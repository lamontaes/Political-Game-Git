import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { applyLegislativeStep } from "../../presentation/legislation-session";
import {
  lifePlaceStateIdentities,
  stateJurisdictionForKey,
} from "../life-places";
import { legislativePackForJurisdiction } from "../legislative-institutions";
import { regularSessionYearForWorld } from "../legislative-procedure-world";
import { legislativeBlueprintForMeasure } from "./legislative-clock";
import {
  availableMeasureSteps,
  introduceMeasure,
  measurePosition,
  recordEnactment,
  requireMeasure,
} from "../legislation";
import {
  votePlanKeyForCommittee,
  votePlanKeyForFloor,
  type LegislativeProcedureContext,
} from "../legislation-scenarios";
import { deserializeWorld, serializeWorld } from "../serialization";
import { personName } from "../people";
import { SeededRng } from "../rng";
import { seatedChamberForPack } from "./chamber-votes";
import { BILL_SIGN } from "./governor-bill-decision";
import {
  decideGoverningMatter,
  executiveDesk,
  governingMatters,
  governorOfficeForJurisdiction,
} from "./state-governing";

/* Running Government player script:
 * 1. Open the actual holder's governor desk.
 * 2. Review and hire staff from their actual records (todo).
 * 3. Receive a passed bill on that desk (supplied recorded chamber votes here).
 * 4. Choose Sign; verify that the actual holder's decision is saved.
 * 5. Continue the same save; a repeated choice adds no action.
 * 6. Ratify an amendment through both actual state chambers (todo).
 * 7. Confirm a nominee through the actual Senate roll call (todo).
 * 8. Cross a legal term boundary through the one office lifecycle (todo).
 * Browser play and naturally formed chamber votes are separate missing proof.
 */
const seed = "Running Government actual desk script";
const pool = [...lifePlaceStateIdentities()];
const rng = new SeededRng(seed);
const places = Array.from(
  { length: 5 },
  () => pool.splice(rng.integer(0, pool.length), 1)[0]!,
);

