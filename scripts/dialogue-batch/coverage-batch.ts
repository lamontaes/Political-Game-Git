/* eslint-disable @typescript-eslint/no-explicit-any -- module rows are read untyped by this tooling */
/**
 * The scene grading batch: thirty different scenes the English engine
 * composes in one played place (owner, Oct 14, 2026, evening), each with the
 * trace that produced it and testing one thing. Development tooling; grading
 * never blocks a merge, and nothing here words anything.
 *
 *   npm run dialogue:coverage -- [--id batch-10] [--seed batch-10] \
 *     [--days 365] [--cache <file>]
 *
 * Places are drawn in turn (`drawPlace("<seed>:<life>", "dialogue-report")`)
 * until one's year passes a local law. That world is built as the bench builds
 * it (`buildBenchWorld`, two-level), the player's circle is watched by the
 * story director, and it runs `--days` days. Its scenes are then read:
 *
 *   journal          a chapter, composeJournal (src/director/journal.ts)
 *   speeches         a rally, public comment, election night, an honor,
 *                    composeAddress over address.json
 *   bills, notices,  a bill's text, a notice, the minutes, a hearing, a
 *   minutes, hearing meeting: composeFromBank over each bank
 *   conversation     one turn's choice set (four replies, the lies, say
 *                    nothing), openConversation and say (play-lives.ts)
 *
 * Every line passes the owner's grades and the guard's line rules first; a
 * phrase is shown once in the batch. A scene the world does not produce is
 * written to the page's "OWNER DECISIONS NEEDED", never invented. `--cache`
 * keeps the world reading so a later run rebuilds only the selection.
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { buildBenchWorld } from "../../src/bench/world";
import { policyNames, schoolsOf } from "../../src/bench/words";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { advanceCore } from "../../src/core2/life";
import { coreAPI } from "../../src/core2/state";
import type { CoreState } from "../../src/core2/types";
import { composeJournal } from "../../src/director/journal";
import { properName } from "../../src/director/words";
import { composeFromBank } from "./bank-compose";
import type { EnglishBank } from "./bank-compose";
import { composeAddress } from "../../src/presentation/english-composition";
import type { GroundedEnglishPacket } from "../../src/presentation/grounded-english";
import { REGISTER_CARDS } from "../../src/presentation/speech-registers";
import { addDays, makeIsoDate } from "../../src/simulation/dates";
import { drawPlace } from "../core2-year/place";
import {
  addressMoves,
  ADDRESS_REGISTERS,
} from "../english-corpus/address-bank";
import lexicon from "./verb-lexicon.json" with { type: "json" };
import { grammatical, lineProblem, type Rejection } from "./repetition-guard";
import { heldByGrades } from "../../src/presentation/english-grades";
import {
  minedParts,
  slotValues,
  variantsFor,
  type IndexedPart,
  type Variant,
} from "./mined-variants";
import { headCommit, playLives } from "./play-lives";
import interviewJson from "../../data/english/parts/interview.json" with { type: "json" };
import legislationJson from "../../data/english/parts/legislation.json" with { type: "json" };
import meetingJson from "../../data/english/parts/meeting.json" with { type: "json" };
import minutesJson from "../../data/english/parts/minutes.json" with { type: "json" };
import noticesJson from "../../data/english/parts/notices.json" with { type: "json" };

const VERB_LEADS = new Set<string>(lexicon.verbs);

const args = process.argv.slice(2);
const option = (name: string, fallback: string) => {
  const at = args.indexOf(`--${name}`);
  return at >= 0 && args[at + 1] !== undefined ? args[at + 1]! : fallback;
};
const id = option("id", "batch-8");
const seed = option("seed", id);
const days = Number(option("days", "365"));
const cachePath = option("cache", "");

/** One engine line before its alternatives are found. JSON-safe, so it can be cached. */
export interface Raw {
  category: string;
  place: string;
  life: number;
  speaker: string;
  /** The scenario the simulation produced, in plain words. */
  context: string;
  prior: string;
  text: string;
  /** The mined part keys that made the line. */
  parts: string[];
  /** The mined moment of the varied part, when the composer knows it. */
  moment?: string;
  sociability?: number | null;
  lie?: boolean;
  composer: string;
  sourceRecordIds: string[];
  /** Refuses alternatives that change what the line means (for example for/against). */
  forbid?: string;
  /** What the repetition guard needs: names to mask, institutions of record and bill titles in the line. */
  guard?: { masks: string[]; institutions: string[]; titles: string[] };
}

const all = minedParts();

/* ------------------------------------------------------------------ facts */

type Fact = { text: string; sourceRecordIds: string[] };
type Facts = Record<string, Fact>;

const packet = (
  momentKey: string,
  facts: Facts,
  stage: string,
  version: string,
): GroundedEnglishPacket =>
  ({
    surface: "dialogue",
    momentKey,
    worldSeed: seed,
    bankVersion: version,
    stage,
    sourceRecordIds: Object.values(facts).flatMap((f) => f.sourceRecordIds),
    facts,
    speaker: { personId: "speaker", traits: {} },
    knowledge: Object.entries(facts).map(([factKey, fact]) => ({
      personId: "speaker",
      factKey,
      sourceRecordIds: fact.sourceRecordIds,
    })),
  }) as unknown as GroundedEnglishPacket;

const longDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
const lowerFirst = (text: string) =>
  text.charAt(0).toLowerCase() + text.slice(1);
/** A bill's title as a name: policy titles are authored as noun or command phrases, and a name in quotation marks is a noun phrase either way. */
const quoted = (title: string) => `"${title}"`;
/** A title that reads as a noun phrase, so a long title can say "To provide for" it. */
const isNounTitle = (title: string) =>
  !VERB_LEADS.has(title.split(/\s+/)[0]!.toLowerCase());
const nameList = (names: readonly string[]) =>
  names.length <= 1
    ? (names[0] ?? "")
    : names.length === 2
      ? `${names[0]} and ${names[1]}`
      : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;

/** Part keys of a line in one mined bank (its slots filled), longest part first. */
function partsOf(text: string, bank: string): string[] {
  const rows = [...all.values()]
    .filter((part) => part.bank === bank)
    .sort((a, b) => b.text.length - a.text.length);
  const found = rows.find((part) => slotValues(part, text) !== null);
  return found ? [found.key] : [];
}

/* ---------------------------------------------------------------- emotion */

