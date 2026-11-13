import { ADDRESS_FACT, ADDRESS_PART_BREAK } from "./opening-facts";
import { speechOfRecord } from "./local-speeches";
import { familyFactsOf } from "../core2/modules/people";
import { corePlaceByJurisdictionId } from "../core2/place-lookup";
import { P } from "../core2/parameters";
import type { CoreState, PersonId } from "../core2/types";
import { relationPhrase } from "../english/journal-words";
import { causeRecordFacts } from "./cause-facts";
import {
  sceneParagraph,
  wordSceneLine,
  type Fact,
  type SceneLine,
  type NarrationMove,
  type SceneWords,
} from "../english/scene-words";
import type { Director } from "./ledger";
import {
  SITUATION_LIBRARY,
  type SceneBinding,
  type ScheduleEntry,
} from "./scheduling";
import { properName, spoken } from "./words";
import { dayOpening, daySince } from "../english/day-words";
import { officeWords } from "../english/said-as";
import { outletsHere } from "../core2/modules/press";
import { coreAPI } from "../core2/state";
import localAddressData from "./data/local-address.json" with { type: "json" };

const zero = P.zero;

/** `data/scene-rows.json`: the scene's structure, holding no sentences. */
export interface SceneRows {
  version: string;
  and: string;
  settings: readonly string[];
  leads: readonly string[];
  causes: readonly string[];
  /** The moves that open a scene, each narrated by the bank's opening sentences. */
  openings?: readonly string[];
  /** The setting kinds the first line of a scene (day, place, person) is worded for. */
  arrivals?: readonly string[];
}
export type { SceneLine };

export interface Scene {
  momentId: string;
  typeKey: string;
  setting: { kind: string; recordId: string };
  presentIds: PersonId[];
  /** Why each person present is there: the fill of the role that cast them. */
  presentReasons: Record<PersonId, string>;
  /**
   * The narrator's opening: one short paragraph (the day, the setting, who is
   * there, what led here), then the characters play the scene out.
   */
  narration: SceneLine[];
  /**
   * The scene's first line, naming the day, the place and the person the
   * player meets (owner, Nov 8). It is the narration's first sentence; a
   * scene that plays another narrator's words (an exchange with a purpose)
   * opens on it unless those words already name the day.
   */
  arrival?: SceneLine;
  /** The person who opens the scene and whom the conversation is with. */
  talkToId?: PersonId;
  /**
   * A speech the scene is about, in the words its record kept (the address
   * the English engine composed): the speaker gives it in the scene.
   */
  speech?: SceneLine & {
    speakerId: PersonId;
    /** The speech in the parts the talk box plays, one per Continue. */
    parts: readonly string[];
    /** Played over the address montage (the President's), else in the scene's own room. */
    montage: boolean;
    /** The speech is the scene's opening line (a floor speech), so the exchange after it does not open with the speaker's own line too. */
    opens: boolean;
    /** Given in the room the scene is in (a floor or a stump speech), not heard on a screen at home. */
    inRoom: boolean;
    /** The speaker's office as the said-as words key it ("governor"): the nameplate says them by it first. */
    office?: string;
    /** The station that carried it home, and its kind (television, radio, newspaper): the talk box names it over each part with its icon. */
    heardOn?: { station: string; medium: string };
  };
  /** The scene's occasion from its type's data ("ceremony"), for how the room is drawn. */
  occasion?: string;
}

/** Whether two people share a household. */
function livesWith(
  core: Readonly<CoreState>,
  personId: string,
  otherId: string,
): boolean {
  const person = core.people.get(personId as PersonId);
  return (
    !!person &&
    (core.households.get(person.householdId)?.memberIds ?? []).includes(
      otherId as PersonId,
    )
  );
}

