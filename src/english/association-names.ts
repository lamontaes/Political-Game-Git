/**
 * The name of an association the residents founded. The core stores a founded
 * cause group under a structured key; what a player reads is composed here
 * from the association-names bank (`data/english/parts/association-names.json`),
 * naming its place and, when it was founded over a named organization, that
 * organization. The pick between wordings is stable per group, from its id,
 * never a roll.
 */
import bankJson from "../../data/english/parts/association-names.json" with { type: "json" };
import drivesData from "../core2/data/drives.json" with { type: "json" };
import { corePlaceByJurisdictionId } from "../core2/place-lookup";
import type { CoreState } from "../core2/types";
import { heldByGrades } from "./english-grades";

interface NamePart {
  key: string;
  move: string;
  text: string;
  shippable: boolean;
}
const PARTS = (bankJson as unknown as { parts: NamePart[] }).parts;

/** A stable number from a group's id, so the same group is always worded the same. */
function stable(id: string): number {
  let hash = 2166136261;
  for (const char of id) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return hash >>> 0;
}

/** An organization's name as a player reads it: a founded group is worded by the bank. */
export function organizationName(
  core: Readonly<CoreState>,
  organizationId: string,
): string | undefined {
  const org = core.organizations.get(organizationId);
  if (!org) return undefined;
  if (org.kind !== drivesData.causeGroupKind) return org.name;
  const place = corePlaceByJurisdictionId(org.placeId as never)?.displayName;
  const topic = org.topic ? core.organizations.get(org.topic)?.name : undefined;
  const move = topic ? "association-name-topic" : "association-name-plain";
  const rows = PARTS.filter(
    (part) => part.move === move && part.shippable && !heldByGrades(part.key),
  );
  const row = rows[stable(org.id) % rows.length];
  if (!row || !place) return undefined;
  return row.text.replace("{place}", place).replace("{topic}", topic ?? "");
}
