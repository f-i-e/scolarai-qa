import { test, expect } from "@playwright/test";
import { uiRoutes } from "./helpers/routes";

test.describe("Frontend — Explore (public catalog)", () => {
  test("explore page loads without auth", async ({ page }) => {
    await page.goto(uiRoutes.explore);
    await expect(page).not.toHaveURL(/\/auth\/login/i);
    await expect(page.locator("body")).toBeVisible();
  });
});