/** Which feeling a line's own words carry. Tags come from the words, never added to them. */
const EMOTION_RULES: [string, RegExp][] = [
  ["apology", /\bsorry\b|apolog/i],
  [
    "sadness",
    /heavy heart|deeply missed|will be missed|condolences|survived by|legacy of|passed away/i,
  ],
  ["disappointment", /didn't win|we lost/i],
  ["resolve", /will be back|not the end|fight goes on/i],
  [
    "pride",
    /\bproud\b|privilege|it is my honor|i'm honored|i am honored|humbled/i,
  ],
  ["gratitude", /grateful|thank you for everything|\bthank/i],
  [
    "joy",
    /happy|great pleasure|congratulat|celebrat|we won|we did it|\bglad\b/i,
  ],
  ["goodwill", /wish .{1,40} well|wish .{1,40} (?:continued )?success/i],
  [
    "arrogance",
    /\b(?:greatest|nobody (?:else )?can|no one (?:else )?can|tremendous|better than (?:anyone|everyone|you))\b/i,
  ],
];
export function emotionsOf(text: string): string[] {
  return EMOTION_RULES.filter(([, rule]) => rule.test(text)).map(
    ([name]) => name,
  );
}

/* ----------------------------------------------------- reading one world */

interface Place {
  life: number;
  key: string;
  name: string;
  state: string;
  seed: string;
}

function readWorld(place: Place): {
  raws: Raw[];
  gaps: string[];
  stood: string[];
  /** The local laws the year passed, by number and title. */
  passed: string[];
} {
  setBookkeeping(false);
  const world = buildBenchWorld(place.seed, "2026-10-12", {
    twoLevel: true,
    placeKey: place.key,
  });
  const core: CoreState = world.core;
  const api = coreAPI(core);
  const me = core.people.get(world.playerId!)!;
  const circle = [
    ...new Set([world.playerId!, ...me.familyIds, ...me.knownIds]),
  ].slice(0, 24);
  for (const person of circle) world.director.watch(core, person);
  advanceCore(core, addDays(makeIsoDate(core.date), days));
  const town = place.name.split(",")[0]!;
  const raws: Raw[] = [];
  const gaps: string[] = [];
  const stood: string[] = [];
  const base = {
    place: place.name,
    life: place.life,
    sourceRecordIds: [] as string[],
  };

  const personOf = (personId: string) =>
    (core.people.get(personId) ?? core.husks.get(personId)) as
      Record<string, any> | undefined;
  const nameOf = (personId: string) => {
    const row = personOf(personId);
    return row ? `${row.givenName} ${row.familyName}` : personId;
  };
  const employerOf = (personId: string) => {
    const jobId = (core.people.get(personId) as any)?.jobId;
    const orgId = jobId ? core.jobs.get(jobId)?.organizationId : undefined;
    const org = orgId ? (core.organizations.get(orgId) as any) : undefined;
    return org
      ? { text: properName(org.name as string), sourceRecordIds: [orgId!] }
      : undefined;
  };
  const factsOf = (personId: string, opponentId?: string): Facts => {
    const row = personOf(personId);
    const gender = row?.looks?.gender;
    const employer = employerOf(personId);
    const opponent = opponentId ? personOf(opponentId) : undefined;
    return {
      name: { text: nameOf(personId), sourceRecordIds: [personId] },
      place: { text: town, sourceRecordIds: [personId] },
      ...(employer ? { employer } : {}),
      // No school: a school is never the event of a speech or a tribute
      // (owner, batch 7), so a speech is not handed one to say.
      ...(opponent
        ? {
            opponent: {
              text: nameOf(opponentId!),
              sourceRecordIds: [opponentId!],
            },
          }
        : {}),
      ...(gender === "female" || gender === "male"
        ? {
            pronoun: {
              text: gender === "female" ? "her" : "his",
              sourceRecordIds: [personId],
            },
            "pronoun-obj": {
              text: gender === "female" ? "her" : "him",
              sourceRecordIds: [personId],
            },
          }
        : {}),
    };
  };

  /* ---- offices, bodies, bills, votes ---- */
  const offices = new Map<string, Record<string, any>>(
    (api.moduleState("core2-offices-v1").table("offices").rows() as any[]).map(
      (row) => [row.id as string, row],
    ),
  );
  const bodyName = (officeId: string) => {
    const office = offices.get(officeId);
    if (!office) return officeId;
    const gov = properName(office.governmentName as string).replace(
      /\bOf\b/g,
      "of",
    );
    const title = String(office.title).replace(/\s+members?$/i, "");
    const noun =
      /council|board|commission|committee|trustees|selectm|supervisors/i.test(
        title,
      )
        ? lowerFirst(title.replace(/s$/, "")).replace(
            new RegExp(`^${gov.split(" ")[0]} `, "i"),
            "",
          )
        : "governing body";
    return `${gov} ${noun}`;
  };
  const terms = api
    .moduleState("core2-offices-v1")
    .table("terms")
    .rows() as any[];
  const holders = (officeId: string) =>
    terms
      .filter((t) => t.officeId === officeId && t.status === "serving")
      .map((t) => t.personId as string);
  const names = policyNames();
  const bills = api
    .moduleState("core2-legislature-v1")
    .table("bills")
    .rows() as any[];
  const voteRows = api
    .moduleState("core2-legislature-v1")
    .table("votes")
    .rows() as any[];
  const localBills = bills.filter(
    (bill) =>
      // A body of the town's own government: one on record below the state
      // (batch 10 listed congressional bills, whose body is not the town's).
      !!offices.get(bill.bodyOfficeId) &&
      !["federal", "state"].includes(offices.get(bill.bodyOfficeId)?.level),
  );
  const titleOf = (bill: any) => {
    const question = bill.provisions.find(
      (p: any) => p.kind === "policy-question",
    );
    return question ? names[question.question as string] : undefined;
  };
  const legBank = legislationJson as unknown as EnglishBank;
  const keyed = (
    bank: EnglishBank,
    key: string,
    facts: Record<string, string>,
  ) => {
    const part = bank.parts.find((row) => row.key === key);
    if (!part) return null;
    return {
      text: part.text.replace(
        /\{(\w+)\}/g,
        (_m, slot: string) => facts[slot] ?? "",
      ),
      partKey: key,
    };
  };

  // Bill text: the pieces of a filed ordinance the bank can word from its record.
  for (const bill of localBills.slice(0, 40)) {
    const title = titleOf(bill);
    if (!title) continue;
    const support = bill.provisions.some(
      (p: any) => p.kind === "policy-question" && p.value > 0,
    );
    const body = bodyName(bill.bodyOfficeId);
    const context = `${bill.number} (${bill.status}), introduced ${longDate(bill.introduced)} before the ${body}: it ${support ? "adopts" : "repeals"} "${title}" on the bill's own provision record.`;
    const pieces: [string, ReturnType<typeof keyed>][] = [
      [
        "Its short title",
        composeFromBank(
          legBank,
          "short-title",
          { act: quoted(title) },
          bill.id,
        ),
      ],
      [
        "Its long title",
        // A long title is a verb phrase the bank leads with "To provide for"; only a noun title fits it.
        isNounTitle(title)
          ? composeFromBank(
              legBank,
              "long-title",
              { purpose: lowerFirst(title) },
              bill.id,
              /^(?!To provide for)/,
            )
          : null,
      ],
      [
        "Its repeal clause",
        support
          ? null
          : keyed(legBank, "legislation.clause.provision-is-repealed", {
              provision: quoted(title),
            }),
      ],
    ];
    for (const [what, made] of pieces) {
      if (!made) continue;
      raws.push({
        ...base,
        category: "legislation",
        speaker: `${body} (bill text)`,
        context: `${what}. ${context}`,
        prior: "",
        text: made.text,
        parts: [made.partKey],
        // A clause bucket holds every drafting clause; none means the same thing.
        ...(made.partKey.includes(".clause.") ? { forbid: "." } : {}),
        composer:
          "composeFromBank over data/english/parts/legislation.json, facts from the bill row (legislature module)",
        sourceRecordIds: [bill.id],
      });
    }
  }
  // A federal bill's enacting clause, from a bill the Congress module holds.
  const federal = (
    api.moduleState("core2-legislature-v1").table("bills").rows() as any[]
  ).find((bill) => /us-house|us-senate/.test(bill.bodyOfficeId as string));
  if (federal) {
    const made = composeFromBank(
      legBank,
      "enacting-clause",
      {},
      federal.id,
      /Resolved|Whereas|Now, therefore/,
    );
    if (made)
      raws.push({
        ...base,
        category: "legislation",
        speaker: "United States Congress (bill text)",
        context: `The opening of ${federal.number} (${federal.status}), filed in the ${federal.bodyOfficeId.includes("senate") ? "Senate" : "House"} on ${longDate(federal.introduced)}.`,
        prior: "",
        text: made.text,
        parts: [made.partKey],
        composer: "composeFromBank over data/english/parts/legislation.json",
        sourceRecordIds: [federal.id],
      });
  } else gaps.push("no federal bill in this world");

  // Notices: hearing and ordinance notices from bills, an election notice from contests.
  const noticeBank = noticesJson as unknown as EnglishBank;
  for (const bill of localBills.slice(0, 20)) {
    const title = titleOf(bill);
    if (!title) continue;
    const body = bodyName(bill.bodyOfficeId);
    for (const [move, facts, what] of [
      [
        "hearing",
        { title: quoted(title), date: longDate(bill.introduced) },
        "A hearing notice",
      ],
      [
        "ordinance",
        { designation: bill.number, title: quoted(title) },
        "An ordinance listing",
      ],
    ] as const) {
      const made = composeFromBank(
        noticeBank,
        move,
        facts as Record<string, string>,
        bill.id,
      );
      if (made)
        raws.push({
          ...base,
          category: "notices",
          speaker: `${body} clerk`,
          context: `${what} for ${bill.number}, posted by the ${body}.`,
          prior: "",
          text: made.text,
          parts: [made.partKey],
          composer: "composeFromBank over data/english/parts/notices.json",
          sourceRecordIds: [bill.id],
        });
    }
  }
  const contests = (
    api.moduleState("core2-elections-v1").table("contests").rows() as any[]
  ).filter(
    (c) => offices.get(c.officeId)?.coversTown && c.electionDate >= core.date,
  );
  const byDate = new Map<string, string[]>();
  for (const contest of contests)
    byDate.set(contest.electionDate, [
      ...(byDate.get(contest.electionDate) ?? []),
      contest.title as string,
    ]);
  for (const [date, titles] of byDate) {
    const made = composeFromBank(
      noticeBank,
      "election",
      {
        place: town,
        date: longDate(date),
        office: nameList([...new Set(titles)]),
      },
      date,
    );
    if (made)
      raws.push({
        ...base,
        category: "notices",
        speaker: `${town} election office`,
        context: `The notice of the ${longDate(date)} election in ${town}, from the contests the elections module holds.`,
        prior: "",
        text: made.text,
        parts: [made.partKey],
        composer: "composeFromBank over data/english/parts/notices.json",
        sourceRecordIds: contests
          .filter((c) => c.electionDate === date)
          .map((c) => c.id),
      });
  }

  // Minutes and hearing exchanges and the chair, from a real roll call.
  // LOCAL_FLOOR_ONLY also refuses what the record contradicts or doesn't
  // hold: an absence from a vote the member cast (owner, batch 9: "I could
  // not make today's vote"), a closed session no meeting record shows, and a
  // chamber's debate-time management ("May I inquire as to how much time",
  // owner, batch 9; "no further speakers"), which a town meeting doesn't run.
  const minutesBank = minutesJson as unknown as EnglishBank;
  const LOCAL_FLOOR_ONLY =
    /\b(Senator|Senate|Congress\w*|House|Speaker|recommit|gentle(?:man|woman|lady)|Representative|legislation|bill|amendment|yield\w*|recess|unanimous consent|balance of my time|privileged|resolution|engross\w*|third time|yeas and nays|previous question|ranking member|chairman|heavy heart|honor the life|sense of loss|in memory|condolences?|passed away|unable to be present|not present|absent|could not make|missed|executive session|nomination|inquire|time remain\w*|time I have|further speakers|more speakers|requests for time|ready to close|prepared to close)\b/i;
  const chairOf = (officeId: string) => {
    const head = holders(officeId)[0];
    const row = head ? personOf(head) : undefined;
    const gender = row?.looks?.gender;
    return {
      id: head,
      stage:
        gender === "female"
          ? "chair-female"
          : gender === "male"
            ? "chair-male"
            : "chair-male",
      address:
        gender === "female"
          ? "Madam Chair"
          : gender === "male"
            ? "Mr. Chair"
            : head
              ? `Chair ${row?.familyName}`
              : "",
    };
  };
  for (const bill of localBills.filter((b) => titleOf(b)).slice(0, 12)) {
    const title = titleOf(bill)!;
    const body = bodyName(bill.bodyOfficeId);
    const rolls = voteRows.filter((v) => v.billId === bill.id);
    const yes = rolls
      .filter((v) => v.vote === "yes")
      .map((v) => nameOf(v.memberId));
    const no = rolls
      .filter((v) => v.vote === "no")
      .map((v) => nameOf(v.memberId));
    const date = longDate(bill.introduced);
    const rollContext = `The roll call on ${bill.number} ("${title}") before the ${body}: ${yes.length} for, ${no.length} against; the bill ${bill.status}.`;
    for (const [names2, opening] of [
      [yes, "Voting for this action"],
      [no, "Voting against this action"],
    ] as const) {
      if (!names2.length) continue;
      const made = composeFromBank(
        minutesBank,
        "vote",
        { members: nameList(names2) },
        bill.id,
        new RegExp(`^(?!${opening})`),
      );
      if (made)
        raws.push({
          ...base,
          category: "minutes",
          speaker: `${body} (minutes)`,
          context: `${rollContext} Each name is read from a member's recorded vote.`,
          prior: "",
          text: made.text,
          parts: [made.partKey],
          forbid: "^Voting (?:for|against)",
          composer: "composeFromBank over data/english/parts/minutes.json",
          sourceRecordIds: [bill.id],
        });
    }
    for (const move of ["discussion"]) {
      const made = composeFromBank(
        minutesBank,
        move,
        { topic: quoted(title) },
        bill.id,
        // A manager does not turn to an item (the chair takes it up), so those sentences are left out (owner, batch 7).
        /view|extent|Against this background|judged|manager/,
      );
      if (made)
        raws.push({
          ...base,
          category: "minutes",
          speaker: `${body} (minutes)`,
          context: `The discussion of "${title}" at the ${date} meeting (${bill.number}).`,
          prior: "",
          text: made.text,
          parts: [made.partKey],
          composer: "composeFromBank over data/english/parts/minutes.json",
          sourceRecordIds: [bill.id],
        });
    }

    // The chair calls the vote, from the bill's recorded outcome.
    const chair = chairOf(bill.bodyOfficeId);
    const run = (what: string) =>
      all.get(`address.run-meeting.${what}`) ??
      [...all.values()].find((p) => p.bank === "address" && p.text === what);
    const lines = [
      "The meeting will come to order.",
      "Is there a motion?",
      "All in favor?",
      bill.status === "failed" ? "The noes have it." : "The motion carries.",
    ];
    lines.forEach((line, at) => {
      const part = run(line);
      if (!part || !chair.id) return;
      raws.push({
        ...base,
        category: "meeting",
        speaker: `${nameOf(chair.id)} (chair)`,
        context: `The ${body} takes up ${bill.number} ("${title}"); the recorded result is ${bill.status}.`,
        prior: at ? `Chair: ${lines[at - 1]}` : "",
        text: line,
        parts: [part.key],
        moment: "address|chair/run-meeting",
        composer:
          "the chair's run-meeting sentences in data/english/parts/address.json, picked by the bill's recorded step",
        sourceRecordIds: [bill.id, chair.id],
      });
    });

    // A member to the chair on the floor: never the chair, who holds one seat
    // (batch 10: the chair was also "a member" addressing "Madam Chair").
    // Words a town body's floor never hears (Congress's procedure, a grief
    // that no death or retirement record stands behind) are left out.
    const speakerId = rolls.find(
      (v) => v.vote === "yes" && v.memberId !== chair.id,
    )?.memberId;
    if (chair.address && speakerId) {
      for (const move of ["opener", "procedural", "closer"]) {
        const made = composeFromBank(
          meetingJson as unknown as EnglishBank,
          move,
          { chair: chair.address, body },
          `${bill.id}:${move}`,
          LOCAL_FLOOR_ONLY,
        );
        if (made)
          raws.push({
            ...base,
            category: "meeting",
            speaker: `${nameOf(speakerId)} (member)`,
            context: `A member of the ${body} speaks to the chair during ${bill.number} ("${title}").`,
            prior: "",
            text: made.text,
            parts: [made.partKey],
            // Its alternatives pass the same floor test as the line.
            forbid: LOCAL_FLOOR_ONLY.source,
            composer: "composeFromBank over data/english/parts/meeting.json",
            sourceRecordIds: [bill.id, speakerId],
          });
      }
      // A hearing needs the question each answer follows, and the hearing
      // bank holds no chair's or member's question yet (batch 10: a witness
      // thanked a question nobody asked); hearings wait for one.
    }
  }

  /* ---- people in contests: campaign, public comment, victory, concession ---- */
  const filings = (
    api.moduleState("core2-elections-v1").table("filings").rows() as any[]
  ).filter((f) => f.status === "on-ballot");
  // Every contest, decided ones too: a past race's filing still names its office.
  const contestOf = new Map<string, any>(
    (
      api.moduleState("core2-elections-v1").table("contests").rows() as any[]
    ).map((c) => [c.id as string, c]),
  );
  const turns: {
    register: string;
    personId: string;
    opponentId?: string;
    office?: string;
    won?: boolean;
    speakerId?: string;
  }[] = [];
  for (const filing of filings.slice(0, 8)) {
    const rival = filings.find(
      (f) => f.contestId === filing.contestId && f.id !== filing.id,
    );
    turns.push({
      register: "campaign",
      personId: filing.personId,
      opponentId: rival?.personId,
      office: contestOf.get(filing.contestId)?.title,
    });
  }
  // Decided races: the winner's election-night words and the loser's concession.
  const results = api
    .moduleState("core2-voting-v1")
    .table("results")
    .rows() as any[];
  const allFilings = api
    .moduleState("core2-elections-v1")
    .table("filings")
    .rows() as any[];
  let decided = 0;
  for (const result of results) {
    const field = allFilings.filter((f) => f.contestId === result.contestId);
    const winner =
      field.find(
        (f) => f.id === result.winnerId || f.personId === result.winnerId,
      )?.personId ?? undefined;
    const loser = field.find((f) => f.personId !== winner)?.personId;
    const office = contestOf.get(result.contestId)?.title;
    if (!winner || !loser) continue;
    decided += 1;
    turns.push({
      register: "victory",
      personId: winner,
      opponentId: loser,
      office,
      won: true,
    });
    turns.push({
      register: "concession",
      personId: loser,
      opponentId: winner,
      office,
    });
  }
  // Public comment from residents who are in the circle, about a bill.
  const residents = circle.filter((c) => c !== world.playerId).slice(0, 4);
  for (const personId of residents)
    turns.push({ register: "public-comment", personId });
  // Honors: a member honored by a colleague in the same state or federal
  // chamber, whose floor addresses the Speaker; a town body's floor never
  // does (batch 10: "Madam Speaker" on a selectboard).
  // The house-floor bank addresses a Speaker, so only a chamber its title
  // marks as a house is honored this way (batch 10: "Mr. Speaker" in the
  // U.S. Senate, whose chair is its President).
  const chambers = [...offices.values()].filter(
    (office) =>
      ["state", "federal"].includes(office.level) &&
      /\b(House|Assembly|Representatives|Delegates)\b/i.test(
        String(office.title),
      ),
  );
  let honors = 0;
  for (const office of chambers) {
    const members = holders(office.id as string).filter(
      (p) => personOf(p)?.alive !== false,
    );
    for (let at = 0; at + 1 < members.length && honors < 4; at += 2) {
      turns.push({
        register: "house-honor",
        personId: members[at]!,
        speakerId: members[at + 1]!,
      });
      honors += 1;
    }
  }
  if (!honors)
    gaps.push(
      "no state or federal house (a chamber with a Speaker) with two members on record in this world, so no floor honor is said; a senate's and a town body's own way of honoring a member are not mined yet",
    );
  const deceased = [...core.people.values()].filter((p) => !p.alive);
  if (!deceased.length)
    gaps.push(
      "no person has died by the end of the run, so a memorial or condolence scenario (tribute sadness) cannot be produced",
    );

  for (const turn of turns) {
    // A race's words name its office; one with no office on record is not
    // said ("a candidate for undefined", owner, batch 9).
    if (
      ["campaign", "victory", "concession"].includes(turn.register) &&
      !turn.office
    )
      continue;
    const facts = factsOf(turn.personId, turn.opponentId);
    if (turn.office)
      facts.office = { text: turn.office, sourceRecordIds: [turn.personId] };
    if (turn.won) facts.won = { text: "yes", sourceRecordIds: [turn.personId] };
    // A congratulation says what the person did, never where they were born
    // (owner, batch 9): their years at their work, from its opening record.
    if (turn.register === "house-honor") {
      delete facts.place;
      const opened = (personOf(turn.personId)?.pastFacts ?? []).find(
        (fact: any) => fact.kind === "work:opening",
      );
      const years = opened
        ? Number(core.date.slice(0, 4)) -
          Number(String(opened.date).slice(0, 4))
        : 0;
      if (years > 1)
        facts.years = { text: String(years), sourceRecordIds: [opened.id] };
    }
    const row = personOf(turn.personId);
    const termOf = terms.find(
      (t) =>
        t.personId === (turn.speakerId ?? turn.personId) &&
        t.status === "serving",
    );
    const stage = termOf
      ? chairOf(termOf.officeId).stage
      : row?.looks?.gender === "female"
        ? "chair-female"
        : "chair-male";
    const card = addressMoves(turn.register);
    if (REGISTER_CARDS[card.register].setting !== "public-address") continue;
    const composed = composeAddress(
      packet(
        `${seed}:${turn.personId}:${turn.register}`,
        facts,
        stage,
        "words-address-v1",
      ),
      card.register,
      card.moves,
    );
    if (composed.kind !== "rendered") continue;
    const reg = ADDRESS_REGISTERS[turn.register]!;
    const subject = reg.from ?? turn.register;
    composed.moves.forEach((move, at) => {
      const role = move.move.split("-").slice(1).join("-");
      const category =
        turn.register === "campaign"
          ? "campaign"
          : turn.register === "public-comment"
            ? "meeting"
            : "emotion";
      const where =
        turn.register === "campaign"
          ? `${nameOf(turn.personId)} speaks at a rally in ${town} as a candidate for ${turn.office}`
          : turn.register === "victory"
            ? `${nameOf(turn.personId)} won the race for ${turn.office} against ${turn.opponentId ? nameOf(turn.opponentId) : "the field"} (the voting module's recorded result) and speaks on election night`
            : turn.register === "concession"
              ? `${nameOf(turn.personId)} lost the race for ${turn.office} to ${nameOf(turn.opponentId!)} (the voting module's recorded result) and concedes`
              : turn.register === "public-comment"
                ? `${nameOf(turn.personId)} speaks in the public comment period of a ${town} council meeting`
                : `${nameOf(turn.speakerId!)} honors ${nameOf(turn.personId)}, a fellow sitting official, on the floor`;
      raws.push({
        ...base,
        category,
        speaker: nameOf(turn.speakerId ?? turn.personId),
        context: where + ".",
        prior: at
          ? `${nameOf(turn.speakerId ?? turn.personId)}: ${composed.moves[at - 1]!.text}`
          : "",
        text: move.text,
        parts: move.parts.map((part) => part.variantKey),
        moment: `address|${subject}/${role}`,
        composer: `composeAddress (src/presentation/english-composition.ts), register ${turn.register}, words from data/english/parts/address.json`,
        sourceRecordIds: [turn.personId],
      });
    });
    // The whole turn is one line too, where a turn carries feelings together.
    if (
      composed.moves.length > 1 &&
      turn.register !== "campaign" &&
      turn.register !== "public-comment"
    )
      raws.push({
        ...base,
        category: "emotion",
        speaker: nameOf(turn.speakerId ?? turn.personId),
        context: `The whole ${turn.register.replace("-", " ")} turn, said in one go (${turn.office ?? "a floor tribute"}).`,
        prior: "",
        text: composed.text,
        parts: composed.moves.flatMap((move) =>
          move.parts.map((part) => part.variantKey),
        ),
        composer: `composeAddress, register ${turn.register}, words from data/english/parts/address.json`,
        sourceRecordIds: [turn.personId],
      });
  }

  /* ---- interviews the press engine ran ---- */
  const interviewBank = interviewJson as unknown as EnglishBank;
  const interviews = (
    api.moduleState("core2-press-v1").table("interviews").rows() as any[]
  ).filter((row) => row.status === "published");
  let opposed = 0;
  for (const interview of interviews.slice(0, 30)) {
    const candidate = nameOf(interview.candidateId);
    for (const answer of interview.answers as any[]) {
      const topic = names[answer.question as string];
      if (!topic) continue;
      const issue = quoted(topic);
      const asked = composeFromBank(
        interviewBank,
        "reporter-issue",
        { issue },
        `${interview.id}:${answer.question}:q`,
      );
      if (!asked) continue;
      const move =
        answer.position === null
          ? "official-deflect"
          : answer.position > 0
            ? "official-commit"
            : "";
      if (!move) {
        opposed += 1;
        continue;
      }
      const made = composeFromBank(
        interviewBank,
        move,
        { issue },
        `${interview.id}:${answer.question}:a`,
      );
      if (!made) continue;
      raws.push({
        ...base,
        category: "interview",
        speaker: candidate,
        context: `A local reporter's interview of ${candidate} (a candidate in ${town}, ${interview.date}); asked about ${issue}; the candidate's recorded answer is ${answer.position === null ? "to decline" : "support"}.`,
        prior: `Reporter: ${asked.text}`,
        text: made.text,
        parts: [made.partKey],
        composer:
          "composeFromBank over data/english/parts/interview.json, driven by the press module's interview rows",
        sourceRecordIds: [interview.id, interview.candidateId],
      });
    }
  }
  if (opposed)
    gaps.push(
      `recorded interview answers oppose the question's policy, and interview.json has no move for saying no to a policy (only commit and deflect), so those answers are left out`,
    );

  /* ---- the journal of the watched circle ---- */
  for (const personId of circle) {
    const chapters = composeJournal(core, world.director, personId);
    for (const chapter of chapters)
      chapter.lines.forEach((line, at) => {
        const parts = partsOf(line.text, "journal");
        if (!parts.length) return;
        raws.push({
          ...base,
          category: "journal",
          speaker: nameOf(personId),
          context: `The "My life" journal of ${nameOf(personId)}, chapter "${chapter.title}", entry dated ${longDate(line.date)}.`,
          prior: at ? `Journal: ${chapter.lines[at - 1]!.text}` : "",
          text: line.text,
          parts,
          moment: all.get(parts[0]!)?.moment[0],
          composer:
            "composeJournal (src/director/journal.ts), words from data/english/parts/journal.json",
          sourceRecordIds: [...line.sourceRecordIds],
        });
      });
  }
  if (!decided)
    gaps.push(
      "no race was decided by the end of the run, so victory and concession lines (which need a recorded winner and loser) cannot be produced",
    );
  // What the repetition guard reads: the world's own names to mask, the schools,
  // workplaces and offices of record, and the bill titles.
  const institutions = new Set<string>();
  for (const personId of circle) {
    for (const school of schoolsOf(core, personId))
      institutions.add(school.name);
    const employer = employerOf(personId);
    if (employer) institutions.add(employer.text);
  }
  for (const org of core.organizations.values()) {
    const orgName = properName((org as any).name as string);
    if (/clerk|registrar|board of elections/i.test(orgName))
      institutions.add(orgName);
  }
  const maskPool = new Set<string>([
    town,
    ...circle.map(nameOf),
    ...[...offices.values()].flatMap((o) => [
      String(o.title),
      bodyName(o.id as string),
    ]),
    ...bills.map((b) => String(b.number)),
    ...contests.map((c) => String(c.title)),
    ...institutions,
  ]);
  const titlePool = [...new Set(Object.values(names))];
  for (const raw of raws) {
    const text = `${raw.text}`;
    raw.guard = {
      masks: [...maskPool, ...titlePool].filter((m) => m && text.includes(m)),
      institutions: [...institutions].filter((m) => text.includes(m)),
      titles: titlePool.filter((m) =>
        text.toLowerCase().includes(m.toLowerCase()),
      ),
    };
  }
  stood.push(
    `${town}: ${decided} decided races, office levels ${[...new Set([...offices.values()].map((o) => o.level))].join("/")};  bills and roll calls are the legislature module's own rows (${localBills.length} local bills, ${voteRows.length} recorded votes); interviews are the press module's`,
  );
  // A bill is named by its title; one with none on record is a defect to
  // file, never named by its own number (batch 10: 2027-1 ("2027-1")).
  const enacted = localBills.filter((bill) =>
    /passed|enacted|adopted|signed/.test(String(bill.status)),
  );
  const untitled = enacted.filter((bill) => !titleOf(bill));
  if (untitled.length)
    gaps.push(
      `defect for OPUS-GOV: ${untitled.length} local bill(s) passed with no title on record (${untitled.map((bill) => `${bill.number}, ${bill.provisions.map((p: any) => p.kind).join("/") || "no provisions"}`).join("; ")}); a bill needs a title the words can name`,
    );
  const passed = enacted
    .filter((bill) => titleOf(bill))
    .map((bill) => `${bill.number} ("${titleOf(bill)}")`);
  return { raws, gaps, stood, passed };
}

/* ------------------------------------------------------------- selection */

interface Item extends Raw {
  i: number;
  varied: string;
  variants: {
    n: number;
    axis: string;
    parts: string[];
    partText: string;
    text: string;
  }[];
}

function withVariants(raw: Raw): Item | null {
  const forbid = raw.forbid ? new RegExp(raw.forbid, "i") : undefined;
  const made = variantsFor(
    raw.text,
    raw.parts,
    raw.sociability ?? undefined,
    all,
    raw.moment,
    forbid ? (other: IndexedPart) => !forbid.test(other.text) : undefined,
  );
  return {
    ...raw,
    i: -1,
    varied: made?.varied.key ?? raw.parts[0] ?? "",
    variants: (made?.variants ?? []).map((variant: Variant, at) => ({
      n: at + 1,
      axis: variant.axis,
      parts: [variant.partKey],
      partText: variant.partText,
      text: variant.text,
    })),
  };
}

const cell = (text: string) =>
  text.replace(/\|/g, "\\|").replace(/\s*\n\s*/g, " / ");

/* --------------------------------------------------------------- scenes */

/**
 * A batch is thirty different scenes in one place (owner, Oct 14, 2026,
 * evening): each item shows the whole scene the engine composed and the
 * trace that produced it, and tests one thing: the wording of one line on one
 * axis, a chapter's opening and closing pair, or a conversation's choice set
 * (the four replies, the lies and say nothing). A phrase that needs one grade
 * appears once in the batch.
 */
export const SCENES = 30;

/** How many scenes of each kind a batch may hold, so thirty are thirty different scenes. */
const SCENE_CAPS: Record<string, number> = {
  journal: 6,
  conversation: 8,
  meeting: 5,
  minutes: 3,
  legislation: 3,
  notices: 2,
  campaign: 4,
  emotion: 5,
  interview: 3,
};

/** The scene a line belongs to: its kind and its situation; a journal line belongs to its chapter. */
function sceneOf(raw: Raw): string {
  if (raw.category === "journal") {
    const chapter = /chapter "([^"]*)"/.exec(raw.context)?.[1] ?? "";
    return `journal|${raw.speaker}|${chapter}`;
  }
  return `${raw.category}|${raw.context}`;
}

