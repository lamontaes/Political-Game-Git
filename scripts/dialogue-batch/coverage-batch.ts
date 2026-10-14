/* eslint-disable @typescript-eslint/no-explicit-any -- module rows are read untyped by this tooling */
/**
 * The coverage grading batch: engine output of every kind the English engine
 * words, from played worlds in drawn places, each line with up to five real
 * alternatives that differ on one axis. Development tooling; grading never
 * blocks a merge, and nothing here words anything.
 *
 *   npm run dialogue:coverage -- [--id batch-7] [--seed batch-7] [--places 5] \
 *     [--days 120] [--cache <file>] [--only conversation] \
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
 *   minutes, hearing hearing / meeting / tribute / interview.json
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
import { composeFromBank } from "../../src/presentation/bank-english";
import type { EnglishBank } from "../../src/presentation/bank-english";
import { composeAddress } from "../../src/presentation/english-composition";
import type { GroundedEnglishPacket } from "../../src/presentation/grounded-english";
import { REGISTER_CARDS } from "../../src/presentation/speech-registers";
import { addDays, makeIsoDate } from "../../src/simulation/dates";
import { drawPlace } from "../core2-year/place";
import {
  addressMoves,
  ADDRESS_REGISTERS,
} from "../english-corpus/address-bank";
import { candidatesOf } from "./grading-batch";
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
import tributeJson from "../../data/english/parts/tribute.json" with { type: "json" };

const args = process.argv.slice(2);
const option = (name: string, fallback: string) => {
  const at = args.indexOf(`--${name}`);
  return at >= 0 && args[at + 1] !== undefined ? args[at + 1]! : fallback;
};
const id = option("id", "batch-7");
const seed = option("seed", id);
const places = Number(option("places", "5"));
const days = Number(option("days", "120"));
const cachePath = option("cache", "");
const only = option("only", "");

/** The order of the page, and how many lines each kind gets. Conversation is last. */
export const DEFAULT_MIX: Record<string, number> = {
  journal: 14,
  legislation: 12,
  notices: 4,
  minutes: 4,
  hearing: 4,
  meeting: 10,
  campaign: 8,
  interview: 8,
  emotion: 18,
  conversation: 18,
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
  ].slice(0, 12);
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
    const school = schoolsOf(core, personId)[0];
    const employer = employerOf(personId);
    const opponent = opponentId ? personOf(opponentId) : undefined;
    return {
      name: { text: nameOf(personId), sourceRecordIds: [personId] },
      place: { text: town, sourceRecordIds: [personId] },
      ...(employer ? { employer } : {}),
      ...(school
        ? { school: { text: school.name, sourceRecordIds: [school.recordId] } }
        : {}),
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
        "The ordinance's title",
        composeFromBank(legBank, "local-title", { title }, bill.id),
      ],
      [
        "Its short title",
        composeFromBank(legBank, "short-title", { act: `"${title}"` }, bill.id),
      ],
      [
        "Its repeal clause",
        support
          ? null
          : keyed(legBank, "legislation.clause.provision-is-repealed", {
              provision: title,
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
        { title, date: longDate(bill.introduced) },
        "A hearing notice",
      ],
      [
        "ordinance",
        { designation: bill.number, title },
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
        { topic: lowerFirst(title) },
        bill.id,
        /view|extent|Against this background|judged/,
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
  const contestOf = new Map<string, any>(
    contests.map((c) => [c.id as string, c]),
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
    const facts = factsOf(turn.personId, turn.opponentId);
    if (turn.office)
      facts.office = { text: turn.office, sourceRecordIds: [turn.personId] };
    if (turn.won) facts.won = { text: "yes", sourceRecordIds: [turn.personId] };
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

  // Tribute lines from tribute.json for a living official.
  const tributeBank = tributeJson as unknown as EnglishBank;
  for (const personId of honored.slice(0, 3)) {
    const row = personOf(personId)!;
    const school = schoolsOf(core, personId)[0];
    const facts = {
      chair: row.looks?.gender === "female" ? "Madam Speaker" : "Mr. Speaker",
      honoree: nameOf(personId),
      community: `the people of ${town}`,
      ...(school ? { school: school.name } : {}),
    };
    for (const move of ["opener", "praise", "closer"]) {
      const made = composeFromBank(
        tributeBank,
        move,
        facts,
        `${personId}:${move}`,
        /missed|survived|heavy heart|condolences|legacy|birthday|retirement|born in|served in/,
      );
      if (made)
        raws.push({
          ...base,
          category: "emotion",
          speaker: "A colleague",
          context: `A colleague honors ${nameOf(personId)}, a sitting official in ${town} (${move}).`,
          prior: "",
          text: made.text,
          parts: [made.partKey],
          composer: "composeFromBank over data/english/parts/tribute.json",
          sourceRecordIds: [personId],
        });
    }
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
      const issue = lowerFirst(topic);
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
    if (only !== "conversation")
      for (const place of placeList) {
        console.error(`reading ${place.name}`);
        const read = readWorld(place);
        cached.raws.push(...read.raws);
        cached.gaps.push(...read.gaps.map((g) => `${place.name}: ${g}`));
        cached.stood.push(...read.stood);
        (globalThis as { gc?: () => void }).gc?.();
      }
    if (cachePath) writeFileSync(cachePath, JSON.stringify(cached));
  }
  const conversation = mix.conversation
    ? conversationRaws()
    : { raws: [], placeList };
  const items: Item[] = [];
  const counts: Record<string, number> = {};
  const emotionsSeen: Record<string, number> = {};
  for (const kind of Object.keys(mix)) {
    const pool =
      kind === "conversation"
        ? conversation.raws
        : cached.raws.filter((raw) => raw.category === kind);
    let picked: Item[];
    if (kind === "conversation") {
      const lies = choose(
        pool.filter((raw) => raw.lie),
        Math.min(4, mix[kind]!),
        "lie",
      );
      const truths = choose(
        pool.filter((raw) => !raw.lie),
        mix[kind]! - lies.length,
        "talk",
      );
      picked = [...truths, ...lies];
    } else if (kind === "emotion") {
      // Emotional register: lines whose own words carry a feeling, a spread of feelings.
      const tagged = cached.raws.filter(
        (raw) => raw.category === "emotion" && emotionsOf(raw.text).length > 0,
      );
      const byFeeling = new Map<string, Raw[]>();
      for (const raw of tagged)
        for (const emotion of emotionsOf(raw.text))
          byFeeling.set(emotion, [...(byFeeling.get(emotion) ?? []), raw]);
      const share = Math.max(
        1,
        Math.ceil(mix[kind]! / Math.max(1, byFeeling.size)),
      );
      picked = [];
      for (const [emotion, rows] of [...byFeeling.entries()].sort()) {
        for (const item of choose(rows, share, `emotion:${emotion}`))
          if (
            !picked.some((row) => row.text === item.text) &&
            picked.length < mix[kind]!
          )
            picked.push(item);
      }
      // Top up to the wanted count from the unused tagged lines, a feeling at a time.
      for (const item of choose(tagged, mix[kind]! * 3, "emotion:rest"))
        if (
          picked.length < mix[kind]! &&
          !picked.some((row) => row.text === item.text)
        )
          picked.push(item);
    } else picked = choose(pool, mix[kind]!, kind);
    counts[kind] = picked.length;
    items.push(...picked);
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
    ]),
  ];

  const batch = {
    id,
    title: `Coverage batch ${id} (${items.length} lines)`,
    at: new Date().toISOString(),
    head: execSync("git rev-parse HEAD").toString().trim(),
    shortHead: headCommit(),
    seed,
    status: "open" as const,
    axes: AXES,
    mix: counts,
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
  emotionCoverage: Record<string, number>;
  stoodIn: string[];
  gaps: string[];
  seed: string;
};
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

These ${batch.variety.items} lines are what the game's English engine produces today for each kind of text, not quotations: a journal entry, the title of a bill, a notice, a roll call in the minutes, a hearing, a chair calling a vote, a campaign speech, an interview answer, a feeling, and a conversation. Each sentence was said in a public-domain federal record, with the names, towns, offices and bills filled from a generated world's own records. Under each line are up to five other real sentences from the same bank, usable at the same moment, each one different on a single axis. Nothing here is invented or reworded. The worlds are ${placeNames.length} places drawn at random from all 56 (seed \`${batch.seed}\`): ${placeNames.join("; ")}.

## What is in this batch

| Kind | Lines |
| --- | --- |
${mixRows.join("\n")}

Every line shows its scenario, the line before it and the speaker. The scenario is what the played world held when the line was made (a filed bill and its roll call, a candidate's filing, an interview the press engine ran, a journal entry the director recorded). Where the world held no record for a scenario, nothing was made up; it is listed under "OWNER DECISIONS NEEDED".

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
