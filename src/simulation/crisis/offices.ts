import { currentFederalTenure } from "../federal-tenures";
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

/** Federal offices the World seats by tenure record, not by election record. */
const FEDERAL_TENURE_OFFICES = [
  { key: "us-president", title: "President of the United States" },
  { key: "us-vice-president", title: "Vice President of the United States" },
  { key: "us-chief-justice", title: "Chief Justice of the United States" },
] as const;

function openingFederalOffices(world: World, personId: EntityId): OfficeRef[] {
  const refs: OfficeRef[] = [];
  for (const office of FEDERAL_TENURE_OFFICES) {
    const tenure = currentFederalTenure(world, office.key);
    if (tenure?.personId !== personId) continue;
    refs.push({
      officeKey: office.key,
      title: office.title,
      organizationId: null,
      termEvidenceId: tenure.event.id,
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
  const electedVice = nationalOfficeHolder(world, "vice-president") !== null;
  refs.push(
    ...openingFederalOffices(world, personId).filter(
      (ref) =>
        !(ref.officeKey === "us-president" && electedPresident) &&
        !(ref.officeKey === "us-vice-president" && electedVice),
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
            // Seat keys already carry the chamber: us-house:KY-03, us-senate:KY:class-2.
            officeKey: seat.seatKey,
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
  const tenure = currentFederalTenure(world, "us-president");
  return tenure
    ? {
        personId: tenure.personId,
        officeKey: "us-president",
        title: "President of the United States",
      }
    : null;
}
