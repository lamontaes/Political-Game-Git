import { keyPeopleOf } from "../core2/modules/people";
import type { CoreState, PersonId } from "../core2/types";
import manifest from "../../art/backdrops/manifest.json" with { type: "json" };
import montage from "./data/opening-montage.json" with { type: "json" };
import { backdropFor, homeOf, peopleHere } from "./scene";

/** A place painted in any light (some are painted in one light only). */
const hasBackdrop = (place: string) =>
  (manifest.backdrops as readonly { place: string }[]).some(
    (record) => record.place === place,
  );

const DATA = montage as unknown as {
  first: BeatKind;
  last: BeatKind;
  levels: Record<string, BeatKind>;
  places: Record<string, string[]>;
  mostOfficials: number;
};

/**
 * Where a beat stands: the chamber the address is given in (the President, or
 * the officials named by office on the same floor), or home, where the
 * household hears it. Never a picture chosen from the part's subject (CTO,
 * Nov 19).
 */
export type BeatKind = "chamber" | "officials" | "home";

/** One part of the address, shown: its picture and who stands in it, officials with their office under their name. */
export interface MontageBeat {
  readonly kind: BeatKind;
  readonly place: string;
  readonly backdrop: ReturnType<typeof backdropFor>;
  readonly people: ReturnType<typeof peopleHere>["people"];
  /** The records the beat stands on. */
  readonly sourceRecordIds: readonly string[];
}

/**
 * The kind of each part of an address from its role: the chamber first, home
 * last, and between them the beat its first sentence's level keys to
 * (congress, the Vice President: the officials on the floor; the families:
 * home; anything else: the President in the chamber, where the address is
 * given). A varied address still finds its beats, since they follow the
 * role, not the position.
 */
export function beatKinds(levels: readonly string[]): BeatKind[] {
  if (levels.length <= 1) return [DATA.last];
  return levels.map((level, at) =>
    at === 0
      ? DATA.first
      : at === levels.length - 1
        ? DATA.last
        : (DATA.levels[level] ?? DATA.first),
  );
}

/** Each part's role: the level of its first sentence that is not the salutation. */
export function partLevels(
  sentences: readonly { level: string; part: number }[],
  parts: number,
): string[] {
  return Array.from(
    { length: parts },
    (_, part) =>
      sentences.find((row) => row.part === part && row.level !== "salutation")
        ?.level ?? "occasion",
  );
}

/**
 * The people each part of a speech names, by part: every full person a
 * sentence of the part cites (the Vice President, the Speaker), never the
 * speaker. The montage shows them as that part is spoken (owner, Nov 12: "it
 * was just showing random busts of people ... unless it's people that he's
 * introducing in this speech").
 */
export function namedInParts(
  core: CoreState,
  sentences: readonly { part: number; sourceRecordIds: readonly string[] }[],
  parts: number,
  speakerId: string,
): string[][] {
  return Array.from({ length: parts }, (_, part) => [
    ...new Set(
      sentences
        .filter((row) => row.part === part)
        .flatMap((row) => row.sourceRecordIds)
        .filter((id) => id !== speakerId && core.people.has(id as PersonId)),
    ),
  ]);
}

/**
 * The address as its montage: one beat per part, each a picture with its
 * people from the records, staged where the address is given: the speaker in
 * the chamber, the key people (the Vice President, Congress's leaders) named
 * by office on the floor, and at the end the household at home, hearing it
 * on a set (CTO, Nov 19: never the speaker standing among them).
 */
export function addressMontage(
  core: CoreState,
  personId: string,
  speakerId: string,
  levels: readonly string[],
  minuteOfDay: number,
  /** The people each part names (`namedInParts`): every beat but home adds them. */
  namedByPart: readonly (readonly string[])[] = [],
): MontageBeat[] {
  const named = (id: string) => {
    const row = core.people.get(id as PersonId);
    return row ? `${row.givenName} ${row.familyName}` : null;
  };
  const speaker = named(speakerId);
  const pictureOf = (kind: BeatKind) =>
    (DATA.places[kind] ?? []).find(hasBackdrop);
  // The Vice President first, then the chambers' leaders, the player's
  // governor, and the legislators after (owner, Oct 29: "the Vice President,
  // Congress and the player's governor with a few state legislators").
  const rank = (person: { officeKind: string; leads?: unknown }) =>
    person.officeKind.includes("vice-president")
      ? 0
      : person.leads
        ? 1
        : person.officeKind === "governor"
          ? 2
          : 3;
  // Drawn on the floor: the national key people who are full people.
  const drawable = keyPeopleOf(core, personId as PersonId)
    .filter(
      (person) =>
        person.id !== speakerId && core.people.has(person.id as PersonId),
    )
    .sort((a, b) => rank(a) - rank(b));
  const ofState = (person: { officeKind: string }) =>
    person.officeKind === "governor" ||
    person.officeKind.startsWith("legislature-");
  const national = drawable.filter((person) => !ofState(person));
  const key = national.length ? national : drawable;
  return beatKinds(levels).map((kind, at) => {
    const namedHere = namedByPart[at] ?? [];
    const place =
      kind === "home" ? homeOf(core, personId, minuteOfDay) : pictureOf(kind);
    const backdrop = backdropFor(core, place ?? "", minuteOfDay, personId);
    const cast: {
      id: string;
      name: string;
      reason: "you" | "household" | "moment";
      /** The office they are named by as the camera passes. */
      role?: string;
    }[] = [];
    const records: string[] = [];
    if (kind === "chamber" && speaker) {
      cast.push({ id: speakerId, name: speaker, reason: "moment" });
      records.push(speakerId);
    } else if (kind === "officials") {
      for (const person of key.slice(0, DATA.mostOfficials)) {
        cast.push({
          id: person.id,
          name: person.name,
          reason: "moment",
          role: person.officeTitle,
        });
        records.push(person.id, ...person.sourceRecordIds);
      }
    } else if (kind === "home") {
      // Only the household, listening: the speaker is on the set, never
      // among them.
      const home = core.households.get(
        core.people.get(personId as PersonId)?.householdId ?? "",
      );
      cast.push({ id: personId, name: named(personId) ?? "", reason: "you" });
      for (const id of home?.memberIds ?? [])
        if (id !== personId && id !== speakerId && core.people.get(id)?.alive) {
          cast.push({ id, name: named(id) ?? "", reason: "household" });
          records.push(id);
        }
    }
    // Whoever the part names is shown as it is spoken (the Vice President
    // when named), unless the beat already holds them or is the home.
    if (kind !== "home")
      for (const id of namedHere)
        if (!cast.some((row) => row.id === id)) {
          cast.push({ id, name: named(id) ?? "", reason: "moment" });
          records.push(id);
        }
    return {
      kind,
      place: place ?? "",
      backdrop,
      people: peopleHere(
        core,
        backdrop.file,
        cast,
        kind === "chamber" ? speakerId : undefined,
      ).people,
      sourceRecordIds: records,
    };
  });
}