interface SceneLine {
  speaker: string;
  text: string;
  parts: string[];
}

interface SceneItem {
  i: number;
  kind: string;
  /** What the scene is, in plain words, and the records behind it. */
  scene: string;
  trace: string[];
  sourceRecordIds: string[];
  lines: SceneLine[];
  /** The one thing the item tests. */
  test: string;
  /** For a line's wording: the line tested and its alternatives on one axis. */
  tested?: { line: number; axis: string; parts: string[] };
  variants: { n: number; axis: string; parts: string[]; text: string }[];
  /** For a conversation: the four replies, the lies and say nothing. */
  choices?: { n: number; text: string; parts: string[]; lie: boolean }[];
}

/** The conversations of one played life, each turn's whole choice set. */
function conversationScenes(placeLife: number): {
  scenes: SceneItem[];
  place: Place | null;
} {
  // Two weeks of days, so the talks are with different people.
  const played = playLives({ seed, lives: placeLife + 1, days: 14 }).at(-1)!;
  const scenes: SceneItem[] = [];
  for (const talk of played.conversations) {
    let fromTalk = 0;
    talk.turns.forEach((turn, at) => {
      // Two turns at most from one talk, so the sets come from different people.
      if (turn.choices.length < 2 || fromTalk >= 2) return;
      fromTalk += 1;
      // What was said since the player last spoke: the turn the replies answer.
      const said = turn.said.map((line) => ({
        speaker: line.speaker,
        text: line.text,
        parts: line.wording?.parts ?? [],
      }));
      const reach = talk.reachesOut[talk.playerId];
      scenes.push({
        i: -1,
        kind: "conversation",
        scene: `${talk.player} talks with ${talk.other}${talk.filledIn ? ", a neighbor met for the first time" : ""}, day ${talk.day + 1}, turn ${at + 1}.`,
        trace: [
          `The replies are the four the engine offers this turn, ranked by ${talk.player}'s traits (conversation.reply-reach: ${reach === undefined ? "no lean on record" : reach >= 0 ? `leans toward carrying the talk on, ${reach.toFixed(2)}` : `leans toward keeping it short, ${reach.toFixed(2)}`}).`,
          turn.lies.length
            ? "The lies are what the scales offer: the same moves made false about the player's own record."
            : "The scales are dim: nothing about the player's own record is in play, or the listener already knows it.",
          "Say nothing is the smaller control beside the replies.",
        ],
        sourceRecordIds: [talk.playerId, talk.otherId],
        lines: said,
        test: "the choice set: mark each reply and each lie good or bad here",
        variants: [],
        choices: [
          ...turn.choices.map((choice, n) => ({
            n: n + 1,
            text: choice.text,
            parts: choice.wording?.parts ?? [],
            lie: false,
          })),
          ...turn.lies.map((choice, n) => ({
            n: turn.choices.length + n + 1,
            text: choice.text,
            parts: choice.wording?.parts ?? [],
            lie: true,
          })),
        ],
      });
    });
  }
  return {
    scenes,
    place: {
      life: played.life,
      key: played.placeKey,
      name: played.placeName,
      state: played.state,
      seed: played.seed,
    },
  };
}

