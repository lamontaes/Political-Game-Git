import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { drawRandomPlace } from "../../tests/support/random-place";
import { DEFAULT_NEW_GAME_SETUP } from "../../src/presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../src/presentation/opening-life";
import { advanceWorld } from "../../src/simulation/world";
import { lawExposureSentence } from "../../src/presentation/law-exposure-lines";
import startingLaw from "../../data/research/laws/starting-law-2026.json" with { type: "json" };
import { lawInForce } from "../../src/simulation/governing/law-in-force";
import { stateJurisdictionForKey } from "../../src/simulation/life-places";

const seed = process.argv[2] ?? "session13-election-landing-pool-2026-10-06";
const questionKey =
  "us-policy-positions:government-operations.legislative-term-limits";
const answers = startingLaw.questions[questionKey].answers as Record<
  string,
  { answer: string }
>;
const place = drawRandomPlace(
  seed,
  (candidate) =>
    candidate.stateJurisdictionKey !== null &&
    answers[candidate.stateJurisdictionKey]?.answer === "yes",
);
const source = execFileSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8",
}).trim();
const opened = generateOpeningLife(
  prepareOpeningLife({
    ...DEFAULT_NEW_GAME_SETUP,
    seed,
    placeKey: place.key,
    startAge: 40,
    questionnaire: "skipped",
  }),
).game;
assert(opened, "The ordinary opening must produce a game.");
const before = opened.world;
const jurisdiction = stateJurisdictionForKey(place.stateJurisdictionKey!);
assert(jurisdiction);
const proposition = Object.values(before.policyCatalog.propositions).find(
  (row) => row.stableKey === questionKey,
);
assert(proposition);
const drawnPlaceLaw = lawInForce(
  before,
  jurisdiction.id,
  proposition.id,
  before.currentDate,
);
assert.equal(drawnPlaceLaw?.answer, "yes");
const next = advanceWorld(before, 1);
const newEvents = next.history.events.slice(before.history.events.length);
const bars = newEvents.filter(
  (event) =>
    event.type === "election.state-legislative-candidacy-intent" &&
    event.tags.includes("barred:term-limit") &&
    event.lawEffectStamps?.length,
);
const exposures = (next.history.lawExposures ?? []).filter(
  (row) => row.channel === "election-rule",
);
assert(bars.length > 0, "This watched seed must exercise an actual legal bar.");
assert.equal(exposures.length, bars.length);
const causes = bars.map((event) => {
  const linked = exposures.filter((row) => row.sourceRecordId === event.id);
  assert.equal(linked.length, 1);
  const exposure = linked[0]!;
  assert(event.involvedEntityIds.includes(exposure.personId));
  assert(event.participants.some((row) => row.personId === exposure.personId));
  assert.equal(exposure.measureId, event.lawEffectStamps![0]!.governingLawKey);
  assert.equal(exposure.direction, "cost");
  assert.equal(exposure.amount, null);
  assert.equal(exposure.relation, "own");
  assert.equal(
    lawExposureSentence(next, exposure.personId, exposure),
    "The term-limit law prevented you from seeking another term.",
  );
  const person = next.people[exposure.personId]!;
  return {
    personId: person.id,
    name: `${person.givenName} ${person.familyName}`,
    eventId: event.id,
    eventDate: event.occurredAt,
    recordedAt: event.recordedAt,
    law: event.lawEffectStamps![0],
    savedReason: event.summary,
    exposureId: exposure.id,
    journalAccount: lawExposureSentence(next, person.id, exposure),
  };
});
console.log(
  JSON.stringify(
    {
      source,
      seed,
      place: {
        key: place.key,
        name: place.displayName,
        within: place.withinName,
      },
      drawnPlaceLaw,
      worldId: next.id,
      playerPersonId: opened.playerPersonId,
      from: before.currentDate,
      to: next.currentDate,
      people: next.personOrder.length,
      actualBarCount: bars.length,
      linkedExposureCount: exposures.length,
      causes,
      limits: [
        "This is one ordinary generated day, not an election-night scene or browser proof.",
        "Accounts belong to the named officeholders; the randomly generated player was not assumed to hold office.",
        "Full-world Save/Continue was not exercised; focused canonical fixtures test reload.",
        "Other LW-12 and LW-13 laws remain unfinished.",
      ],
    },
    null,
    2,
  ),
);
