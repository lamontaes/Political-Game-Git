import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { applyLegislativeStep } from "../../presentation/legislation-session";
import { projectGoverningOfficeDesk } from "../../presentation/governing-office-desk";
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
import type { World } from "../types";
import { advanceWorld } from "../world";
import { daysBetween } from "../dates";
import { currentPresidentOf } from "../crisis/offices";
import { composeWorldTimeHandlers } from "../campaigns";
import { ensureOpeningJudiciary } from "../judiciary/opening";
import { seatHolderAt, seatsForCourt } from "../judiciary/courts";
import { seatedCongressChamber } from "./congress-chambers";
import {
  SUPREME_COURT_ID,
  SUPREME_COURT_NOMINATED_EVENT,
  SUPREME_COURT_VOTE_EVENT,
  SUPREME_COURT_SEATED_EVENT,
  ASSOCIATE_JUSTICE_NOMINATION,
  ASSOCIATE_JUSTICE_CONFIRMATION,
  openAssociateJusticeVacancy,
} from "./supreme-court-appointments";
import {
  decideGoverningMatter,
  chiefOfStaffFor,
  executiveDesk,
  governingMatters,
  governorOfficeForJurisdiction,
  openTransitionMatters,
} from "./state-governing";

/* Running Government player script:
 * 1. Open the actual holder's governor desk.
 * 2. Review and hire a saved candidate; verify the actual job on the desk.
 * 3. Receive a passed bill on that desk (supplied recorded chamber votes here).
 * 4. Choose Sign; verify that the actual holder's decision is saved.
 * 5. Continue the same save; a repeated choice adds no action.
 * 6. Ratify an amendment through both actual state chambers (todo).
 * 7. Follow a recorded vacancy through nomination and the actual Senate roll call.
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
    it(`hires a saved staff candidate on the actual player desk in ${place.jurisdictionKey}`, () => {
      const fixture = smallWorld({
        place: place.jurisdictionKey,
        seed: `${seed}:staff`,
        offices: ["governor"],
      });
      const office = governorOfficeForJurisdiction(
        fixture.world,
        place.jurisdictionKey,
      );
      expect(office).not.toBeNull();
      if (!office) throw Error("No actual officeholder for the staff step.");
      let world: World = {
        ...fixture.world,
        control: { kind: "person" as const, personId: office.holderPersonId },
      };
      expect(chiefOfStaffFor(world, office)).toBeNull();
      world = openTransitionMatters(world, office.officeKey);
      const matter = governingMatters(world, office.officeKey).find(
        (row) => row.family === "chief-of-staff" && row.status === "open",
      );
      expect(matter).toBeDefined();
      if (!matter) throw Error("The actual staff matter did not open.");
      // An explicit supplied player choice from the saved candidate list,
      // not an NPC preference, ranking, career or steadiness estimate.
      const option = matter.options[0];
      expect(option?.personId).toBeDefined();
      expect(option?.assessment).toBeDefined();
      if (!option?.personId) throw Error("No saved candidate can be hired.");
      expect(world.people[option.personId]).toBeDefined();
      const outsider = {
        ...world,
        control: { kind: "person" as const, personId: fixture.personId },
      };
      const refused = decideGoverningMatter(outsider, matter.id, option.key);
      expect(refused.ok).toBe(false);
      expect(refused.world).toBe(outsider);
      const choice = decideGoverningMatter(world, matter.id, option.key);
      expect(choice.ok).toBe(true);
      world = choice.world;
      const decided = governingMatters(world, office.officeKey).find(
        (row) => row.id === matter.id,
      )!;
      expect(decided.status).toBe("decided");
      expect(decided.decision?.tags).toContain("decided-by:player");
      expect(decided.decision?.tags).toContain(`choice:${option.key}`);
      const work = world.history.workRelationships.find(
        (row) => row.stableKey === `${matter.stableKey}:hire`,
      )!;
      expect(work).toMatchObject({
        personId: option.personId,
        organizationId: office.organizationId,
        startedAt: world.currentDate,
        kind: "employment:executive-staff",
        provenance: {
          kind: "simulated-event",
          eventId: decided.decision!.id,
        },
      });
      expect(chiefOfStaffFor(world, office)).toBe(option.personId);
      const incumbency = world.history.officeStaffIncumbencies?.find(
        (row) => row.workRelationshipId === work.id,
      );
      expect(incumbency).toBeDefined();
      const desk = projectGoverningOfficeDesk(world, office.holderPersonId);
      expect(desk?.staff).toContainEqual(
        expect.objectContaining({
          personId: option.personId,
          name: personName(world.people[option.personId]!),
          roleTitle: "Chief of Staff",
        }),
      );
      const loaded = deserializeWorld(serializeWorld(world));
      expect(chiefOfStaffFor(loaded, office)).toBe(option.personId);
      expect(loaded.history.officeStaffIncumbencies).toEqual(
        world.history.officeStaffIncumbencies,
      );
      expect(projectGoverningOfficeDesk(loaded, office.holderPersonId)).toEqual(
        desk,
      );
      const again = decideGoverningMatter(loaded, matter.id, option.key);
      expect(again.ok).toBe(false);
      expect(again.world).toBe(loaded);
      console.info(
        "Running Government staff",
        JSON.stringify({
          seed: `${seed}:staff`,
          place: place.jurisdictionKey,
          holder: personName(world.people[office.holderPersonId]!),
          candidate: personName(world.people[option.personId]!),
          matterId: matter.id,
          decisionId: decided.decision!.id,
          workId: work.id,
          incumbencyId: incumbency!.id,
          suppliedPlayerChoice: true,
        }),
      );
    });
  }
  it.todo("records both actual state ratification chamber votes");
  for (const place of places) {
    it(`records the actual Senate vote and resulting seat in ${place.jurisdictionKey}`, () => {
      const fixture = smallWorld({
        place: place.jurisdictionKey,
        seed: `${seed}:senate`,
        offices: ["congress"],
      });
      const opening = ensureOpeningJudiciary(fixture.world);
      const president = currentPresidentOf(opening)!;
      const seat = seatsForCourt(opening, SUPREME_COURT_ID).find(
        (row) =>
          row.linkedOfficeId === null && seatHolderAt(opening, row.seatId),
      )!;
      const formerHolder = seatHolderAt(opening, seat.seatId)!;
      expect(president).toBeDefined();
      expect(formerHolder).toBeDefined();
      // Explicit supplied vacancy isolates the existing appointment route.
      // Dates, nominee, Senate decisions and resulting seat are not supplied.
      let world = openAssociateJusticeVacancy(opening, {
        seatId: seat.seatId,
        vacancyDate: opening.currentDate,
        formerHolderId: formerHolder.personId,
        reason: "resignation",
      }).world;
      const handlers = composeWorldTimeHandlers();
      const nominationDue = world.history.futureDueItems.find(
        (row) => row.transitionKey === ASSOCIATE_JUSTICE_NOMINATION,
      )!;
      expect(nominationDue).toBeDefined();
      expect(seatHolderAt(world, seat.seatId)).toBeNull();
      world = advanceWorld(
        world,
        daysBetween(world.currentDate, nominationDue.dueAt),
        handlers,
      );
      const nomination = world.history.events.find(
        (row) => row.type === SUPREME_COURT_NOMINATED_EVENT,
      )!;
      expect(nomination).toBeDefined();
      const nomineeId = nomination.participants.find(
        (row) => row.role === "focus:subject",
      )!.personId;
      expect(nomination.participants).toContainEqual(
        expect.objectContaining({
          personId: president.personId,
          role: "focus:actor",
        }),
      );
      expect(seatHolderAt(world, seat.seatId)).toBeNull();
      expect(
        world.history.events.filter(
          (row) => row.type === SUPREME_COURT_VOTE_EVENT,
        ),
      ).toHaveLength(0);
      const confirmationDue = world.history.futureDueItems.find(
        (row) => row.transitionKey === ASSOCIATE_JUSTICE_CONFIRMATION,
      )!;
      expect(confirmationDue).toBeDefined();
      // Continue before the vote must retain the same nominee and due item.
      world = deserializeWorld(serializeWorld(world));
      expect(
        world.history.futureDueItems.find(
          (row) => row.id === confirmationDue.id,
        ),
      ).toEqual(confirmationDue);
      world = advanceWorld(
        world,
        daysBetween(world.currentDate, confirmationDue.dueAt),
        handlers,
      );
      const vote = world.history.events.find(
        (row) => row.type === SUPREME_COURT_VOTE_EVENT,
      )!;
      expect(vote).toBeDefined();
      const senate = seatedCongressChamber(world, "senate")!.body.members;
      const ballots = vote.participants.filter(
        (row) => row.role === "agency:senate-vote",
      );
      expect(ballots).toHaveLength(senate.length);
      expect(new Set(ballots.map((row) => row.personId)).size).toBe(
        senate.length,
      );
      for (const ballot of ballots) {
        expect(
          senate.some((member) => member.personId === ballot.personId),
        ).toBe(true);
        expect(ballot.detail).toMatch(
          /^(yea|nay|present-not-voting|absent)\|.+/,
        );
      }
      const confirmed = vote.tags.includes("outcome:confirmed");
      const holder = seatHolderAt(world, seat.seatId);
      expect(holder?.personId ?? null).toBe(confirmed ? nomineeId : null);
      if (confirmed) {
        expect(
          world.judiciary!.seatTenures.find(
            (row) =>
              row.seatId === seat.seatId &&
              row.personId === nomineeId &&
              row.endedAt === null,
          )!.selection.decisionRecordId,
        ).toBe(vote.id);
        expect(
          world.history.events.some(
            (row) =>
              row.type === SUPREME_COURT_SEATED_EVENT &&
              row.involvedEntityIds.includes(nomineeId),
          ),
        ).toBe(true);
      }
      const continued = deserializeWorld(serializeWorld(world));
      expect(continued.judiciary).toEqual(world.judiciary);
      expect(
        continued.history.events.find((row) => row.id === vote.id),
      ).toEqual(vote);
      const repeated = advanceWorld(continued, 1, handlers);
      expect(
        repeated.history.events.filter(
          (row) => row.stableKey === vote.stableKey,
        ),
      ).toHaveLength(1);
      expect(seatHolderAt(repeated, seat.seatId)).toEqual(holder);
      console.info(
        "Running Government Senate",
        JSON.stringify({
          seed: `${seed}:senate`,
          place: place.jurisdictionKey,
          president: personName(world.people[president.personId]!),
          nominee: personName(world.people[nomineeId]!),
          nominationEventId: nomination.id,
          voteEventId: vote.id,
          senators: ballots.length,
          outcome: confirmed ? "confirmed" : "not-confirmed",
          seatId: seat.seatId,
        }),
      );
    });
  }
  it.todo("crosses a legal term boundary through the single office lifecycle");
  it.todo("takes the same steps in the ordinary browser play route");
});
