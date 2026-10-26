import { expect, test } from "@playwright/test";
import { apiRoutes } from "../helpers/api-routes";
import { bearerAuth } from "../helpers/auth-headers";
import { bootstrapSessionWithCredentials } from "../helpers/auth-flow";
import { readEnvelope } from "../helpers/json";

type CmsPath = { path?: string };
type CmsFooterLinkGroup = { slug?: string };
type CmsLocale = { code?: string };
type CmsEntry = {
  contentBlocks?: unknown[];
  id?: string;
  locale?: string;
  path?: string;
  slug?: string;
  title?: string;
};

test.describe("CMS public API", () => {
  test.beforeEach(async ({ request }) => {
    const response = await request.get(apiRoutes.cmsSite);
    test.skip(
      response.status() === 404,
      "CMS public routes are not deployed to the configured API host"
    );
    expect(response.status(), "CMS site endpoint should be available").toBe(200);
  });

  test("returns public site copy and enabled locales", async ({ request }) => {
    const siteResponse = await request.get(apiRoutes.cmsSite);
    const site = await readEnvelope(siteResponse);
    expect(site.success, site.message).toBe(true);
    expect(site.data).toEqual(
      expect.objectContaining({
        llmsTxt: expect.any(String),
        aiFactsHtml: expect.any(String),
        homeSummary: expect.any(String),
      })
    );

    const localesResponse = await request.get(apiRoutes.cmsLocales);
    const locales = await readEnvelope(localesResponse);
    expect(locales.success, locales.message).toBe(true);
    expect(Array.isArray(locales.data), "CMS locales should be an array").toBe(
      true
    );
  });

  test("returns navigation and sitemap paths", async ({ request }) => {
    const navigationResponse = await request.get(apiRoutes.cmsNavigation);
    const navigation = await readEnvelope<{
      header?: unknown[];
      footer?: CmsFooterLinkGroup[];
      social?: unknown[];
    }>(navigationResponse);
    expect(navigation.success, navigation.message).toBe(true);
    expect(navigation.data).toEqual(
      expect.objectContaining({
        header: expect.any(Array),
        footer: expect.any(Array),
        social: expect.any(Array),
      })
    );

    const pathsResponse = await request.get(apiRoutes.cmsPaths);
    const paths = await readEnvelope<CmsPath[]>(pathsResponse);
    expect(paths.success, paths.message).toBe(true);
    expect(Array.isArray(paths.data), "CMS paths should be an array").toBe(true);
  });

  test("lists blog posts and FAQs using the public response shapes", async ({
    request,
  }) => {
    const blogResponse = await request.get(
      `${apiRoutes.cmsBlog}?page=1&pageSize=5`
    );
    expect(blogResponse.status()).toBe(200);
    const blog = (await blogResponse.json()) as {
      success?: boolean;
      data?: unknown[];
      meta?: { page?: number; pageSize?: number; total?: number };
    };
    expect(blog.success).toBe(true);
    expect(Array.isArray(blog.data)).toBe(true);
    expect(blog.meta).toEqual(
      expect.objectContaining({
        page: 1,
        pageSize: 5,
        total: expect.any(Number),
      })
    );

    const faqResponse = await request.get(apiRoutes.cmsFaqs);
    const faqs = await readEnvelope(faqResponse);
    expect(faqs.success, faqs.message).toBe(true);
    expect(Array.isArray(faqs.data), "CMS FAQs should be an array").toBe(true);
  });

  test("loads a published page from the sitemap paths", async ({ request }) => {
    const pathsResponse = await request.get(apiRoutes.cmsPaths);
    const paths = await readEnvelope<CmsPath[]>(pathsResponse);
    expect(paths.success, paths.message).toBe(true);
    const path = paths.data?.find(
      (item): item is { path: string } =>
        typeof item.path === "string" && item.path.length > 0
    )?.path;
    test.skip(!path, "No published CMS paths exist on the configured API host");

    const contentResponse = await request.get(
      `${apiRoutes.cmsContent}?path=${encodeURIComponent(path!)}`
    );
    const content = await readEnvelope<CmsEntry>(contentResponse);
    expect(content.success, content.message).toBe(true);
    expect(content.data).toEqual(
      expect.objectContaining({ path, title: expect.any(String) })
    );
  });

  test("loads a published page category linked from navigation", async ({
    request,
  }) => {
    const response = await request.get(apiRoutes.cmsNavigation);
    const navigation = await readEnvelope<{
      footer?: CmsFooterLinkGroup[];
    }>(response);
    expect(navigation.success, navigation.message).toBe(true);
    const slug = navigation.data?.footer?.find(
      (group): group is { slug: string } =>
        typeof group.slug === "string" && group.slug.length > 0
    )?.slug;
    test.skip(!slug, "No CMS footer categories exist on the configured API host");

    const categoryResponse = await request.get(
      apiRoutes.cmsCategoryBySlug(slug!)
    );
    const category = await readEnvelope<{ slug?: string; entries?: unknown[] }>(
      categoryResponse
    );
    expect(category.success, category.message).toBe(true);
    expect(category.data).toEqual(
      expect.objectContaining({ slug, entries: expect.any(Array) })
    );
  });

  test("returns null when no redirect matches a path", async ({ request }) => {
    const response = await request.get(
      `${apiRoutes.cmsRedirectMatch}?path=${encodeURIComponent(
        `/qa-no-redirect-${Date.now()}`
      )}`
    );
    const result = await readEnvelope(response);
    expect(result.success, result.message).toBe(true);
    expect(result.data).toBeNull();
  });
});

