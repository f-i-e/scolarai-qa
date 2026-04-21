import type { Page } from "@playwright/test";

/**
 * Frontend is not wired to backend yet.
 * Stub any network calls that look like auth so UI flows can be tested.
 */
export async function stubAuthNetwork(page: Page) {
  await page.route("**/*", async (route) => {
    const req = route.request();
    const url = req.url();
    const method = req.method();

    // Let static assets through.
    const isLikelyAsset =
      url.includes("/_next/") ||
      url.endsWith(".js") ||
      url.endsWith(".css") ||
      url.endsWith(".png") ||
      url.endsWith(".jpg") ||
      url.endsWith(".svg") ||
      url.endsWith(".ico") ||
      url.includes("fonts");
    if (isLikelyAsset) return route.continue();

    // Basic heuristics: endpoints containing auth/login/register.
    const looksLikeAuth = /\/auth\/(login|register)\b/i.test(url);
    if (!looksLikeAuth) return route.continue();

    // Respond with a stable JSON shape.
    if (method === "POST" && /\/auth\/login\b/i.test(url)) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "Request successful",
          data: {
            user: { id: "qa-user", email: "qa@example.com" },
            accessToken: "qa-access-token",
            refreshToken: "qa-refresh-token",
          },
          error: null,
        }),
      });
    }

    if (method === "POST" && /\/auth\/register\b/i.test(url)) {
      return route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "User registered successfully",
          data: { id: "qa-user", email: "qa@example.com" },
          error: null,
        }),
      });
    }

    return route.continue();
  });
}

