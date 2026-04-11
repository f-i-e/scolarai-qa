/** Domain for synthetic accounts (each run uses a new local part). Override if your API blocks certain domains. */
function testEmailDomain(): string {
  const raw = process.env.SCHOLARAI_TEST_EMAIL_DOMAIN?.trim();
  if (raw) {
    return raw.startsWith("@") ? raw.slice(1) : raw;
  }
  return "qa.scolarai.test";
}

export function uniqueEmail(prefix = "qa"): string {
  const t = Date.now();
  const r = Math.random().toString(36).slice(2, 10);
  return `${prefix}+${t}.${r}@${testEmailDomain()}`;
}