test.describe("CMS admin API", () => {
  test.describe.configure({ mode: "serial" });

  test("requires authentication for protected content management", async ({
    request,
  }) => {
    const response = await request.get(apiRoutes.adminCmsEntries);
    test.skip(
      response.status() === 404,
      "CMS admin routes are not deployed to the configured API host"
    );
    expect([401, 403]).toContain(response.status());
  });

  const email = process.env.SCHOLARAI_CMS_ADMIN_EMAIL?.trim();
  const password = process.env.SCHOLARAI_CMS_ADMIN_PASSWORD?.trimEnd();

  let accessToken = "";

  test("authenticates a CMS editor account", async ({ request }) => {
    test.skip(
      !email || !password,
      "Set SCHOLARAI_CMS_ADMIN_EMAIL/PASSWORD to run CMS editor API tests"
    );
    const session = await bootstrapSessionWithCredentials(
      request,
      email!,
      password!
    );
    expect(session.accessToken, session.reason).toBeTruthy();
    accessToken = session.accessToken!;
  });

  test("exposes content authoring, taxonomy, locale, and media resources", async ({
    request,
  }) => {
    test.skip(!accessToken, "Needs a CMS editor account");
    const endpoints = [
      apiRoutes.adminCmsPageTypes,
      apiRoutes.adminCmsLocales,
      apiRoutes.adminCmsCategories,
      apiRoutes.adminCmsNavigation,
      apiRoutes.adminCmsMedia,
      apiRoutes.adminCmsEntries,
    ];

    for (const endpoint of endpoints) {
      const response = await request.get(endpoint, {
        headers: bearerAuth(accessToken),
      });
      const result = await readEnvelope(response);
      expect(response.status(), `${endpoint}: ${result.message}`).toBe(200);
      expect(result.success, `${endpoint}: ${result.message}`).toBe(true);
      expect(result.data, `${endpoint} should return data`).not.toBeNull();
    }
  });

  test("creates, edits, previews, links a translation, archives, and deletes a draft", async ({
    request,
  }) => {
    test.skip(!accessToken, "Needs a CMS editor account");
    const unique = `${Date.now()}`;
    let entryId: string | undefined;
    const translationIds: string[] = [];
    const headers = bearerAuth(accessToken);

    try {
      const createResponse = await request.post(apiRoutes.adminCmsEntries, {
        headers,
        data: {
          kind: "POST",
          title: `QA CMS draft ${unique}`,
          slug: `qa-cms-${unique}`,
          bodySource: `<p>CMS QA draft ${unique}</p>`,
          contentBlocks: [
            {
              id: "qa-rich-text",
              type: "rich_text",
              html: `<p>CMS block ${unique}</p>`,
            },
          ],
        },
      });
      const created = await readEnvelope<CmsEntry>(createResponse);
      expect([200, 201]).toContain(createResponse.status());
      expect(created.success, created.message).toBe(true);
      expect(typeof created.data?.id).toBe("string");
      entryId = created.data?.id;
      expect(created.data?.title).toBe(`QA CMS draft ${unique}`);
      expect(created.data?.slug).toBe(`qa-cms-${unique}`);

      const detailResponse = await request.get(
        apiRoutes.adminCmsEntryById(entryId!),
        { headers }
      );
      const detail = await readEnvelope<CmsEntry>(detailResponse);
      expect(detailResponse.status()).toBe(200);
      expect(detail.data?.id).toBe(entryId);

      const updateResponse = await request.patch(
        apiRoutes.adminCmsEntryById(entryId!),
        {
          headers,
          data: { title: `Updated QA CMS draft ${unique}` },
        }
      );
      const updated = await readEnvelope<CmsEntry>(updateResponse);
      expect(updateResponse.status()).toBe(200);
      expect(updated.data?.title).toBe(`Updated QA CMS draft ${unique}`);

      const revisionsResponse = await request.get(
        apiRoutes.adminCmsEntryRevisions(entryId!),
        { headers }
      );
      const revisions = await readEnvelope<unknown[]>(revisionsResponse);
      expect(revisionsResponse.status()).toBe(200);
      expect(Array.isArray(revisions.data)).toBe(true);
      expect(revisions.data?.length).toBeGreaterThan(0);

      const previewTokenResponse = await request.post(
        apiRoutes.adminCmsEntryPreviewToken(entryId!),
        { headers }
      );
      const previewToken = await readEnvelope<{ token?: string }>(
        previewTokenResponse
      );
      expect(previewTokenResponse.status()).toBe(201);
      expect(typeof previewToken.data?.token).toBe("string");

      const previewResponse = await request.get(
        apiRoutes.cmsPreview(previewToken.data!.token!)
      );
      const preview = await readEnvelope<CmsEntry & { preview?: boolean }>(
        previewResponse
      );
      expect(previewResponse.status()).toBe(200);
      expect(preview.data?.preview).toBe(true);
      expect(preview.data?.title).toBe(`Updated QA CMS draft ${unique}`);
      expect(preview.data?.contentBlocks).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: "rich_text",
            html: expect.stringContaining(`CMS block ${unique}`),
          }),
        ])
      );

      const translationsResponse = await request.get(
        apiRoutes.adminCmsEntryTranslations(entryId!),
        { headers }
      );
      const translations = await readEnvelope<{
        locale?: string;
        missing?: CmsLocale[];
      }>(translationsResponse);
      expect(translationsResponse.status()).toBe(200);
      expect(typeof translations.data?.locale).toBe("string");
      expect(Array.isArray(translations.data?.missing)).toBe(true);

      const targetLocale = translations.data?.missing?.find(
        (locale): locale is { code: string } =>
          typeof locale.code === "string" &&
          locale.code.length > 0 &&
          locale.code !== translations.data?.locale
      )?.code;

      if (targetLocale) {
        const addTranslationResponse = await request.post(
          apiRoutes.adminCmsEntryAddTranslation(entryId!),
          {
            headers,
            data: {
              locale: targetLocale,
              slug: `qa-cms-${unique}-${targetLocale}`,
              copyContent: true,
            },
          }
        );
        const translation = await readEnvelope<CmsEntry>(addTranslationResponse);
        expect(addTranslationResponse.status()).toBe(201);
        expect(translation.success, translation.message).toBe(true);
        expect(translation.data?.locale).toBe(targetLocale);
        expect(translation.data?.path).toContain(`/${targetLocale}/`);
        expect(typeof translation.data?.id).toBe("string");
        if (translation.data?.id) translationIds.push(translation.data.id);
      }

      const archiveResponse = await request.post(
        apiRoutes.adminCmsEntryArchive(entryId!),
        { headers }
      );
      expect(archiveResponse.status()).toBe(201);

      const restoreResponse = await request.post(
        apiRoutes.adminCmsEntryRestore(entryId!),
        { headers }
      );
      expect(restoreResponse.status()).toBe(201);
    } finally {
      for (const translationId of translationIds) {
        await request.delete(apiRoutes.adminCmsEntryDelete(translationId), {
          headers,
        });
      }
      if (entryId) {
        await request.delete(apiRoutes.adminCmsEntryDelete(entryId), {
          headers,
        });
      }
    }
  });
});
