import { test, expect } from "@playwright/test";
import { apiRoutes } from "../helpers/api-routes";
import { bearerAuth } from "../helpers/auth-headers";
import { readEnvelope } from "../helpers/json";
import { expectStatus } from "../helpers/http-expect";
import { pickFirstIdFromList } from "../helpers/list-data";
import { requireLearnerAccessToken } from "../helpers/require-session";

test.describe("OpenAPI — Learner AI chat", () => {
  test.describe.configure({ mode: "serial" });

  let accessToken = "";
  let chatSessionId = "";

  test.beforeAll(async ({ request }) => {
    accessToken = await requireLearnerAccessToken(request);
  });

  test("GET /v1/chat/sessions — list threads", async ({ request }) => {
    const res = await request.get(apiRoutes.chatSessions, {
      headers: bearerAuth(accessToken),
    });
    const json = await readEnvelope(res);

    await expectStatus(res, [200, 404, 503], "chat/sessions list");
    if (res.status() === 200) {
      expect(json.success, json.message).toBe(true);
      chatSessionId = pickFirstIdFromList(json.data) ?? "";
    }
  });

  test("POST /v1/chat/sessions — open session (dashboard entry)", async ({
    request,
  }) => {
    const res = await request.post(apiRoutes.chatSessions, {
      headers: bearerAuth(accessToken),
      data: {
        title: `QA chat ${Date.now()}`,
        entryPoint: { kind: "dashboard" },
      },
    });
    const json = await readEnvelope(res);

    await expectStatus(
      res,
      [200, 201, 404, 503],
      "chat session create (404 = no learner profile / subjects; 503 = AI lane down)"
    );

    if (res.status() === 200 || res.status() === 201) {
      expect(json.success, json.message).toBe(true);
      const data = json.data as Record<string, unknown> | null;
      const id =
        typeof data?.sessionId === "string"
          ? data.sessionId
          : typeof data?.id === "string"
            ? data.id
            : undefined;
      if (id) chatSessionId = id;
    }
  });

  test("GET session transcript when a session id exists", async ({ request }) => {
    expect(
      chatSessionId,
      "Need a chat session id from GET list or POST create (check learner profile + chat deploy on API)"
    ).toBeTruthy();

    const res = await request.get(apiRoutes.chatSessionMessages(chatSessionId), {
      headers: bearerAuth(accessToken),
    });
    await expectStatus(res, [200, 404, 503], "chat history");
  });
});
