import "dotenv/config";
import { defineConfig } from "@playwright/test";

/**
 * Use **origin only** (scheme + host, optional port). Do not set …/api/v1 here — that lives in `paths.ts`.
 * Wrong: https://host/api/v1 + path /auth/register → resolves to https://host/auth/register (broken).
 */
const baseURL =
  process.env.SCHOLARAI_API_BASE_URL ?? "https://test-api.scolarai.com";

export default defineConfig({
  testDir: "tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: 45_000,
  use: {
    baseURL,
    extraHTTPHeaders: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  },
  projects: [
    {
      name: "backend-setup",
      testMatch: /tests\/backend\/backend\.setup\.ts/,
    },
    {
      name: "backend-auth",
      dependencies: ["backend-setup"],
      testMatch: /tests\/backend\/auth\/.*\.spec\.ts/,
    },
    {
      name: "backend-api",
      dependencies: ["backend-setup"],
      testMatch: /tests\/backend\/api\/.*\.spec\.ts/,
    },
  ],
});
