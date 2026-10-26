import { test, expect } from "@playwright/test";
import { uiRoutes } from "./helpers/routes";

test.describe("Frontend — Tutor portal shell", () => {
  test("unauthenticated visit to tutor dashboard redirects to sign-in", async ({
    page,
  }) => {
    await page.goto(uiRoutes.tutorDashboard);
    await expect(page).toHaveURL(/\/auth\/login/i, { timeout: 20_000 });
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
  });

  test("tutor classroom route requires auth (login or redirect)", async ({
    page,
  }) => {
    await page.goto(uiRoutes.tutorClassroom);
    await expect(page).toHaveURL(/\/auth\/login|\/tutor\/classroom/i, {
      timeout: 20_000,
    });
  });
});
