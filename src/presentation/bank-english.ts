/**
 * Lines composed from the merged English part banks (schema english-parts/1).
 * Every line is one bank part with its slots filled from a real World record;
 * nothing is written here. A part is chosen by a stable hash of a record id,
 * never by a roll. Pure: reads the world, never advances time or writes.
 */
import hearingBank from "../../data/english/parts/hearing.json" with { type: "json" };
import legislationBank from "../../data/english/parts/legislation.json" with { type: "json" };
import meetingBank from "../../data/english/parts/meeting.json" with { type: "json" };
import minutesBank from "../../data/english/parts/minutes.json" with { type: "json" };
import noticesBank from "../../data/english/parts/notices.json" with { type: "json" };
import newspaperLedesBank from "../../data/english/parts/newspaper-ledes.json" with { type: "json" };
import winningLosingBank from "../../data/english/parts/winning-losing.json" with { type: "json" };
import type { EntityId, World } from "../simulation";
import { personName, spokenDate } from "../simulation";
import { postedMeetingVoteSentence } from "../simulation/living-world/local-council-meetings";
import { homeLocalGovernmentUnits } from "../simulation/nationwide-world/local-governments";
import { governmentUnitJurisdictionId } from "../simulation/government-units";
import {
  organizationIdFor,
  sittingLocalOfficers,
} from "../simulation/living-world/local-government-seats";
import { organizationNameAt } from "../simulation/living-world/party-registry";
import {
  heldByGrades,
  PART_GRADES,
  type PartGradeLedger,
} from "./english-grades";

export interface EnglishPart {
  readonly key: string;
  readonly move: string;
  readonly kind: string;
  readonly text: string;
  readonly shippable: boolean;
}
export interface EnglishBank {
  readonly parts: readonly EnglishPart[];
}

export interface BankLine {
  readonly kind: string;
  /** Plain words describing the real record; never an id. */
  readonly situation: string;
  readonly text: string;
  readonly partKey: string;
}
/** Up to three lines, or the reason naming the record that is missing. */
export type BankReading = readonly BankLine[] | string;

const PER_KIND = 3;

/** A stable 32-bit string hash (FNV-1a). */
export function stableHash(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

function slotsOf(text: string): string[] {
  return [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]!);
}

export function composeFromBank(
  bank: EnglishBank,
  move: string,
  facts: Record<string, string>,
  pickKey: string,
  /** Parts whose words claim something the records do not hold. */
  excludes?: RegExp,
  /** The owner's grades; a part they held back is not chosen. */
  grades: PartGradeLedger = PART_GRADES,
): { text: string; partKey: string } | null {
  const fits = bank.parts.filter(
    (part) =>
      part.shippable &&
      !heldByGrades(part.key, grades) &&
      !heldByGrades(`bank:${part.key}`, grades) &&
      !excludes?.test(part.text) &&
      part.move === move &&
      slotsOf(part.text).every((slot) => (facts[slot] ?? "").trim() !== ""),
  );
  if (fits.length === 0) return null;
  const part = fits[stableHash(pickKey) % fits.length]!;
  const text = part.text.replace(/\{(\w+)\}/g, (_m, slot: string) =>
    facts[slot]!.trim(),
  );
  return { text, partKey: part.key };
}

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function weekdayOf(date: string): string {
  const [y, m, d] = date.slice(0, 10).split("-").map(Number);
  return WEEKDAYS[new Date(Date.UTC(y!, m! - 1, d!)).getUTCDay()]!;
}

