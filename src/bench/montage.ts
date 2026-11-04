import { keyPeopleOf } from "../core2/modules/people";
import type { CoreState, PersonId } from "../core2/types";
import manifest from "../../art/backdrops/manifest.json" with { type: "json" };
import montage from "./data/opening-montage.json" with { type: "json" };
import { backdropFor, homeOf, stagePeople } from "./scene";

/** A place painted in any light (the Oval Office address is painted at night only, the colonnade in the morning only). */
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
  mostAmerica: number;
};

export type BeatKind =
  "oval-desk" | "colonnade" | "officials" | "state" | "america" | "home";

/** One part of the address, shown: its picture, who stands in it, and the office-and-name line for officials. */
export interface MontageBeat {
  readonly kind: BeatKind;
  readonly place: string;
  readonly backdrop: ReturnType<typeof backdropFor>;
  readonly people: ReturnType<typeof stagePeople>["people"];
  /** Officials named by office as the camera passes; null where the beat names no one. */
  readonly caption: string | null;
  /** The records the beat stands on. */
  readonly sourceRecordIds: readonly string[];
}

/**
 * The kind of each part of an address from its role: the desk first, home
 * last, and between them the beat its first sentence's level keys to
 * (occasion: the colonnade; country and people: America; congress, the Vice
 * President: the officials; the states: the player's state; the families:
 * home). A varied
 * address still finds its beats, since they follow the role, not the position.
 */
export function beatKinds(levels: readonly string[]): BeatKind[] {
  if (levels.length <= 1) return [DATA.last];
  return levels.map((level, at) =>
    at === 0
      ? DATA.first
      : at === levels.length - 1
        ? DATA.last
        : (DATA.levels[level] ?? "america"),
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
 * The address as its montage: one beat per part, each a picture with its
 * people from the records: the speaker at the desk and on the colonnade, the
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
  return beatKinds(levels).map((kind) => {
    const place =
      kind === "home"
        ? homeOf(core, personId, minuteOfDay)
        : pictureOf(kind, kind === "america" ? americaTurn++ : 0);
    const backdrop = backdropFor(core, place ?? "", minuteOfDay, personId);
    const cast: {
      id: string;
      name: string;
      reason: "you" | "household" | "moment";
    }[] = [];
    let caption: string | null = null;
    const records: string[] = [];
    if ((kind === "oval-desk" || kind === "colonnade") && speaker) {
      cast.push({ id: speakerId, name: speaker, reason: "moment" });
      records.push(speakerId);
    } else if (kind === "officials") {
      const officials = key.slice(0, DATA.mostOfficials);
      for (const person of officials) {
        cast.push({ id: person.id, name: person.name, reason: "moment" });
        records.push(person.id, ...person.sourceRecordIds);
      }
      caption = officials
        .map((person) => `${person.officeTitle} ${person.name}`)
        .join(" · ");
    } else if (kind === "state") {
      for (const person of statePeople)
        records.push(person.id, ...person.sourceRecordIds);
      caption = statePeople.length
        ? statePeople
            .map((person) => `${person.officeTitle} ${person.name}`)
            .join(" · ")
        : null;
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
    return {
      kind,
      place: place ?? "",
      backdrop,
      people: stagePeople(
        core,
        backdrop.file,
        cast,
        kind === "oval-desk" ? speakerId : undefined,
        kind === "oval-desk" ? "address" : undefined,
      ).people,
      caption,
      sourceRecordIds: records,
    };
  });
}
