import assert from "node:assert/strict";
import test from "node:test";
import { selectBenchPlace } from "./place-selection.mjs";

// Synthetic catalog tests selection only, never generated-world acceptance.
const jurisdictions = Array.from({ length: 56 }, (_, i) => ({
  jurisdictionKey: `jurisdiction-${i}`,
}));
const places = jurisdictions.flatMap(({ jurisdictionKey }) =>
  ["a", "b"].map((suffix) => ({
    key: `${jurisdictionKey}-${suffix}`,
    stateJurisdictionKey: jurisdictionKey,
    scope: "locality",
  })),
);

test("a seed selects the same source row regardless of catalog order", () => {
  const chosen = selectBenchPlace("replay", jurisdictions, places);
  assert.ok(places.includes(chosen));
  assert.equal(
    selectBenchPlace(
      "replay",
      [...jurisdictions].reverse(),
      [...places].reverse(),
    ),
    chosen,
  );
});

test("every jurisdiction participates in seeded opening selection", () => {
  const seen = new Set();
  for (let seed = 0; seed < 1024; seed++)
    seen.add(
      selectBenchPlace(String(seed), jurisdictions, places)
        .stateJurisdictionKey,
    );
  assert.deepEqual(
    seen,
    new Set(jurisdictions.map((row) => row.jurisdictionKey)),
  );
});

test("missing coverage rejects instead of silently narrowing the draw", () => {
  assert.throws(
    () => selectBenchPlace("coverage", jurisdictions, places.slice(2)),
    /Locality coverage missing/,
  );
});

test("empty seeds and duplicate jurisdiction identities reject", () => {
  assert.throws(() => selectBenchPlace(" ", jurisdictions, places), /seed/);
  assert.throws(
    () =>
      selectBenchPlace("seed", [...jurisdictions, jurisdictions[0]], places),
    /unique/,
  );
});
