import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createCampaignElectionTransitionRegistry} from '../../../src/simulation/campaigns.ts';
import {operativeDateInWorld,lawInForce} from '../../../src/simulation/governing/law-in-force.ts';
import {propositionIdFor} from '../../../src/simulation/public-budgets/fiscal.ts';
import {daysBetween,makeIsoDate} from '../../../src/simulation/dates.ts';
import {seatsForChamber} from '../../../src/simulation/legislature-game-profile.ts';
import {legislativePackForJurisdiction,legislativeWorkKey} from '../../../src/simulation/legislative-institutions.ts';
import {legislativeProcedureForJurisdiction} from '../../../src/simulation/legislative-procedure-world.ts';
import {availableMeasureSteps,measurePosition} from '../../../src/simulation/legislation.ts';
import {seatBodyForPack,votePlanKeyForCommittee,votePlanKeyForFloor,type LegislativeProcedureContext} from '../../../src/simulation/legislation-scenarios.ts';
import {STATE_TRANSIT_VARIANT_KEY,TRANSIT_PROGRAM_KEY} from '../../../src/simulation/legislation-transit-families.ts';
import {searchLifePlaces,stateJurisdictionForKey,lifePlaceByJurisdictionId} from '../../../src/simulation/life-places.ts';
import {ensureStateExecutiveIncumbent,currentStateExecutiveHolders} from '../../../src/simulation/nationwide-world/state-executives.ts';
import {advanceWorld} from '../../../src/simulation/world.ts';
import {ensureWorldStartingConditions} from '../../../src/simulation/world-setup/conditions.ts';
import {generatePoliticalStartingConditions} from '../../../src/simulation/world-setup/political-start.ts';
import {CRUNCH46_WORLD_OPENING_VERSION} from '../../../src/simulation/world-setup/types.ts';
import {applyLegislativeStep} from '../../../src/presentation/legislation-session.ts';
import {fileDraft} from '../../../src/presentation/legislation-docket.ts';
import {createNewGameWorld,DEFAULT_NEW_GAME_SETUP} from '../../../src/presentation/new-game.ts';
import {publishLegislativeTransition} from '../../../src/presentation/publish-legislative-transition.ts';
import {personName} from '../../../src/simulation/people.ts';
const expect=(actual:unknown)=>({toBe:(wanted:unknown)=>assert.equal(actual,wanted)});
function enactedTransitBill(stateUsps: string, fareRelief = false) {
  const jurisdictionId = stateJurisdictionForKey(`US-${stateUsps}`)?.id;
  const place = searchLifePlaces("", 1, {
    stateJurisdictionKey: `US-${stateUsps}`,
    scope: "locality",
  })[0];
  if (!jurisdictionId || !place) throw new Error(`${stateUsps}: no locality`);
  const game = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    seed: `all-state-transit-payment:${stateUsps}`,
    placeKey: place.key,
    startAge: 40,
    questionnaire: "skipped",
  });
  let world = ensureWorldStartingConditions(game.world, {
    openingVersion: CRUNCH46_WORLD_OPENING_VERSION,
    political: generatePoliticalStartingConditions,
  });
  const savedProcedure = legislativeProcedureForJurisdiction(
    world,
    jurisdictionId,
  );
  if (!savedProcedure)
    throw new Error(`${stateUsps}: no saved opening procedure`);
  // A biennial odd-year opening remains on its own calendar. Time advances
  // through the ordinary world writer before this synthetic bill is filed.
  if (
    savedProcedure.sessionCadence === "biennial" &&
    savedProcedure.sessionYearParity === "odd"
  ) {
    world = advanceWorld(
      world,
      daysBetween(world.currentDate, makeIsoDate("2027-01-05")),
      createCampaignElectionTransitionRegistry(),
    );
  }
  world = ensureStateExecutiveIncumbent(world, game.playerPersonId, stateUsps);
  const pack = legislativePackForJurisdiction(jurisdictionId);
  if (!pack) throw new Error(`${stateUsps}: no legislature`);
  const filed = fileDraft(world, {
    scenarioKey: legislativeWorkKey(pack),
    playerPersonId: game.playerPersonId,
    jurisdictionId,
    familyKey: fareRelief ? "transit-access" : "appropriations",
    variantKey: fareRelief
      ? "enrollment-fare-relief"
      : STATE_TRANSIT_VARIANT_KEY,
    ...(fareRelief ? {} : { authorityKey: TRANSIT_PROGRAM_KEY }),
    parameterValues: fareRelief
      ? {
          "support-limit": {
            kind: "money",
            minorUnits: 800_000_000,
            currency: "USD",
          },
          "rider-eligibility": {
            kind: "enumerated",
            value: "assistance-enrollees",
          },
          "pilot-term": { kind: "duration-years", years: 2 },
        }
      : {
          appropriation: {
            kind: "money",
            minorUnits: 2_000_000,
            currency: "USD",
          },
          "service-window": { kind: "enumerated", value: "weekday" },
        },
  });
  world = filed.world;
  const measureId = filed.bill.measureId;
  // Authored saved-answer fixture matching automatic transit measures. Manual
  // fileDraft currently omits answers; this does not repair that production gap.
  const propositionId = propositionIdFor(
    world,
    fareRelief
      ? "us-policy-positions:transportation-infrastructure.fare-free-transit"
      : "us-policy-positions:transportation-infrastructure.additional-rural-transit-service-hours",
  );
  if (!propositionId)
    throw new Error("The transit question is missing from the test catalog.");
  world = {
    ...world,
    history: {
      ...world.history,
      legislativeMeasures: world.history.legislativeMeasures!.map((row) =>
        row.id === measureId
          ? {
              ...row,
              propositionIds: [
                ...new Set([...(row.propositionIds ?? []), propositionId]),
              ],
              propositionAnswers: [{ propositionId, answer: "yes" as const }],
            }
          : row,
      ),
    },
  };

  const bodies = pack.chambers.map((chamber) => {
    const seats = seatsForChamber(pack, chamber.chamberKey)?.seats;
    if (!seats)
      throw new Error(`${stateUsps}: no seats in ${chamber.chamberKey}`);
    return seatBodyForPack(
      chamber.chamberKey,
      chamber.name,
      seats,
      [],
      pack.structure === "unicameral",
    );
  });
  const votePlan: Record<string, { readonly yea: number }> = {};
  for (const chamber of pack.chambers) {
    const seats = bodies.find((body) => body.chamberKey === chamber.chamberKey)!
      .members.length;
    for (const committee of chamber.committees)
      votePlan[votePlanKeyForCommittee(committee.committeeKey)] = {
        yea: Math.min(seats, committee.appointedMembers),
      };
    for (const stage of chamber.floorStages)
      votePlan[votePlanKeyForFloor(chamber.chamberKey, stage.stageKey)] = {
        yea: seats,
      };
  }
  const procedure: LegislativeProcedureContext = {
    pack,
    measureId,
    bodies,
    committeeMemberCount: null,
    votePlan,
    governorAction: "signed",
    governorRationale: "Supplied fictional signature for the payment fixture.",
  };
  for (let guard = 0; guard < 40; guard++) {
    if (measurePosition(world, measureId).outcome === "enacted") break;
    const step = availableMeasureSteps(world, measureId).find(
      (candidate) => candidate !== "offer-amendment",
    );
    if (!step) throw new Error(`${stateUsps}: no passage step`);
    world = publishLegislativeTransition(
      world,
      applyLegislativeStep(procedure, world, step).world,
    );
  }
  expect(measurePosition(world, measureId).outcome).toBe("enacted");
  return {
    world,
    measureId,
    jurisdictionId,
    playerPersonId: game.playerPersonId,
  };
}

