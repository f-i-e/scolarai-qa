export function bearerAuth(accessToken: string): Record<string, string> {
  return { Authorization: `Bearer ${accessToken}` };
}
