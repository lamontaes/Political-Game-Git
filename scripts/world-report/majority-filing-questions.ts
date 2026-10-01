/** Retained-record counts; never forms principles or advances the clock. */
import { readFileSync, writeFileSync } from "node:fs";
import { SeededRng } from "../../src/simulation/rng";
import { US_STATE_USPS } from "../../src/simulation/nationwide-world/state-executive-candidacy-packs";
import { stateJurisdictionForKey } from "../../src/simulation/life-places";
import { legislativePackForJurisdiction } from "../../src/simulation/legislative-institutions";
import {
  publicPartyOf,
  seatedChamberForPack,
} from "../../src/simulation/governing/chamber-votes";
import { currentGoverningOffices } from "../../src/simulation/governing/state-governing";
import { agendaCaucus } from "../../src/simulation/governing/majority-agenda";
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
import type { World } from "../../src/simulation/types";

const args = process.argv.slice(2);
const option = (key: string, fallback: string) => {
  const at = args.indexOf(`--${key}`);
  return at < 0 ? fallback : args[at + 1]!;
};
const input = option(
  "save",
  "test-results/member-filing/after-a522ed5be.world.json",
);
const output = option("out", "/tmp/team1-majority-filing-questions.json");
const selectionSeed = option("seed", "team1-majority-questions-20261001");
const world = JSON.parse(readFileSync(input, "utf8")).world as World;
if (!world?.history)
  throw new Error("Expected the retained canonical save envelope.");
