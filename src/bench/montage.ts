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
  /** Parts of a kind of speech that stage differently (the inaugural): its first part and the beats its levels key to. */
  speeches: Record<
    string,
    {
      first?: BeatKind;
      levels?: Record<string, BeatKind>;
      /** Levels whose parts take these beats in turn: America along a route, then the Oval Office, and so on. */
      alternate?: { levels: string[]; kinds: BeatKind[] };
    }
  >;
  /** The kinds of beat the speaker is in the room for (the rest are heard on a set). */
  inRoom: BeatKind[];
  mostOfficials: number;
  mostAmerica: number;
};

export type BeatKind =
  | "chamber"
  | "stand"
  | "desk"
  | "officials"
  | "colonnade"
  | "state"
  | "america"
  | "home";

/** Beats that show the speaker large, and beats that name the key people by office. */
const SPEAKER_KINDS: readonly BeatKind[] = ["chamber", "stand", "desk"];
const OFFICIAL_KINDS: readonly BeatKind[] = ["officials", "colonnade"];

/** One part of the address, shown: its picture and who stands in it, officials with their office under their name. */
export interface MontageBeat {
  readonly kind: BeatKind;
  /** The speaker is in the room (else heard on a set over the beat). */
  readonly inRoom: boolean;
  readonly place: string;
  readonly backdrop: ReturnType<typeof backdropFor>;
  readonly people: ReturnType<typeof peopleHere>["people"];
  /** The records the beat stands on. */
  readonly sourceRecordIds: readonly string[];
}

/**
 * The kind of each part of an address from its role: the desk first, home
 * last, and between them the beat its first sentence's level keys to
 * (occasion: the chamber; country and people: America; congress, the Vice
 * President: the officials; the states: the player's state; the families:
 * home). A varied
 * address still finds its beats, since they follow the role, not the position.
 */
export function beatKinds(
  levels: readonly string[],
  /** The kind of speech: an inaugural is given at the Capitol's stand, with the Oval Office as a cutaway (owner, Nov 23). */
  speechKind?: string,
): BeatKind[] {
  if (levels.length <= 1) return [DATA.last];
  const staged = speechKind ? DATA.speeches[speechKind] : undefined;
  let turn = 0;
  return levels.map((level, at) => {
    if (at === 0) return staged?.first ?? DATA.first;
    if (at === levels.length - 1) return DATA.last;
    const kinds = staged?.alternate?.kinds;
    if (kinds && staged.alternate!.levels.includes(level))
      return kinds[turn++ % kinds.length]!;
    return staged?.levels?.[level] ?? DATA.levels[level] ?? "america";
  });
}

/**
 * Each part's role. The record's part numbers can skip (a block that said
 * nothing leaves a gap), while the parts the player sees are the distinct
 * numbers in order, so the role is read per distinct part, not by number
 * (P8, Nov 23). A part's role is the level of its first sentence that is
 * neither the salutation nor the occasion lead-in a point block may open
 * with, so a stance part keys to its point's level; a part of nothing else
 * is the occasion.
 */
export function partLevels(
  sentences: readonly { level: string; part: number }[],
  parts: number,
): string[] {
  const numbers = [...new Set(sentences.map((row) => row.part))];
  return Array.from({ length: parts }, (_, at) => {
    const rows = sentences.filter(
      (row) => row.part === numbers[at] && row.level !== "salutation",
    );
    return (
      rows.find((row) => row.level !== "occasion")?.level ??
      rows[0]?.level ??
      "occasion"
    );
  });
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
 * people from the records: the speaker in the chamber, the
 * player's own circle across the town, the key people (the Vice President,
 * the chambers' leaders, the player's governor) named by office in the
 * capitol hallway, and the household at home.
 */
