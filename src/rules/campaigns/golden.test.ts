import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { lifePlaceStateIdentities } from "../../simulation/life-places";
import { pickDistinct, SeededRng } from "../../simulation/rng";
import {
  campaignActions,
  campaignActionResultRecords,
} from "../../simulation/campaign-queries";
import {
  householdMembershipsAt,
  activeWorkRelationshipsAt,
} from "../../simulation/life-queries";
import { recordsByKey } from "../../simulation/history-index";
import { townAdultEstimate } from "../../simulation/living-world/town-residents";
import { homeJurisdictionResidenceSince } from "../../simulation/nationwide-world/residence-duration";
import { strongestOfficialStanding } from "../../simulation/official-view-reads";
import { livedOutcomesOf } from "../../simulation/living-world/lived-outcomes";
import { reactionLens } from "../../simulation/living-world/official-views";
import { addDays, daysBetween, makeIsoDate } from "./dates";
import { simulationMomentOnLocalDate } from "../../simulation/dates";
import { doorKnockingReturn as oldRecognition } from "../../simulation/campaign-recognition";
import { doorKnockingReturn } from "./recognition";
import { modelCampaignFieldReach as oldReach } from "../../simulation/campaign-contact-calibration";
import { modelCampaignFieldReach } from "./field-reach";
import * as oldPacing from "../../simulation/campaign-canvass";
import * as pacing from "./canvass-pacing";
import { assessCampaignContribution as oldLimit } from "../../simulation/campaign-donors";
import { campaignCompliancePackFor } from "../../simulation/campaign-compliance";
import { assessCampaignContribution } from "./contribution-limits";
import {
  assessContribution as oldContribution,
  campaignObligations,
  contributionsFromOthersMinorUnits,
} from "../../simulation/campaign-compliance-rules";
import { assessContribution } from "./contribution-ruling";
import { flowsForYear as oldFlows } from "../../simulation/pressure/flows";
import { flowsForYear } from "./pressure-flows";
import { pressureLevel } from "./pressure-levels";
import { civicStake, passesMeasure } from "./civic-stake";
import type { World, CampaignRecord } from "../../simulation/types";
import type { PressureReading } from "../../simulation/pressure/contract";
const seed = "rules3-campaigns-golden-2026-10-11";
const places = lifePlaceStateIdentities();
const watched = pickDistinct(new SeededRng(seed), places, 1)[0]!;
/** Evaluate the original private KEEP bodies with the original record readers. */
function legacyCivic() {
  const file = "src/simulation/living-world/civic-actions.ts";
  const code = readFileSync(file, "utf8");
  const sf = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true);
  const names = new Set([
    "STAKE",
    "STRONG_VIEW_POINTS",
    "STRONG_VIEW_FACTOR",
    "DAYS_PER_QUARTER",
    "MEASURE",
    "CIVIC_ACTION_EVENTS",
    "civicStake",
    "passesMeasure",
  ]);
  const text = sf.statements
    .filter(
      (n) =>
        (ts.isFunctionDeclaration(n) && n.name && names.has(n.name.text)) ||
        (ts.isVariableStatement(n) &&
          n.declarationList.declarations.some(
            (d) => ts.isIdentifier(d.name) && names.has(d.name.text),
          )),
    )
    .map((n) => n.getText(sf).replace(/^export /, ""))
    .join("\n");
  const js = ts.transpileModule(text, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.None,
    },
  }).outputText;
  return new Function(
    "addDays",
    "daysBetween",
    "homeJurisdictionResidenceSince",
    "activeWorkRelationshipsAt",
    "strongestViewOf",
    "livedOutcomesOf",
    "reactionLens",
    js + "\nreturn {civicStake,passesMeasure};",
  )(
    addDays,
    daysBetween,
    homeJurisdictionResidenceSince,
    activeWorkRelationshipsAt,
    strongestOfficialStanding,
    livedOutcomesOf,
    reactionLens,
  ) as {
    civicStake: (
      ...args: Parameters<typeof civicStake> extends [...infer A, unknown]
        ? A
        : never
    ) => ReturnType<typeof civicStake>;
    passesMeasure: typeof passesMeasure;
  };
}
const civic = legacyCivic();
describe(`campaign golden equivalence; watched=${watched.jurisdictionKey}; seed=${seed}`, () => {
  it("covers all 56 places", () => expect(places).toHaveLength(56));
  for (const place of places)
    it(place.jurisdictionKey, () => {
      const small = smallWorld({
        place: place.usps,
        people: 4,
        seed,
      });
      for (const level of ["local", "state", "federal"] as const) {
        const campaign = {
          id: `campaign:${place.usps}:${level}`,
          candidatePersonId: small.personId,
          jurisdictionId: small.jurisdictionId,
          contestId: "contest",
          officeKey: `office:${level}`,
          organizationId: "committee",
          compliancePackId: null,
        } as CampaignRecord;
        const world = {
          ...small.world,
          currentDate: makeIsoDate("2026-10-11"),
          currentMoment: simulationMomentOnLocalDate(
            small.world.currentMoment,
            makeIsoDate("2026-10-11"),
          ),
          history: { ...small.world.history, campaigns: [campaign] },
        } as World;
        const facts = {
          today: world.currentDate,
          jurisdictionKind: world.jurisdictions[campaign.jurisdictionId]?.kind,
          personOrder: world.personOrder,
          peopleById: world.people,
          electionContests: world.history.electionContests,
          electionContestResults: world.history.electionContestResults,
          results: campaignActionResultRecords(world),
          actions: campaignActions(world, campaign.id),
          homesByPerson: new Map(
            world.personOrder.map((id) => [
              id,
              householdMembershipsAt(world, id),
            ]),
          ),
          contacts: recordsByKey(
            world.history.relationshipInteractions,
            "relationship-interactions-by-person",
            (r) => r.personIds,
            campaign.candidatePersonId,
          ),
          eventsById: new Map(world.history.events.map((e) => [e.id, e])),
          townAdultEstimate: townAdultEstimate(campaign.jurisdictionId),
        };
        expect(doorKnockingReturn(campaign, null, facts)).toEqual(
          oldRecognition(world, campaign),
        );
        const other = oldRecognition(world, campaign).adultResidentIds[0]!;
        const event = {
          id: `contact-event:${campaign.id}`,
          occurredAt: world.currentDate,
          participants: [
            { personId: small.personId, role: "presence:participant" },
            { personId: other, role: "presence:participant" },
          ],
        } as World["history"]["events"][number];
        const contact = {
          id: `contact:${campaign.id}`,
          personIds: [small.personId, other],
          eventId: event.id,
          occurredAt: world.currentDate,
          tags: ["campaign.contact"],
        } as World["history"]["relationshipInteractions"][number];
        const observed = {
          ...world,
          history: {
            ...world.history,
            events: [...world.history.events, event],
            relationshipInteractions: [
              ...world.history.relationshipInteractions,
              contact,
            ],
          },
        } as World;
        const observedFacts = {
          ...facts,
          contacts: [...facts.contacts, contact],
          eventsById: new Map(observed.history.events.map((e) => [e.id, e])),
        };
        const recognition = doorKnockingReturn(campaign, null, observedFacts);
        expect(recognition).toEqual(oldRecognition(observed, campaign));
        expect(recognition.recognizedPersonIds).toContain(other);
        expect(recognition.percent).toBeGreaterThan(0);
        expect(
          assessCampaignContribution(
            campaignCompliancePackFor(world, campaign.id),
          ),
        ).toEqual(oldLimit(world, campaign.id));
        for (const amount of [0, 74999, 75000, 75001, 1000000])
          for (const sourcePersonId of [small.personId, null]) {
            const input = {
              campaignId: campaign.id,
              sourcePersonId,
              incomingMinorUnits: amount,
              statementOfOrganizationFiled: false,
              treasurerPersonId: null,
              treasurerQualifiedElector: null,
            };
            expect(
              assessContribution(
                {
                  campaign,
                  obligations: campaignObligations(
                    place.jurisdictionKey,
                    world.currentDate,
                  ),
                  committeeExists: false,
                  otherContributionsMinorUnits:
                    contributionsFromOthersMinorUnits(world, campaign),
                },
                input,
              ),
            ).toEqual(oldContribution(world, input));
          }
        for (const minutes of [1, 30, 60, 180, 1000])
          for (const form of [
            "door-canvass",
            "phone-shift",
            "petition-circulation",
          ] as const)
            expect(modelCampaignFieldReach(form, minutes)).toEqual(
              oldReach(form, minutes),
            );
        const group = new Set([small.personId]);
        const old = civic.civicStake(
          world,
          small.personId,
          small.jurisdictionId,
          group,
        );
        const fresh = civicStake(small.personId, small.jurisdictionId, group, {
          birthDate: world.people[small.personId]!.birthDate,
          today: world.currentDate,
          startedAt: world.startedAt,
          lawExposures: world.history.lawExposures,
          organizationParticipations: world.history.organizationParticipations,
          organizations: world.history.organizations,
          recordedResidenceSince: homeJurisdictionResidenceSince(
            world,
            small.personId,
            small.jurisdictionId,
            world.currentDate,
          ),
          employed: activeWorkRelationshipsAt(world, small.personId).length > 0,
          view: strongestOfficialStanding(world, small.personId),
          outcomes: livedOutcomesOf(world, small.personId),
          reactionLens: reactionLens(world, small.personId),
        });
        expect(fresh).toEqual(old);
        for (const action of ["contacted", "attended"] as const)
          for (const date of [
            world.currentDate,
            addDays(world.currentDate, 91),
            addDays(world.currentDate, 365),
          ])
            expect(passesMeasure(fresh, action, date)).toBe(
              civic.passesMeasure(old, action, date),
            );
      }
      expect(pacing.CANVASS_DOORS_PER_HOUR).toBe(
        oldPacing.CANVASS_DOORS_PER_HOUR,
      );
      expect(pacing.CANVASS_SESSION_MINUTES).toEqual(
        oldPacing.CANVASS_SESSION_MINUTES,
      );
    });
  it("preserves missing readings, pressure ties and rounded fade", () => {
    const readings = new Map<string, PressureReading>(
      places.map((p, i) => [
        p.jurisdictionKey,
        {
          stateKey: p.jurisdictionKey,
          levels: {
            leave: i / 100,
            arrive: i / 200,
            anger: 0,
            fear: 0,
            hope: 0,
          },
        } as PressureReading,
      ]),
    );
    const keys = places.map((p) => p.jurisdictionKey);
    expect(flowsForYear(keys, readings, 2027, 1)).toEqual(
      oldFlows(keys, readings, 2027, 1),
    );
    expect(flowsForYear(keys, new Map(), 2027, 1)).toEqual(
      oldFlows(keys, new Map(), 2027, 1),
    );
    expect(
      pressureLevel(
        0.2,
        [{ kind: "fear", amount: 0.1, causeKey: "cause", sourceId: "record" }],
        "fear",
      ),
    ).toBe(0.25);
  });
  it("refuses invalid field minutes and keeps zero recognition explicit", () => {
    expect(() => modelCampaignFieldReach("door-canvass", 0)).toThrow();
    expect(() => oldReach("door-canvass", 0)).toThrow();
    expect(makeIsoDate("2026-10-11")).toBe("2026-10-11");
  });
});