const initialSequence = world.history.nextSequence;
const offices = currentGoverningOffices(world);
const states = US_STATE_USPS.flatMap((place) => {
  const jurisdiction = stateJurisdictionForKey(`US-${place}`)!;
  const pack = legislativePackForJurisdiction(jurisdiction.id);
  if (!pack) return [];
  const chambers = pack.chambers.map((chamber) => {
    const members =
      seatedChamberForPack(
        world,
        pack.packId,
        chamber.chamberKey,
        chamber.name,
      )?.body.members.filter((member) => member.personId !== null) ?? [];
    const caucus = agendaCaucus(members);
    const party = caucus[0]?.partyKey ?? null;
    const majorityParty = caucus.length > members.length / 2 ? party : null;
    return { chamberKey: chamber.chamberKey, members, caucus, majorityParty };
  });
  const governor = offices.find(
    (office) => office.jurisdictionId === jurisdiction.id,
  );
  const governorParty = governor
    ? publicPartyOf(world, governor.holderPersonId)
    : null;
  const parties = [
    governorParty,
    ...chambers.map((chamber) => chamber.majorityParty),
  ];
  const classified = parties.every((party) => party === "democratic")
    ? "D-led"
    : parties.every((party) => party === "republican")
      ? "R-led"
      : parties.every(
            (party) => party === "democratic" || party === "republican",
          )
        ? "split"
        : null;
  return [
    {
      place,
      jurisdiction,
      pack,
      chambers,
      governor,
      governorParty,
      classified,
    },
  ];
});
const threshold = MEMBER_AGENDA_LEVEL_SETTINGS.state.filingThreshold;
const rows = ["D-led", "R-led", "split"].map((classification) => {
  const candidates = states.filter(
    (state) => state.classified === classification,
  );
  if (!candidates.length)
    return { classification, status: "NO SAVED MATCH", candidateCount: 0 };
  const state = new SeededRng(selectionSeed)
    .fork(classification)
    .pick(candidates);
  const questions = stateQuestions(world, state.jurisdiction.id);
  const open = questions.filter(
    (id) => !pendingBillOn(world, state.jurisdiction.id, id),
  );
  const details = open.map((propositionId) => {
    const law = lawInForce(world, state.jurisdiction.id, propositionId);
    const lawAnswer = statuteAnswer(law);
    const differs = state.chambers.flatMap((chamber) =>
      chamber.caucus.flatMap((member) => {
        const leaning = principledLeaning(
          world,
          member.personId!,
          propositionId,
        );
        // Zero is no saved directional view. The existing bill-direction
        // predicate supplies the comparison; numeric term changes are not inferred.
        if (
          leaning.score === 0 ||
          positionBillAnswer(leaning.score, lawAnswer) === null
        )
          return [];
        return [
          {
            chamberKey: chamber.chamberKey,
            personId: member.personId!,
            score: leaning.score,
            principleRecordIds: leaning.recordIds,
            clearsThreshold: Math.abs(leaning.score) >= threshold,
          },
        ];
      }),
    );
    const ordered = [...differs].sort(
      (left, right) => Math.abs(right.score) - Math.abs(left.score),
    );
    return {
      propositionId,
      questionKey: world.policyCatalog.propositions[propositionId]!.stableKey,
      lawAnswer,
      lawMeasureId: law?.measureId ?? null,
      differingMemberQuestionPairs: differs.length,
      differingPairsClearingThreshold: differs.filter(
        (member) => member.clearsThreshold,
      ).length,
      largestAbsoluteDifferingScore: ordered[0]
        ? Math.abs(ordered[0].score)
        : null,
      strongestRecordedExample: ordered[0] ?? null,
    };
  });
  return {
    classification,
    status: "COUNTED",
    candidateCount: candidates.length,
    place: state.place,
    jurisdictionId: state.jurisdiction.id,
    packId: state.pack.packId,
    governor: {
      personId: state.governor?.holderPersonId ?? null,
      party: state.governorParty,
    },
    chambers: state.chambers.map((chamber) => ({
      chamberKey: chamber.chamberKey,
      seatedMembers: chamber.members.length,
      majorityParty: chamber.majorityParty,
      caucusMembers: chamber.caucus.length,
    })),
    authorityQuestions: questions.length,
    openQuestions: open.length,
    constitutionClosedOpenQuestions: details.filter(
      (row) => row.lawAnswer === "closed",
    ).length,
    openQuestionsWithMajorityViewDifferent: details.filter(
      (row) => row.differingMemberQuestionPairs > 0,
    ).length,
    openQuestionsWithMajorityDifferenceClearingThreshold: details.filter(
      (row) => row.differingPairsClearingThreshold > 0,
    ).length,
    differingMemberQuestionPairs: details.reduce(
      (sum, row) => sum + row.differingMemberQuestionPairs,
      0,
    ),
    differingPairsClearingThreshold: details.reduce(
      (sum, row) => sum + row.differingPairsClearingThreshold,
      0,
    ),
    questions: details,
  };
});
if (world.history.nextSequence !== initialSequence)
  throw new Error("The retained-record reader wrote history.");
const receipt = {
  sourceHead: option("head", "unrecorded"),
  runtimeSourceHead: "a522ed5be56ab97afedc24d8d73e847a7586852a",
  observerSeed: "team1-member-filing-20261001",
  selectionSeed,
  snapshotDate: world.currentDate,
  filingThreshold: threshold,
  initialSequence,
  finalSequence: world.history.nextSequence,
  limits:
    "Terminal retained records, not historical intake reconstruction. D/R-led requires the saved governor and strict seated majorities in all chambers; split requires known D/R control with disagreement. Majority-member count reuses the filer's actual agendaCaucus. Question counts are unique propositions; pair counts retain chamber/person/proposition. Openness reuses pendingBillOn and authority uses stateQuestions. Directional difference reuses positionBillAnswer; zero has no directional view and constitution-closed questions cannot change by statute. No numeric requested-term difference, compilation, cooldown, origination or eventual filing is inferred. No principle producer, clock, threshold change or new year run.",
  rows,
};
writeFileSync(output, JSON.stringify(receipt, null, 2) + "\n");
console.log(
  JSON.stringify(
    rows.map(({ questions: _questions, ...row }) => row),
    null,
    2,
  ),
);
