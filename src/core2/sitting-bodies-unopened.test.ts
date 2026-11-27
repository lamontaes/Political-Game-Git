import { describe, expect, it } from "vitest";
import { OFFICES_MODULE_ID } from "./modules/offices";
import { SITTING_CALENDAR } from "./modules/world-legislating";
import type { CoreAPI } from "./types";

describe("a world that has not opened the legislating engine yet", () => {
  it("lists no body that its own reader would then refuse to open", () => {
    // Relationships change while a world is built, before every engine is
    // installed, and the sitting readers are one list for the whole process.
    // The offices engine is in; the legislating engine is not: a person who
    // holds a council seat sat on a body `bodiesOf` listed and `owns` refused,
    // and the shared hours of two members read the missing reader's `seats`.
    const council = {
      id: "office:test:council",
      kind: "council",
      jurisdiction: "J",
      governmentName: "G",
    };
    const term = { officeId: council.id, status: "serving" };
    const api = {
      state: { modules: new Map([[OFFICES_MODULE_ID, {}]]) },
      moduleState: () => ({
        table: (name: string) => ({
          query: () => (name === "terms" ? [term] : []),
          get: (id: string) => (id === council.id ? council : undefined),
          rows: () => [council],
        }),
      }),
    } as unknown as CoreAPI;
    for (const body of SITTING_CALENDAR.bodiesOf(api, "person-1"))
      expect(SITTING_CALENDAR.owns(api, body)).toBe(true);
  });
});