function main() {
  // One place, with real local laws passing: draws are read in turn until a
  // year passes a local law (owner, batch 9: three places with nothing
  // differentiating them is wasted usage).
  let cached:
    | {
        raws: Raw[];
        gaps: string[];
        stood: string[];
        passed: string[];
        place: Place;
        tried: string[];
      }
    | undefined;
  if (cachePath && existsSync(cachePath))
    cached = JSON.parse(readFileSync(cachePath, "utf8"));
  if (!cached) {
    const tried: string[] = [];
    for (let life = 0; life < 8 && !cached; life += 1) {
      const drawn = drawPlace(`${seed}:${life}`, "dialogue-report");
      const place: Place = {
        life,
        key: drawn.key,
        name: drawn.name,
        state: drawn.state,
        seed: drawn.seed,
      };
      console.error(`reading ${place.name}`);
      try {
        const world = readWorld(place);
        if (!world.passed.length) {
          tried.push(`${place.name}: no local law passed in the year`);
          continue;
        }
        cached = { ...world, place, tried };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        tried.push(
          `${place.name}: the played world stopped before its year ended (${message})`,
        );
      }
      (globalThis as { gc?: () => void }).gc?.();
    }
    if (!cached)
      throw new Error(`no drawn place passed a local law: ${tried.join("; ")}`);
    if (cachePath) writeFileSync(cachePath, JSON.stringify(cached));
  }
  const place = cached.place;

  // Every line passes the owner's grades and the guard's single-line rules first.
  const held = (keys: readonly string[]) =>
    keys.some((key) => heldByGrades(key) || heldByGrades(`bank:${key}`));
  const rejections: Rejection[] = [];
  const graded = { lines: 0, alternatives: 0, ungrammatical: 0 };
  const passes = (raw: Raw): boolean => {
    if (held(raw.parts)) {
      graded.lines += 1;
      rejections.push({
        rule: "held-by-grades",
        kind: raw.category,
        text: raw.text,
      });
      return false;
    }
    if (!grammatical(raw.text)) {
      graded.ungrammatical += 1;
      rejections.push({
        rule: "ungrammatical",
        kind: raw.category,
        text: raw.text,
      });
      return false;
    }
    const problem = lineProblem({
      kind: raw.category,
      text: raw.text,
      parts: raw.parts,
      masks: raw.guard?.masks,
      institutions: raw.guard?.institutions,
      titles: raw.guard?.titles,
      sourceRecordIds: raw.sourceRecordIds,
    });
    if (problem) {
      rejections.push({ rule: problem, kind: raw.category, text: raw.text });
      return false;
    }
    return true;
  };

  // The world's scenes, each with the lines that passed, in the order said.
  const grouped = new Map<string, Raw[]>();
  for (const raw of cached.raws) {
    const key = sceneOf(raw);
    grouped.set(key, [...(grouped.get(key) ?? []), raw]);
  }
  const used = new Set<string>();
  const fresh = (parts: readonly string[]) =>
    parts.every((key) => !used.has(key));
  const sceneItems = new Map<string, SceneItem[]>();
  for (const [key, rows] of grouped) {
    const kind = key.split("|")[0]!;
    const kept = rows.filter(passes);
    if (!kept.length) continue;
    const first = kept[0]!;
    const isPair = kind === "journal" || kind === "campaign";
    // The line tested: the one with alternatives on an axis, a chapter's or a
    // speech's closing line when the test is the opening and closing pair.
    const candidates = (isPair ? [kept.at(-1)!] : kept)
      .map((raw) => ({ raw, item: withVariants(raw) }))
      .filter(({ item }) => item && item.variants.length);
    const pick = candidates[0];
    const variants = (pick?.item?.variants ?? []).filter((variant) => {
      if (held(variant.parts)) {
        graded.alternatives += 1;
        return false;
      }
      if (!grammatical(variant.text)) {
        graded.ungrammatical += 1;
        return false;
      }
      return true;
    });
    const axis = variants[0]?.axis;
    const oneAxis = variants.filter((variant) => variant.axis === axis);
    // A related set of alternatives on one axis only, the closest ones.
    const shown = (oneAxis.length ? oneAxis : variants).slice(0, 3);
    const lines = kept.map((raw) => ({
      speaker: raw.speaker,
      text: raw.text,
      parts: raw.parts,
    }));
    const testedAt = pick ? kept.indexOf(pick.raw) : -1;
    sceneItems.set(kind, [
      ...(sceneItems.get(kind) ?? []),
      {
        i: -1,
        kind,
        scene:
          kind === "journal"
            ? `The "My life" journal of ${first.speaker}, chapter "${/chapter "([^"]*)"/.exec(first.context)?.[1] ?? ""}".`
            : first.context,
        trace: [
          first.composer,
          ...(kind === "journal"
            ? kept
                .map(
                  (raw) => /entry dated ([^.]*)/.exec(raw.context)?.[0] ?? "",
                )
                .filter(Boolean)
            : []),
        ],
        sourceRecordIds: [
          ...new Set(kept.flatMap((raw) => raw.sourceRecordIds)),
        ],
        lines,
        test: isPair
          ? "the opening and closing pair: does the closing line follow from the opening, here?"
          : shown.length
            ? `the wording of line ${testedAt + 1} on one axis (${shown[0]!.axis})`
            : "the scene as it stands",
        ...(pick && shown.length
          ? {
              tested: {
                line: testedAt,
                axis: shown[0]!.axis,
                parts: pick.raw.parts,
              },
            }
          : {}),
        variants: shown.map((variant, at) => ({
          n: at + 1,
          axis: variant.axis,
          parts: variant.parts,
          text: variant.text,
        })),
      },
    ]);
  }

  // Conversations from the same place and the same seed.
  const talk = conversationScenes(place.life);
  sceneItems.set("conversation", talk.scenes);

  // Thirty different scenes: kinds in turn, each under its cap, and no phrase
  // shown twice in the batch.
  const order = Object.keys(SCENE_CAPS);
  const taken: Record<string, number> = {};
  const items: SceneItem[] = [];
  // What a scene puts in front of the owner to grade: a choice set's asked
  // line and its replies that are new to the batch (an "All right." in every
  // set is graded once), and everything else in any other scene.
  const tested = (item: SceneItem): string[] | null => {
    if (!item.choices) return phrases(item);
    const asked = item.lines.at(-1)?.parts ?? [];
    const newReplies = item.choices.filter((choice) => fresh(choice.parts));
    return newReplies.length >= 3
      ? [...asked, ...newReplies.flatMap((choice) => choice.parts)]
      : null;
  };
  const phrases = (item: SceneItem) => [
    ...item.lines.flatMap((line) => line.parts),
    ...item.variants.flatMap((variant) => variant.parts),
    ...(item.choices ?? []).flatMap((choice) => choice.parts),
  ];
  for (let round = 0; items.length < SCENES && round < SCENES; round += 1) {
    let added = false;
    for (const kind of order) {
      if (items.length >= SCENES) break;
      if ((taken[kind] ?? 0) >= SCENE_CAPS[kind]!) continue;
      const pool = sceneItems.get(kind) ?? [];
      const next = pool.find((item) => {
        const keys = tested(item);
        return !items.includes(item) && keys !== null && fresh(keys);
      });
      if (!next) continue;
      for (const key of tested(next) ?? []) used.add(key);
      items.push(next);
      taken[kind] = (taken[kind] ?? 0) + 1;
      added = true;
    }
    if (!added) break;
  }
  items.forEach((item, at) => {
    item.i = at;
  });

  const gaps = [
    ...new Set([
      ...cached.gaps.filter((g) => !g.includes("oppose the question's policy")),
      ...(taken.interview
        ? []
        : [
            "Interviews: every recorded question and answer names a policy by its catalog name, which nobody says aloud (owner, batch 9); they return when each policy carries its purpose phrase and moniker (owner ruling, Oct 14 afternoon, item 1).",
          ]),
      "Hearings: the hearing bank holds a witness's thanks, answers and agreement but no chair's or member's question, so no answer could follow a question it was asked; hearings return when a question move is mined.",
      "Scenes the world does not yet produce: a wedding, pork barreling (a member asking for a project in the district), a legislator arguing on the floor against another member by name.",
      "A tribute's middle: the bank says where someone was born or grew up, which a congratulation never uses (owner, batch 9), and 'worked at {employer} for {years} years'; what a body says of an official's service ('{name} has served as {office}') is not mined yet.",
      ...(items.length < SCENES
        ? [
            `Only ${items.length} different scenes passed: the world held no more scenes whose phrases were not already shown.`,
          ]
        : []),
    ]),
  ];
  const batch = {
    id,
    title: `Scene batch ${id} (${items.length} scenes)`,
    at: new Date().toISOString(),
    head: execSync("git rev-parse HEAD").toString().trim(),
    shortHead: headCommit(),
    seed,
    days,
    status: "open" as const,
    place: {
      name: place.name,
      key: place.key,
      seed: place.seed,
      passed: cached.passed,
      tried: cached.tried,
    },
    kinds: taken,
    screened: { rejected: rejections.length, byGrades: graded, rejections },
    stoodIn: cached.stood,
    gaps,
    items: items.map((item) => ({
      ...item,
      // What a grade is counted against: the tested line's parts, or each reply's.
      parts: item.tested?.parts ?? item.lines.at(-1)?.parts ?? [],
    })),
  };
  writeFileSync(
    `data/english/batches/${id}.json`,
    `${JSON.stringify(batch, null, 2)}\n`,
  );
  writeFileSync(`docs/grading/words-${id}.md`, scenePage(batch));
  execSync(
    `npx prettier --write data/english/batches/${id}.json docs/grading/words-${id}.md`,
    { stdio: "ignore" },
  );
  console.error(
    `${items.length} scenes in ${place.name}; ${JSON.stringify(taken)}; screened out ${rejections.length} lines`,
  );
}

