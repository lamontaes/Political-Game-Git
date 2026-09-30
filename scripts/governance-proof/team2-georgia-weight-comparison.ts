/** Bounded paired decision replay. Does not cast ballots or claim enactments. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { openWatchedWorld } from "../dev-lab/world-aging";
import { advanceObservedWorld } from "../../src/presentation/observer-world";
import {
  searchLifePlaces,
  stateJurisdictionForKey,
} from "../../src/simulation/life-places";
import { legislativePackForJurisdiction } from "../../src/simulation/legislative-institutions";
import { introduceMeasure } from "../../src/simulation/legislation";
import { personName } from "../../src/simulation/people";
import {
  decideChamberVote,
  seatedChamberForPack,
} from "../../src/simulation/governing/chamber-votes";
import {
  ensureOfficeholderPrinciples,
  principledLeaning,
} from "../../src/simulation/governing/officeholder-principles";
import { questionAuthority } from "../../src/simulation/governing/question-authority";
import type { World } from "../../src/simulation/types";

const source = execFileSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8",
}).trim();
const productionSource = "59e59903ac0fe9df5497010b424bedca9bf22a26";
const seed = "team2-georgia-weight-comparison-20260930";
const place = searchLifePlaces("", 1, {
  stateJurisdictionKey: "US-GA",
  scope: "locality",
})[0]!;
const out = process.argv[2] ?? "test-results/team2-georgia/comparison.json";
mkdirSync(dirname(out), { recursive: true });
const checkpoint = (activity: string, world?: World) => {
  const row = {
    source,
    seed,
    place: place.key,
    activity,
    date: world?.currentDate ?? null,
  };
  writeFileSync(`${out}.checkpoint.json`, JSON.stringify(row, null, 2));
  console.log(JSON.stringify(row));
};
checkpoint("opening");
let world = openWatchedWorld(seed, place.key).world;
const jurisdiction = stateJurisdictionForKey("US-GA")!;
const pack = legislativePackForJurisdiction(jurisdiction.id)!;
const chamber = seatedChamberForPack(
  world,
  pack.packId,
  "house",
  "Georgia House",
)!;
assert(chamber && chamber.body.members.length > 0);
checkpoint("advancing seven ordinary days to the session opening", world);
world = advanceObservedWorld(world, 7);
const generated = (world.history.legislativeMeasures ?? []).filter(
  (m) =>
    m.jurisdictionId === jurisdiction.id &&
    m.originChamberKey === "house" &&
    (m.propositionAnswers?.length ?? 0) > 0,
);
const coverage = world.policyCatalog.propositionOrder
  .map((id) => world.policyCatalog.propositions[id]!)
  .filter((p) => p.principles?.some((b) => b.weight !== undefined));
const weightedState = coverage.filter(
  (p) => questionAuthority(world, jurisdiction.id, p.id).may === "yes",
);
// No authored law positions or person convictions are added. If the bounded
// clock has no bill for a weighted question, an explicitly labeled probe puts
// that existing catalog question to the existing chamber, without passage.
const covered = new Set(
  generated.flatMap((m) =>
    (m.propositionAnswers ?? []).map((a) => a.propositionId),
  ),
);
const probeIds: string[] = [];
for (const [i, proposition] of weightedState
  .filter((p) => !covered.has(p.id))
  .entries()) {
  world = introduceMeasure(world, {
    stableKey: `team2:authored-weight-probe:${proposition.stableKey}`,
    jurisdictionId: jurisdiction.id,
    rulePackId: pack.packId,
    designation: `DEV PROBE ${i + 1}`,
    shortTitle: proposition.name,
    summary:
      "Authored comparison probe; not a watched sponsor filing or enacted law.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey: "house",
    sponsorPersonId: null,
    propositionIds: [proposition.id],
    propositionAnswers: [{ propositionId: proposition.id, answer: "yes" }],
  });
  probeIds.push(world.history.legislativeMeasures!.at(-1)!.id);
}
world = ensureOfficeholderPrinciples(
  world,
  chamber.body.members.flatMap((m) => (m.personId ? [m.personId] : [])),
);
const unweighted: World = {
  ...world,
  policyCatalog: {
    ...world.policyCatalog,
    propositions: Object.fromEntries(
      Object.entries(world.policyCatalog.propositions).map(([id, p]) => [
        id,
        {
          ...p,
          ...(p.principles
            ? { principles: p.principles.map((b) => ({ ...b, weight: 1 })) }
            : {}),
        },
      ]),
    ),
  },
};
assert.equal(world.history, unweighted.history);
assert.equal(world.people, unweighted.people);
assert.equal(world.currentDate, unweighted.currentDate);
const hash = () =>
  createHash("sha256").update(JSON.stringify(world)).digest("hex");
const before = hash();
const measures = world.history.legislativeMeasures!.filter(
  (m) => generated.some((g) => g.id === m.id) || probeIds.includes(m.id),
);
checkpoint(
  `comparing ${measures.length} bills across ${chamber.body.members.length} unchanged members`,
  world,
);
const rows = measures.map((measure) => {
  const input = {
    stableKey: `team2:paired:${measure.id}`,
    members: chamber.body.members,
    question: {
      questionLabel: measure.shortTitle,
      question: {
        measureId: measure.id,
        purpose: "floor-stage" as const,
        forumKey: "house",
        floorStageKey: null,
        amendmentStableKey: null,
        provisionKey: null,
      },
    },
  };
  const oldVotes = decideChamberVote(unweighted, input);
  const newVotes = decideChamberVote(world, input);
  assert.equal(oldVotes.length, newVotes.length);
  const changed = newVotes.flatMap((vote, index) => {
    const old = oldVotes[index]!;
    assert.equal(old.memberKey, vote.memberKey);
    assert.equal(old.personId, vote.personId);
    const member = chamber.body.members.find(
      (m) => m.memberKey === vote.memberKey,
    )!;
    return [
      {
        personId: vote.personId,
        name: vote.personId
          ? personName(world.people[vote.personId]!)
          : member.name,
        memberKey: vote.memberKey,
        unweighted: old,
        weighted: vote,
        leanings: (measure.propositionAnswers ?? []).map((a) => ({
          questionKey:
            world.policyCatalog.propositions[a.propositionId]!.stableKey,
          answer: a.answer,
          unweighted: principledLeaning(
            unweighted,
            vote.personId!,
            a.propositionId,
          ),
          weighted: principledLeaning(world, vote.personId!, a.propositionId),
        })),
      },
    ];
  });
  const dispositionChanges = changed.filter(
    (c) => c.unweighted.disposition !== c.weighted.disposition,
  );
  return {
    measureId: measure.id,
    title: measure.shortTitle,
    kind: probeIds.includes(measure.id)
      ? "authored-comparison-probe"
      : "watched-generated-bill",
    answers: measure.propositionAnswers,
    votes: newVotes.length,
    changed: dispositionChanges.length,
    changedLeaningScores: changed.filter((c) =>
      c.leanings.some((l) => l.unweighted.score !== l.weighted.score),
    ).length,
    directionFlips: dispositionChanges.filter(
      (c) =>
        (c.unweighted.disposition === "yea" &&
          c.weighted.disposition === "nay") ||
        (c.unweighted.disposition === "nay" &&
          c.weighted.disposition === "yea"),
    ).length,
    changes: dispositionChanges,
    memberComparisons: changed,
    unweightedVotes: oldVotes,
    weightedVotes: newVotes,
  };
});
assert.equal(hash(), before, "Decision readers must preserve the paired world");
const result = {
  source,
  productionSource,
  seed,
  placeKey: place.key,
  placeName: place.displayName,
  date: world.currentDate,
  worldId: world.id,
  worldHash: before,
  sameHistoryPeopleBillsDates: true,
  worldUnchanged: true,
  catalogWeightedQuestions: coverage.map((p) => ({
    key: p.stableKey,
    arguments: p.principles,
  })),
  stateWeightedQuestionKeys: weightedState.map((p) => p.stableKey),
  members: chamber.body.members.length,
  generatedBills: generated.length,
  authoredProbes: probeIds.length,
  billMemberDecisions: rows.reduce((n, r) => n + r.votes, 0),
  changedDispositions: rows.reduce((n, r) => n + r.changed, 0),
  yeaNayDirectionFlips: rows.reduce((n, r) => n + r.directionFlips, 0),
  changedLeaningScores: rows.reduce((n, r) => n + r.changedLeaningScores, 0),
  rows,
  limitations: [
    "Paired decision replay, not recorded floor votes or passage.",
    "Probe bills are explicitly authored and have no sponsor.",
    "Only catalog weights actually present at the pinned merged source are used.",
    "No nationwide audit or money-effect proof is run here.",
  ],
};
writeFileSync(out, JSON.stringify(result, null, 2));
checkpoint("complete", world);
console.log(
  JSON.stringify({
    source,
    out,
    members: result.members,
    generatedBills: result.generatedBills,
    authoredProbes: result.authoredProbes,
    billMemberDecisions: result.billMemberDecisions,
    changedDispositions: result.changedDispositions,
    directionFlips: result.yeaNayDirectionFlips,
    changedLeaningScores: result.changedLeaningScores,
    example:
      rows
        .flatMap((r) => r.memberComparisons)
        .find((c) =>
          c.leanings.some((l) => l.unweighted.score !== l.weighted.score),
        ) ?? null,
  }),
);
