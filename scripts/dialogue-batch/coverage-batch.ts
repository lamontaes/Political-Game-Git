/* eslint-disable @typescript-eslint/no-explicit-any -- module rows are read untyped by this tooling */
/**
 * The coverage grading batch: engine output of every kind the English engine
 * words, from played worlds in drawn places, each line with up to five real
 * alternatives that differ on one axis. Development tooling; grading never
 * blocks a merge, and nothing here words anything.
 *
 *   npm run dialogue:coverage -- [--id batch-8] [--seed batch-8] [--places 5] \
 *     [--days 365] [--cache <file>] [--only conversation] \
 *     [--mix journal=14,legislation=12,...]
 *
 * Per place (`drawPlace("<seed>:<life>", "dialogue-report")`, the same draw as
 * the conversation batch) it builds the played world (`buildBenchWorld`,
 * two-level), lets the player's circle be watched by the story director, runs
 * `--days` days, and reads what the world holds: the circle's journal
 * (`composeJournal`), filed bills and their roll calls, contests and their
 * filings, interviews the press engine ran, and the officials. Each kind is
 * worded by the engine's own composer with those records as facts:
 *
 *   journal          composeJournal (src/director/journal.ts)
 *   speeches         composeAddress over address.json (campaign, public
 *                    comment, victory, concession, house honors, chair)
 *   bills, notices,  composeFromBank over legislation / notices / minutes /
 *   minutes, hearing hearing / meeting / interview.json
 *   conversation     openConversation and say (play-lives.ts), true replies
 *                    and the scales' false set
 *
 * A kind the engine cannot word, or a scenario the simulation cannot yet
 * produce, is written to the batch's `gaps` and the page's "OWNER DECISIONS
 * NEEDED" section, never invented. `--cache` keeps the world-derived lines so a
 * later run (a new director change) rebuilds only the conversation slice.
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
import { candidatesOf } from "./grading-batch";
import {
  checkBatch,
  grammatical,
  lineProblem,
  loadThresholds,
  selectPassing,
  type GuardLine,
  type Rejection,
} from "./repetition-guard";
import { heldByGrades } from "../../src/presentation/english-grades";
import {
  AXES,
  minedParts,
  slotValues,
  variantsFor,
  type IndexedPart,
  type Variant,
} from "./mined-variants";
import { hashOf, headCommit, playLives } from "./play-lives";
import hearingJson from "../../data/english/parts/hearing.json" with { type: "json" };
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
const places = Number(option("places", "5"));
const days = Number(option("days", "365"));
const cachePath = option("cache", "");
/** How many candidate lines per kind are put in front of the repetition guard. */
const CANDIDATES = 400;
const only = option("only", "");

/** The order of the page, and how many lines each kind gets. Conversation is last. */
export const DEFAULT_MIX: Record<string, number> = {
  journal: 20,
  legislation: 12,
  notices: 2,
  minutes: 4,
  hearing: 4,
  meeting: 12,
  campaign: 8,
  interview: 8,
  emotion: 18,
  conversation: 12,
};
const mix: Record<string, number> = { ...DEFAULT_MIX };
for (const pair of option("mix", "").split(",").filter(Boolean)) {
  const [kind, count] = pair.split("=");
  if (kind && count) mix[kind] = Number(count);
}

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
  const minutesBank = minutesJson as unknown as EnglishBank;
  const hearingBank = hearingJson as unknown as EnglishBank;
  const LOCAL_FLOOR_ONLY =
    /\b(Senator|Senate|Congress\w*|House|gentle(?:man|woman|lady)|Representative|legislation|bill|amendment|yield\w*|recess|unanimous consent|balance of my time|privileged|resolution|engross\w*|third time|yeas and nays|previous question)\b/i;
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

    // A member to the chair on the floor, and a hearing exchange.
    const speakerId = rolls.find((v) => v.vote === "yes")?.memberId ?? chair.id;
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
            composer: "composeFromBank over data/english/parts/meeting.json",
            sourceRecordIds: [bill.id, speakerId],
          });
      }
      const witness =
        circle.filter((c) => c !== world.playerId)[
          hashOf(seed, bill.id) % Math.max(1, circle.length - 1)
        ] ?? speakerId;
      for (const move of ["thanks", "answer", "chair-procedure", "agree"]) {
        const made = composeFromBank(
          hearingBank,
          move,
          {},
          `${bill.id}:h:${move}`,
          LOCAL_FLOOR_ONLY,
        );
        if (made)
          raws.push({
            ...base,
            category: "hearing",
            speaker: `${nameOf(move === "chair-procedure" ? (chair.id ?? speakerId) : witness)}${move === "chair-procedure" ? " (chair)" : " (witness)"}`,
            context: `A hearing on ${bill.number} ("${title}") before the ${body}; the witness is ${nameOf(witness)}, a resident.`,
            prior: "",
            text: made.text,
            parts: [made.partKey],
            composer: "composeFromBank over data/english/parts/hearing.json",
            sourceRecordIds: [bill.id],
          });
      }
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
  // Honors: a sitting official honored by a colleague.
  const sitting = terms
    .filter((t) => t.status === "serving")
    .map((t) => t.personId as string);
  const honored = sitting
    .filter((p) => personOf(p)?.alive !== false)
    .slice(0, 4);
  honored.forEach((personId, at) => {
    const colleague = honored[(at + 1) % honored.length];
    if (colleague && colleague !== personId)
      turns.push({ register: "house-honor", personId, speakerId: colleague });
  });
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
  return { raws, gaps, stood };
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
  const forbid = raw.forbid ? new RegExp(raw.forbid) : undefined;
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