export function addressMontage(
  core: CoreState,
  personId: string,
  speakerId: string,
  levels: readonly string[],
  minuteOfDay: number,
  /** The people each part names (`namedInParts`): an "america" beat shows them, and any beat adds them. */
  namedByPart: readonly (readonly string[])[] = [],
  /** The address's kind of speech (`speechKind` of the opening story). */
  speechKind?: string,
): MontageBeat[] {
  const named = (id: string) => {
    const row = core.people.get(id as PersonId);
    return row ? `${row.givenName} ${row.familyName}` : null;
  };
  const speaker = named(speakerId);
  const pictureOf = (kind: BeatKind, turn: number) => {
    const places = DATA.places[kind] ?? [];
    return kind === "america"
      ? places.filter(hasBackdrop)[
          turn % Math.max(places.filter(hasBackdrop).length, 1)
        ]
      : kind === "state"
        ? places
            .map((place) => place.replace("{state}", stateCode))
            .find(hasBackdrop)
        : places.find(hasBackdrop);
  };
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
  const everyKey = keyPeopleOf(core, personId as PersonId)
    .filter((person) => person.id !== speakerId)
    .sort((a, b) => rank(a) - rank(b));
  // Drawn in the Oval Office: the national key people who are full people
  // (the states' part names its own and draws no one).
  const drawable = everyKey.filter((person) =>
    core.people.has(person.id as PersonId),
  );
  // The state's own offices: its governor and its legislature's chambers.
  const ofState = (person: { officeKind: string }) =>
    person.officeKind === "governor" ||
    person.officeKind.startsWith("legislature-");
  const national = drawable.filter((person) => !ofState(person));
  const key = national.length ? national : drawable;
  // The states' part: the player's governor and the state's chamber leaders,
  // named over the state's own capitol (filled in or not: nobody is drawn).
  const statePeople = everyKey
    .filter(
      (person) =>
        ofState(person) &&
        (person.reasons.includes("governor") ||
          person.reasons.includes("chamber-leader")),
    )
    // The governor first, then the chambers' leaders.
    .sort(
      (a, b) =>
        Number(!a.reasons.includes("governor")) -
        Number(!b.reasons.includes("governor")),
    );
  // Their state's capitol; with nobody to name, the generic dome.
  const stateCode = (statePeople[0]?.stateKey ?? "").slice(3).toLowerCase();
  // America: the town's own people, as they are along a route (the full
  // people the town keeps, never the player's household, who wait at home).
  const player = core.people.get(personId as PersonId);
  const household = new Set(
    core.households.get(player?.householdId ?? "")?.memberIds ?? [],
  );
  const known = [...(core.peopleByPlace.get(player?.placeId ?? "") ?? [])]
    .filter(
      (id) =>
        core.people.get(id)?.alive && id !== speakerId && !household.has(id),
    )
    .sort();
  let americaTurn = 0;
  return beatKinds(levels, speechKind).map((kind, at) => {
    const namedHere = namedByPart[at] ?? [];
    const place =
      kind === "home"
        ? homeOf(core, personId, minuteOfDay)
        : pictureOf(kind, kind === "america" ? americaTurn++ : 0);
    const backdrop = backdropFor(core, place ?? "", minuteOfDay, personId);
    const cast: {
      id: string;
      name: string;
      reason: "you" | "household" | "moment";
      /** The office they are named by as the camera passes. */
      role?: string;
      /** The address is a formal occasion for the people it names: they wear formal clothes (owner, Nov 23, P10). */
      formal?: boolean;
    }[] = [];
    const records: string[] = [];
    if (SPEAKER_KINDS.includes(kind) && speaker) {
      cast.push({
        id: speakerId,
        name: speaker,
        reason: "moment",
        formal: true,
      });
      records.push(speakerId);
    } else if (OFFICIAL_KINDS.includes(kind)) {
      const officials = key.slice(0, DATA.mostOfficials);
      for (const person of officials) {
        cast.push({
          id: person.id,
          name: person.name,
          reason: "moment",
          role: person.officeTitle,
          formal: true,
        });
        records.push(person.id, ...person.sourceRecordIds);
      }
    } else if (kind === "state") {
      // The player's own state's officials stand on the strip over their
      // capitol, each with their office.
      for (const person of statePeople) {
        cast.push({
          id: person.id,
          name: person.name,
          reason: "moment",
          role: person.officeTitle,
          formal: true,
        });
        records.push(person.id, ...person.sourceRecordIds);
      }
    } else if (kind === "america" && namedByPart.length) {
      // The people this part names, and no one else: no stranger stands in.
      for (const id of namedHere) {
        cast.push({
          id,
          name: named(id) ?? "",
          reason: "moment",
          formal: true,
        });
        records.push(id);
      }
    } else if (kind === "america") {
      for (const id of known.slice(
        americaTurn * 2 - 2,
        americaTurn * 2 - 2 + DATA.mostAmerica,
      )) {
        cast.push({ id, name: named(id) ?? "", reason: "moment" });
        records.push(id);
      }
    } else if (kind === "home") {
      const home = core.households.get(
        core.people.get(personId as PersonId)?.householdId ?? "",
      );
      cast.push({ id: personId, name: named(personId) ?? "", reason: "you" });
      for (const id of home?.memberIds ?? [])
        if (id !== personId && core.people.get(id)?.alive) {
          cast.push({ id, name: named(id) ?? "", reason: "household" });
          records.push(id);
        }
    }
    // Whoever the part names is shown as it is spoken (the Vice President
    // when named), unless the beat already holds them or is the home.
    // The President at work in the Oval Office stands alone: the people a part
    // names are not drawn into that cutaway.
    if (kind !== "home" && kind !== "desk")
      for (const id of namedHere)
        if (!cast.some((row) => row.id === id)) {
          cast.push({
            id,
            name: named(id) ?? "",
            reason: "moment",
            formal: true,
          });
          records.push(id);
        }
    return {
      kind,
      inRoom: DATA.inRoom.includes(kind),
      place: place ?? "",
      backdrop,
      people: peopleHere(
        core,
        backdrop.file,
        cast,
        SPEAKER_KINDS.includes(kind) ? speakerId : undefined,
      ).people,
      sourceRecordIds: records,
    };
  });
}
