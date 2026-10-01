import { lawInForce, ownLawLevel } from "../governing/law-in-force";
import { outranks } from "../law-hierarchy";
import { addDays } from "../dates";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createScenarioWorld } from "../demo";
import { advanceWorld, createWorld } from "../world";
import { createProductionPolicyCatalog } from "../production-catalog";
import { lifePlaceByKey } from "../life-places";
import { governmentUnitsForState } from "../government-units";
import {
  municipalGovernmentByKey,
  municipalRulePackFor,
} from "../municipal-government";
import { CHIEF_EXECUTIVE_JURISDICTIONS } from "../nationwide-world/state-executive-candidacy-packs";
import { ensureMunicipalCouncilOpening } from "../municipal-council-opening";
import { createFormationContext, recordPrinciples } from "../politics";
import {
  createFutureTransitionHandlerRegistry,
  scheduleFutureDueItem,
} from "../future-transitions";
import { deserializeWorld, serializeWorld } from "../serialization";
import { sittingLocalOfficers } from "./local-government-seats";
import {
  LOCAL_COUNCIL_MEETING,
  LOCAL_COUNCIL_MEETINGS_VERSION,
  LOCAL_COUNCIL_MEETING_HANDLERS,
  townQuestions,
} from "./local-council-meetings";

const seed = "a72-local-callers-20261001";
// Seeded fixture selection among recorded places; no production decision draw.
const places = CHIEF_EXECUTIVE_JURISDICTIONS.flatMap((state) =>
  governmentUnitsForState(state),
)
  .filter(
    (unit) =>
      unit.unitType === "municipality" &&
      unit.functionalActive &&
      unit.placeGeoid,
  )
  .map((unit) => ({
    unit,
    rank: createHash("sha256").update(`${seed}:${unit.id}`).digest("hex"),
  }))
  .sort((a, b) => a.rank.localeCompare(b.rank))
  .flatMap(({ unit }) => {
    const place = lifePlaceByKey(unit.placeGeoid!);
    const government = municipalGovernmentByKey(unit.id);
    return place && government && municipalRulePackFor(government).ok
      ? [{ place, unit }]
      : [];
  })
  .slice(0, 5);

describe("actual local council filing caller", () => {
  expect(places).toHaveLength(5);
  it.each(places)(
    "records the strongest actual member in $place.key",
    ({ place, unit }) => {
      const base = createScenarioWorld(`${seed}:${place.key}`, place.context, {
        peopleCount: 8,
      });
      let world = ensureMunicipalCouncilOpening(
        createWorld({
          seed: base.seed,
          currentDate: base.currentDate,
          currentMoment: base.currentMoment,
          jurisdictions: base.jurisdictionOrder.map(
            (id) => base.jurisdictions[id]!,
          ),
          people: base.personOrder.map((id) => base.people[id]!),
          policyCatalog: createProductionPolicyCatalog(),
        }),
        unit.id,
      );
      const members = sittingLocalOfficers(world, unit).filter(
        (seat) => !seat.mayor,
      );
      expect(members.length).toBeGreaterThanOrEqual(2);
      const proposition = townQuestions(
        world,
        place.context.jurisdiction.id,
      ).find((question) => {
        const law = lawInForce(
          world,
          place.context.jurisdiction.id,
          question.id,
        );
        return (
          (question.principles ?? []).reduce(
            (sum, bearing) => sum + (bearing.weight ?? 1),
            0,
          ) >= 1 &&
          law?.answer !== "yes" &&
          !(
            law &&
            outranks(law.level, ownLawLevel(place.context.jurisdiction.id)) &&
            law.preempts !== false
          )
        );
      })!;
      expect(proposition).toBeDefined();
      const weaker = members[0]!.personId;
      const stronger = members[1]!.personId;
      const bearings = new Map(
        proposition.principles!.map((bearing) => [
          bearing.principleId,
          bearing.bearing,
        ]),
      );
      world = recordPrinciples(
        world,
        members.flatMap((member) =>
          world.policyCatalog.principleOrder.map((principleId) => ({
            stableKey: `${seed}:${member.personId}:${principleId}`,
            personId: member.personId,
            principleId,
            formedAt: world.currentDate,
            stance:
              bearings.has(principleId) &&
              [weaker, stronger].includes(member.personId)
                ? bearings.get(principleId) === "against"
                  ? "rejects"
                  : "endorses"
                : "conflicted",
            strength: member.personId === stronger ? 1 : 0.75,
            conviction: "settled",
            flexibility: "firm",
            qualification: null,
            formation: createFormationContext("experience:life", {
              note: "Controlled recorded member stakes for existing local meeting caller.",
            }),
            supersedesPrincipleRecordId: null,
          })),
        ),
      );
      world = scheduleFutureDueItem(world, {
        stableKey: `${LOCAL_COUNCIL_MEETINGS_VERSION}:${unit.id}:posted-meeting:${world.currentDate}`,
        dueAt: addDays(world.currentDate, 1),
        transitionKey: LOCAL_COUNCIL_MEETING,
        entityIds: [place.context.jurisdiction.id, base.personOrder[0]!],
        jurisdictionId: place.context.jurisdiction.id,
        provenance: {
          kind: "authored",
          note: "Controlled posted meeting, using the actual existing caller.",
        },
      });
      const result = {
        world: advanceWorld(
          world,
          1,
          createFutureTransitionHandlerRegistry(LOCAL_COUNCIL_MEETING_HANDLERS),
        ),
      };
      const bills = result.world.history.legislativeMeasures ?? [];
      expect(bills.length).toBeGreaterThan(0);
      const chosen = bills.find((bill) =>
        bill.propositionIds?.includes(proposition.id),
      )!;
      expect(chosen.sponsorPersonId).toBe(stronger);
      expect(chosen.designation).toMatch(/^ORD /);
      expect(chosen.shortTitle).toContain("Ordinance");
      expect(
        result.world.history.events.find(
          (event) => event.stableKey === `${chosen.stableKey}:motive`,
        )?.type,
      ).toBe("legislation.sponsor-motive");
      expect(result.world.control).toEqual(world.control);
      expect(deserializeWorld(serializeWorld(result.world))).toEqual(
        result.world,
      );
    },
  );
});
