/**
 * The player's four replies to the President's point (CTO, Nov 18, order
 * item 3; pattern A47's choices: "agree with them", "disagree", "ask what it
 * means for them", "let it go"), and the household branch's one-liner ("It
 * can be one line, praise or scorn, with no question at the end"). In places
 * drawn from all 56, on the opening evening:
 *
 * - "ask" is offered only when the speaker's point carries a reason from
 *   their own life (work, money, the lease, a relative, a story), and is
 *   answered from that reason; the relative keeps the reply by the question;
 * - "let it go" keeps no stand (the point's record is not set), keeps the no
 *   as its own record, closes the talk, still gives the tie its time, and on
 *   a later evening the same point is raised again, knowing it was let go;
 * - a housemate who watched the address with the player at home, with a
 *   decided stand and traits that keep talk short, says the point in one
 *   line with no closer and no question at the end; the replies read it.
 *
 * Until the Story lead's lines for ask and let-go are in the bank, this file
 * adds stand-in pieces for the moves the bank has no words for, so the
 * engine's rules are proved now; a move the bank words is proved with the
 * bank's own lines. The stand-ins exist only in this test.
 */
import { randomBytes } from "node:crypto";
import { expect, it, vi } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { traceNode } from "../bench/dev-trace";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { decisionLean } from "../core2/trait-decisions";
import type { CoreState, PersonId } from "../core2/types";
import rules from "./data/conversation-rules.json" with { type: "json" };
import {
  openConversation,
  say,
  subjectsBetween,
  type Conversation,
} from "./conversation";
import { DEFAULT_DIRECTOR_DATA } from "./ledger";
import { ADDRESS_FACT } from "./opening-facts";

const STAND_INS = vi.hoisted(() => {
  const marks = [
    "why-work",
    "why-money",
    "why-lease",
    "why-relative",
    "why-story",
  ];
  const piece = (
    key: string,
    text: string,
    use: Record<string, unknown>,
    part?: Record<string, unknown>,
  ) => ({
    key: `test-stand-in.${key}`,
    move: `test-stand-in.${key}`,
    kind: "spoken",
    text,
    uses: [{ move: `test-stand-in.${key}`, ...use }],
    ...(part ? { piece: part } : {}),
    bearing: "calm",
    origin: "authored",
    author: "conversation-address-replies.test (stand-in, never shipped)",
    date: "2026-11-18",
  });
  return {
    marks,
    pieces: {
      ask: [
        piece("ask-1", "I hear you. What does it mean for you, though?", {
          subject: "address-point",
          role: "answer",
          choice: "ask",
        }),
      ],
      "let-go": [
        piece("let-go-1", "Let's leave it for tonight.", {
          subject: "address-point",
          role: "answer",
          choice: "let-go",
        }),
      ],
      "back-ask": marks.map((mark) =>
        piece(
          `ask-back.${mark}`,
          "It comes home for me, that's all.",
          {
            subject: "address-point-back",
            role: "core",
            stages: ["ask"],
            requiresFacts: [mark],
          },
          { of: "address-point-back", part: "core", required: true },
        ),
      ),
      "back-let-go": [
        piece(
          "let-go-back",
          "Fair enough.",
          { subject: "address-point-back", role: "core", stages: ["let-go"] },
          { of: "address-point-back", part: "core", required: true },
        ),
      ],
    },
  };
});

vi.mock(
  "../../data/english/parts/conversation.json",
  async (importOriginal) => {
    const real = (await importOriginal()) as {
      default: {
        parts: {
          uses: { subject: string; choice?: string; stages?: string[] }[];
        }[];
      };
    };
    const bank = real.default;
    const has = (
      subject: string,
      test: (use: { choice?: string; stages?: string[] }) => boolean,
    ) =>
      bank.parts.some((part) =>
        part.uses.some((use) => use.subject === subject && test(use)),
      );
    const added = [
      ...(has("address-point", (use) => use.choice === "ask")
        ? []
        : STAND_INS.pieces.ask),
      ...(has("address-point", (use) => use.choice === "let-go")
        ? []
        : STAND_INS.pieces["let-go"]),
      ...(has("address-point-back", (use) => !!use.stages?.includes("ask"))
        ? []
        : STAND_INS.pieces["back-ask"]),
      ...(has("address-point-back", (use) => !!use.stages?.includes("let-go"))
        ? []
        : STAND_INS.pieces["back-let-go"]),
    ];
    return { default: { ...bank, parts: [...bank.parts, ...added] } };
  },
);

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(10).toString("hex");
const ATTEMPTS = 12;
const POINT = "address-point";
const BACK = rules.addressPoint.back;
const REPLIES = rules.addressPoint.replies;
const ONE_LINER = rules.addressPoint.oneLiner.fact;
const CLOSER = "address-point-closer";
const ADDRESS_DAYS =
  DEFAULT_DIRECTOR_DATA.parameters.directorTalkAddressDays!.value;

