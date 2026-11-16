/**
 * The picture a news story carries: the painted place the story's own record
 * is about, never a stock photo keyed by level and never a face (owner, Oct
 * 14, docs/play-first/LAW.md: "The game paints the photo of the actual
 * story"). A body's vote or meeting shows the room that body sits in, a law
 * the capitol or hall of the government that made it, a business story the
 * business, a home sale the home, a month's change in the town the town's
 * main street. The pictures are the scenes' own backdrops, read through the
 * scenes' own pickers, so a story and a scene at the same place look alike.
 * Rooms are painted empty: no one in a story's picture can disagree with
 * their card.
 */
import { capitolPlaceFor, hasBackdrop } from "./backdrop-places";
import { governmentRoom, officeRoom } from "./government-bodies";
import { backdropFile, homeOf, orgPlace, pictureFor } from "./scene";
import { LEGISLATURE_MODULE_ID } from "../core2/modules/legislature";
import { OFFICES_MODULE_ID } from "../core2/modules/offices";
import { coreAPI } from "../core2/state";
import type { CoreState } from "../core2/types";

/** Noon: a paper's photographs are taken in daylight. */
const NOON = 12 * 60;

export interface StoryPicture {
  /** The picture's address on the bench. */
  readonly url: string;
  /** The painted place it shows. */
  readonly place: string;
  /** The record the picture was chosen from (an office, a law, a business, a household's home). */
  readonly recordId: string;
}

type Facts = Readonly<Record<string, unknown>>;

/** The body a bill on record is in, or undefined when the id names no bill. */
function billBody(core: CoreState, billId: string): string | undefined {
  if (!billId || !core.modules.has(LEGISLATURE_MODULE_ID)) return undefined;
  const bill = coreAPI(core)
    .moduleState(LEGISLATURE_MODULE_ID)
    .table("bills")
    .get(billId) as unknown as { bodyOfficeId?: string } | undefined;
  return bill?.bodyOfficeId;
}

/** The office a term on record is for, or undefined when the id names no term. */
function termOffice(core: CoreState, id: string): string | undefined {
  if (!id.startsWith("term:") || !core.modules.has(OFFICES_MODULE_ID))
    return undefined;
  const term = coreAPI(core)
    .moduleState(OFFICES_MODULE_ID)
    .table("terms")
    .get(id) as unknown as { officeId?: string } | undefined;
  return term?.officeId;
}

/** The place a law's government sits: the nation's Capitol, a state's capitol, the town's hall. */
function lawPlace(lawId: string): string {
  const government = /^law:(US(?:-[A-Z]{2})?)(?::|$)/.exec(lawId)?.[1];
  // A federal law, the nation's or a state's share of it, is Congress's.
  if (government === "US" || /^law:US-[A-Z]{2}:federal:/.test(lawId))
    return "us-capitol-exterior";
  if (government) return capitolPlaceFor(government.slice(3));
  return "city-hall-exterior";
}

/**
 * The painted place a story is about and the record it was chosen from, in
 * the order its facts name them: the body or office that acted, the law, the
 * federal post, the business, then the record the story was printed from (a
 * business it names, a household's home), then the town for a month's change.
 * A government named alone (a budget) shows its largest body's room.
 * Null when the record names nothing a picture can show.
 */
function placeOf(
  core: CoreState,
  facts: Facts,
  sourceRecordIds: readonly string[],
): { place: string; recordId: string } | null {
  const text = (key: string) =>
    typeof facts[key] === "string" ? (facts[key] as string) : "";
  const offices = [
    text("officeId"),
    text("chamber"),
    text("body"),
    ...text("officeIds").split(","),
  ].filter(Boolean);
  // A bill in committee is heard in a committee room; a bill otherwise
  // shows its own body's room.
  if (text("committee") && text("billId"))
    return { place: "committee-hearing-room", recordId: text("billId") };
  const bill = billBody(core, text("billId"));
  if (bill) offices.push(bill);
  for (const officeId of offices) {
    const place = officeRoom(core, officeId);
    if (place) return { place, recordId: officeId };
  }
  // An address is given where its speaker's government sits: an inaugural at
  // the capitol, the President's other addresses to Congress on the House
  // floor, a governor's in their state's capitol.
  // A story about an officeholder (a profile) cites their term: the room of
  // that term's office.
  for (const id of sourceRecordIds) {
    const officeId = termOffice(core, id);
    const place = officeId ? officeRoom(core, officeId) : null;
    if (place) return { place, recordId: id };
  }
  const speaker = text("address:speaker");
  if (speaker) {
    const state = /:US-([A-Z]{2}):/.exec(speaker)?.[1];
    const place = state
      ? capitolPlaceFor(state)
      : text("address:kind") === "inaugural"
        ? "us-capitol-exterior"
        : "us-house-floor";
    return { place, recordId: text("address:event") || speaker };
  }
  if (text("governmentId")) {
    const room = governmentRoom(core, text("governmentId"));
    if (room)
      return {
        place: room.place,
        recordId: room.officeId ?? text("governmentId"),
      };
  }
  if (text("lawId"))
    return { place: lawPlace(text("lawId")), recordId: text("lawId") };
  // A cabinet post is the President's to fill.
  if (text("postId"))
    return { place: "white-house-exterior", recordId: text("postId") };
  const business = orgPlace(core, text("organizationId") || undefined);
  if (business) return { place: business, recordId: text("organizationId") };
  const record = core.durableLog.get(text("sourceRecordId"));
  if (record) {
    const target = record.targetId ? orgPlace(core, record.targetId) : null;
    if (target) return { place: target, recordId: record.targetId! };
    const organization = Object.values(record.facts ?? {}).find((value) =>
      core.organizations.has(value as never),
    );
    const named = organization ? orgPlace(core, organization) : null;
    if (named) return { place: named, recordId: organization! };
    if (record.kind.startsWith("housing.") && record.personIds[0]) {
      const person = core.people.get(record.personIds[0]);
      return {
        place: homeOf(core, record.personIds[0]),
        recordId: person?.householdId ?? record.personIds[0],
      };
    }
  }
  // A death is remembered at the funeral chapel.
  const recordKind = text("recordKind") || (record?.kind ?? "");
  if (/died|death|obituary/.test(recordKind))
    return {
      place: pictureFor(core, "funeral-home-chapel", text("recordId")),
      recordId: text("recordId") || text("sourceRecordId"),
    };
  // Anything else happened in the town: its street, the same one for the
  // same record.
  const recordId =
    text("webRecordId") || text("recordId") || text("sourceRecordId");
  return recordId
    ? { place: pictureFor(core, "main-street", recordId), recordId }
    : null;
}

/** A story's picture, or null when its record names no place the art has painted. */
export function storyPicture(
  core: CoreState,
  facts: Facts,
  sourceRecordIds: readonly string[] = [],
): StoryPicture | null {
  const found = placeOf(core, facts, sourceRecordIds);
  if (!found || !hasBackdrop(found.place)) return null;
  try {
    return {
      url: backdropFile(found.place, NOON, []).url,
      place: found.place,
      recordId: found.recordId,
    };
  } catch {
    return null;
  }
}
