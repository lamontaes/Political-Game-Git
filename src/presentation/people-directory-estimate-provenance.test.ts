import { describe, expect, it } from "vitest";

import {
  EVERYBODY_KNOWS_EVERYBODY_LIMIT,
  EVERYBODY_KNOWS_LIMIT_PROVENANCE,
} from "./people-directory";

describe("the everybody-knows limit says where it comes from", () => {
  it("is marked estimated with a source", () => {
    expect(EVERYBODY_KNOWS_EVERYBODY_LIMIT).toBe(20);
    expect(EVERYBODY_KNOWS_LIMIT_PROVENANCE.provenance).toBe(
      "estimated-from-average",
    );
    expect(EVERYBODY_KNOWS_LIMIT_PROVENANCE.estimated).toBe(true);
  });
});