const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
assert.equal(head,process.env.OCD_AUDIT_EXPECTED_MAIN);
const rows=[];
for(const usps of (process.env.OCD_FARE_STATES??'WA,OH').split(',')){
 const enacted=enactedTransitBill(usps,true), law=enacted.world.history.legislativeEnactments!.find(e=>e.measureId===enacted.measureId)!;
 const operativeAt=operativeDateInWorld(enacted.world,law)!.date;
 const world=advanceWorld(enacted.world,daysBetween(enacted.world.currentDate,operativeAt)+62,createCampaignElectionTransitionRegistry());
 const records=world.history.publicProgramRecords??[];
 const authorities=records.filter(r=>r.kind==='appropriation'&&r.sourceMeasureId===enacted.measureId);
 const authorityIds=new Set(authorities.map(r=>r.id));
 const commitments=records.filter(r=>r.kind==='commitment'&&authorityIds.has(r.appropriationId));
 const commitIds=new Set(commitments.map(r=>r.id));
 const installments=records.filter(r=>r.kind==='installment'&&commitIds.has(r.commitmentId));
 const propositionId=propositionIdFor(world,'us-policy-positions:transportation-infrastructure.fare-free-transit')!;
 const paymentTrace=installments.map(r=>({installment:r,outcome:world.history.resourceTransferOutcomes.find(o=>o.resourceFlowId===r.resourceFlowId&&o.status==='completed')??null,canonicalLawOnPayment:lawInForce(world,enacted.jurisdictionId,propositionId,r.recordedAt)}));
 const relatedMatters=world.history.events.filter(e=>e.type.startsWith('governing.matter')&&(e.tags.some(t=>[...authorityIds].some(id=>t==='appropriation:'+id))||e.tags.includes('matter-family:program')));
 const stamped=(world.history.metricStates as any[]).flatMap(r=>r.lawEffectStamps??[]).filter(s=>s.questionKey==='us-policy-positions:transportation-infrastructure.fare-free-transit'&&s.governingLawKey===enacted.measureId);
 const gov=currentStateExecutiveHolders(world).find(g=>g.stateUsps===usps);
 rows.push({usps,head,place:lifePlaceByJurisdictionId(world.people[enacted.playerPersonId]!.homeJurisdictionId)?.displayName,
  player:personName(world.people[enacted.playerPersonId]!),governor:gov?{personId:gov.personId,name:personName(world.people[gov.personId]!)}:null,
  measureId:enacted.measureId,law,operativeAt,currentDate:world.currentDate,authorities,commitments,paymentTrace,relatedMatters,stamped,
  qualifyingCompleted:paymentTrace.filter(p=>p.installment.status==='posted'&&p.installment.recordedAt>=operativeAt&&p.canonicalLawOnPayment?.measureId===enacted.measureId&&p.outcome).length});
 console.log(JSON.stringify({usps,measureId:enacted.measureId,operativeAt,authorityCount:authorities.length,commitments:commitments.length,installments:installments.length,qualifyingCompleted:rows.at(-1)!.qualifyingCompleted,stamps:stamped.length}));
}
const old=JSON.parse(fs.readFileSync('docs/codex/audit-systems-fare-producer-trace.json','utf8')); assert.equal(old.head,head); rows.unshift(...old.states.filter((r:any)=>!rows.some(n=>n.usps===r.usps)));
fs.writeFileSync('docs/codex/audit-systems-fare-producer-trace.json',JSON.stringify({head,fixtureSource:'src/presentation/all-state-transit-payment.test.ts',fixtureSourceSha256:'6bed8d25adb46b2bd36bdf577e1939f8fc894fb9ff23cd4b9d58f5a54a565450',copiedFunctionSha256:'378911515c74f8e8a82a3642d05d16fe14a077e34c09d2887d9b0a112cc1e2e5',states:rows},null,2)+'\n');
