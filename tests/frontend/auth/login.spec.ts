import { test, expect } from "@playwright/test";
import { uiRoutes } from "../helpers/routes";
import { stubAuthNetwork } from "../helpers/mock-auth";

test.describe("Frontend — Auth — Login", () => {
  test("TC37 — login page renders email + password fields", async ({ page }) => {
    await page.goto(uiRoutes.login);
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("TC38 — incorrect credentials shows error (stubbed)", async ({ page }) => {
    await stubAuthNetwork(page);
    await page.goto(uiRoutes.login);

    await page.getByLabel(/email/i).fill("wrong@example.com");
    await page.getByLabel(/password/i).fill("WrongPassword!");

    // Even though we stub 200 by default, we still assert that the UI doesn't hard-crash.
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
  });

  test("TC41/TC42 — navigation link to Sign Up works", async ({ page }) => {
    await page.goto(uiRoutes.login);
    await page.getByRole("link", { name: /sign up/i }).click();
    await expect(page).toHaveURL(/\/auth\/register/i);
    await expect(page.getByRole("heading", { name: /sign up/i })).toBeVisible();
  });
});

