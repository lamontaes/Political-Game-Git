import {
  activeCampaignForCandidate,
  candidacyEligibility,
  homeStateUsps,
  districtSeatMustBeNamed,
} from "../simulation";
import { localGoverningBodyIdentityForOfficeKey } from "../simulation/nationwide-world/local-governing-body-candidacy-packs";
import { nominationPlan } from "../simulation/nominations/nomination-rules";
import { municipalSeatChoices } from "../simulation/municipal-seat-identity";
import type {
  DistrictSeatBinding,
  EntityId,
  IsoDate,
  World,
} from "../simulation/types";
import { projectCampaignOffices } from "./campaign-office-discovery";
import { recordedDistrictForOffice } from "./district-selection";
import {
  fileForOffice,
  availableCampaignElectionDate,
} from "./campaign-projection";
import {
  congressCandidacyForPerson,
  fileForCongressSeat,
} from "./congress-candidacy";
import {
  fileForStateExecutiveOffice,
  stateExecutiveCandidacyForPerson,
  stateExecutiveOfficeCalendar,
} from "./nationwide-candidacy";

export interface ClerkOffice {
  readonly key: string;
  readonly officeKey: string;
  readonly title: string;
  readonly writer: "local-or-legislative" | "executive" | "congress";
  readonly eligible: boolean;
  readonly eligibility: string;
  readonly electionDate: IsoDate | null;
  readonly filingDeadline: IsoDate | null;
  readonly filingBasis: "set-for-2026" | "estimated-from-average" | null;
  readonly districtBinding: DistrictSeatBinding | null;
  readonly municipalSeatKey: string | null;
}

/** The same qualification and calendar readers that filing itself consumes. */
export function electionClerkOffices(
  world: World,
  personId: EntityId,
): readonly ClerkOffice[] {
  const person = world.people[personId];
  if (!person) return [];
  const active = activeCampaignForCandidate(world, personId) !== null;
  const stateUsps = homeStateUsps(world, personId);
  const offices: ClerkOffice[] = [];
  for (const office of projectCampaignOffices(world, personId)) {
    const districtBinding =
      recordedDistrictForOffice(world, personId, office.officeKey)?.binding ??
      null;
    const checked = candidacyEligibility(world, {
      personId,
      jurisdictionId: person.homeJurisdictionId,
      officeKey: office.officeKey,
      alreadyACandidate: active,
      ...(districtBinding ? { districtBinding } : {}),
    });
    const seats = municipalSeatChoices(world, personId, office.officeKey);
    const choices = seats.length ? seats : [null];
    const local = localGoverningBodyIdentityForOfficeKey(office.officeKey);
    const needsDistrict = districtSeatMustBeNamed(
      person.homeJurisdictionId,
      office.officeKey,
    );
    const electionDate = availableCampaignElectionDate(
      world,
      person.homeJurisdictionId,
      office.officeKey,
      districtBinding,
    );
    const plan =
      !local && stateUsps && electionDate
        ? nominationPlan(world, {
            stateUsps,
            family: "state-legislature",
            year: Number(electionDate.slice(0, 4)),
            onDate: world.currentDate,
            generalDay: electionDate,
          })
        : null;
    for (const seat of choices) {
      const eligible =
        office.eligible &&
        checked.eligible &&
        (!needsDistrict || districtBinding !== null) &&
        (seat?.eligible ?? true);
      offices.push({
        key: `${office.officeKey}${seat ? `|${seat.key}` : ""}`,
        officeKey: office.officeKey,
        title: `${office.title}${seat ? ` — ${seat.label}` : ""}`,
        writer: "local-or-legislative",
        eligible,
        eligibility:
          needsDistrict && !districtBinding
            ? "Choose a district seat before filing."
            : !checked.eligible
              ? checked.blocks.map((block) => block.reason).join(" ")
              : (seat?.reason ?? office.eligibility),
        electionDate,
        filingDeadline: plan?.known ? plan.filingDeadline : null,
        filingBasis: plan?.known ? plan.filingBasis : null,
        districtBinding,
        municipalSeatKey: seat?.key ?? null,
      });
    }
  }
  const executive = stateExecutiveCandidacyForPerson(world, personId, active);
  if (executive) {
    const calendar = stateExecutiveOfficeCalendar(
      world,
      executive.identity.stateUsps,
    );
    const plan = calendar
      ? nominationPlan(world, {
          stateUsps: executive.identity.stateUsps,
          family: "governor",
          year: Number(calendar.nextElection.slice(0, 4)),
          onDate: world.currentDate,
          generalDay: calendar.nextElection,
        })
      : null;
    offices.push({
      key: executive.identity.officeKey,
      officeKey: executive.identity.officeKey,
      title: executive.identity.title,
      writer: "executive",
      eligible: executive.eligible && calendar !== null,
      eligibility: executive.eligible
        ? "You can run for this office."
        : executive.blocks.map((block) => block.reason).join(" "),
      electionDate: calendar?.nextElection ?? null,
      filingDeadline: plan?.known ? plan.filingDeadline : null,
      filingBasis: plan?.known ? plan.filingBasis : null,
      districtBinding: null,
      municipalSeatKey: null,
    });
  }
  const congress = congressCandidacyForPerson(world, personId, active);
  for (const seat of congress?.seats ?? []) {
    const plan = nominationPlan(world, {
      stateUsps: congress!.stateUsps,
      family:
        seat.identity.seat.chamberKey === "us-house" ? "us-house" : "us-senate",
      year: Number(seat.calendar.nextElection.slice(0, 4)),
      onDate: world.currentDate,
      generalDay: seat.calendar.nextElection,
    });
    offices.push({
      key: seat.identity.officeKey,
      officeKey: seat.identity.officeKey,
      title: seat.identity.title,
      writer: "congress",
      eligible:
        seat.eligible && plan.known && world.currentDate <= plan.filingDeadline,
      eligibility: !seat.eligible
        ? seat.blocks.map((block) => block.reason).join(" ")
        : !plan.known
          ? plan.reason
          : world.currentDate > plan.filingDeadline
            ? "The filing deadline for this election has passed."
            : "You can run for this office.",
      electionDate: seat.calendar.nextElection,
      filingDeadline: plan.known ? plan.filingDeadline : null,
      filingBasis: plan.known ? plan.filingBasis : null,
      districtBinding: null,
      municipalSeatKey: null,
    });
  }
  return offices;
}

/** No alternate eligibility writer or authored election date at this seam. */
export function fileThroughElectionClerk(
  world: World,
  personId: EntityId,
  key: string,
): World {
  const office = electionClerkOffices(world, personId).find(
    (row) => row.key === key,
  );
  if (!office || !office.eligible)
    throw new Error(office?.eligibility ?? "That office is not offered here.");
  switch (office.writer) {
    case "executive":
      return fileForStateExecutiveOffice(world, personId);
    case "congress":
      return fileForCongressSeat(world, personId, office.officeKey);
    case "local-or-legislative":
      return fileForOffice(
        world,
        personId,
        office.districtBinding,
        office.officeKey,
        null,
        office.municipalSeatKey,
      );
  }
}