describe("Running Government: the holder chooses on the actual desk", () => {
  for (const place of places) {
    const jurisdiction = stateJurisdictionForKey(place.jurisdictionKey);
    const pack =
      jurisdiction && legislativePackForJurisdiction(jurisdiction.id);
    if (!pack) {
      it.todo(
        `opens an actual desk and legislature in ${place.jurisdictionKey}: own pack unavailable`,
      );
      continue;
    }
    it(`receives, signs and continues the same bill in ${place.jurisdictionKey}`, () => {
      const opening = smallWorld({
        place: place.jurisdictionKey,
        seed,
        offices: ["governor", "state-legislature"],
      });
      const year = Number(opening.world.currentDate.slice(0, 4));
      const fixture = regularSessionYearForWorld(
        opening.world,
        opening.stateJurisdictionId,
        year,
      )
        ? opening
        : smallWorld({
            place: place.jurisdictionKey,
            seed,
            date: `${year + 1}${opening.world.currentDate.slice(4)}`,
            offices: ["governor", "state-legislature"],
          });
      let world = fixture.world;
      const office = governorOfficeForJurisdiction(world, pack.jurisdictionKey);
      expect(office).not.toBeNull();
      if (!office)
        throw Error("No actual office holder; cannot run the desk script.");
      // An explicit supplied control change isolates this existing holder's desk.
      // It does not claim that the resident won or qualified for this office.
      world = {
        ...world,
        control: { kind: "person", personId: office.holderPersonId },
      };
      const bodies = pack.chambers.map((chamber) => {
        const seated = seatedChamberForPack(
          world,
          pack.packId,
          chamber.chamberKey,
          chamber.name,
        );
        if (!seated)
          throw Error("No actual saved chamber; no synthetic seats allowed.");
        return seated.body;
      });
      const first = pack.chambers.find(
        (chamber) => chamber.introductionAllowed,
      )!;
      const sponsor = bodies
        .find((body) => body.chamberKey === first.chamberKey)!
        .members.find((member) => member.personId)!;
      const billKey = `${seed}:${place.jurisdictionKey}:bill`;
      world = introduceMeasure(world, {
        stableKey: billKey,
        jurisdictionId: fixture.stateJurisdictionId,
        rulePackId: pack.packId,
        designation: "Play-script bill 1",
        shortTitle: "Recorded executive decision fixture",
        summary:
          "A supplied fictional policy bill isolates the actual executive desk.",
        origin: "member-introduction",
        subjectClass: "general-policy",
        originChamberKey: first.chamberKey,
        sponsorPersonId: sponsor.personId,
      });
      const measureId = world.history.legislativeMeasures!.find(
        (measure) => measure.stableKey === billKey,
      )!.id;
      const votePlan: Record<string, { yea: number }> = {};
      for (const chamber of pack.chambers) {
        const body = bodies.find(
          (body) => body.chamberKey === chamber.chamberKey,
        )!;
        for (const committee of chamber.committees)
          votePlan[votePlanKeyForCommittee(committee.committeeKey)] = {
            yea: Math.min(body.members.length, committee.appointedMembers),
          };
        for (const stage of chamber.floorStages)
          votePlan[votePlanKeyForFloor(chamber.chamberKey, stage.stageKey)] = {
            yea: body.members.length,
          };
      }
      const context: LegislativeProcedureContext = {
        pack,
        measureId,
        bodies,
        committeeMemberCount: null,
        votePlan,
        // An authored ending cannot sign; the actual desk decision below must.
        governorAction: null,
        governorRationale: "No supplied executive decision.",
      };
      for (let guard = 0; guard < 40; guard += 1) {
        if (measurePosition(world, measureId).phase === "awaiting-executive")
          break;
        const step = availableMeasureSteps(world, measureId).find(
          (step) => step !== "offer-amendment",
        );
        if (!step)
          throw Error(
            `No canonical step at ${measurePosition(world, measureId).phase}`,
          );
        world = applyLegislativeStep(context, world, step).world;
      }
      expect(measurePosition(world, measureId).phase).toBe(
        "awaiting-executive",
      );
      expect(world.history.executiveDispositions ?? []).toHaveLength(0);
      const measure = requireMeasure(world, measureId);
      world = executiveDesk(
        world,
        measure,
        legislativeBlueprintForMeasure(world, measure),
      );
      const matter = governingMatters(world).find(
        (matter) => matter.measureId === measureId && matter.status === "open",
      );
      expect(matter?.holderPersonId).toBe(office.holderPersonId);
      if (!matter)
        throw Error("No actual bill matter appeared on the holder's desk.");
      const choice = decideGoverningMatter(world, matter.id, BILL_SIGN);
      expect(choice.ok).toBe(true);
      world = choice.world;
      expect(measurePosition(world, measureId).phase).toBe(
        "awaiting-enactment",
      );
      const signature = world.history.executiveDispositions!.find(
        (row) => row.measureId === measureId,
      )!;
      expect(signature.action).toBe("signed");
      world = recordEnactment(world, {
        stableKey: `${billKey}:enactment`,
        measureId,
        effectiveAt: world.currentDate,
      });
      const loaded = deserializeWorld(serializeWorld(world));
      expect(measurePosition(loaded, measureId).outcome).toBe("enacted");
      expect(loaded.history.executiveDispositions).toEqual(
        world.history.executiveDispositions,
      );
      expect(loaded.history.legislativeEnactments).toEqual(
        world.history.legislativeEnactments,
      );
      const again = decideGoverningMatter(loaded, matter.id, BILL_SIGN);
      expect(again.ok).toBe(false);
      expect(again.world).toBe(loaded);
      console.info(
        "Running Government desk",
        JSON.stringify({
          seed,
          place: place.jurisdictionKey,
          holder: personName(world.people[office.holderPersonId]!),
          holderId: office.holderPersonId,
          sponsorId: sponsor.personId,
          measureId,
          matterId: matter.id,
          signatureId: signature.id,
          outcome: measurePosition(loaded, measureId).outcome,
        }),
      );
    });
  }
  it.todo("reviews actual staff evidence and hires on the player desk");
  it.todo("records both actual state ratification chamber votes");
  it.todo("records the Senate's actual nomination confirmation vote");
  it.todo("crosses a legal term boundary through the single office lifecycle");
  it.todo("takes the same steps in the ordinary browser play route");
});
