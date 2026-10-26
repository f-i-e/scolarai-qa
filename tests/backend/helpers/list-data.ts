/** Extract first string `id` from common paginated list shapes. */
export function pickFirstIdFromList(data: unknown): string | undefined {
  const rows = listRows(data);
  const first = firstRow(rows);
  if (!first) return undefined;
  return firstString(first.id, first.lessonId, first.sessionId);
}

/** Lesson list items may expose `id`, `lessonId`, or only `slug`. */
export function pickLessonRef(
  data: unknown
): { lessonId?: string; slug?: string } | undefined {
  const rows = listRows(data);
  const first = firstRow(rows);
  if (!first) return undefined;
  const lessonId = firstString(first.id, first.lessonId);
  const slug = firstString(first.slug);
  if (lessonId || slug) return { lessonId, slug };
  return undefined;
}

function firstRow(
  rows: unknown[] | undefined
): Record<string, unknown> | undefined {
  const first = rows?.[0];
  return first !== null && typeof first === "object" && !Array.isArray(first)
    ? (first as Record<string, unknown>)
    : undefined;
}

function firstString(...values: unknown[]): string | undefined {
  return values.find(
    (value): value is string => typeof value === "string" && value.length > 0
  );
}

function listRows(data: unknown): unknown[] | undefined {
  if (Array.isArray(data)) return data;
  if (
    data &&
    typeof data === "object" &&
    "items" in data &&
    Array.isArray((data as { items: unknown }).items)
  ) {
    return (data as { items: unknown[] }).items;
  }
  return undefined;
}
