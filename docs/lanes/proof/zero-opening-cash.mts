import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { buildBenchWorld } from "../../../src/bench/world.ts";
import { searchCorePlaces } from "../../../src/core2/place-lookup.ts";
import { coreAPI } from "../../../src/core2/state.ts";
import {
  governments,
  openBudgets,
} from "../../../src/core2/modules/budgets.ts";
import { gameStartDate } from "../../../src/core2/game-start.ts";
import { advanceCore } from "../../../src/core2/life.ts";
import { addDays, makeIsoDate } from "../../../src/core2/kernel/dates.ts";
import { treasuryMonthsOf } from "../../../src/core2/budgets-treasury.ts";
const replay = "75ae3c9378284205";
const authority = JSON.parse(
  readFileSync(
    "data/research/laws/starting-law-2026/labor-workforce.json",
    "utf8",
  ),
).questions["us-policy-positions:labor-workforce.local-minimum-wage-authority"]
  .answers;
const pick = (list, salt) =>
  list[
    parseInt(
      createHash("sha256")
        .update(`${replay}:${salt}`)
        .digest("hex")
        .slice(0, 8),
      16,
    ) % list.length
  ];
const states = Object.keys(authority)
  .filter(
    (k) =>
      !["US-NE", "US-DC", "US-AS", "US-GU", "US-MP", "US-VI", "US-PR"].includes(
        k,
      ),
  )
  .sort();
const state = pick(states, "project:0:0");
const places = [
  ...searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
    stateJurisdictionKey: state,
    scope: "locality",
  }),
].sort((a, b) => a.key.localeCompare(b.key));
const place = pick(places, "project:0:place:0");
console.log(
  JSON.stringify({ phase: "drawn from unchanged failing test", replay, place }),
);
const { core } = buildBenchWorld(replay, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
core.observer = true;
const api = coreAPI(core);
const opening = governments(api).map((g) => ({
  id: g.id,
  organizationId: g.organizationId,
  openingCash: g.openingCash,
}));
const zero = opening.filter((g) => g.openingCash?.minor === 0);
assert.ok(
  zero.length,
  "failing replay must contain a natural zero opening balance",
);
for (const g of zero)
  assert.equal(Object.hasOwn(g.openingCash, "journalSequence"), false);
assert.ok(
  opening.some((g) => g.openingCash?.journalSequence === 0),
  "first real journal sequence zero is preserved",
);
function reopen() {
  const balances = opening.map(
    (g) => core.organizations.get(g.organizationId).liquidMinor,
  );
  const sequence = core.cashJournal.nextSequence;
  assert.throws(
    () => openBudgets(core),
    /Duplicate institutional calendar key/,
  );
  assert.deepEqual(
    governments(api).map((g) => g.openingCash),
    opening.map((g) => g.openingCash),
  );
  assert.deepEqual(
    opening.map((g) => core.organizations.get(g.organizationId).liquidMinor),
    balances,
  );
  assert.equal(core.cashJournal.nextSequence, sequence);
}
reopen();
advanceCore(core, addDays(makeIsoDate(core.date), 365));
const evidence = zero.map((g) => {
  const months = treasuryMonthsOf(api, g.id);
  const payments = [...core.cashJournal.detailedReceipts.values()].filter(
    (r) => {
      const owner = r.owners.get(g.organizationId);
      return owner && owner.afterMinor < owner.beforeMinor;
    },
  );
  const named = payments.flatMap((r) =>
    [...r.owners.values()]
      .filter((o) => core.people.has(o.ownerId) && o.afterMinor > o.beforeMinor)
      .map((o) => ({
        journal: r.id,
        source: r.sourceRef,
        person: o.ownerId,
        name: `${core.people.get(o.ownerId).givenName} ${core.people.get(o.ownerId).familyName}`,
        minor: o.afterMinor - o.beforeMinor,
      })),
  );
  assert.ok(
    months.length,
    "treasury engine reads the zero-cash government during play",
  );
  return {
    ...g,
    months: months.length,
    firstClose: months[0],
    namedPayments: named.length,
    payee: named[0] ?? null,
  };
});
reopen();
const result = {
  replay,
  place,
  worldSeed: core.seed,
  through: core.date,
  opening,
  evidence,
  reopening: "cash, markers and journal sequence unchanged",
};
mkdirSync("test-results/lane-2-zero-opening-cash", { recursive: true });
writeFileSync(
  "test-results/lane-2-zero-opening-cash/audit.json",
  JSON.stringify(result, null, 2),
);
console.log(JSON.stringify(result));
