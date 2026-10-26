import { expect, test } from "@playwright/test";
import { pickFirstIdFromList, pickLessonRef } from "../../backend/helpers/list-data";

test.describe("list data helpers", () => {
  test("picks the first id from an array or paginated items envelope", () => {
    expect(pickFirstIdFromList([{ id: "array-id" }])).toBe("array-id");
    expect(
      pickFirstIdFromList({ items: [{ id: "paginated-id" }] })
    ).toBe("paginated-id");
  });

  test("falls back to lessonId and sessionId when id is unavailable", () => {
    expect(pickFirstIdFromList([{ lessonId: "lesson-id" }])).toBe("lesson-id");
    expect(pickFirstIdFromList([{ sessionId: "session-id" }])).toBe(
      "session-id"
    );
    expect(
      pickFirstIdFromList([{ id: 42, lessonId: "lesson-id" }])
    ).toBe("lesson-id");
  });

  test("returns undefined for empty, unsupported, or malformed lists", () => {
    for (const value of [
      undefined,
      null,
      "not a list",
      {},
      { items: "not an array" },
      [],
      { items: [] },
      [null],
      [42],
      [{ id: 42 }],
    ]) {
      expect(pickFirstIdFromList(value)).toBeUndefined();
      expect(pickLessonRef(value)).toBeUndefined();
    }
  });

  test("picks lesson ids and slugs from supported lesson item fields", () => {
    expect(
      pickLessonRef([{ id: "id", lessonId: "lesson-id", slug: "slug" }])
    ).toEqual({
      lessonId: "id",
      slug: "slug",
    });
    expect(pickLessonRef([{ lessonId: "lesson-id" }])).toEqual({
      lessonId: "lesson-id",
      slug: undefined,
    });
    expect(
      pickLessonRef([{ id: 42, lessonId: "lesson-id", slug: "slug" }])
    ).toEqual({
      lessonId: "lesson-id",
      slug: "slug",
    });
    expect(pickLessonRef([{ slug: "slug" }])).toEqual({
      lessonId: undefined,
      slug: "slug",
    });
  });
});
