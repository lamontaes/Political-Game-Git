import { describe, expect, it } from "vitest";

import { searchLifePlaces } from "../simulation";
import { stateJurisdictionForKey } from "../simulation/life-places";
import { measurePropositionAnswer } from "../simulation/issue-record";
import { US_STATE_USPS } from "../simulation/nationwide-world/state-executive-candidacy-packs";
import { fileMemberAgendaBill } from "../simulation/governing/member-agenda";
import {
  automaticLawMappingFor,
  compileAutomaticLawDraft,
  stateTransitAutomaticLawContext,
} from "../simulation/governing/automatic-legislation";
import { principledLeaning } from "../simulation/governing/officeholder-principles";
import { stateLegislators } from "../simulation/nationwide-world/state-legislature-opening";
import { legislativePackForJurisdiction } from "../simulation/legislative-institutions";
import type { World } from "../simulation";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { openOrdinaryLife, passOrdinaryDays } from "./ordinary-life";

/**
 * A state with no written bills gets bills from its own members.
 *
 * Before: Colorado's seated legislature filed nothing, because the only bills
 * a state sent were authored scenario measures, and the governor's office
 * recorded that no bill reached it. After: on the legislature's bill day a
 * seated member files a bill on the question their own principles press
 * hardest, answering it the way they lean, and it goes to the clock.
 */
describe("a member files a bill of their own", () => {
  const place = searchLifePlaces("", 1, {
    stateJurisdictionKey: "US-CO",
    scope: "locality",
  })[0]!;
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "member-agenda-US-CO",
      placeKey: place.key,
      startAge: 40,
      questionnaire: "skipped",
    }),
  ).game!;
  const colorado = stateJurisdictionForKey("US-CO")!.id;
  const pack = legislativePackForJurisdiction(colorado)!;
  let world: World = openOrdinaryLife(game.world, game.playerPersonId);
  const agendaBills = (w: World) =>
    (w.history.legislativeMeasures ?? []).filter(
      (measure) =>
        measure.jurisdictionId === colorado &&
        measure.stableKey.endsWith(":agenda"),
    );
  for (let day = 0; day < 120 && agendaBills(world).length === 0; day += 1)
    world = passOrdinaryDays(world, 1);

  it("files a bill on the bill day, carried by a seated member", () => {
    const [bill] = agendaBills(world);
    expect(bill).toBeDefined();
    const seated = new Set(
      stateLegislators(world, `${pack.packId}:candidacy`).map(
        (member) => member.personId,
      ),
    );
    expect(seated.has(bill!.sponsorPersonId!)).toBe(true);
    expect(bill!.sponsorPersonId).not.toBe(game.playerPersonId);
  });

  it("answers the question the way the sponsor's principles lean", () => {
    const bill = agendaBills(world)[0]!;
    expect(bill.propositionAnswers).toHaveLength(1);
    const { propositionId } = bill.propositionAnswers![0]!;
    const answer = measurePropositionAnswer(bill, propositionId);
    const { score } = principledLeaning(
      world,
      bill.sponsorPersonId!,
      propositionId,
    );
    expect(Math.abs(score)).toBeGreaterThanOrEqual(3);
    // Nothing is law on the question yet, so only support files a bill.
    expect(answer).toBe("yes");
    expect(score).toBeGreaterThan(0);
    expect(bill.shortTitle).toBe("Additional Service Hours");
  });

  it("records the compiled appropriation and its saved political cause", () => {
    const bill = agendaBills(world)[0]!;
    const leaning = principledLeaning(
      world,
      bill.sponsorPersonId!,
      bill.propositionAnswers![0]!.propositionId,
    );
    const provision = (world.history.legislativeProvisions ?? []).find(
      (record) =>
        record.measureId === bill.id &&
        record.provisionKey === "amount-provided",
    );
    expect(provision?.operativeEffect).toEqual({
      kind: "public-program-appropriation",
    });
    expect(provision?.fiscalExposureMinorUnits).toBeGreaterThan(0);

    const lineage = (world.history.legislativeDraftLineages ?? []).find(
      (record) => record.measureId === bill.id,
    );
    expect(lineage?.familyKey).toBe("appropriations");
    expect(lineage?.variantKey).toBe("transit-staged-service-v2");
    expect(lineage?.provenanceNote).toContain(leaning.recordIds.join(", "));
    expect(lineage?.provenanceNote).toContain(`score of ${leaning.score}`);
  });

  it("compiles the typed state transit bill for all 50 saved state profiles", () => {
    const proposition = Object.values(world.policyCatalog.propositions).find(
      (entry) =>
        entry.stableKey ===
        "us-policy-positions:transportation-infrastructure.additional-rural-transit-service-hours",
    );
    expect(proposition).toBeDefined();
    expect(
      automaticLawMappingFor(proposition!.stableKey, "yes", "state")
        ?.variantKey,
    ).toBe("transit-staged-service-v2");
    expect(
      automaticLawMappingFor(proposition!.stableKey, "no", "state"),
    ).toBeNull();

    const territoryIds = ["US-PR", "US-DC"]
      .map((key) => stateJurisdictionForKey(key)?.id)
      .filter((id): id is string => id !== undefined);
    for (const jurisdictionId of territoryIds)
      expect(stateTransitAutomaticLawContext(world, jurisdictionId)).toBeNull();

    for (const usps of US_STATE_USPS) {
      const jurisdictionId = stateJurisdictionForKey(`US-${usps}`)!.id;
      const context = stateTransitAutomaticLawContext(world, jurisdictionId);
      expect(context, `${usps} state profile`).not.toBeNull();
      const draft = compileAutomaticLawDraft({
        world,
        jurisdictionId,
        propositionId: proposition!.id,
        answer: "yes",
        designation: `${usps} State Transit Bill`,
        intakeKey: `state-transit-profile-coverage:${usps}`,
        context: context!,
      });
      expect(draft, `${usps} state draft`).not.toBeNull();
      expect(draft!.variantKey).toBe("transit-staged-service-v2");
      expect(draft!.jurisdictionId).toBe(jurisdictionId);
      expect(draft!.rulePackId).toBe(context!.rulePackId);
      expect(
        draft!.clauses.find(
          (clause) => clause.provisionKey === "amount-provided",
        )?.operativeEffect,
      ).toEqual({ kind: "public-program-appropriation" });
    }
  });

  it("files once per bill day", () => {
    const bill = agendaBills(world)[0]!;
    const intakeKey = bill.stableKey
      .replace(/^legislative-intake\/v1:/, "")
      .replace(/:agenda$/, "");
    const again = fileMemberAgendaBill(world, {
      jurisdictionId: colorado,
      intakeKey,
    });
    expect(again).toBe(world);
  });

  it("does not repeat the same pending issue at the next intake", () => {
    const before = world.history.legislativeMeasures?.length ?? 0;
    const laterIntake = fileMemberAgendaBill(world, {
      jurisdictionId: colorado,
      intakeKey: "later-intake-same-saved-cause",
    });
    expect(laterIntake.history.legislativeMeasures).toHaveLength(before);
    expect(agendaBills(laterIntake)).toHaveLength(agendaBills(world).length);
  });
}, 900_000);