/** Places in turn, lines with alternatives first, each part varied at most once. */
function choose(rows: Raw[], wanted: number, label: string): Item[] {
  const seenText = new Set<string>();
  const byPlace = new Map<number, Item[]>();
  for (const raw of rows) {
    const key = `${raw.prior}|${raw.text}`;
    if (seenText.has(key)) continue;
    seenText.add(key);
    const item = withVariants(raw);
    if (!item) continue;
    byPlace.set(raw.life, [...(byPlace.get(raw.life) ?? []), item]);
  }
  const pools = [...byPlace.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, items]) =>
      items.sort(
        (a, b) =>
          Math.min(b.variants.length, 3) - Math.min(a.variants.length, 3) ||
          hashOf(seed, label, a.text, a.prior) -
            hashOf(seed, label, b.text, b.prior),
      ),
    );
  const used = new Map<string, number>();
  const chosen: Item[] = [];
  for (let round = 0; chosen.length < wanted && round < 6; round += 1)
    for (let at = 0; chosen.length < wanted; at += 1) {
      let any = false;
      for (const pool of pools) {
        const item = pool[at];
        if (!item) continue;
        any = true;
        if (chosen.length >= wanted || chosen.includes(item)) continue;
        if ((used.get(item.varied) ?? 0) > round) continue;
        chosen.push(item);
        used.set(item.varied, (used.get(item.varied) ?? 0) + 1);
      }
      if (!any) break;
    }
  return chosen;
}

/* ---------------------------------------------------- the conversation slice */

function conversationRaws(): { raws: Raw[]; placeList: Place[] } {
  const played = playLives({
    seed,
    lives: places,
    days: 6,
    onLife: (life) =>
      console.error(
        `conversation life ${life.life}: ${life.placeName} ${life.error ? `FAILED ${life.error.split("\n")[0]}` : `${life.conversations.length} conversations`}`,
      ),
  });
  const raws: Raw[] = [];
  const bank = [...all.values()]
    .filter((part) => part.bank === "conversation")
    .sort((a, b) => b.text.length - a.text.length);
  for (const life of played.filter((row) => !row.error))
    for (const row of candidatesOf(life, { lies: true })) {
      const parts = row.lineParts.length
        ? row.lineParts
        : bank
            .filter((p) => slotValues(p, row.text))
            .slice(0, 1)
            .map((p) => p.key);
      if (!parts.length) continue;
      raws.push({
        category: "conversation",
        place: life.placeName,
        life: life.life,
        speaker: row.speaker,
        context: `${row.situation}${row.lie ? " This is one of the scales' false versions: a reply that is not true of the speaker." : ""}${row.kind === "choice" ? " A reply the player could pick." : ""}`,
        prior: row.prior,
        text: row.text,
        parts,
        moment: row.moment,
        sociability: row.sociability,
        lie: row.lie ?? false,
        composer:
          "openConversation and say (src/director/conversation.ts), words from data/english/parts/conversation.json",
        sourceRecordIds: [],
      });
    }
  return {
    raws,
    placeList: played.map((life) => ({
      life: life.life,
      key: life.placeKey,
      name: life.placeName,
      state: life.state,
      seed: life.seed,
    })),
  };
}

