import { describe, expect, it } from "vitest";

import { recordById, recordsByStringField } from "./history-index";
import type { EntityId } from "./types";

describe("immutable history lookup indexes", () => {
  it("keeps first-match and source order while a new array gets fresh entries", () => {
    const first = { id: "first" as EntityId, personId: "a", value: 1 };
    const duplicate = { id: "first" as EntityId, personId: "b", value: 2 };
    const records = [first, duplicate] as const;
    expect(recordById(records, first.id)).toBe(first);
    expect(recordsByStringField(records, "personId", "a")).toEqual([first]);
    expect(recordsByStringField(records, "personId", "b")).toEqual([duplicate]);

    const changed = [
      first,
      duplicate,
      { id: "third" as EntityId, personId: "a", value: 3 },
    ];
    expect(recordById(changed, changed[2]!.id)).toBe(changed[2]);
    expect(recordsByStringField(changed, "personId", "a")).toEqual([
      first,
      changed[2],
    ]);
    expect(recordById(records, changed[2]!.id)).toBeUndefined();
  });
});
