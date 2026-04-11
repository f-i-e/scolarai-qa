import { test, expect } from "@playwright/test";
import { readEnvelope } from "./helpers/json";
import { paths } from "./helpers/paths";

test.describe.configure({ mode: "serial" });

test("API responds (auth register validation)", async ({ request }) => {
  const allowOffline = process.env.SCHOLARAI_ALLOW_OFFLINE === "1";
  let res;
  try {
    res = await request.post(paths.register, { data: {} });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (allowOffline) {
      test.skip(true, `API unreachable (${msg}). Set SCHOLARAI_API_BASE_URL or start services.`);
      return;
    }
    throw new Error(
      `Cannot reach API (${msg}). Fix SCHOLARAI_API_BASE_URL or use SCHOLARAI_ALLOW_OFFLINE=1.`
    );
  }

  const json = await readEnvelope(res);
  if (json.error?.code === "RESOURCE_NOT_FOUND" || res.status() === 404) {
    throw new Error(
      `No route at ${paths.register} (HTTP ${res.status()}). ` +
        `Try SCHOLARAI_API_VERSION_PREFIX=/api or /api/v1 to match your gateway. ` +
        `Keep SCHOLARAI_API_BASE_URL as origin only (e.g. https://test-api.scolarai.com).`
    );
  }
  expect(res.status(), json.message).toBeGreaterThanOrEqual(400);
  expect(json.success).toBe(false);
  expect(json.error?.code).toBeTruthy();
});
