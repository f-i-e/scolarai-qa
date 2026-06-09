import { test } from "@playwright/test";
import spec from "../fixtures/openapi-spec.json";
import { expectStatus } from "../helpers/http-expect";
import { buildOpenApiContext, type OpenApiContext } from "../helpers/openapi-context";
import {
  listOperations,
  invokeOperation,
  operationKey,
  smokeAllowedStatuses,
  SKIP_OPERATIONS,
} from "../helpers/openapi-smoke";

const operations = listOperations(spec);

test.describe("OpenAPI — full spec coverage (api.testing)", () => {
  test.describe.configure({ mode: "serial" });

  const state: { ctx: OpenApiContext } = { ctx: {} };

  test.beforeAll(async ({ request }) => {
    state.ctx = await buildOpenApiContext(request);
  });

  for (const op of operations) {
    const key = operationKey(op);
    const title = op.operationId
      ? `${op.method} ${op.path} (${op.operationId})`
      : `${op.method} ${op.path}`;

    test(title, async ({ request }) => {
      const ctx = state.ctx;

      if (SKIP_OPERATIONS.has(key)) {
        test.skip(true, "Skipped — destructive; covered by dedicated user-journey specs");
        return;
      }

      if (op.requiresJwt && !ctx.accessToken) {
        test.skip(
          true,
          ctx.authReason ??
            "JWT required — set SCHOLARAI_VERIFIED_USER_EMAIL/PASSWORD in .env"
        );
        return;
      }

      const res = await invokeOperation(request, op, ctx);
      const allowed = smokeAllowedStatuses(
        op.method,
        op.requiresJwt,
        Boolean(ctx.accessToken)
      );
      await expectStatus(res, allowed, key);
    });
  }
});
