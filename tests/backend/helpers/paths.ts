/**
 * Route prefix before `/auth/...` (no trailing slash).
 *
 * - **`/api/v1`** — default; matches OpenAPI (`/api/v1/auth/...` on test-api).
 * - **`/api`** — set `SCHOLARAI_API_VERSION_PREFIX=/api` if your gateway uses unversioned paths.
 *
 * **baseURL** must stay **origin-only** (e.g. `https://test-api.scolarai.com`). See `playwright.config.ts`.
 *
 * Note: GitHub Actions often passes `SCHOLARAI_API_VERSION_PREFIX=` as an **empty string** when the
 * variable is unset — `??` would not fall back. We treat blank as missing and default to `/api/v1`.
 */
export const apiRoutePrefix = (
  process.env.SCHOLARAI_API_VERSION_PREFIX?.trim() || "/api/v1"
).replace(/\/$/, "");

const versionPrefix = apiRoutePrefix;

export const paths = {
  register: process.env.SCHOLARAI_PATH_REGISTER ?? `${versionPrefix}/auth/register`,
  login: process.env.SCHOLARAI_PATH_LOGIN ?? `${versionPrefix}/auth/login`,
  refresh: process.env.SCHOLARAI_PATH_REFRESH ?? `${versionPrefix}/auth/refresh`,
  logout: process.env.SCHOLARAI_PATH_LOGOUT ?? `${versionPrefix}/auth/logout`,
  me: process.env.SCHOLARAI_PATH_ME ?? `${versionPrefix}/auth/me`,
  verify: process.env.SCHOLARAI_PATH_VERIFY ?? `${versionPrefix}/auth/verify`,
  passwordResetRequest:
    process.env.SCHOLARAI_PATH_PASSWORD_RESET_REQUEST ??
    `${versionPrefix}/auth/password/reset/request`,
  passwordResetConfirm:
    process.env.SCHOLARAI_PATH_PASSWORD_RESET_CONFIRM ??
    `${versionPrefix}/auth/password/reset/confirm`,
};
