/** Read saved filing predicates without forming principles or filing bills. */
import { readFileSync, writeFileSync } from "node:fs";
import { stateJurisdictionForKey } from "../../src/simulation/life-places";
import { NATIONAL_ELECTION_JURISDICTION } from "../../src/simulation/national-election-geography";
import { legislativePackForJurisdiction } from "../../src/simulation/legislative-institutions";
import { seatedChamberForPack } from "../../src/simulation/governing/chamber-votes";
import {
  pendingBillOn,
  positionBillAnswer,
  stateQuestions,
} from "../../src/simulation/governing/member-agenda";
import { MEMBER_AGENDA_LEVEL_SETTINGS } from "../../src/simulation/governing/member-agenda-settings";
import { principledLeaning } from "../../src/simulation/governing/officeholder-principles";
import {
  lawInForce,
  statuteAnswer,
} from "../../src/simulation/governing/law-in-force";
import { personName } from "../../src/simulation/people";
import type { World } from "../../src/simulation/types";

const args = process.argv.slice(2);
const option = (key: string, fallback: string) => {
  const at = args.indexOf(`--${key}`);
  return at < 0 ? fallback : args[at + 1]!;
};
const world = JSON.parse(
  readFileSync(
    option("save", "test-results/member-filing/after-a522ed5be.world.json"),
    "utf8",
  ),
).world as World;
if (!world?.history)
  throw new Error("Expected the retained canonical save envelope.");
const initialSequence = world.history.nextSequence;
const playerId =
  world.control.kind === "person" ? world.control.personId : null;
