/** Raw legal, court, trait, identity and life source receipts; none preselect rent, landlord, arrears or case math. */
import { addDays } from "../../../simulation/dates";
import { organizationProfileAt } from "../../../simulation/life-queries";
import { personTrait } from "../../../simulation/people-traits";
import {
  personName,
  drawCanonicalNameForGender,
} from "../../../simulation/people";
import { nameCorpusVersionForWorld } from "../../../simulation/place-name-corpus";
import { SeededRng } from "../../../simulation/rng";
import { rentConstructionCovered } from "../../../simulation/law-consequences/rent-construction-coverage";
import { readFinalEnactedLawTerm } from "../../../simulation/governing/final-law-term-query";
import { lawInForce } from "../../../simulation/governing/law-in-force";
import { courtFor } from "../../../simulation/judiciary/court-for";
import {
  seatsForCourt,
  seatHolderAt,
} from "../../../simulation/judiciary/courts";
import { playerHandlesJudicialCase } from "../../../simulation/office-workflow";
import { rentReadingFacts } from "./rent-reading-facts";
import {
  rentSourceKey,
  RENT_LAW_KEYS,
  TOWN_RENT_VERSION,
  type RentEffectFacts,
} from "../rent-effects";
import type { World, IsoDate } from "../../../simulation/types";
export function rentEffectFacts(
  world: World,
  dates: readonly IsoDate[],
): RentEffectFacts {
  const allDates = [
    ...new Set([
      world.currentDate,
      ...dates,
      ...dates.map((date) => addDays(date, -365)),
      ...world.history.dwellings.map((row) => row.establishedAt),
    ]),
  ];
  const reading = rentReadingFacts(world, allDates);
  const profiles = new Map(
    world.history.organizations.map((row) => [
      row.id,
      organizationProfileAt(world, row.id),
    ]),
  );
  const traits = new Map(
    world.personOrder.flatMap((id) =>
      (["conflict", "reliability"] as const).map(
        (key) => [rentSourceKey(id, key), personTrait(world, id, key)] as const,
      ),
    ),
  );
  const construction = new Map(
    world.history.dwellings.flatMap((row) =>
      allDates.map(
        (date) =>
          [
            rentSourceKey(row.id, date),
            rentConstructionCovered(world, row, date, null),
          ] as const,
      ),
    ),
  );
  const finalTerms = new Map<
    string,
    ReturnType<typeof readFinalEnactedLawTerm>
  >();
  for (const id of world.jurisdictionOrder)
    for (const key of [
      RENT_LAW_KEYS.inclusionary,
      RENT_LAW_KEYS.rentStabilization,
    ])
      for (const date of allDates) {
        const question = Object.values(world.policyCatalog.propositions).find(
          (row) => row.stableKey === key,
        );
        const law = question ? lawInForce(world, id, question.id, date) : null;
        if (law) {
          const query = {
            questionKey: key,
            termKey: key === RENT_LAW_KEYS.inclusionary ? "share" : "cap",
            unit: "ratio" as const,
            onDate: date,
          };
          finalTerms.set(
            rentSourceKey(law.measureId, query),
            readFinalEnactedLawTerm(world, law, query),
          );
        }
      }
  const courtSources = new Map<string, ReturnType<typeof courtFor>>(),
    seats = new Map<string, ReturnType<typeof seatsForCourt>>(),
    holders = new Map<string, ReturnType<typeof seatHolderAt>>();
  for (const id of world.jurisdictionOrder) {
    const court = courtFor(world, id, "local-general-trial", "civil");
    courtSources.set(rentSourceKey(id), court);
    if (court)
      for (const date of allDates) {
        const rows = seatsForCourt(world, court.courtId, date);
        seats.set(rentSourceKey(court.courtId, date), rows);
        for (const seat of rows)
          holders.set(
            rentSourceKey(seat.seatId, date),
            seatHolderAt(world, seat.seatId, date),
          );
      }
  }
  const identityFamilies = new Map(
    world.jurisdictionOrder.flatMap((town) =>
      Array.from({ length: 2 }, (_, index) => {
        const stableKey = `${TOWN_RENT_VERSION}:${town}:property-manager:${index}`;
        return [
          rentSourceKey(town, index),
          drawCanonicalNameForGender(
            new SeededRng(world.seed).fork(`${stableKey}:family`),
            "unstated",
            nameCorpusVersionForWorld(world, town),
          ).familyName,
        ] as const;
      }),
    ),
  );
  return {
    ...reading,
    id: world.id,
    control: world.control,
    profiles,
    traits,
    construction,
    finalTerms,
    courtSources,
    seats,
    holders,
    handlesCivil: new Map(
      world.personOrder.map((id) => [
        id,
        playerHandlesJudicialCase(world, id, "civil"),
      ]),
    ),
    identityFamilies,
    names: new Map(
      world.personOrder.map((id) => [id, personName(world.people[id]!)]),
    ),
  };
}
