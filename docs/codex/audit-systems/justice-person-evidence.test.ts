import assert from "node:assert/strict";
import type { AuditRow } from "../../../scripts/law-audit/audit";
import type {
  World,
  HistoricalEvent,
  EntityId,
  Person,
} from "../../../src/simulation/types";
import { enrichJusticePersonEvidence } from "./justice-person-evidence";

const eventId = "event_1111111111111111" as EntityId;
const personId = "person_1111111111111111" as EntityId;
const judgeId = "person_2222222222222222" as EntityId;
const question = "us-policy-positions:justice-public-safety.end-cash-bail";
const law = `starting-law:US-AL:${question}`;
function fixture() {
  const event = {
    id: eventId,
    type: "justice.held-before-trial",
    occurredAt: "2026-05-04",
    jurisdictionId: "jurisdiction_fixture",
    involvedEntityIds: [personId, judgeId],
    participants: [
      { personId, role: "focus:defendant" },
      { personId, role: "focus:defendant" },
      { personId: judgeId, role: "agency:decided" },
    ],
    lawEffectStamps: [
      {
        version: "law-effect-stamp/v1",
        governingLawKey: law,
        source: "in-force-at-start",
        effectKind: "justice.held-before-trial",
        questionKey: question,
        jurisdictionId: "jurisdiction_fixture",
        operativeAt: "2026-01-01",
        appliedAt: "2026-05-04",
        sourceRecordIds: [eventId],
      },
    ],
  } as unknown as HistoricalEvent;
  const world = {
    history: { events: [event] },
    people: {
      [personId]: { givenName: "Fixture", familyName: "Defendant" } as Person,
      [judgeId]: { givenName: "Fixture", familyName: "Judge" } as Person,
    },
  } as unknown as World;
  const row: AuditRow = {
    source: "starting",
    lawSource: "in-force-at-start",
    measureId: law,
    question,
    effect: "stamped:justice.held-before-trial",
    fired: true,
    enactmentId: null,
    designation: "Fixture starting law",
    title: "Fixture cash-bail question",
    jurisdiction: "Fixture jurisdiction",
    jurisdictionId: "jurisdiction_fixture",
    level: "state",
    answer: "no",
    startingAnswer: "no",
    comparison: "same as starting law",
    effectiveAt: "2026-01-01",
    reader: "events",
    reason: "fixture-saved-consequence",
    research: null,
    trace: null,
    evidence: [
      {
        record: `events:${eventId}`,
        touched: "original identity unavailable",
        before: null,
        after: { summary: "fixture" },
        detail: "original",
        jurisdictionId: "jurisdiction_fixture",
        appliedAt: "2026-05-04",
        sourceRecordIds: [eventId],
      },
    ],
  };
  return { world, row, event };
}
let checks = 0;
const f = fixture();
const before = JSON.stringify(f);
const enriched = enrichJusticePersonEvidence(f.world, [f.row]);
assert.deepEqual(enriched[0]!.evidence[0]!.touchedPersonIds, [personId]);
checks++;
assert.equal(enriched[0]!.evidence[0]!.identityExtraction?.status, "available");
checks++;
assert.equal(enriched[0]!.fired, true);
checks++;
assert.equal(JSON.stringify(f), before);
checks++;
assert.deepEqual(enrichJusticePersonEvidence(f.world, enriched), enriched);
checks++;
for (const [reason, mutate] of [
  [
    "exact-event-locator-unavailable",
    (x: ReturnType<typeof fixture>) => {
      x.row.evidence[0]!.record = "events:wrong";
    },
  ],
  [
    "saved-event-unavailable",
    (x: ReturnType<typeof fixture>) => {
      (x.world.history.events as HistoricalEvent[]).pop();
    },
  ],
  [
    "event-type-mismatch",
    (x: ReturnType<typeof fixture>) => {
      (x.event as any).type = "justice.sentenced";
    },
  ],
  [
    "event-date-mismatch",
    (x: ReturnType<typeof fixture>) => {
      x.row.evidence[0]!.appliedAt = "2026-05-05";
    },
  ],
  [
    "event-jurisdiction-mismatch",
    (x: ReturnType<typeof fixture>) => {
      x.row.evidence[0]!.jurisdictionId = "another";
    },
  ],
  [
    "row-law-source-mismatch",
    (x: ReturnType<typeof fixture>) => {
      x.row.lawSource = "enacted";
    },
  ],
  [
    "matching-saved-law-stamp-unavailable",
    (x: ReturnType<typeof fixture>) => {
      x.row.measureId = "another-law";
    },
  ],
  [
    "matching-saved-law-stamp-unavailable",
    (x: ReturnType<typeof fixture>) => {
      x.row.evidence[0]!.sourceRecordIds = [];
    },
  ],
  [
    "matching-saved-law-stamp-unavailable",
    (x: ReturnType<typeof fixture>) => {
      (x.event.lawEffectStamps![0] as any).source = "enacted";
    },
  ],
  [
    "matching-saved-law-stamp-unavailable",
    (x: ReturnType<typeof fixture>) => {
      (x.event.lawEffectStamps![0] as any).appliedAt = "2026-05-05";
    },
  ],
  [
    "matching-saved-law-stamp-unavailable",
    (x: ReturnType<typeof fixture>) => {
      (x.event.lawEffectStamps![0] as any).jurisdictionId = "another";
    },
  ],
  [
    "saved-defendant-person-unavailable",
    (x: ReturnType<typeof fixture>) => {
      delete (x.world.people as any)[personId];
    },
  ],
  [
    "defendant-role-unavailable",
    (x: ReturnType<typeof fixture>) => {
      (x.event as any).participants = [
        { personId: judgeId, role: "agency:decided" },
      ];
    },
  ],
] as const) {
  const x = fixture();
  mutate(x);
  const result = enrichJusticePersonEvidence(x.world, [x.row])[0]!.evidence[0]!;
  assert.equal(result.identityExtraction?.reason, reason);
  assert.equal(result.touchedPersonIds, undefined);
  assert.equal(result.touched, x.row.evidence[0]!.touched);
  checks++;
}
const other = fixture();
other.row.effect = "stamped:justice.sentenced";
assert.deepEqual(
  enrichJusticePersonEvidence(other.world, [other.row])[0]!.evidence,
  other.row.evidence,
);
checks++;
const released = fixture();
(released.event as any).type = "justice.released-before-trial";
released.row.effect = "stamped:justice.released-before-trial";
released.row.source = "enacted";
released.row.lawSource = "enacted";
released.row.measureId = "measure_fixture";
Object.assign(released.event.lawEffectStamps![0]!, {
  source: "enacted",
  governingLawKey: "measure_fixture",
  effectKind: "justice.released-before-trial",
});
assert.deepEqual(
  enrichJusticePersonEvidence(released.world, [released.row])[0]!.evidence[0]!
    .touchedPersonIds,
  [personId],
);
checks++;
const unstamped = fixture();
unstamped.row.effect = "justice.held-before-trial";
assert.deepEqual(
  enrichJusticePersonEvidence(unstamped.world, [unstamped.row])[0]!.evidence,
  unstamped.row.evidence,
);
checks++;
console.log(
  `${checks} pure record fixture checks passed; zero worlds or simulation days.`,
);
