import { describe, expect, it } from "vitest";
import type { EntityId, IsoDate } from "../simulation/types";
import {
  selectOpeningRegionalPlate,
  type OpeningRegionalSceneContext,
  type OpeningRegionalPlateCandidate,
} from "./opening-regional-plate";

const context: OpeningRegionalSceneContext = {
  jurisdictionId: "test-buchanan" as EntityId,
  placeKey: "buchanan-fixture",
  sourceGeoid: "2611400",
  stateJurisdictionKey: "US-MI",
  asOf: "2026-01-05" as IsoDate,
  presentationKey: "saved-person:local:buchanan-fixture",
};
const generic = { assetId: "generic", coverage: { generic: true } } as const;
const state = {
  assetId: "michigan",
  coverage: { stateJurisdictionKeys: ["US-MI"] },
} as const;
const local = {
  assetId: "buchanan",
  coverage: { placeKeys: ["buchanan-fixture"] },
} as const;

describe("regional opening image eligibility", () => {
  it("prefers explicit locality, then state, then declared generic coverage", () => {
    expect(selectOpeningRegionalPlate(context, [generic, state, local])).toBe(
      local,
    );
    expect(
      selectOpeningRegionalPlate({ ...context, placeKey: "another-place" }, [
        local,
        generic,
        state,
      ]),
    ).toBe(state);
    expect(
      selectOpeningRegionalPlate(
        {
          ...context,
          stateJurisdictionKey: "US-KY",
          placeKey: "another-place",
        },
        [local, state, generic],
      ),
    ).toBe(generic);
  });
  it("does not turn tags, a reference location or an empty coverage declaration into eligibility", () => {
    const candidates = [
      {
        assetId: "coal",
        coverage: { placeKeys: ["pikeville-only"] },
        tags: ["Michigan", "industry"],
      },
      {
        assetId: "grassland",
        coverage: { stateJurisdictionKeys: ["US-ND"] },
        sourceLocation: "Buchanan",
      },
      { assetId: "empty", coverage: {} },
    ];
    expect(selectOpeningRegionalPlate(context, candidates)).toBeNull();
    expect(selectOpeningRegionalPlate(null, [generic])).toBeNull();
  });
  it("filters incompatible seasons before specificity and rejects malformed month coverage", () => {
    for (const months of [[7], [], [0, 1], [1, 13], [1, 2.5]]) {
      expect(
        selectOpeningRegionalPlate(context, [{ ...local, months }, generic]),
      ).toBe(generic);
    }
    expect(
      selectOpeningRegionalPlate(context, [{ ...local, months: [1] }, generic])
        ?.assetId,
    ).toBe("buchanan");
  });
  it("keeps a deterministic choice across ordering, redraws and same-season date changes without mutating inputs", () => {
    const candidates: readonly OpeningRegionalPlateCandidate[] = [
      local,
      { ...local, assetId: "buchanan-b" },
      state,
    ];
    const before = JSON.stringify({ context, candidates });
    const chosen = selectOpeningRegionalPlate(context, candidates);
    expect(selectOpeningRegionalPlate(context, [...candidates].reverse())).toBe(
      chosen,
    );
    expect(
      selectOpeningRegionalPlate(
        { ...context, asOf: "2026-01-06" as IsoDate },
        candidates,
      ),
    ).toBe(chosen);
    expect(JSON.stringify({ context, candidates })).toBe(before);
  });
});