function world(draw: number, purpose: string) {
  const place = drawPlace(`${seed}:${draw}`, purpose);
  setBookkeeping(false);
  const built = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  return {
    ...built,
    me: built.playerId as PersonId,
    where: `${place.name} (${place.key}), seed ${seed}:${draw}`,
  };
}

const housematesOf = (core: CoreState, me: PersonId) =>
  [...core.people.values()]
    .filter(
      (row) =>
        row.alive &&
        row.id !== me &&
        row.householdId === core.people.get(me)!.householdId,
    )
    .sort((a, b) => a.id.localeCompare(b.id));

/** The talk opened with a housemate, carried to the point they raise, or null. */
function pointTalk(
  core: CoreState,
  me: PersonId,
  otherId: PersonId,
  director: Parameters<typeof openConversation>[3] extends infer O
    ? O extends { director?: infer D }
      ? D
      : never
    : never,
): Conversation | null {
  const talk = openConversation(core, me, otherId, { director });
  const first = talk.lines[0]?.kind;
  if ((first !== "address" && first !== POINT) || !talk.choices.length)
    return null;
  if (first === "address") say(core, talk, talk.choices[0]!.key);
  return talk.last?.kind === POINT && talk.choices.length ? talk : null;
}

const watchedTogether = (core: CoreState, a: PersonId, b: PersonId) => {
  const mine = core.knowledgeByPerson.get(a)?.get(ADDRESS_FACT.event);
  const theirs = core.knowledgeByPerson.get(b)?.get(ADDRESS_FACT.event);
  return (
    !!mine &&
    !!theirs &&
    mine.value === theirs.value &&
    mine.learnedAt === theirs.learnedAt
  );
};

const pointKey = (me: PersonId, question: string) =>
  `talk:${me}:address-point:${question}`;
const letGoKey = (me: PersonId, question: string) =>
  `talk:${me}:${REPLIES.letGoKey}:${question}`;

