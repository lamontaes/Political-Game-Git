import { currentFederalTenure } from "../federal-tenures";
import { projectCongress } from "../living-world/congress";
import { nationalOfficeHolder } from "../national-election-consumer";
import { currentStateExecutiveHolders } from "../nationwide-world/state-executives";
import { seatHolderAt, seatsForCourt } from "../judiciary/courts";
import type { EntityId, World } from "../types";
import type { OfficeRef } from "./types";

/**
 * The public offices a person holds on the World's current date, read from
 * the offices the World already represents. This is detection for the
 * continuity notice only: it grants nothing and never ends a term.
 */

/** Federal offices the World seats by tenure record, not by election record. */
const FEDERAL_TENURE_OFFICES = [
  { key: "us-president", title: "President of the United States" },
  { key: "us-vice-president", title: "Vice President of the United States" },
  { key: "us-chief-justice", title: "Chief Justice of the United States" },
] as const;

/**
 * Every office the World seats on its current date, read once for each World
 * and kept by holder. An appointment weighs the offices of every candidate it
 * considers, and reading Congress and the state executives again for each one
 * cost more with every year a world ran. A World is never edited, so its table
 * never goes stale.
 */
interface OfficeTable {
  /** Offices seated by tenure record, before an election record replaces them. */
  readonly opening: ReadonlyMap<EntityId, readonly OfficeRef[]>;
  readonly elected: ReadonlyMap<EntityId, readonly OfficeRef[]>;
  readonly electedPresident: boolean;
  readonly electedVice: boolean;
  readonly stateExecutive: ReadonlyMap<EntityId, readonly OfficeRef[]>;
  /** Associate justices; the Chief Justice is read from its federal tenure. */
  readonly justices: ReadonlyMap<EntityId, readonly OfficeRef[]>;
  readonly congress: ReadonlyMap<EntityId, readonly OfficeRef[]>;
}

const OFFICE_TABLES = new WeakMap<World, OfficeTable>();

function add(
  table: Map<EntityId, OfficeRef[]>,
  personId: EntityId,
  ref: OfficeRef,
): void {
  const refs = table.get(personId);
  if (refs) refs.push(ref);
  else table.set(personId, [ref]);
}

function officeTable(world: World): OfficeTable {
  const known = OFFICE_TABLES.get(world);
  if (known) return known;
  const opening = new Map<EntityId, OfficeRef[]>();
  for (const office of FEDERAL_TENURE_OFFICES) {
    const tenure = currentFederalTenure(world, office.key);
    if (!tenure) continue;
    add(opening, tenure.personId, {
      officeKey: office.key,
      title: office.title,
      organizationId: null,
      termEvidenceId: tenure.event.id,
    });
  }
  const elected = new Map<EntityId, OfficeRef[]>();
  for (const office of ["president", "vice-president"] as const) {
    const holder = nationalOfficeHolder(world, office);
    if (!holder) continue;
    add(elected, holder.plan.personId, {
      officeKey: `us-${office}`,
      title:
        office === "president"
          ? "President of the United States"
          : "Vice President of the United States",
      organizationId: null,
      termEvidenceId: holder.plan.id,
    });
  }
  const stateExecutive = new Map<EntityId, OfficeRef[]>();
  for (const holder of currentStateExecutiveHolders(world))
    add(stateExecutive, holder.personId, {
      officeKey: holder.officeKey,
      title: holder.title,
      organizationId: holder.organizationId,
      termEvidenceId: holder.termId,
    });
  const justices = new Map<EntityId, OfficeRef[]>();
  for (const seat of world.judiciary?.courts["us-supreme-court"]
    ? seatsForCourt(world, "us-supreme-court")
    : []) {
    if (seat.linkedOfficeId) continue;
    const holder = seatHolderAt(world, seat.seatId);
    if (!holder) continue;
    add(justices, holder.personId, {
      officeKey: seat.seatId,
      title: "Associate Justice of the Supreme Court",
      organizationId: null,
      termEvidenceId: holder.tenureId as EntityId,
    });
  }
  const congress = new Map<EntityId, OfficeRef[]>();
  const seated = projectCongress(world);
  if (seated) {
    for (const chamber of [seated.house, seated.senate]) {
      for (const seat of chamber.seats) {
        if (seat.occupant.kind !== "member") continue;
        add(congress, seat.occupant.member.personId, {
          // Seat keys already carry the chamber: us-house:KY-03, us-senate:KY:class-2.
          officeKey: seat.seatKey,
          title: seat.occupant.member.title,
          organizationId: chamber.organizationId,
          termEvidenceId: seat.occupant.member.termId,
        });
      }
    }
  }
  const table: OfficeTable = {
    opening,
    elected,
    electedPresident: nationalOfficeHolder(world, "president") !== null,
    electedVice: nationalOfficeHolder(world, "vice-president") !== null,
    stateExecutive,
    justices,
    congress,
  };
  OFFICE_TABLES.set(world, table);
  return table;
}

export function publicOfficesHeldBy(
  world: World,
  personId: EntityId,
): readonly OfficeRef[] {
  const table = officeTable(world);
  const refs: OfficeRef[] = [...(table.elected.get(personId) ?? [])];
  refs.push(
    ...(table.opening.get(personId) ?? []).filter(
      (ref) =>
        !(ref.officeKey === "us-president" && table.electedPresident) &&
        !(ref.officeKey === "us-vice-president" && table.electedVice),
    ),
  );
  refs.push(...(table.stateExecutive.get(personId) ?? []));
  refs.push(...(table.justices.get(personId) ?? []));
  refs.push(...(table.congress.get(personId) ?? []));
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
  const tenure = currentFederalTenure(world, "us-president");
  if (tenure?.event.tags.includes("acting:true"))
    return {
      personId: tenure.personId,
      officeKey: "us-president",
      title: "Acting President of the United States",
    };
  const elected = nationalOfficeHolder(world, "president");
  if (elected)
    return {
      personId: elected.plan.personId,
      officeKey: "us-president",
      title: "President of the United States",
    };
  return tenure
    ? {
        personId: tenure.personId,
        officeKey: "us-president",
        title: "President of the United States",
      }
    : null;
}
