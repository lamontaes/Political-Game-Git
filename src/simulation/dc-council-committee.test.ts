import { describe, expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { createScenarioWorld } from "./demo";
import { requireLifePlace } from "./life-places";
import { ensureJurisdiction } from "./national-election-geography";
import { CHIEF_EXECUTIVE_JURISDICTIONS } from "./nationwide-world/state-executive-candidacy-packs";
import {
  ensureDistrictOfColumbiaCouncilOpening,
  DC_GOVERNMENT_KEY,
} from "./nationwide-world/district-of-columbia-council-opening";
import {
  municipalGovernmentByKey,
  municipalRulePackFor,
} from "./municipal-government";
import {
  municipalGovernmentJurisdictionId,
  municipalSeats,
} from "./municipal-public-work";
import {
  introduceMeasure,
  measureActions,
  measureEnactment,
  measurePosition,
} from "./legislation";
import { nextMeasureNumbering } from "./measure-numbering";
import { chamberByKey } from "./legislature-rules";
import {
  dcCouncilSittingHandler,
  scheduleDcCouncilSitting,
} from "./dc-council-sittings";
import { SeededRng } from "./rng";
import { mayAnswerQuestion } from "./governing/question-authority";
import { advanceWorld } from "./world";
import {
  actAmendsCriminalCode,
  congressionalReviewEffectiveOn,
  resolveLegislativeEffectiveDate,
} from "./legislative-effective-date";
import { legislativeRulePackForWorld } from "./legislative-procedure-world";
import { deserializeWorld, serializeWorld } from "./serialization";
import { personName } from "./people";

const seed = "au2-dup-03-dc-committee-20261008";
// The controlled person lives in a seed-drawn place among all 56; the Council
// sits on its own.
const home =
  CHIEF_EXECUTIVE_JURISDICTIONS[
    new SeededRng(seed).integer(0, CHIEF_EXECUTIVE_JURISDICTIONS.length)
  ]!;

function councilWithAct() {
  const small = smallWorld({ place: home, people: 4, seed });
  let world = small.world;
  // The real District scenario supplies only its canonical jurisdictions.
  const dc = createScenarioWorld(
    `${seed}:dc-context`,
    requireLifePlace("1150000").context,
    { peopleCount: 4 },
  );
  for (const id of dc.jurisdictionOrder)
    world = ensureJurisdiction(world, dc.jurisdictions[id]!);
  world = ensureDistrictOfColumbiaCouncilOpening(world, [small.personId]);
  const rules = municipalRulePackFor(
    municipalGovernmentByKey(DC_GOVERNMENT_KEY)!,
  );
  if (!rules.ok) throw new Error("Expected the District's rule pack.");
  const seats = municipalSeats(world, DC_GOVERNMENT_KEY).filter(
    (seat) => seat.role === "member" || seat.role === "presiding-member",
  );
  const jurisdictionId = municipalGovernmentJurisdictionId(
    world,
    DC_GOVERNMENT_KEY,
  )!;
  // A question the District's own law may answer, so its members weigh it
  // from their own principles.
  const proposition = Object.values(world.policyCatalog.propositions).find(
    (row) => mayAnswerQuestion(world, jurisdictionId, row.id),
  )!;
  world = introduceMeasure(world, {
    stableKey: `${seed}:act`,
    jurisdictionId,
    rulePackId: rules.pack.packId,
    ...nextMeasureNumbering(world, {
      jurisdictionId,
      originChamber: chamberByKey(rules.pack, "council"),
      rulePackId: rules.pack.packId,
    }),
    shortTitle: "Council committee route",
    summary: "A member's act for the Council's own sittings.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey: "council",
    sponsorPersonId: seats[0]!.personId,
    propositionIds: [proposition.id],
    propositionAnswers: [{ propositionId: proposition.id, answer: "yes" }],
  });
  const measure = world.history.legislativeMeasures!.at(-1)!;
  return { world, measure, seats, pack: rules.pack };
}

describe(`the D.C. Council's acts go through committee (seed ${seed}, home ${home})`, () => {
  it("carries its standing committee in the District's own rule pack", () => {
    const { pack } = councilWithAct();
    const chamber = chamberByKey(pack, "council");
    expect(chamber.committees).toHaveLength(1);
    expect(chamber.committees[0]!.reportThreshold.source.verification).toBe(
      "game-profile",
    );
  });

  it("refers, hears and reports an act before its first reading, on the shared bill driver", () => {
    const setup = councilWithAct();
    const { measure } = setup;
    // The sitting takes the act's first step: referral to the committee.
    let world = dcCouncilSittingHandler(setup.world).world;
    expect(measurePosition(world, measure.id).phase).toBe("in-committee");
    world = scheduleDcCouncilSitting(world);
    // The Council sits on its own clock; the hearing and every later step
    // come due as time passes.
    for (let week = 0; week < 40; week += 1) {
      world = advanceWorld(world, 7);
      if (measurePosition(world, measure.id).terminal) break;
    }
    const actions = measureActions(world, measure.id);
    const kinds = actions.map((row) => row.kind);
    const firstReading = kinds.indexOf("floor-stage-passed");
    expect(kinds.indexOf("referred")).toBeGreaterThanOrEqual(0);
    expect(kinds.indexOf("committee-hearing-held")).toBeGreaterThan(
      kinds.indexOf("referred"),
    );
    expect(kinds.indexOf("committee-reported")).toBeGreaterThan(
      kinds.indexOf("committee-hearing-held"),
    );
    expect(firstReading).toBeGreaterThan(kinds.indexOf("committee-reported"));
    // The committee's members decided their own ballots, each with a reason.
    const committeeVote = world.history.legislativeVotes!.find(
      (row) =>
        row.measureId === measure.id && row.purpose === "committee-report",
    )!;
    expect(committeeVote).toBeDefined();
    const seated = new Set(setup.seats.map((seat) => seat.personId));
    expect(committeeVote.dispositions.length).toBeGreaterThan(0);
    for (const row of committeeVote.dispositions) {
      expect(seated.has(row.personId!)).toBe(true);
      expect(row.reason).toBeTruthy();
    }
    // Two readings, 13 days intervening.
    const readings = actions.filter((row) => row.kind === "floor-stage-passed");
    expect(readings).toHaveLength(2);
    expect(readings[1]!.occurredAt > readings[0]!.occurredAt).toBe(true);
    // The act became law and takes effect when congressional review ends.
    expect(measurePosition(world, measure.id).phase).toBe("enacted");
    const enactment = measureEnactment(world, measure.id)!;
    const pack = legislativeRulePackForWorld(world, measure.rulePackId);
    const days = actAmendsCriminalCode(world, measure) ? 60 : 30;
    expect(enactment.effectiveAt).toBe(
      congressionalReviewEffectiveOn(enactment.resolvedAt, days),
    );
    expect(enactment.effectiveDateBasis).toBe("source-default");
    expect(
      resolveLegislativeEffectiveDate(pack, enactment.resolvedAt, {
        amendsCriminalCode: () => actAmendsCriminalCode(world, measure),
      }),
    ).toEqual({ kind: "source-default", effectiveAt: enactment.effectiveAt });
    // Continue keeps the act and its date exactly.
    const resumed = deserializeWorld(serializeWorld(world));
    expect(measureEnactment(resumed, measure.id)).toEqual(enactment);
    console.info(
      "[au2-dup-03-dc-committee]",
      JSON.stringify({
        seed,
        home,
        worldId: world.id,
        measureId: measure.id,
        designation: measure.designation,
        steps: actions.map((row) => `${row.occurredAt} ${row.kind}`),
        committee: committeeVote.dispositions.map((row) => ({
          member: personName(world.people[row.personId!]!),
          disposition: row.disposition,
          reason: row.reason,
        })),
        enactedOn: enactment.resolvedAt,
        effectiveOn: enactment.effectiveAt,
        reviewDays: days,
      }),
    );
  }, 300_000);
});