const bodies = [
  {
    label: "New Jersey",
    jurisdiction: stateJurisdictionForKey("US-NJ")!,
    settings: MEMBER_AGENDA_LEVEL_SETTINGS.state,
  },
  {
    label: "Congress",
    jurisdiction: NATIONAL_ELECTION_JURISDICTION,
    settings: MEMBER_AGENDA_LEVEL_SETTINGS.federal,
  },
].map(({ label, jurisdiction, settings }) => {
  const pack = legislativePackForJurisdiction(jurisdiction.id)!;
  const authority = stateQuestions(world, jurisdiction.id);
  const questions = authority.filter(
    (id) =>
      settings.issuePrefix === null ||
      world.policyCatalog.issues[
        world.policyCatalog.propositions[id]!.issueId
      ]!.stableKey.startsWith(settings.issuePrefix),
  );
  const pending = new Map(
    questions.map((id) => [id, pendingBillOn(world, jurisdiction.id, id)]),
  );
  const chambers = pack.chambers.map((chamber) => {
    const members =
      seatedChamberForPack(world, pack.packId, chamber.chamberKey, chamber.name)
        ?.body.members ?? [];
    const sponsors = members.filter(
      (member) => member.personId !== null && member.personId !== playerId,
    );
    const pairs = sponsors.flatMap((member) =>
      questions.map((propositionId) => {
        const leaning = principledLeaning(
          world,
          member.personId!,
          propositionId,
        );
        const law = lawInForce(world, jurisdiction.id, propositionId);
        const operativeAnswer = statuteAnswer(law);
        const plainPositionAnswer =
          leaning.score === 0
            ? null
            : positionBillAnswer(leaning.score, operativeAnswer);
        return {
          personId: member.personId!,
          name: personName(world.people[member.personId!]!),
          propositionId,
          questionKey:
            world.policyCatalog.propositions[propositionId]!.stableKey,
          score: leaning.score,
          principleRecordIds: leaning.recordIds,
          operativeAnswer,
          lawMeasureId: law?.measureId ?? null,
          pending: pending.get(propositionId)!,
          clearsThreshold: Math.abs(leaning.score) >= settings.filingThreshold,
          plainPositionAnswer,
          firstObservedPredicateFailure: pending.get(propositionId)
            ? "pending-question"
            : Math.abs(leaning.score) < settings.filingThreshold
              ? "filing-threshold"
              : plainPositionAnswer === null
                ? "plain-position-direction; numeric-request path NOT OBSERVED, so actual rejection is not inferred"
                : null,
        };
      }),
    );
    const openPairs = pairs.filter((pair) => !pair.pending);
    const strongPairs = openPairs.filter((pair) => pair.clearsThreshold);
    const directionPairs = strongPairs.filter(
      (pair) => pair.plainPositionAnswer !== null,
    );
    const strongest =
      [...openPairs].sort(
        (left, right) => Math.abs(right.score) - Math.abs(left.score),
      )[0] ?? null;
    return {
      chamberKey: chamber.chamberKey,
      introductionAllowed: chamber.introductionAllowed,
      seatedNonPlayerSponsors: sponsors.length,
      memberQuestionPairs: pairs.length,
      pendingQuestionPairExclusions: pairs.length - openPairs.length,
      openMemberQuestionPairs: openPairs.length,
      signedScoreRange: openPairs.length
        ? [
            Math.min(...openPairs.map((pair) => pair.score)),
            Math.max(...openPairs.map((pair) => pair.score)),
          ]
        : null,
      maximumAbsoluteScore: strongest ? Math.abs(strongest.score) : null,
      zeroScorePairs: openPairs.filter((pair) => pair.score === 0).length,
      pairsClearingThreshold: strongPairs.length,
      plainPositionChangePairsClearingThreshold: directionPairs.length,
      questionsClearingThreshold: new Set(
        strongPairs.map((pair) => pair.propositionId),
      ).size,
      plainPositionChangeQuestionsClearingThreshold: new Set(
        directionPairs.map((pair) => pair.propositionId),
      ).size,
      clearingQuestionEvidence: [
        ...new Set(strongPairs.map((pair) => pair.propositionId)),
      ].map((propositionId) => {
        const supporting = strongPairs.filter(
          (pair) => pair.propositionId === propositionId,
        );
        const example = [...supporting].sort(
          (left, right) => Math.abs(right.score) - Math.abs(left.score),
        )[0]!;
        return {
          questionKey: example.questionKey,
          pairsClearingThreshold: supporting.length,
          strongestRecordedExample: example,
        };
      }),
      strongestRecordedExample: strongest,
      laterCooldownOriginationCompilationSelection:
        strongPairs.length === 0
          ? "NOT REACHED by these terminal saved scores"
          : "NOT OBSERVED; no second proposal evaluator or filer invoked",
      acceptedProposals: "NOT OBSERVED; this read does not invoke the filer",
    };
  });
  return {
    label,
    jurisdictionId: jurisdiction.id,
    packId: pack.packId,
    authorityQuestionCount: authority.length,
    postIssuePrefixQuestionCount: questions.length,
    issuePrefix: settings.issuePrefix,
    pendingQuestionExclusions: [...pending.values()].filter(Boolean).length,
    filingThreshold: settings.filingThreshold,
    individualAgenda: settings.individualAgenda,
    chambers,
  };
});
if (world.history.nextSequence !== initialSequence)
  throw new Error("The retained-record reader wrote history.");
const receipt = {
  sourceHead: option("head", "unrecorded"),
  runtimeSourceHead: "a522ed5be56ab97afedc24d8d73e847a7586852a",
  observerSeed: "team1-member-filing-20261001",
  snapshotDate: world.currentDate,
  initialSequence,
  finalSequence: world.history.nextSequence,
  limits:
    "Terminal snapshot, not historical intake reconstruction. No historical intake snapshot is retained. No actor/principle producer, filer, time advance, score/threshold change or new year. Authority, prefix, pending, score and plain-position direction use actual existing predicates/settings. Later numeric requests, cooldown, origination, selection and accepted proposals are not inferred. These records cannot establish which historical branch rejected an intake.",
  bodies,
};
writeFileSync(
  option("out", "/tmp/team1-nj-congress-filing-gates.json"),
  JSON.stringify(receipt, null, 2) + "\n",
);
console.log(JSON.stringify(receipt, null, 2));
