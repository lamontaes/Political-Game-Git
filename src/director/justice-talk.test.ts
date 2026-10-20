import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  chargeDecision,
  JUSTICE_MODULE_ID,
  type CaseRow,
  type InvestigationRow,
} from "../core2/modules/justice";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { openConversation, subjectsBetween } from "./conversation";
import bankJson from "../../data/english/parts/conversation.json" with { type: "json" };
import { conversationDataFromBank } from "./mined/conversation-bank";

// The new parts are held until the owner grades them, so the talk reads them through the grading-only option.
const HELD_DATA = conversationDataFromBank(undefined, true);

// A piece serves a subject by a use of its own, whether it was written for it or shared with another subject.
const BANK = bankJson as unknown as {
  parts: { key: string; uses: { subject: string }[] }[];
};
const serves = (key: string, subject: string) =>
  BANK.parts.some(
    (part) =>
      part.key === key &&
      part.uses.some(
        (use) => use.subject === subject || use.subject === `${subject}-reply`,
      ),
  );

// Hearing and verdict words (pool item words-justice-hearing-verdict-bank): a
// person the justice engine charges, and then convicts or acquits, can be
// talked to about it. The charge is a real case from the engine's own
// charging step in a drawn place; the talk is the conversation engine's, and
// every line comes from the bank's authored charge, conviction and acquittal
// pieces, citing the justice record that fired it.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const place = drawPlace(seed, "justice-talk");
const where = `${place.name} (${place.key}), seed ${seed}`;

const KINDS = ["charge", "conviction", "acquittal"] as const;

it(`the accused and their friend talk about a charge and its verdict in the words of the bank (${where})`, () => {
  setBookkeeping(false);
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const { core, director } = world;
  const api = coreAPI(core);
  for (const person of core.people.values())
    if (person.alive && person.id.startsWith("person_"))
      director.watch(core, person.id);
  const table = (name: string) =>
    api.moduleState(JUSTICE_MODULE_ID).table(name);

  // A full person with a full, living friend, both watched by the director.
  const full = (id: PersonId) => {
    const row = core.people.get(id);
    return !!row?.alive && row.tier !== "husk" && row.id.startsWith("person_");
  };
  const accused = [...core.people.values()]
    .filter((row) => full(row.id) && [...row.knownIds].some(full))
    .sort((a, b) => a.id.localeCompare(b.id))[0]!;
  const friendId = [...accused.knownIds].filter(full).sort()[0]!;

  // The engine charges them: strong evidence, a prosecutor's desk.
  const investigation: InvestigationRow = {
    id: `investigation:justice-talk:${seed}`,
    complaintIds: [],
    crimeId: `crime:justice-talk:${seed}`,
    prosecutorOfficeId: "office:justice-talk",
    prosecutorPersonId: null,
    opened: true,
    date: core.date,
    reasons: {},
    targets: [
      { personId: accused.id, crimeIds: [], evidence: [], strength: 1 },
    ],
    status: "open",
  };
  table("investigations").put(investigation as never);
  chargeDecision(api, investigation.id);
  const caseId = `case:${investigation.id}:${accused.id}`;
  const charged = table("cases").get(caseId) as unknown as CaseRow;
  expect(charged.status, where).not.toBe("no-charge");

  advanceCore(core, addDays(makeIsoDate(core.date), 1));
  const check = (kind: (typeof KINDS)[number]) => {
    const row = subjectsBetween(core, accused.id, friendId, director).find(
      (subject) => subject.kind === kind,
    )!;
    expect(row.facts.case!.sourceRecordIds, where).toContain(caseId);
    // Each way round: the accused tells their friend, and the friend asks them.
    const told = openConversation(core, friendId, accused.id, {
      director,
      data: HELD_DATA,
    });
    const asked = openConversation(core, accused.id, friendId, {
      director,
      data: HELD_DATA,
    });
    for (const talk of [told, asked]) {
      const line = talk.lines.find((row) => row.kind.startsWith(kind));
      expect(line, `${where}: ${kind}`).toBeDefined();
      expect(line!.subjectId, where).toContain(caseId);
      expect(serves(line!.wording!.parts[0]!, kind), where).toBe(true);
      // Four replies, each from the bank, none of them a generic one.
      expect(talk.choices, where).toHaveLength(4);
      for (const choice of talk.choices)
        expect(serves(choice.wording!.parts[0]!, kind), where).toBe(true);
    }
  };
  // The newest event of the case is the one told: a plea is a verdict at once.
  const first = subjectsBetween(core, accused.id, friendId, director).find(
    (row) => KINDS.includes(row.kind as never),
  )!;
  check(first.kind as (typeof KINDS)[number]);

  // Then the trial, when there is one: a verdict stands in for the charge.
  if (charged.trialDate) {
    advanceCore(core, addDays(makeIsoDate(charged.trialDate), 1));
    const decided = table("cases").get(caseId) as unknown as CaseRow;
    expect(["convicted", "acquitted"], where).toContain(decided.status);
    const kind = decided.status === "convicted" ? "conviction" : "acquittal";
    const subjects = subjectsBetween(core, accused.id, friendId, director);
    expect(
      subjects.map((row) => row.kind),
      where,
    ).toContain(kind);
    expect(
      subjects.map((row) => row.kind),
      where,
    ).not.toContain("charge");
    check(kind);
  }
}, 3_600_000);