function nameList(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

interface LocalBody {
  readonly organizationId: EntityId;
  readonly jurisdictionId: EntityId;
  readonly bodyName: string;
  readonly chair: string;
  readonly members: readonly string[];
}

/** The player's own town (else county) governing body, from its recorded seats. */
function localBody(
  world: World,
  playerId: EntityId,
  jurisdictionId?: EntityId,
): LocalBody | null {
  const home = homeLocalGovernmentUnits(world, playerId);
  for (const unit of [...home.municipal, ...home.counties]) {
    if (jurisdictionId && governmentUnitJurisdictionId(unit) !== jurisdictionId)
      continue;
    const organizationId = organizationIdFor(world, unit);
    if (!organizationId) continue;
    const bodyName = organizationNameAt(world, organizationId);
    const officers = sittingLocalOfficers(world, unit).filter(
      (officer) => world.people[officer.personId],
    );
    if (!bodyName || officers.length === 0) continue;
    const head =
      officers.find((officer) => officer.presiding) ??
      officers.find((officer) => officer.mayor);
    let chair = "";
    if (head) {
      const person = world.people[head.personId]!;
      const gender = person.identity?.gender;
      chair =
        gender === "female"
          ? "Madam Chair"
          : gender === "male"
            ? "Mr. Chair"
            : `Chair ${person.familyName}`;
    }
    return {
      organizationId,
      jurisdictionId: governmentUnitJurisdictionId(unit),
      bodyName,
      chair,
      members: officers.map((officer) =>
        personName(world.people[officer.personId]!),
      ),
    };
  }
  return null;
}

function lines(
  kind: string,
  situation: string,
  bank: EnglishBank,
  moves: readonly string[],
  facts: Record<string, string>,
  pickKey: string,
  excludes?: RegExp,
): BankLine[] {
  const out: BankLine[] = [];
  const seen = new Set<string>();
  for (const move of moves) {
    if (out.length >= PER_KIND) break;
    const made = composeFromBank(
      bank,
      move,
      facts,
      `${pickKey}:${move}`,
      excludes,
    );
    if (!made || seen.has(made.text)) continue;
    seen.add(made.text);
    out.push({
      kind,
      situation: `${situation} Move: ${move.replace(/-/g, " ")}.`,
      ...made,
    });
  }
  return out;
}

/**
 * A local body's speech addresses its own members and its own business. Floor
 * wording that names an office the body does not have (Senator, the
 * gentleman yielding) or business it has not recorded (a bill, an amendment,
 * a recess, a consent request) would claim what the records do not hold.
 */
const LOCAL_FLOOR_ONLY =
  /\b(Senator|Senate|Congress\w*|House|gentle(?:man|woman|lady)|Representative|legislation|bill|amendment|yield\w*|recess|unanimous consent|balance of my time|privileged|resolution|engross\w*|third time|yeas and nays|previous question)\b/i;

const NO_BODY =
  "no seated local governing body is recorded for the player's home town or county";

function bodyFacts(world: World, body: LocalBody): Record<string, string> {
  return {
    body: body.bodyName,
    chair: body.chair,
    member: body.members[0] ?? "",
    members: body.members.length > 1 ? nameList(body.members.slice(0, 3)) : "",
    day: weekdayOf(world.currentDate),
    date: spokenDate(world.currentDate),
  };
}

export function readMeetingBank(world: World, playerId: EntityId): BankReading {
  const body = localBody(world, playerId);
  if (!body) return NO_BODY;
  if (!body.chair)
    return `${body.bodyName} has seated members but no recorded chair to address`;
  const found = lines(
    "meeting",
    `What a member says to the chair of ${body.bodyName}, from its recorded seats.`,
    meetingBank as EnglishBank,
    ["opener", "procedural", "closer"],
    bodyFacts(world, body),
    body.organizationId,
    LOCAL_FLOOR_ONLY,
  );
  return found.length ? found : "no meeting part fits the recorded facts";
}

export function readMinutesBank(world: World, playerId: EntityId): BankReading {
  const body = localBody(world, playerId);
  if (!body) return NO_BODY;
  // Minutes record a meeting that happened: how its members voted, by name,
  // read from the roll call itself. Until the body has a recorded vote, any
  // minutes line would invent one.
  const out: BankLine[] = [];
  for (const vote of world.history.legislativeVotes ?? []) {
    if (out.length >= PER_KIND) break;
    const named = (way: string) =>
      vote.dispositions
        .filter((row) => row.disposition === way && row.personId)
        .map((row) => world.people[row.personId!])
        .filter((person) => !!person)
        .map((person) => personName(person!));
    const yea = named("yea");
    const nay = named("nay");
    const when = spokenDate(vote.takenAt);
    for (const [names, opening] of [
      [yea, "Voting for this action"],
      [nay, "Voting against this action"],
    ] as const) {
      if (names.length === 0 || out.length >= PER_KIND) continue;
      const made = composeFromBank(
        minutesBank as EnglishBank,
        "vote",
        { members: listOf(names) },
        vote.id,
        new RegExp(`^(?!${opening})`),
      );
      if (made)
        out.push({
          kind: "minutes",
          situation: `Minutes of the roll call taken on ${when}: who voted ${opening.endsWith("for this action") ? "for" : "against"}, read from each member's recorded vote.`,
          ...made,
        });
    }
    if (nay.length === 0 && yea.length > 0 && out.length < PER_KIND) {
      const made = composeFromBank(
        minutesBank as EnglishBank,
        "vote",
        { body: body.bodyName, action: "approved the measure" },
        vote.id,
        /^(?!By unanimous vote)/,
      );
      if (made && vote.outcome === "passed")
        out.push({
          kind: "minutes",
          situation: `Minutes of the unanimous roll call taken on ${when}. Move: vote.`,
          ...made,
        });
    }
  }
  return out.length
    ? out
    : `no output, because ${body.bodyName} has no recorded meeting or vote to take minutes of`;
}

function listOf(names: readonly string[]): string {
  if (names.length <= 2) return names.join(" and ");
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

export function readHearingBank(world: World, playerId: EntityId): BankReading {
  const body = localBody(world, playerId);
  if (!body) return NO_BODY;
  const found = lines(
    "hearing",
    `A hearing exchange before ${body.bodyName}, from its recorded seats.`,
    hearingBank as EnglishBank,
    ["thanks", "answer", "chair-procedure"],
    {},
    body.organizationId,
    LOCAL_FLOOR_ONLY,
  );
  return found.length ? found : "no hearing part is shippable";
}

export function readWinningLosingBank(
  world: World,
  playerId: EntityId,
): BankReading {
  const out: BankLine[] = [];
  for (const vote of world.history.legislativeVotes ?? []) {
    if (out.length >= PER_KIND) break;
    out.push(
      ...lines(
        "winning-and-losing",
        `The recorded ${vote.outcome === "passed" ? "passage" : "defeat"} of a measure on ${spokenDate(vote.takenAt)}.`,
        winningLosingBank as EnglishBank,
        [vote.outcome === "passed" ? "carried" : "lost"],
        { n: String(vote.tally.yea) },
        vote.id,
        LOCAL_FLOOR_ONLY,
      ),
    );
  }
  // The game's own result sentence for the posted meeting's roll call.
  const town = world.people[playerId]?.homeJurisdictionId;
  const result = town ? postedMeetingVoteSentence(world, town) : null;
  if (result && out.length < PER_KIND)
    out.push({
      kind: "winning-and-losing",
      situation:
        "The result of the roll call at the posted public meeting, as the game words it.",
      text: result,
      partKey: "local-council-meetings:posted-meeting-vote-sentence",
    });
  return out.length
    ? out.slice(0, PER_KIND)
    : "no recorded vote or decided contest exists to attach a result line to";
}

export function readLegislationBank(
  world: World,
  playerId?: EntityId,
): BankReading {
  const out: BankLine[] = [];
  for (const measure of world.history.legislativeMeasures ?? []) {
    if (out.length >= PER_KIND) break;
    const title = measure.shortTitle?.trim();
    if (!title) continue;
    const body = playerId
      ? localBody(world, playerId, measure.jurisdictionId)
      : null;
    const local = body !== null;
    const pieces: { text: string; partKey: string }[] = [];
    if (local) {
      const titled = composeFromBank(
        legislationBank as EnglishBank,
        "local-title",
        { title },
        measure.id,
      );
      if (titled) pieces.push(titled);
      const provisions = (world.history.legislativeProvisions ?? []).filter(
        (provision) => provision.measureId === measure.id,
      );
      const superseded = new Set(
        provisions.flatMap((provision) =>
          provision.supersedesProvisionId
            ? [provision.supersedesProvisionId]
            : [],
        ),
      );
      const current = provisions
        .filter((provision) => !superseded.has(provision.id))
        .sort((a, b) => a.sectionNumber - b.sectionNumber);
      for (const provision of current) {
        const made = composeFromBank(
          legislationBank as EnglishBank,
          provision.sectionNumber === 1
            ? "local-section-first"
            : "local-section-further",
          {
            number: String(provision.sectionNumber),
            body: body.bodyName,
            text: provision.text,
          },
          `${measure.id}:${provision.provisionKey}`,
        );
        if (made) pieces.push(made);
      }
    }
    if (!pieces.length) {
      const made = composeFromBank(
        legislationBank as EnglishBank,
        "short-title",
        { act: `"${title}"` },
        measure.id,
      );
      if (made) pieces.push(made);
    }
    if (!pieces.length) continue;
    const text = pieces.map((piece) => piece.text).join("\n");
    out.push({
      kind: "legislation",
      situation: `${local ? "The filed local ordinance" : "The short title"} of ${measure.designation}.`,
      text,
      partKey: pieces.map((piece) => piece.partKey).join("+"),
    });
  }
  return out.length ? out : "no filed measure with a short title exists";
}

/**
 * A published legislative action can lead the paper from its recorded actor,
 * measure, policy alternative, and jurisdiction. Publication copy is not read
 * back as a headline or summary; the mined lede supplies the structure.
 */
export function readNewsBank(world: World): BankReading {
  const publishedEvents = new Set(
    (world.history.publications ?? [])
      .filter(
        (publication) =>
          publication.publishedAt <= world.currentDate &&
          publication.recordedAt <= world.currentDate,
      )
      .map((publication) => publication.sourceEventId),
  );
  const measures = new Map(
    (world.history.legislativeMeasures ?? []).map((measure) => [
      measure.id,
      measure,
    ]),
  );
  const alternatives = new Map(
    world.history.policyAlternatives.map((alternative) => [
      alternative.id,
      alternative,
    ]),
  );
  const out: BankLine[] = [];
  for (const action of world.history.legislativeActions ?? []) {
    if (out.length >= PER_KIND || !publishedEvents.has(action.eventId))
      continue;
    const measure = measures.get(action.measureId);
    const place = measure
      ? world.jurisdictions[measure.jurisdictionId]?.name
      : null;
    const issue = measure?.policyAlternativeIds
      .map((id) => alternatives.get(id)?.title?.trim() ?? "")
      .find(Boolean);
    if (!measure?.shortTitle.trim() || !place || !issue) continue;
    const move =
      action.kind === "vetoed"
        ? "denial-consequence"
        : action.kind === "floor-stage-passed" || action.kind === "concurred"
          ? "vote-purpose"
          : null;
    if (!move) continue;
    const made = composeFromBank(
      newspaperLedesBank as EnglishBank,
      move,
      {
        actor: action.actorLabel,
        record: measure.shortTitle,
        issue,
        place,
      },
      action.id,
    );
    if (!made) continue;
    out.push({
      kind: "news",
      situation: `A published ${action.kind === "vetoed" ? "veto" : "vote"} on ${measure.designation} in ${place}.`,
      ...made,
    });
  }
  return out.length
    ? out
    : "no published vote or veto has a linked short-title measure, policy issue, and jurisdiction to compose a lede from";
}

/**
 * Notice wording is attached only to recorded local hearings and measures,
 * and scheduled election contests. Dates, titles, offices, and jurisdictions
 * come from those records; this reader never invents a notice or its subject.
 */
export function readNoticesBank(world: World, playerId: EntityId): BankReading {
  const home = homeLocalGovernmentUnits(world, playerId);
  const localJurisdictions = new Set(
    [...home.municipal, ...home.counties, ...home.townships].map(
      governmentUnitJurisdictionId,
    ),
  );
  const measures = world.history.legislativeMeasures ?? [];
  const localMeasures = new Map(
    measures
      .filter(
        (measure) =>
          localJurisdictions.has(measure.jurisdictionId) &&
          !!measure.shortTitle?.trim() &&
          measure.introducedAt <= world.currentDate,
      )
      .map((measure) => [measure.id, measure]),
  );
  const out: BankLine[] = [];
  const add = (
    move: string,
    facts: Record<string, string>,
    pickKey: string,
    situation: string,
  ) => {
    if (
      out.length >= PER_KIND ||
      out.some((line) => line.partKey.startsWith(`notice.${move}.`))
    )
      return;
    const made = composeFromBank(
      noticesBank as EnglishBank,
      move,
      facts,
      pickKey,
    );
    if (made)
      out.push({
        kind: "notices-and-screens",
        situation,
        ...made,
      });
  };

  for (const action of world.history.legislativeActions ?? []) {
    if (action.kind !== "committee-hearing-held") continue;
    const measure = localMeasures.get(action.measureId);
    if (!measure || action.occurredAt > world.currentDate) continue;
    add(
      "hearing",
      {
        title: measure.shortTitle,
        date: spokenDate(action.occurredAt),
      },
      action.id,
      `Recorded hearing on ${measure.designation} for ${measure.shortTitle}, held ${spokenDate(action.occurredAt)}.`,
    );
  }

  for (const measure of localMeasures.values()) {
    if (out.length >= PER_KIND) break;
    add(
      "ordinance",
      {
        designation: measure.designation,
        title: measure.shortTitle,
      },
      measure.id,
      `Recorded local measure ${measure.designation}, introduced ${spokenDate(measure.introducedAt)}.`,
    );
  }

  for (const contest of world.history.electionContests ?? []) {
    if (out.length >= PER_KIND) break;
    if (
      contest.scheduledAt > world.currentDate ||
      contest.electionDate < contest.scheduledAt
    )
      continue;
    const place = world.jurisdictions[contest.jurisdictionId]?.name;
    if (!place || !contest.office.title.trim()) continue;
    add(
      "election",
      {
        place,
        date: spokenDate(contest.electionDate),
        office: contest.office.title,
      },
      contest.id,
      `Election notice for ${contest.office.title} in ${place}, scheduled for ${spokenDate(contest.electionDate)}.`,
    );
  }

  return out.length
    ? out
    : "no output, because no recorded local hearing or measure, or scheduled election contest, is available";
}