/* ------------------------------------------------------------------- main */

const cell = (text: string) =>
  text.replace(/\|/g, "\\|").replace(/\s*\n\s*/g, " / ");

function emotionCoverage() {
  const found: Record<string, number> = {};
  for (const [name] of EMOTION_RULES) found[name] = 0;
  for (const part of all.values())
    for (const emotion of emotionsOf(part.text))
      found[emotion] = (found[emotion] ?? 0) + 1;
  return found;
}

function main() {
  const placeList: Place[] = Array.from({ length: places }, (_unused, life) => {
    const drawn = drawPlace(`${seed}:${life}`, "dialogue-report");
    return {
      life,
      key: drawn.key,
      name: drawn.name,
      state: drawn.state,
      seed: drawn.seed,
    };
  });
  let cached: { raws: Raw[]; gaps: string[]; stood: string[] } | undefined;
  if (cachePath && existsSync(cachePath))
    cached = JSON.parse(readFileSync(cachePath, "utf8"));
  if (!cached) {
    cached = { raws: [], gaps: [], stood: [] };
    if (only !== "conversation") {
      // A world that fails to run is named as a gap and the next place is
      // drawn, so the batch still covers as many places as asked.
      const read: Place[] = [];
      for (let life = 0; read.length < places && life < places * 2; life += 1) {
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
          cached.raws.push(...world.raws);
          cached.gaps.push(...world.gaps.map((g) => `${place.name}: ${g}`));
          cached.stood.push(...world.stood);
          read.push(place);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          cached.gaps.push(
            `${place.name} (seed ${place.seed}): the played world stopped before its year ended (${message}); another place was drawn`,
          );
        }
        (globalThis as { gc?: () => void }).gc?.();
      }
      placeList.splice(0, placeList.length, ...read);
    }
    if (cachePath) writeFileSync(cachePath, JSON.stringify(cached));
  }
  const conversation = mix.conversation
    ? conversationRaws()
    : { raws: [], placeList };
  const items: Item[] = [];
  const counts: Record<string, number> = {};
  const emotionsSeen: Record<string, number> = {};
  const kinds = Object.keys(mix);
  const thresholds = loadThresholds(kinds);
  const rejections: Rejection[] = [];
  const triedBy: Record<string, number> = {};
  const poolBy: Record<string, number> = {};
  const shortGaps: string[] = [];
  // The owner's grades come first: a line or an alternative said by a part he
  // held back never reaches the page, nor does one that is not whole English.
  const held = (keys: readonly string[]) =>
    keys.some((key) => heldByGrades(key) || heldByGrades(`bank:${key}`));
  const graded = { lines: 0, alternatives: 0, ungrammatical: 0 };
  const screen = (kind: string, items: Item[]): Item[] =>
    items.flatMap((item) => {
      if (held(item.parts)) {
        graded.lines += 1;
        rejections.push({ rule: "held-by-grades", kind, text: item.text });
        return [];
      }
      if (!grammatical(item.text)) {
        graded.ungrammatical += 1;
        rejections.push({ rule: "ungrammatical", kind, text: item.text });
        return [];
      }
      // The line before it is part of the same exchange: a tribute that made
      // a school the event fails whichever of its sentences is shown.
      if (
        item.prior &&
        lineProblem({ ...guardOf(item), text: item.prior }) ===
          "institution-event"
      ) {
        rejections.push({ rule: "institution-event", kind, text: item.prior });
        return [];
      }
      const variants = item.variants.filter((variant) => {
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
      return [
        {
          ...item,
          variants: variants.map((variant, at) => ({ ...variant, n: at + 1 })),
        },
      ];
    });
  const guardOf = (item: Item): GuardLine => ({
    kind: item.category,
    text: item.text,
    parts: item.parts,
    masks: [...(item.guard?.masks ?? []), item.speaker.split(" (")[0]!],
    institutions: item.guard?.institutions,
    titles: item.guard?.titles,
    sourceRecordIds: item.sourceRecordIds,
  });
  for (const kind of kinds) {
    const pool =
      kind === "conversation"
        ? conversation.raws
        : cached.raws.filter((raw) => raw.category === kind);
    // Every candidate in a stable order (places in turn, lines with alternatives first),
    // far more than the page needs; the guard keeps the first ones that pass.
    let ordered: Item[];
    if (kind === "conversation") {
      const lies = choose(
        pool.filter((raw) => raw.lie),
        CANDIDATES,
        "lie",
      );
      const truths = choose(
        pool.filter((raw) => !raw.lie),
        CANDIDATES,
        "talk",
      );
      // About one false version in four, as the scales offer them.
      ordered = [];
      for (let at = 0; at < truths.length || at < lies.length; at += 1) {
        for (const item of truths.slice(at * 3, at * 3 + 3)) ordered.push(item);
        if (lies[at]) ordered.push(lies[at]!);
      }
    } else if (kind === "emotion") {
      // Lines whose own words carry a feeling, a spread of feelings in turn.
      const tagged = cached.raws.filter(
        (raw) => raw.category === "emotion" && emotionsOf(raw.text).length > 0,
      );
      const byFeeling = new Map<string, Raw[]>();
      for (const raw of tagged)
        for (const emotion of emotionsOf(raw.text))
          byFeeling.set(emotion, [...(byFeeling.get(emotion) ?? []), raw]);
      const lanes = [...byFeeling.entries()]
        .sort()
        .map(([emotion, rows]) =>
          choose(rows, CANDIDATES, `emotion:${emotion}`),
        );
      ordered = [];
      for (let at = 0; lanes.some((lane) => lane[at]); at += 1)
        for (const lane of lanes)
          if (lane[at] && !ordered.some((row) => row.text === lane[at]!.text))
            ordered.push(lane[at]!);
    } else ordered = choose(pool, CANDIDATES, kind);
    const candidates = screen(kind, ordered).map((item) => ({
      ...guardOf(item),
      item,
    }));
    const picked = selectPassing(kind, candidates, mix[kind]!, thresholds);
    poolBy[kind] = candidates.length;
    triedBy[kind] = picked.tried;
    rejections.push(...picked.rejections);
    if (picked.short)
      shortGaps.push(
        `${kind}: the world held ${candidates.length} candidate lines, and only ${picked.chosen.length} of the ${mix[kind]} wanted passed the repetition guard (${picked.rejections.length} rejected). The records do not yet give this kind enough different openers, sentence shapes and verbs.`,
      );
    counts[kind] = picked.chosen.length;
    items.push(...picked.chosen.map((row) => row.item));
  }
  const guardLines = items.map(guardOf);
  const guarded = checkBatch(guardLines, thresholds);
  if (guarded.failures.length) {
    console.error(
      `the repetition guard fails the batch:\n${guarded.failures.join("\n")}`,
    );
    process.exit(1);
  }
  items.forEach((item, at) => {
    item.i = at;
    for (const emotion of emotionsOf(item.text))
      emotionsSeen[emotion] = (emotionsSeen[emotion] ?? 0) + 1;
  });
  const byAxis: Record<string, number> = {};
  for (const item of items)
    for (const variant of item.variants)
      byAxis[variant.axis] = (byAxis[variant.axis] ?? 0) + 1;

  const coverage = emotionCoverage();
  const gaps = [
    ...new Set([
      // Each place's count of opposing interview answers is covered by the
      // one interview line below.
      ...cached.gaps
        .map((g) => g.replace(/^[^:]+: /, ""))
        .filter((g) => !g.includes("oppose the question's policy")),
      "Arrogance, anger and fear have no words in any bank: no part carries a boast, a threat or an alarm, and the composer's `mood` input has no bank that reads it. Owner's intent: temporary emotions are separate from core traits, and cocky and brazen are named traits (docs/coordination/DECISION-REGISTER.md, the personality-vocabulary entry); the wording is the owner's call.",
      "Local ordinance wording: the only local parts ('An Ordinance concerning', 'Be it ordained by the') come from one Baltimore bill and are marked not shippable, so a town council's measure is worded with the federal bank's short title ('This Act may be cited as') and repeal clause. Owner decision needed on whether a local body's measure uses its own form.",
      "Bill text is only a bill's title, short title, long title and repeal clause: no composer turns a provision (a policy question and a direction, or a budget line and an amount) into an operative section, and the local ordinance section part needs words nobody writes. Owner decision needed on how a section's operative words are produced without hand-written text.",
      "Interviews: a recorded answer that opposes a policy has no wording (the bank only commits or deflects), and the 'record' move needs the candidate's recorded vote on the same question, which the press and record modules do not join.",
      "Minutes: only roll-call lines and a discussion line; 'the next meeting would be held on' needs a recorded next meeting date and 'dissented because' needs a recorded reason, which the legislature module does not keep.",
      "Meeting agendas and the speech of a real council meeting come only from bills of the town's bodies; a posted agenda record (items in order, with times) is not in the world yet.",
      "Bill titles in the real form: a bill's title should read 'A bill to ...' (a verb phrase after 'To'), but the bill catalog names each policy as a bare phrase, some a noun ('Paid family leave') and some a command ('Shift highway funds to transit'). Until each policy carries its own purpose phrase, notices, minutes, interviews and the repeal clause carry the title as a name in quotation marks, the short title carries it as before, and the long title ('To provide for ...') is made only for noun titles. Owner decision needed: who writes a purpose phrase per policy, or whether a quoted name is the form.",
      "Workplaces and schools are settings, never entries: the guard fails any line whose event is a school, a workplace, a filing office or an institution. Business names (for example 'Farmer's General Store') are another engine's work and are not fixed here.",
      ...shortGaps,
    ]),
  ];

  const batch = {
    id,
    title: `Coverage batch ${id} (${items.length} lines)`,
    at: new Date().toISOString(),
    head: execSync("git rev-parse HEAD").toString().trim(),
    shortHead: headCommit(),
    seed,
    days,
    status: "open" as const,
    axes: AXES,
    mix: counts,
    guard: {
      thresholds,
      measured: guarded.measures,
      candidates: poolBy,
      tried: triedBy,
      rejected: rejections.length,
      byGrades: graded,
      rejections,
    },
    variety: {
      items: items.length,
      places: conversation.placeList.length || placeList.length,
      placeList: placeList.map(({ life, key, name, state }) => ({
        life,
        key,
        name,
        state,
      })),
      variantsByAxis: byAxis,
      emotionsSeen,
    },
    emotionCoverage: coverage,
    stoodIn: cached.stood,
    gaps,
    items: items.map((item) => ({
      i: item.i,
      kind: item.category,
      category: item.category,
      place: item.place,
      life: item.life,
      speaker: item.speaker,
      context: item.context,
      situation: item.context,
      prior: item.prior,
      text: item.text,
      lie: item.lie ?? false,
      emotion: emotionsOf(item.text),
      parts: [item.varied],
      lineParts: item.parts,
      guard: item.guard,
      composer: item.composer,
      sourceRecordIds: item.sourceRecordIds,
      variants: item.variants,
    })),
  };
  writeFileSync(
    `data/english/batches/${id}.json`,
    `${JSON.stringify(batch, null, 2)}\n`,
  );
  writeFileSync(
    `docs/grading/words-${id}.md`,
    buildForPage(batch as unknown as PageBatch),
  );
  execSync(
    `npx prettier --write data/english/batches/${id}.json docs/grading/words-${id}.md`,
    {
      stdio: "ignore",
    },
  );
  console.error(
    `${items.length} lines; mix ${JSON.stringify(counts)}; variants ${JSON.stringify(byAxis)}`,
  );
}

const KIND_TITLES: Record<string, string> = {
  journal: 'Journal ("My life")',
  legislation: "Legislation (bill text)",
  notices: "Notices",
  minutes: "Minutes",
  hearing: "Hearings",
  meeting: "Meetings (chair, members, public comment)",
  campaign: "Campaign speech",
  interview: "Interview answers",
  emotion: "Emotional register",
  conversation: "Conversation (true replies and the scales' false versions)",
};

type PageBatch = {
  id: string;
  mix: Record<string, number>;
  items: {
    i: number;
    category: string;
    place: string;
    speaker: string;
    context: string;
    prior: string;
    text: string;
    lie: boolean;
    emotion: string[];
    lineParts: string[];
    variants: { n: number; axis: string; text: string }[];
  }[];
  variety: { placeList: { name: string }[]; items: number };
  days: number;
  guard: {
    thresholds: Record<string, Record<string, number>>;
    measured: {
      kind: string;
      lines: number;
      openers: number;
      closers: number;
      shapes: number;
      verbs: number;
    }[];
    candidates: Record<string, number>;
    tried: Record<string, number>;
    rejected: number;
    byGrades?: { lines: number; alternatives: number; ungrammatical: number };
    rejections: { rule: string; kind: string; text: string }[];
  };
  emotionCoverage: Record<string, number>;
  stoodIn: string[];
  gaps: string[];
  seed: string;
};
function guardSection(batch: PageBatch): string {
  const g = batch.guard;
  const rows = g.measured.map((m) => {
    const t = g.thresholds[m.kind]!;
    return `| ${KIND_TITLES[m.kind] ?? m.kind} | ${m.lines} | ${m.openers.toFixed(2)} (${t.openers}) | ${m.closers.toFixed(2)} (${t.closers}) | ${m.shapes.toFixed(2)} (${t.shapes}) | ${m.verbs.toFixed(2)} (${t.verbs}) | ${g.candidates[m.kind]} | ${g.tried[m.kind]} |`;
  });
  const byRule = new Map<string, Map<string, number>>();
  for (const row of g.rejections) {
    const kinds2 = byRule.get(row.rule) ?? new Map<string, number>();
    kinds2.set(row.kind, (kinds2.get(row.kind) ?? 0) + 1);
    byRule.set(row.rule, kinds2);
  }
  const ruleRows = [...byRule.entries()].map(
    ([rule, kinds2]) =>
      `| ${rule} | ${[...kinds2.values()].reduce((a, b) => a + b, 0)} | ${[...kinds2.entries()].map(([k, n]) => `${k} ${n}`).join(", ")} |`,
  );
  const examples = [...byRule.keys()].flatMap((rule) =>
    g.rejections
      .filter((row) => row.rule === rule)
      .slice(0, 3)
      .map((row) => `- ${rule} (${row.kind}): ${cell(row.text.slice(0, 120))}`),
  );
  const grades = g.byGrades
    ? `Your grades were applied first: ${g.byGrades.lines} candidate lines and ${g.byGrades.alternatives} alternatives used a part you failed (a school or a job as an entry, "The bill passed.", "the manager turned to"), and ${g.byGrades.ungrammatical} lines or alternatives were not whole English (such as "My daughter was born years old."); none of them is on this page.\n\n`
    : "";
  return `${grades}Before this page was written, every kind was checked for repetition (owner, Oct 14: batch 7 was "still super repetitive"). Each kind is measured on the share of distinct openers (first two words), distinct closers (last two words), distinct sentence shapes (names, titles, numbers and dates masked) and distinct main verbs; a kind under its threshold, or any line whose event is a school, a workplace, an institution or a filing office, or a bill title worded as a bare command, fails. The thresholds are estimated from real samples of the same size (\`src/director/data/director.json\`, \`dialogueGuard*\` rows). The worlds were played ${batch.days} days each.

| Kind | Lines | Openers (threshold) | Closers (threshold) | Shapes (threshold) | Verbs (threshold) | Candidates | Looked at before it passed |
| --- | --- | --- | --- | --- | --- | --- | --- |
${rows.join("\n")}

Rejected: ${g.rejected} candidates.

| Rule | Rejected | By kind |
| --- | --- | --- |
${ruleRows.join("\n") || "| (none) | 0 | |"}

${examples.join("\n")}`;
}

function buildForPage(batch: PageBatch): string {
  const placeNames = batch.variety.placeList.map((row) => row.name);
  const sections: string[] = [];
  let kind = "";
  for (const item of batch.items) {
    if (item.category !== kind) {
      kind = item.category;
      sections.push(
        `## ${KIND_TITLES[kind] ?? kind} (${batch.mix[kind]} lines)\n`,
      );
    }
    const rows = item.variants.map(
      (variant) =>
        `| ${variant.n} | ${variant.axis} | ${cell(variant.text)} | | |`,
    );
    const tags = [
      item.lie ? "a false version" : "",
      item.emotion.length ? `feeling: ${item.emotion.join(" + ")}` : "",
    ].filter(Boolean);
    sections.push(
      [
        `### ${item.i}. ${item.place}`,
        "",
        `Scenario: ${cell(item.context)}`,
        "",
        item.prior
          ? `The line before: ${cell(item.prior)}`
          : "The line before: (this opens it)",
        "",
        `The line${tags.length ? ` (${tags.join("; ")})` : ""}: **${cell(item.speaker)}: ${cell(item.text)}**`,
        "",
        item.variants.length
          ? [
              "| # | Axis | Another way to say it | Grade the line on this axis | Better |",
              "| --- | --- | --- | --- | --- |",
              ...rows,
            ].join("\n")
          : "No other wording in the bank fits this moment on one axis, so grade the line as it stands in a `note`.",
        "",
      ].join("\n"),
    );
  }
  const mixRows = Object.entries(batch.mix).map(
    ([name, count]) => `| ${KIND_TITLES[name] ?? name} | ${count} |`,
  );
  const feelingRows = Object.entries(batch.emotionCoverage).map(
    ([name, count]) => `| ${name} | ${count ? `${count} parts` : "none"} |`,
  );
  return `# Words across the game, graded on five axes: grading batch ${batch.id}

These ${batch.variety.items} lines are what the game's English engine produces today for each kind of text, not quotations: a journal entry, the title of a bill, a notice, a roll call in the minutes, a hearing, a chair calling a vote, a campaign speech, an interview answer, a feeling, and a conversation. Each sentence was said in a public-domain federal record, with the names, towns, offices and bills filled from a generated world's own records. Under each line are up to five other real sentences from the same bank, usable at the same moment, each one different on a single axis. Nothing here is invented or reworded. The worlds are ${placeNames.length} places drawn at random from all 56 (seed \`${batch.seed}\`), each played ${batch.days} days from 2026-10-12: ${placeNames.join("; ")}.

## What is in this batch

| Kind | Lines |
| --- | --- |
${mixRows.join("\n")}

Every line shows its scenario, the line before it and the speaker. The scenario is what the played world held when the line was made (a filed bill and its roll call, a candidate's filing, an interview the press engine ran, a journal entry the director recorded). Where the world held no record for a scenario, nothing was made up; it is listed under "OWNER DECISIONS NEEDED".

## What the repetition guard did

${guardSection(batch)}

## Feelings: what the banks have and lack

A line is tagged with the feeling its own words carry. These are the feelings the whole mined banks carry (parts found):

| Feeling | In the banks |
| --- | --- |
${feelingRows.join("\n")}

## How to grade

Each line has a few numbered alternatives. Each alternative is tagged with the one axis it differs on:

- **personality fit**: whether the words suit the person saying them (an outgoing person warmer, a reserved one briefer).
- **formality**: how formal or casual the words are.
- **word choice**: the same length and shape, but different words.
- **sentence structure**: a question against a statement, or one sentence against two.
- **length**: a much longer or shorter way to say it.

For each axis that appears, grade the line itself on that axis, as the owner hears it:

- **GOOD**: the line is right on this axis; keep it.
- **BAD**: the line is wrong on this axis; never say it in that spot.
- **FIX**: close, but it needs rewording.

Then, if one of the alternatives is better than the line on that axis, write its number. If the line is better, leave it blank. Skip any axis you have no opinion on. Lines marked "a false version" are what the scales offer as a lie; grade whether they would pass as the speaker's. Grades never block a merge.

## Where the grades go

Write them to \`data/english/grades/${batch.id}.json\` in this shape. Axis names are exactly: personality fit, formality, word choice, sentence structure, length. \`prefer\` holds the number of the better alternative for that axis, and is left out when the line is better.

\`\`\`json
{
  "batch": "${batch.id}",
  "grades": [
    {
      "i": 0,
      "axes": { "formality": "GOOD", "length": "BAD" },
      "prefer": { "length": 2 },
      "note": "optional"
    }
  ]
}
\`\`\`

\`node --import tsx scripts/dialogue-batch/apply-grades.ts\` folds them into the part ledger (\`data/english/part-grades.json\`).

## Facts that were stood in

${batch.stoodIn.map((row) => `- ${row}`).join("\n")}

## OWNER DECISIONS NEEDED

Each of these is a kind of line or a scenario the simulation cannot produce yet. None was invented for this batch.

${batch.gaps.map((row) => `- ${row}`).join("\n")}

## The lines

${sections.join("\n")}`;
}

if (import.meta.url === `file://${process.argv[1]}`) main();
