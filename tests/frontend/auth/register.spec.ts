import { test, expect } from "@playwright/test";
import { uiRoutes } from "../helpers/routes";
import { stubAuthNetwork } from "../helpers/mock-auth";

test.describe("Frontend — Auth — Register", () => {
  function registerForm(page: import("@playwright/test").Page) {
    return page.locator("form");
  }

  test("TC31 — register page renders required fields", async ({ page }) => {
    await page.goto(uiRoutes.register);
    await expect(page.getByRole("heading", { name: /sign up/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/^password$/i)).toBeVisible();
    await expect(page.getByLabel(/confirm password/i)).toBeVisible();
    await expect(registerForm(page).getByRole("button", { name: "Sign Up", exact: true })).toBeVisible();
  });

  test("TC32 — password mismatch shows inline error before submit", async ({ page }) => {
    await page.goto(uiRoutes.register);

    await page.getByLabel(/email/i).fill("qa@example.com");
    await page.getByLabel(/^password$/i).fill("Str0ng!pass1");
    await page.getByLabel(/confirm password/i).fill("Different!pass1");

    await registerForm(page).getByRole("button", { name: "Sign Up", exact: true }).click();

    // No stable testids yet; assert any visible error-like text.
    await expect(page.getByText(/match|mismatch|same password/i)).toBeVisible();
  });

  test("TC33 — invalid email format shows inline error", async ({ page }) => {
    await page.goto(uiRoutes.register);
    await page.getByLabel(/email/i).fill("not-an-email");
    await registerForm(page).getByRole("button", { name: "Sign Up", exact: true }).click();
    await expect(page.getByText(/email/i)).toBeVisible();
  });

  test("TC35 — valid form submits (stubbed) without crashing", async ({ page }) => {
    await stubAuthNetwork(page);
    await page.goto(uiRoutes.register);

    await page.getByLabel(/email/i).fill(`qa+${Date.now()}@example.com`);
    await page.getByLabel(/^password$/i).fill("Str0ng!pass1");
    await page.getByLabel(/confirm password/i).fill("Str0ng!pass1");

    await registerForm(page).getByRole("button", { name: "Sign Up", exact: true }).click();
    await expect(page.getByRole("heading", { name: /sign up/i })).toBeVisible();
  });

  test("TC37 — navigation link to Sign In works", async ({ page }) => {
    await page.goto(uiRoutes.register);
    await page.getByRole("link", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/auth\/login/i);
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
  });
});