export function composeScene(
  core: Readonly<CoreState>,
  director: Director,
  personId: PersonId,
  entry: ScheduleEntry,
  words?: SceneWords,
  /** The minute of the day the scene plays at; without it, the moment's stop or the day's start. */
  minuteOfDay?: number,
): Scene | null {
  const book = director.ledger.people.get(personId);
  const moment = book?.momentsById.get(entry.momentId);
  const person = core.people.get(personId);
  if (!moment || !person) return null;
  // A moment no situation type binds still plays: at home, with the people
  // who live there, about what happened (audit 1: it used to throw).
  const living = (
    core.households.get(person.householdId)?.memberIds ?? []
  ).filter((id) => core.people.get(id)?.alive);
  const binding: SceneBinding = entry.bindings[zero] ?? {
    typeKey: "unbound",
    roles: [],
    presentIds: living,
    presentReasons: Object.fromEntries(
      living.map((id) => [id, "household"]),
    ) as Record<PersonId, string>,
    setting: { kind: "home", recordId: person.householdId },
    timing: "now",
    openUntil: moment.date,
  };

  const relation = familyFactsOf(person);
  const named = new Set<PersonId>();
  // Someone in the scene, as you know them: by relation, else by name.
  const who = (id: PersonId): Fact | null => {
    const row = core.people.get(id);
    if (!row) return null;
    const kin = relation.get(id);
    const phrase = kin
      ? relationPhrase(kin.relation, row.looks?.gender ?? "other", "scene")
      : undefined;
    if (kin && phrase) return { text: phrase, sourceRecordIds: [kin.factId] };
    if (!person.knownIds.has(id)) return null;
    const first = !named.has(id);
    named.add(id);
    return {
      text: first ? `${row.givenName} ${row.familyName}` : row.givenName,
      sourceRecordIds: [person.knownIdSources?.[id]?.sourceFactId ?? id],
    };
  };
  const place = (id: string): Fact | null => {
    const row = corePlaceByJurisdictionId(id as never);
    return row ? { text: spoken(row), sourceRecordIds: [id] } : null;
  };

  // What the moment's own record names (the office, the bill, the employer
  // that called), read once for the lead and the cause.
  let recordFacts: Record<string, Fact> | undefined;
  const fromRecord = () =>
    (recordFacts ??= causeRecordFacts(core, moment.causeId));

  // The narrator's lines are the English engine's: the director says which
  // line it is and what the records give it.
  const render = (
    move: NarrationMove,
    facts: Record<string, Fact> | (() => Record<string, Fact>),
    momentKey: string,
    stage?: (facts: Record<string, Fact>) => string,
  ): SceneLine | null =>
    wordSceneLine({
      seed: core.seed,
      move,
      viewerId: personId,
      facts,
      ...(stage ? { stage } : {}),
      momentKey,
      fallbackSourceId: moment.causeId,
      ...(words ? { words } : {}),
    });

  // Every scene opens on one line that names the day, the place and the
  // person the player meets (owner, Nov 8: "If it's June 7th, it says first
  // thing on June 7th. You head to the clerk's office and speak to Maria
  // Patton. And then it starts like that."), which replaces the line that
  // only said a call or a letter. It supersedes Oct 26 and 27's "never the
  // day or the place", which were about restating the screen's own labels.
  const sentences: SceneLine[] = [];
  const { kind } = binding.setting;

  // Nobody is announced as merely there;
  // the scene's lead says who came and why.
  const opener = binding.roles.find((row) => row.role === binding.opener);

  // What is happening, from the staged situation's type. It names only
  // someone the scene places in the room: not the person a funeral is for.
  // A speech heard (the address on the evening news) is its speaker's own
  // words: no talk opens with them and no lead stands in for them.
  const talkToId = binding.said
    ? undefined
    : (opener?.personIds.find((id) => id !== personId) ??
      moment.counterpartIds.find((id) => binding.presentIds.includes(id)));
  const meeting = talkToId ? core.people.get(talkToId) : undefined;
  const settingOrg =
    kind === "workplace" || kind === "office" || kind === "school"
      ? core.organizations.get(binding.setting.recordId)
      : undefined;
  const arrival = render(
    { part: "arrival", kind },
    () => {
      const facts: Record<string, Fact> = {
        begins: {
          text: dayOpening(
            core.date,
            minuteOfDay ??
              entry.stop?.at.minuteOfDay ??
              core.data.parameters.playerDayStartMinute!.value,
          ),
          sourceRecordIds: [moment.id],
        },
      };
      // A record made on an earlier day (a call that came in the evening,
      // played the next morning) is told as past: "yesterday".
      const since = daySince(moment.date, core.date);
      if (since) facts.since = { text: since, sourceRecordIds: [moment.id] };
      if (meeting)
        facts.name = {
          text: `${meeting.givenName} ${meeting.familyName}`,
          sourceRecordIds: [meeting.id],
        };
      if (settingOrg)
        facts.where = {
          text: properName(settingOrg.name),
          sourceRecordIds: [settingOrg.id],
        };
      return facts;
    },
    `${moment.id}:arrival`,
    // Someone who lives with the player does not arrive: they are home, so
    // the day opens as it does alone and the scene's lead says who is there.
    (facts) =>
      facts.name && !(meeting && livesWith(core, personId, meeting.id))
        ? "other"
        : "alone",
  );
  // The call or letter line is the fallback when no arrival is worded.
  const setting = arrival
    ? null
    : render(
        { part: "setting", kind },
        (): Record<string, Fact> => {
          const writer = talkToId ? who(talkToId) : null;
          return writer ? { who: writer } : {};
        },
        `${moment.id}:setting`,
      );
  if (arrival) sentences.push(arrival);
  else if (setting) sentences.push(setting);
  // Said in full once, so later lines call them by their first name.
  if (talkToId && arrival?.usedFactKeys?.includes("name")) named.add(talkToId);
  const wasNamed = talkToId ? named.has(talkToId) : false;
  // Whom the moment is about when they are not the one in the room: the one
  // mourned, the one missing from the table, the newcomer.
  const aboutId = moment.counterpartIds.find(
    (id) => id !== talkToId && id !== personId,
  );
  const aboutWasNamed = aboutId ? named.has(aboutId) : false;
  const lead = binding.said
    ? null
    : render(
        {
          part: "lead",
          typeKey: binding.typeKey,
          setting: binding.setting.kind,
        },
        () => {
          const facts: Record<string, Fact> = { ...fromRecord() };
          const other = talkToId ? who(talkToId) : null;
          if (other) facts.other = other;
          const about = aboutId ? who(aboutId) : null;
          if (about) facts.about = about;
          // The school or workplace the scene is set at, by its record.
          if (settingOrg)
            facts.where = {
              text: properName(settingOrg.name),
              sourceRecordIds: [settingOrg.id],
            };
          const job = person.jobId ? core.jobs.get(person.jobId) : undefined;
          const org = job
            ? core.organizations.get(job.organizationId)
            : undefined;
          if (org)
            facts.employer = {
              text: properName(org.name),
              sourceRecordIds: [org.id],
            };
          const town = place(person.placeId);
          if (town) facts.place = town;
          return facts;
        },
        `${moment.id}:lead`,
        (facts) => (facts.other ? "other" : "alone"),
      );
  if (lead) sentences.push(lead);
  // A lead that did not say the name leaves it unsaid: the next line to name
  // them says it in full.
  if (talkToId && !wasNamed && !lead?.usedFactKeys?.includes("other"))
    named.delete(talkToId);
  if (aboutId && !aboutWasNamed && !lead?.usedFactKeys?.includes("about"))
    named.delete(aboutId);

  // How the scene opens, from its first move: the one who opens it and
  // what they came to do ("Your mother has something to tell you.").
  const openerId = opener?.personIds.find((id) => id !== personId);
  const openerFact = openerId ? who(openerId) : null;
  const openingLine =
    binding.opening && openerFact
      ? render(
          { part: "opening", move: binding.opening },
          { who: openerFact },
          `${moment.id}:opening`,
        )
      : null;
  // A lead that names the one who opens the scene has already said who came
  // and why; the opening would say it again ("Your mother has news for you.
  // Your mother has something to tell you.").
  const leadNamedOpener =
    !!openerId &&
    openerId === talkToId &&
    !!lead?.usedFactKeys?.includes("other");
  const opening = leadNamedOpener ? null : openingLine;

  // What led here, from the moment's cause, about someone else or the
  // player. News the opener is about to tell is left to them to tell.
  const toTell = openingLine !== null && binding.opening === "tell";
  const otherId = moment.counterpartIds[zero];
  const cause = toTell
    ? null
    : render(
        { part: "cause", label: moment.label },
        () => {
          const facts: Record<string, Fact> = { ...fromRecord() };
          const other = otherId ? who(otherId) : null;
          if (other) facts.other = other;
          const job = person.jobId ? core.jobs.get(person.jobId) : undefined;
          const org = core.jobs.get(moment.causeId)
            ? core.organizations.get(
                core.jobs.get(moment.causeId)!.organizationId,
              )
            : job
              ? core.organizations.get(job.organizationId)
              : undefined;
          if (org)
            facts.employer = {
              text: properName(org.name),
              sourceRecordIds: [org.id],
            };
          const town = place(person.placeId);
          if (town) facts.place = town;
          // A law's effect learned: which law, by its bill's name or what
          // it is about, and what the household paid or got back under it,
          // from the learned record (place-prices: refund minus charge).
          const learned = core.durableLog.get(moment.causeId);
          if (learned?.kind === "law.effect-learned") {
            const moved = Number(learned.facts?.movedMinor ?? P.zero);
            if (Number.isFinite(moved) && moved !== P.zero)
              facts[moved < P.zero ? "cost" : "refund"] = {
                text: new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                }).format(Math.abs(moved) / P.minorPerDollar),
                sourceRecordIds: [moment.causeId],
              };
          }
          return facts;
        },
        `${moment.id}:cause`,
        (facts) => (facts.other && otherId !== personId ? "other" : "self"),
      );
  if (cause) sentences.push(cause);
  if (opening) sentences.push(opening);
  // A broadcast heard at home (an address a governor or a town's head gave):
  // the narrator says how it reached the player, from the outlets the place
  // keeps, and names the speaker by office. One staging rule any broadcast
  // can use.
  const heardHow = heardLine(core, moment.causeId, (move, facts) =>
    render(move, facts, `${moment.id}:heard`),
  );
  if (heardHow) sentences.push(heardHow);

  // The sentences are one paragraph, so the narrator sets the scene before
  // anyone speaks.
  const narration: SceneLine[] = sentences.length
    ? [
        {
          text: sceneParagraph(sentences),
          parts: sentences.flatMap((line) => line.parts ?? []),
          // A sitting that took in a later cause the same day cites it too.
          // The sentence of what led here cites the record that led here,
          // whatever facts it names ("Your daughter has been born." named the
          // daughter by the family record and cited no birth, Neillsville,
          // Wisconsin, seed birth-n1).
          sourceRecordIds: [
            ...new Set([
              ...sentences.flatMap((line) => line.sourceRecordIds),
              // The scene is staged from its cause, said or not.
              moment.causeId,
              ...(binding.joined ?? []).map((row) => row.causeId),
            ]),
          ],
        },
      ]
    : [];
  // A speech's own words: an address's as its record kept them, a floor or
  // campaign speech composed from its record by the one planner.
  const record = core.durableLog.get(moment.causeId);
  const castIds = binding.roles.flatMap((row) => row.personIds);
  const speechText = record?.facts?.[ADDRESS_FACT.text];
  // The speaker is the person, or the one the scene's `said` role holds: the
  // President's opening names them as President, every other address as speaker.
  const speakerId =
    record?.facts?.[ADDRESS_FACT.speaker] ??
    record?.facts?.[ADDRESS_FACT.president];
  const heard = record
    ? speechOfRecord(core as CoreState, record, castIds)
    : null;
  const speech =
    typeof speechText === "string" &&
    speechText &&
    speakerId &&
    (speakerId === personId ||
      binding.roles.some(
        (row) =>
          row.role === binding.said &&
          row.personIds.includes(speakerId as PersonId),
      ))
      ? {
          speakerId: speakerId as PersonId,
          text: speechText,
          // Played one part per Continue; a speech kept whole is one part.
          parts: String(record!.facts?.[ADDRESS_FACT.parts] ?? speechText)
            .split(ADDRESS_PART_BREAK)
            .filter(Boolean),
          sourceRecordIds: [record!.id],
          // The President's address plays over its montage (the desk, the
          // colonnade, the country); a governor's or a town's is heard at
          // home, as the narrator says (`heardLine`), its speaker not drawn.
          montage: !!record!.facts?.[ADDRESS_FACT.president],
          opens: false,
          inRoom: false,
          ...((carried) =>
            carried
              ? {
                  heardOn: {
                    station: properName(carried.org.name),
                    medium: carried.medium,
                  },
                }
              : {})(heardOn(core, record!.id)),
          ...(record!.facts?.[ADDRESS_FACT.office] ||
          record!.facts?.[ADDRESS_FACT.president]
            ? {
                office:
                  record!.facts?.[ADDRESS_FACT.office] ??
                  ADDRESS_PRESIDENT_OFFICE,
              }
            : {}),
        }
      : heard && heard.speakerId !== personId
        ? { ...heard, montage: false, inRoom: true }
        : undefined;
  const occasion = OCCASIONS.get(binding.typeKey);
  return {
    momentId: moment.id,
    typeKey: binding.typeKey,
    setting: binding.setting,
    ...(arrival ? { arrival } : {}),
    presentIds: binding.presentIds,
    presentReasons: binding.presentReasons ?? {},
    narration,
    ...(talkToId ? { talkToId } : {}),
    ...(speech ? { speech } : {}),
    ...(occasion ? { occasion } : {}),
  };
}

