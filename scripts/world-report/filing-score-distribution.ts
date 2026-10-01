/** Read saved member principles once; do not advance time or manufacture records. */
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { deserializeWorld } from "../../src/simulation/serialization";
import { CHIEF_EXECUTIVE_JURISDICTIONS } from "../../src/simulation/nationwide-world/state-executive-candidacy-packs";
import { stateJurisdictionForKey } from "../../src/simulation/life-places";
import { legislativePackForJurisdiction } from "../../src/simulation/legislative-institutions";
import { seatedChamberForPack } from "../../src/simulation/governing/chamber-votes";
import { principledLeaning } from "../../src/simulation/governing/officeholder-principles";
import { mayAnswerQuestion } from "../../src/simulation/governing/question-authority";
import { US_CONGRESS_RULE_PACK } from "../../src/simulation/congress-rule-pack";
import { NATIONAL_ELECTION_JURISDICTION } from "../../src/simulation/national-election-geography";

const args = process.argv.slice(2);
function option(key: string): string {
  const at = args.indexOf(`--${key}`);
  if (at < 0 || !args[at + 1]) throw new Error(`Missing --${key}`);
  return args[at + 1]!;
}
const save = option("save");
const output = option("out");
const input = readFileSync(save, "utf8");
const world = deserializeWorld(input);
// CTO 3:54/4:29/8:22 explicitly approves the median of these sourced observations.
const target = (5.2 + 8.8) / 2;
const bodies = [
  ...CHIEF_EXECUTIVE_JURISDICTIONS.map((key) => {
    const jurisdiction = stateJurisdictionForKey(`US-${key}`)!;
    return {
      key,
      jurisdictionId: jurisdiction.id,
      pack: legislativePackForJurisdiction(jurisdiction.id),
    };
  }),
  {
    key: "US",
    jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
    pack: US_CONGRESS_RULE_PACK,
  },
];
const rows = bodies.map((body) => {
  const members =
    body.pack?.chambers.flatMap(
      (chamber) =>
        seatedChamberForPack(
          world,
          body.pack!.packId,
          chamber.chamberKey,
          chamber.name,
        )?.body.members.flatMap((member) =>
          member.personId ? [member.personId] : [],
        ) ?? [],
    ) ?? [];
  const questions = world.policyCatalog.propositionOrder.filter(
    (id) =>
      mayAnswerQuestion(world, body.jurisdictionId, id) &&
      (body.key !== "US" ||
        world.policyCatalog.issues[
          world.policyCatalog.propositions[id]!.issueId
        ]!.stableKey.startsWith("us-federal:")),
  );
  const scores = members.flatMap((personId) =>
    questions.map((id) =>
      Math.abs(principledLeaning(world, personId, id).score),
    ),
  );
  return {
    place: body.key,
    packId: body.pack?.packId ?? null,
    seatedMembers: members.length,
    questionCount: questions.length,
    scores,
  };
});
const seatedMembers = rows.reduce((sum, row) => sum + row.seatedMembers, 0);
if (!seatedMembers)
  throw new Error("The retained save contains no seated members.");
const frequencies = new Map<number, number>();
for (const row of rows)
  for (const score of row.scores)
    if (score > 0) frequencies.set(score, (frequencies.get(score) ?? 0) + 1);
const distribution = [...frequencies].sort(([left], [right]) => right - left);
const desired = target * seatedMembers;
let eligiblePairs = 0;
let selected: {
  threshold: number;
  eligiblePairs: number;
  error: number;
} | null = null;
for (const [threshold, count] of distribution) {
  eligiblePairs += count;
  const error = Math.abs(eligiblePairs - desired);
  if (!selected || error < selected.error)
    selected = { threshold, eligiblePairs, error };
}
if (!selected)
  throw new Error(
    "No positive saved principle scores; no threshold can be calibrated.",
  );
writeFileSync(
  output,
  JSON.stringify(
    {
      sourceHead: option("head"),
      save,
      saveSha256: createHash("sha256").update(input).digest("hex"),
      seed: world.seed,
      asOf: world.currentDate,
      method:
        "Closest inclusive empirical positive-score cutoff to seven member-question opportunities per seated member. Higher cutoff wins an equal-error tie. Opportunity counts are NOT filed bills; actual pending-question, best-one/member/intake, current-law, compiler and session guards remain outside this static measurement.",
      targetOpportunitiesPerMember: target,
      seatedMembers,
      selected,
      actualFilingCounts: "NOT RUN; no time advanced or filer invoked",
      distribution: distribution.map(([absoluteScore, pairCount]) => ({
        absoluteScore,
        pairCount,
      })),
      rows: rows.map(({ scores, ...row }) => ({
        ...row,
        measuredPairs: scores.length,
        positivePairs: scores.filter((score) => score > 0).length,
        pairsClearingOldThreshold: scores.filter((score) => score >= 3).length,
        pairsClearingDerivedThreshold: scores.filter(
          (score) => score >= selected.threshold,
        ).length,
        opportunitiesPerMember: row.seatedMembers
          ? scores.filter((score) => score >= selected.threshold).length /
            row.seatedMembers
          : null,
        pendingQuestionCapacityUpperBoundPerIntake: row.seatedMembers
          ? row.questionCount
          : null,
      })),
    },
    null,
    2,
  ) + "\n",
);
console.log(
  JSON.stringify({
    asOf: world.currentDate,
    bodies: rows.filter((row) => row.seatedMembers > 0).length,
    seatedMembers,
    target,
    selected,
    output,
  }),
);