const KIND_TITLES: Record<string, string> = {
  journal: 'A chapter of "My life"',
  conversation: "A conversation turn",
  meeting: "A meeting",
  hearing: "A hearing",
  minutes: "The minutes",
  legislation: "Bill text",
  notices: "A notice",
  campaign: "A rally",
  emotion: "Election night or an honor",
  interview: "An interview",
};

function scenePage(batch: {
  id: string;
  seed: string;
  days: number;
  place: { name: string; seed: string; passed: string[]; tried: string[] };
  kinds: Record<string, number>;
  screened: {
    rejected: number;
    byGrades: { lines: number; alternatives: number; ungrammatical: number };
    rejections: Rejection[];
  };
  stoodIn: string[];
  gaps: string[];
  items: SceneItem[];
}): string {
  const byRule = new Map<string, number>();
  for (const row of batch.screened.rejections)
    byRule.set(row.rule, (byRule.get(row.rule) ?? 0) + 1);
  const sections = batch.items.map((item) => {
    const said = item.lines.map(
      (line, at) =>
        `${at + 1}. ${cell(line.speaker)}: ${item.tested?.line === at ? `**${cell(line.text)}**` : cell(line.text)}`,
    );
    const options = item.choices
      ? [
          "| # | Reply | Lie | Good here? |",
          "| --- | --- | --- | --- |",
          ...item.choices.map(
            (choice) =>
              `| ${choice.n} | ${cell(choice.text)} | ${choice.lie ? "yes" : ""} | |`,
          ),
          "| | (Say nothing) | | |",
        ].join("\n")
      : item.variants.length
        ? [
            `| # | Another way to say the bold line (${item.variants[0]!.axis}) | Better? |`,
            "| --- | --- | --- |",
            ...item.variants.map(
              (variant) => `| ${variant.n} | ${cell(variant.text)} | |`,
            ),
          ].join("\n")
        : "No other wording in the bank fits this line on one axis; grade the scene as it stands.";
    return [
      `### ${item.i}. ${KIND_TITLES[item.kind] ?? item.kind}`,
      "",
      `The scene: ${cell(item.scene)}`,
      "",
      `How it was made: ${item.trace.map(cell).join(" ")}`,
      "",
      `Tests one thing: ${item.test}.`,
      "",
      said.join("\n"),
      "",
      options,
      "",
    ].join("\n");
  });
  return `# Words in thirty scenes: grading batch ${batch.id}

Thirty different scenes from one place, ${batch.place.name}, played ${batch.days} days from 2026-10-12 (seed \`${batch.place.seed}\`). Its year passed real local laws: ${batch.place.passed.join("; ")}.${batch.place.tried.length ? ` Places drawn before it and passed over: ${batch.place.tried.join("; ")}.` : ""}

Each item is one scene as the engine composed it, with how it was made, and tests one thing (owner, Oct 14, 2026, evening): the wording of the bold line on one axis, a chapter's or a speech's opening and closing pair, or a conversation's choice set (the four replies, the lies and say nothing). A phrase appears once in the whole batch. Every sentence was said in a public-domain record; the names, places, offices and bills are the world's own records.

## What was screened out first

Your grades: ${batch.screened.byGrades.lines} lines and ${batch.screened.byGrades.alternatives} alternatives used a part you failed or marked conditional; ${batch.screened.byGrades.ungrammatical} lines or alternatives were not whole English. In all ${batch.screened.rejected} lines were left out: ${[...byRule.entries()].map(([rule, n]) => `${rule} ${n}`).join(", ") || "none"}.

| Scene kind | Scenes |
| --- | --- |
${Object.entries(batch.kinds)
  .map(([kind, n]) => `| ${KIND_TITLES[kind] ?? kind} | ${n} |`)
  .join("\n")}

## How to grade

- A line's wording: GOOD, BAD or FIX for the bold line, and the number of a better alternative if one is.
- An opening and closing pair: GOOD, BAD or FIX for the pair, with a note.
- A choice set: good or bad for each reply and each lie, here, in this conversation.

Write them to \`data/english/grades/${batch.id}.json\`:

\`\`\`json
[
  { "i": 0, "grade": "pass", "note": "optional" },
  { "i": 1, "grade": "fail", "prefer": 2 },
  { "i": 2, "choices": { "1": "good", "2": "bad", "5": "good" } }
]
\`\`\`

\`node --import tsx scripts/dialogue-batch/apply-grades.ts\` folds them into the part ledger.

## Facts that were stood in

${batch.stoodIn.map((row) => `- ${row}`).join("\n")}

## OWNER DECISIONS NEEDED

${batch.gaps.map((row) => `- ${row}`).join("\n")}

## The scenes

${sections.join("\n")}`;
}

if (import.meta.url === `file://${process.argv[1]}`) main();