/**
 * How a broadcast reached the player at home: the narrator's line naming the
 * outlet that carried it, from the place's own outlets by the order the
 * director's data gives (television, then radio, then the paper the next
 * morning), and the speaker by office first. Null for a record that is no
 * broadcast heard at home (the President's address plays as its montage) or
 * a place with no outlet on record.
 */
export function heardLine(
  core: Readonly<CoreState>,
  recordId: string,
  render: (
    move: { part: "opening"; move: string },
    facts: Record<string, Fact>,
  ) => SceneLine | null,
): SceneLine | null {
  const record = core.durableLog.get(recordId);
  const office = record?.facts?.[ADDRESS_FACT.office];
  const speakerId = record?.facts?.[ADDRESS_FACT.speaker];
  const occasion = HEARD.occasions[record?.facts?.[ADDRESS_FACT.kind] ?? ""];
  const speaker = speakerId ? core.people.get(speakerId as PersonId) : null;
  if (!record || !office || !speaker || !occasion) return null;
  const carried = heardOn(core, recordId);
  if (!carried) return null;
  {
    const { medium, outlet, org } = carried;
    const title = officeWords(office)?.before;
    return render(
      { part: "opening", move: `heard-${medium}` },
      {
        speaker: {
          text: `${title ? `${title} ` : ""}${speaker.givenName} ${speaker.familyName}`,
          sourceRecordIds: [speaker.id, record.id],
        },
        occasion: { text: occasion, sourceRecordIds: [record.id] },
        outlet: {
          text: properName(org.name),
          sourceRecordIds: [outlet.id, org.id],
        },
      },
    );
  }
}

