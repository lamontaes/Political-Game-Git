import {
  municipalGovernmentByKey,
  primaryReading,
} from "../simulation/municipal-government";
import { personName } from "../simulation/people";
import type { EntityId, World } from "../simulation/types";
import { proseDate } from "./prose-dates";

/** A read-only paper view of a saved proposal, before chamber introduction. */
export interface MunicipalOrdinancePaper {
  readonly proposalId: EntityId;
  readonly governmentName: string;
  readonly bodyName: string | null;
  readonly title: string;
  readonly sponsor: string;
  readonly proposedAt: string;
  readonly operativeText: string;
  readonly stamp:
    "PROPOSAL · NOT INTRODUCED · NOT LAW" | "INTRODUCED · SEE COUNCIL DOCKET";
  readonly designation: string | null;
}

export function projectMunicipalOrdinancePaper(
  world: World,
  proposalId: EntityId,
): MunicipalOrdinancePaper | null {
  const proposal = world.history.legislativeProposals?.find(
    (record) => record.id === proposalId,
  );
  if (!proposal) return null;
  const government = municipalGovernmentByKey(proposal.governmentKey);
  const sponsor = world.people[proposal.sponsorPersonId];
  if (!government || !sponsor) return null;
  const reading = primaryReading(government);
  const measure = (world.history.legislativeMeasures ?? []).find(
    (record) => record.sourceDocumentKey === proposal.id,
  );
  return {
    proposalId,
    governmentName: reading.displayName,
    bodyName: reading.bodyName,
    title: proposal.title,
    sponsor: personName(sponsor),
    proposedAt: proseDate(proposal.proposedAt),
    operativeText: proposal.operativeText,
    stamp: measure
      ? "INTRODUCED · SEE COUNCIL DOCKET"
      : "PROPOSAL · NOT INTRODUCED · NOT LAW",
    designation: measure?.designation ?? null,
  };
}
