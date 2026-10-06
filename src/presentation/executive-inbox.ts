import {
  governingMatters,
  governingOfficeForPerson,
} from "../simulation/governing/state-governing";
import type { EntityId, World } from "../simulation/types";
import { resolveExecutiveOffice } from "../simulation/executive-work-context";
import {
  BRIEFING_SIGNIFICANT_LIMIT,
  projectGoverningBriefing,
  americanDate,
  type BriefingMatter,
} from "./governing-briefing";
import {
  projectExecutiveWork,
  type ExecutiveWorkItemView,
} from "./executive-work";

export type ExecutiveInboxItem =
  | {
      readonly kind: "governing";
      readonly id: EntityId;
      readonly matter: BriefingMatter;
    }
  | {
      readonly kind: "work";
      readonly id: EntityId;
      readonly work: ExecutiveWorkItemView;
    };

/** One read-only inbox over existing canonical matters and kernel work records.
 * A bill already bound to the holder's governing desk has one decision entry,
 * including after a decision: an older intake cannot offer a second signature.
 * This adapter neither infers office authority nor creates work or attendance. */
export function projectExecutiveInbox(world: World, personId: EntityId) {
  const briefing = projectGoverningBriefing(world, personId);
  const office = governingOfficeForPerson(world, personId);
  const kernelOffice = resolveExecutiveOffice(world);
  const work =
    world.control.kind === "person" &&
    world.control.personId === personId &&
    (!office ||
      (kernelOffice?.pack.office.officeKey === office.officeKey &&
        kernelOffice.jurisdictionId === office.jurisdictionId))
      ? projectExecutiveWork(world)
      : null;
  if (!briefing && !work?.available) return null;
  const canonicalMatters = office
    ? governingMatters(world, office.officeKey).filter(
        (matter) =>
          matter.holderPersonId === personId &&
          (office.termStartedAt === null ||
            matter.openedAt >= office.termStartedAt),
      )
    : [];
  const measures = new Set(
    canonicalMatters.flatMap((matter) =>
      matter.measureId ? [matter.measureId] : [],
    ),
  );
  const governing = [
    ...(briefing?.significant ?? []),
    ...(briefing?.more ?? []),
  ].map((matter) => ({
    kind: "governing" as const,
    id:
      canonicalMatters.find((record) => record.id === matter.id)?.workItemId ??
      matter.id,
    matter,
  }));
  const ids = new Set(governing.map((item) => item.id));
  const duplicatedWorkIds = new Set(
    world.history.workItems
      .filter(
        (record) =>
          record.focus.kind === "legislative-material" &&
          record.focus.targetKey.startsWith("executive-work:measure:") &&
          measures.has(
            record.focus.targetKey.slice(
              "executive-work:measure:".length,
            ) as EntityId,
          ),
      )
      .map((record) => record.id),
  );
  const kernelWork = (work?.items ?? [])
    .filter(
      (item) =>
        item.status !== "completed" &&
        item.status !== "cancelled" &&
        !ids.has(item.id) &&
        !duplicatedWorkIds.has(item.id) &&
        !item.practices.some(
          (practice) =>
            practice.measureId !== null && measures.has(practice.measureId),
        ),
    )
    .map((item) => ({ kind: "work" as const, id: item.id, work: item }));
  const items: readonly ExecutiveInboxItem[] = [...governing, ...kernelWork];
  const workIds = new Set((work?.items ?? []).map((item) => item.id));
  for (const record of world.history.workItems)
    if (record.sourceEntityIds.some((id) => workIds.has(id)))
      workIds.add(record.id);
  const recentWork = workIds.size
    ? world.history.events
        .filter(
          (event) =>
            (event.type === "executive.work-response" ||
              event.type === "executive.work-instruction") &&
            event.involvedEntityIds.some((id) => workIds.has(id)),
        )
        .slice(-BRIEFING_SIGNIFICANT_LIMIT)
        .reverse()
        .map((event) => ({
          date: americanDate(event.occurredAt),
          text: event.summary,
        }))
    : [];
  return {
    officeTitle:
      briefing?.officeTitle ?? (work?.available ? work.officeTitle : ""),
    termLine:
      briefing?.termLine ??
      (work?.available
        ? `Your term runs until ${americanDate(work.endsAt)}.`
        : ""),
    calendarNote: briefing?.calendarNote ?? null,
    chiefOfStaff: briefing?.chiefOfStaff ?? null,
    significant: items.slice(0, BRIEFING_SIGNIFICANT_LIMIT),
    more: items.slice(BRIEFING_SIGNIFICANT_LIMIT),
    recent: [...(briefing?.recent ?? []), ...recentWork],
    canSpendWorkTime: work?.available === true,
  };
}