it(`ask is offered only with a reason of their own and answered from it; let it go keeps no stand and the point comes back; a home one-liner has no question (seed ${seed})`, () => {
  const seen: string[] = [];
  let asked = false;
  let letGo = false;
  let raisedAgain = false;
  let oneLiners = 0;
  let withCloser = 0;
  for (
    let draw = 0;
    draw < ATTEMPTS && !(asked && letGo && raisedAgain && oneLiners);
    draw += 1
  ) {
    const { core, director, me, where } = world(draw, "address-replies");
    process.stderr.write(`address-replies: ${where}\n`);
    // Only the player's house has heard the address on the opening evening,
    // and a reason from their own life (a story read, a lease, a relative)
    // may come in the days after: each drawn world is read evening by
    // evening while the address is the day's news at home.
    const reasons = new Set<string>();
    for (let day = 0; day <= ADDRESS_DAYS; day += 1) {
      if (asked && letGo && raisedAgain && oneLiners) break;
      if (day) advanceCore(core, addDays(makeIsoDate(core.date), 1));
      const talks: { otherId: PersonId; talk: Conversation }[] = [];
      for (const other of housematesOf(core, me)) {
        const otherId = other.id as PersonId;
        const talk = pointTalk(core, me, otherId, director);
        if (!talk) continue;
        const here = `${where}: ${other.givenName}`;
        const facts = talk.last!.facts;
        const moves = new Set(talk.choices.map((row) => row.move));
        const reason = STAND_INS.marks.find((mark) => !!facts[mark]);
        reasons.add(reason ?? "none");
        // Ask: only with a reason from their own life; the stand-in opens on a
        // statement, so a closing question never holds it back.
        expect(moves.has(REPLIES.ask), `${here}: ask with ${reason}`).toBe(
          !!reason,
        );
        // One ask on a screen: never both forms.
        expect(moves.has(REPLIES.ask) && moves.has(REPLIES.here), here).toBe(
          false,
        );
        // Let it go is always a reply to the point.
        expect(moves.has(REPLIES.letGo), here).toBe(true);
        expect(moves.has("instead"), here).toBe(false);
        // The one-liner: watched together at home, a decided stand, and traits
        // that keep talk short (no roll).
        const line = talk.lines.find(
          (row) => row.kind === POINT && row.speakerId === otherId,
        )!;
        const keepsShort =
          decisionLean(
            core,
            core.people.get(otherId)!,
            "conversation.reply-reach",
            "carry-on",
            "keep-short",
          ) < 0;
        const expected =
          watchedTogether(core, me, otherId) &&
          !!facts["stand-decided"] &&
          keepsShort;
        expect(!!facts[ONE_LINER], `${here}: "${line.text}"`).toBe(expected);
        const closer = (line.wording?.parts ?? []).some((key) =>
          key.includes(CLOSER),
        );
        if (facts[ONE_LINER]) {
          expect(closer, `${here}: "${line.text}"`).toBe(false);
          expect(line.text, here).not.toMatch(/\?$/);
          oneLiners += 1;
          seen.push(`${here}: one line: "${line.text}"`);
        } else if (closer) withCloser += 1;
        talks.push({ otherId, talk });
      }
      // One point talk a day in a house: the first that can show what is
      // still unproved answers it.
      const askTalk = !asked
        ? talks.find(({ talk }) =>
            talk.choices.some((row) => row.move === REPLIES.ask),
          )
        : undefined;
      const pick = askTalk ?? (!letGo || !raisedAgain ? talks[0] : undefined);
      if (!pick) continue;
      const { otherId, talk } = pick;
      const here = `${where}: ${core.people.get(otherId)!.givenName}`;
      const question = talk.last!.subject.point!.question;
      if (askTalk) {
        const choice = talk.choices.find((row) => row.move === REPLIES.ask)!;
        const reason = STAND_INS.marks.find(
          (mark) => !!talk.last!.facts[mark],
        )!;
        const before = talk.lines.length;
        say(core, talk, choice.key);
        const answer = talk.lines[before + 1];
        expect(answer?.kind, `${here}: "${choice.text}"`).toBe(BACK);
        // Answered from their reason: a stand-in answers only its own mark;
        // the bank's own lines are read the same way, by the reason's record.
        const ownPiece = answer!.wording!.parts.find((key) =>
          key.startsWith("test-stand-in."),
        );
        if (ownPiece) expect(ownPiece, here).toContain(reason);
        expect(
          core.knowledgeByPerson.get(otherId)?.get(pointKey(me, question))
            ?.value,
          here,
        ).toBe(REPLIES.ask);
        seen.push(
          `${here}: ask ("${choice.text}") answered "${answer!.text}" from ${reason}`,
        );
        asked = true;
        continue;
      }
      // Let it go.
      const choice = talk.choices.find((row) => row.move === REPLIES.letGo)!;
      // The tie's time together, through the core's own writer: the
      // relationship row's latest change is this reply's.
      const tie = () =>
        [...core.relationships.values()].find(
          (row) =>
            (row.actorId === me && row.otherId === otherId) ||
            (row.actorId === otherId && row.otherId === me),
        );
      const recordedBefore = talk.recorded.length;
      say(core, talk, choice.key);
      const eventId = talk.lines.find(
        (row) => row.move === REPLIES.letGo,
      )?.recordId;
      expect(tie()?.lastContactDate, `${here}: the tie's time`).toBe(core.date);
      const change = tie()?.latestChange as
        { reason?: { sourceId?: string } } | undefined;
      if (change)
        expect(change.reason?.sourceId, `${here}: the tie's time`).toBe(
          eventId,
        );
      // No stand is kept; the no is its own record, an event of the core.
      const known = core.knowledgeByPerson.get(otherId);
      expect(known?.get(pointKey(me, question)), here).toBeUndefined();
      const no = known?.get(letGoKey(me, question));
      expect(no?.value, here).toBe(core.date);
      expect(core.eventIds.has(no!.sourceId as never), here).toBe(true);
      expect(talk.recorded.slice(recordedBefore), here).toContain(no!.sourceId);
      // Dev mode's record of the talk: the player's line names its move and
      // the id its records start with, and Trace finds the record.
      const mine = talk.lines.find((row) => row.move === REPLIES.letGo);
      expect(no!.sourceId.startsWith(mine?.recordId ?? "-"), here).toBe(true);
      const traced = traceNode(core, director, no!.sourceId);
      expect(traced.answer, `${here}: Trace of ${no!.sourceId}`).not.toBe(
        "not-a-record",
      );
      // The talk closes on their answer.
      expect(talk.choices, here).toEqual([]);
      expect(talk.lines.at(-1)?.speakerId, here).toBe(otherId);
      letGo = true;
      // A later evening: the same point is theirs to raise again, and it
      // knows it was let go.
      const letGoOn = core.date;
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
      day += 1;
      const again = subjectsBetween(core, otherId, me, director).find(
        (row) => row.kind === POINT && row.point?.question === question,
      );
      expect(again, `${here}: the point on ${core.date}`).toBeTruthy();
      expect(again!.facts[REPLIES.letGoFact]?.sourceRecordIds, here).toContain(
        no!.sourceId,
      );
      const next = pointTalk(core, me, otherId, director);
      const raised = next?.last?.subject.point?.question === question;
      seen.push(
        `${here}: let go on ${letGoOn} ("${choice.text}" / "${talk.lines.at(-1)!.text}", record ${no!.sourceId}); on ${core.date} the point is ${raised ? `raised again: "${next!.lines.find((row) => row.kind === POINT)!.text}"` : "theirs to raise but another subject leads"}`,
      );
      if (raised) raisedAgain = true;
    }
    if (!asked)
      seen.push(
        `${where}: passed over for ask, the points stood on ${[...reasons].join(", ") || "no point raised"}`,
      );
  }
  process.stdout.write(
    `ADDRESS REPLIES ${seed}: ${seen.join("; ")}; one-liners ${oneLiners}, with a closer ${withCloser}\n`,
  );
  expect(
    { asked, letGo, raisedAgain, oneLiner: oneLiners > 0 },
    seen.join("; "),
  ).toEqual({
    asked: true,
    letGo: true,
    raisedAgain: true,
    oneLiner: true,
  });
}, 1_800_000);
