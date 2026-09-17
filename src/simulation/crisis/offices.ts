import { makeIsoDate } from "../dates";
import { projectCongress } from "../living-world/congress";
import { nationalOfficeHolder } from "../national-election-consumer";
import { currentStateExecutiveHolders } from "../nationwide-world/state-executives";
import type { EntityId, World } from "../types";
import type { OfficeRef } from "./types";

/**
 * The public offices a person holds on the World's current date, read from
 * the offices the World already represents. This is detection for the
 * continuity notice only: it grants nothing and never ends a term.
 */

/** Opening federal tenures the World seats without an election record. */
const OPENING_FEDERAL_TENURES = [
  {
    tag: "office:us-president",
    key: "us-president",
    title: "President of the United States",
    years: 4,
    monthDay: "01-20",
  },
  {
    tag: "office:us-chief-justice",
    key: "us-chief-justice",
    title: "Chief Justice of the United States",
    years: null,
    monthDay: null,
  },
] as const;

function openingFederalOffices(world: World, personId: EntityId): OfficeRef[] {
  const refs: OfficeRef[] = [];
  for (const office of OPENING_FEDERAL_TENURES) {
    const terms = world.history.events.filter(
      (event) =>
        event.type === "world.office-tenure" &&
        event.tags.includes(office.tag) &&
        event.occurredAt <= world.currentDate,
    );
    const latest = terms.at(-1);
    if (!latest) continue;
    const holder = latest.participants.find(
      (participant) => participant.role === "focus:subject",
    )?.personId;
    if (holder !== personId) continue;
    if (
      world.history.personDeaths.some(
        (death) =>
          death.personId === personId && death.diedAt <= world.currentDate,
      )
    )
      continue;
    if (office.years !== null) {
      const endExclusive = makeIsoDate(
        `${Number(latest.occurredAt.slice(0, 4)) + office.years}-${office.monthDay}`,
      );
      if (world.currentDate >= endExclusive) continue;
    }
    refs.push({
      officeKey: office.key,
      title: office.title,
      organizationId: null,
      termEvidenceId: latest.id,
    });
  }
  return refs;
}

export function publicOfficesHeldBy(
  world: World,
  personId: EntityId,
): readonly OfficeRef[] {
  const refs: OfficeRef[] = [];
  const elected = (["president", "vice-president"] as const).flatMap(
    (office) => {
      const holder = nationalOfficeHolder(world, office);
      return holder && holder.plan.personId === personId
        ? [
            {
              officeKey: `us-${office}`,
              title:
                office === "president"
                  ? "President of the United States"
                  : "Vice President of the United States",
              organizationId: null,
              termEvidenceId: holder.plan.id,
            } satisfies OfficeRef,
          ]
        : [];
    },
  );
  refs.push(...elected);
  const electedPresident = nationalOfficeHolder(world, "president") !== null;
  refs.push(
    ...openingFederalOffices(world, personId).filter(
      (ref) => !(ref.officeKey === "us-president" && electedPresident),
    ),
  );
  for (const holder of currentStateExecutiveHolders(world)) {
    if (holder.personId !== personId) continue;
    refs.push({
      officeKey: holder.officeKey,
      title: holder.title,
      organizationId: holder.organizationId,
      termEvidenceId: holder.termId,
    });
  }
  const congress = projectCongress(world);
  if (congress) {
    for (const chamber of [congress.house, congress.senate]) {
      for (const seat of chamber.seats) {
        if (
          seat.occupant.kind === "member" &&
          seat.occupant.member.personId === personId
        )
          refs.push({
            officeKey: `${chamber.chamberKey}:${seat.seatKey}`,
            title: seat.occupant.member.title,
            organizationId: chamber.organizationId,
            termEvidenceId: seat.occupant.member.termId,
          });
      }
    }
  }
  return refs.sort((a, b) => a.officeKey.localeCompare(b.officeKey));
}

export interface OfficeHolder {
  readonly personId: EntityId;
  readonly officeKey: string;
  readonly title: string;
}

/** The person currently holding a state's chief executive office, if any. */
export function currentGovernorOf(
  world: World,
  stateUsps: string,
): OfficeHolder | null {
  const holder = currentStateExecutiveHolders(world).find(
    (candidate) => candidate.stateUsps === stateUsps,
  );
  return holder
    ? {
        personId: holder.personId,
        officeKey: holder.officeKey,
        title: holder.title,
      }
    : null;
}

/** The person currently holding the Presidency, if the World records one. */
export function currentPresidentOf(world: World): OfficeHolder | null {
  const elected = nationalOfficeHolder(world, "president");
  if (elected)
    return {
      personId: elected.plan.personId,
      officeKey: "us-president",
      title: "President of the United States",
    };
  const latest = world.history.events
    .filter(
      (event) =>
        event.type === "world.office-tenure" &&
        event.tags.includes("office:us-president") &&
        event.occurredAt <= world.currentDate,
    )
    .at(-1);
  const personId = latest?.participants.find(
    (participant) => participant.role === "focus:subject",
  )?.personId;
  if (!personId) return null;
  const ref = openingFederalOffices(world, personId).find(
    (office) => office.officeKey === "us-president",
  );
  return ref ? { personId, officeKey: ref.officeKey, title: ref.title } : null;
}
