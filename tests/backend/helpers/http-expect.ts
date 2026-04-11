import type { APIResponse } from "@playwright/test";
import { expect } from "@playwright/test";

export async function expectStatus(
  res: APIResponse,
  allowed: readonly number[],
  note?: string
): Promise<void> {
  const body = await res.text();
  const got = res.status();
  expect(
    allowed,
    note ? `${note}: HTTP ${got} — ${body}` : `HTTP ${got} not in [${allowed.join(",")}] — ${body}`
  ).toContain(got);
}
