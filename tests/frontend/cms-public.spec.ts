import { expect, test } from "@playwright/test";
import { uiRoutes } from "./helpers/routes";

test.describe("Frontend — CMS public pages", () => {
  test("blog index renders without authentication", async ({ page }) => {
    await page.goto(uiRoutes.cmsBlog);
    await expect(page).not.toHaveURL(/\/auth\/login/i);
    await expect(
      page.getByRole("heading", { name: "Blog", level: 1 })
    ).toBeVisible();
  });

  test("FAQ index renders without authentication", async ({ page }) => {
    await page.goto(uiRoutes.cmsFaq);
    await expect(page).not.toHaveURL(/\/auth\/login/i);
    await expect(
      page.getByRole("heading", { name: "FAQ", level: 1 })
    ).toBeVisible();
  });
});
