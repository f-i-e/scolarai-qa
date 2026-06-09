/** Extract first string `id` from common paginated list shapes. */
export function pickFirstIdFromList(data: unknown): string | undefined {
  const rows = listRows(data);
  if (!rows?.length) return undefined;
  const first = rows[0] as Record<string, unknown>;
  const id = first?.id ?? first?.lessonId;
  return typeof id === "string" && id.length > 0 ? id : undefined;
}

/** Lesson list items may expose `id`, `lessonId`, or only `slug`. */
export function pickLessonRef(
  data: unknown
): { lessonId?: string; slug?: string } | undefined {
  const rows = listRows(data);
  if (!rows?.length) return undefined;
  const first = rows[0] as Record<string, unknown>;
  const lessonId =
    typeof first?.id === "string"
      ? first.id
      : typeof first?.lessonId === "string"
        ? first.lessonId
        : undefined;
  const slug = typeof first?.slug === "string" ? first.slug : undefined;
  if (lessonId || slug) return { lessonId, slug };
  return undefined;
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