/**
 * The outlet that carried a broadcast to the player's home: the first of the
 * place's own outlets in the order local-address.json `heard` gives. Its
 * station is what the talk box names over the line (owner, Oct 14: "News you
 * overhear: TV or radio speaks like anyone else: a small card in the
 * conversation text style with a tiny radio/TV icon, the station, and the
 * line.").
 */
export function heardOn(core: Readonly<CoreState>, recordId: string) {
  const record = core.durableLog.get(recordId);
  if (!record?.facts?.[ADDRESS_FACT.office]) return null;
  const api = coreAPI(core as CoreState);
  const here = core.people.get(core.playerId ?? ("" as PersonId))?.placeId;
  const outlets = outletsHere(api).filter(
    (row) => row.tier !== "national" && (!here || row.placeId === here),
  );
  for (const medium of HEARD.order) {
    const outlet = outlets.find((row) => row.kind === medium);
    const org = outlet ? core.organizations.get(outlet.organizationId) : null;
    if (outlet && org) return { medium, outlet, org };
  }
  return null;
}
const HEARD = localAddressData.heard as unknown as {
  order: readonly string[];
  occasions: Readonly<Record<string, string>>;
};

/** The said-as office key the President's address names its speaker by. */
const ADDRESS_PRESIDENT_OFFICE = "president";

/** Each situation type's occasion, where its data names one. */
const OCCASIONS: ReadonlyMap<string, string> = new Map(
  SITUATION_LIBRARY.types.flatMap((row) =>
    row.occasion ? [[row.key, row.occasion] as const] : [],
  ),
);
