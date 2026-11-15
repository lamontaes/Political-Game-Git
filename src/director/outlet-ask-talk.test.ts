/**
 * A neighbor asks the player about a printed story by the outlet's medium
 * (Words lead, Nov 15), and the player answers yes or no from their own
 * record; a player who did not hear it is told what the story reported, from
 * the story's own record (a vote carried or lost, a law in force, a budget
 * line moved), or, where the record holds nothing, misses it. Pinned at Creve
 * Coeur, Illinois (record id 1717549, seed pl5): the neighbor is a member of
 * the player's household, the story is printed and delivered by the news
 * engine's route (printStory) on the opening day, with a radio station, a
 * television station or a paper as its outlet. The talks are written to a file
 * for the readers.
 */
import { appendFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { OFFICES_MODULE_ID } from "../core2/modules/offices";
import { outletsHere } from "../core2/modules/press";
import { printStory, storiesHeard } from "../core2/modules/news";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { newsStake, openConversation, say } from "./conversation";
import { strongestQuestion } from "./view-learned";

interface Case {
  readonly title: string;
  readonly kind: "radio" | "television" | "newspaper";
  readonly playerHeard: boolean;
  /** What the story's row holds, given the town's own body (the chamber's office id). */
  readonly facts?: (chamber: string) => Record<string, string>;
  /** What the neighbor says after a no, from the row; none where the row holds nothing. */
  readonly told?: RegExp;
  /** What the neighbor's ask says, from the row (a budget line: more or less money for what it pays for). */
  readonly asks?: RegExp;
  /** The question the story is about, where it is not the neighbor's strongest (a budget line's own question). */
  readonly topic?: string;
  /** Their own stand follows the telling as a line of its own (their own view is not on this question), on the story's side, not the question's. */
  readonly stand?: RegExp;
}

const CASES: readonly Case[] = [
  ...(["radio", "television", "newspaper"] as const).flatMap((kind) => [
    {
      title: `${kind}, heard it (yes)`,
      kind,
      playerHeard: true,
    },
    {
      title: `${kind}, did not hear it, the row holds nothing (I missed it)`,
      kind,
      playerHeard: false,
    },
  ]),
  {
    title: "newspaper, a vote the body carried",
    kind: "newspaper",
    playerHeard: false,
    facts: (chamber) => ({
      billId: "bill:fixture:carried",
      yes: "3",
      no: "2",
      chamber,
    }),
    told: /^The .+ passed it\.$/,
  },
  {
    title: "television, a vote the body lost",
    kind: "television",
    playerHeard: false,
    facts: (chamber) => ({
      billId: "bill:fixture:lost",
      yes: "2",
      no: "3",
      chamber,
    }),
    told: /^The .+ passed it\.$|^The .+ voted it down\.$/,
  },
  {
    title: "radio, a bill that failed on the floor",
    kind: "radio",
    playerHeard: false,
    facts: (chamber) => ({
      billId: "bill:fixture:failed",
      stage: "floor",
      sponsorId: "person:fixture",
      yes: "2",
      no: "3",
      chamber,
    }),
    told: /^The .+ voted it down\.$/,
  },
  {
    title: "newspaper, a law that took effect",
    kind: "newspaper",
    playerHeard: false,
    facts: () => ({ lawId: "law:fixture:took-effect" }),
    told: /^It took effect\. It's the law now\.$/,
  },
  {
    title: "television, a budget line moved up",
    kind: "television",
    playerHeard: false,
    facts: () => ({
      line: "police",
      deltaMinor: "1000",
      carried: "yes",
      level: "city",
    }),
    topic: "budget-line:police",
    told: /^The .+ passed it\.$/,
    asks: /more money for the police/,
    stand: /glad/,
  },
  {
    title: "radio, a budget line moved down",
    kind: "radio",
    playerHeard: false,
    facts: () => ({
      line: "police",
      deltaMinor: "-1000",
      carried: "yes",
      level: "city",
    }),
    topic: "budget-line:police",
    told: /^The .+ passed it\.$/,
    asks: /less money for the police/,
    stand: /wish they hadn/,
  },
];

for (const row of CASES)
  it(`${row.title} (played file)`, () => {
    setBookkeeping(false);
    const place = drawPlace("pl5", "police-log");
    // Creve Coeur, Illinois, by its record id: a change to the draw fails here, not in a lookalike place.
    expect(place.key).toBe("1717549");
    const { core, director, playerId } = buildBenchWorld(
      place.seed,
      gameStartDate(),
      { twoLevel: true, placeKey: place.key },
    );
    const me = playerId as PersonId;
    const api = coreAPI(core);
    // No natural story yet: the printed story the neighbor raises is the one staged below.
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const outlet = outletsHere(api).find(
      (o) => o.kind === row.kind && o.tier !== "national",
    )!;
    const org = core.organizations.get(outlet.organizationId as never)!;
    const chamber = (
      api.moduleState(OFFICES_MODULE_ID).table("offices").rows() as unknown as {
        id: string;
        bodyName?: string;
        level: string;
      }[]
    )
      .filter((o) => o.bodyName && o.level === "city")
      .sort((a, b) => a.id.localeCompare(b.id))[0]!;
    const neighbor = [...core.people.values()]
      .filter(
        (p) =>
          p.alive &&
          p.id !== me &&
          p.householdId === core.people.get(me)!.householdId,
      )
      .sort((a, b) => a.id.localeCompare(b.id))
      .find((p) =>
        row.topic
          ? newsStake(core, p.id as PersonId, { news: { question: row.topic } })
              .reason === "stance"
          : strongestQuestion(api, p.id as PersonId),
      );
    expect(neighbor, "a neighbor with a stand").toBeTruthy();
    const id = neighbor!.id as PersonId;
    const storyId = `fixture:ask-talk:${row.title}`;
    const readers = row.playerHeard ? [id, me] : [id];
    printStory(
      api,
      {
        id: storyId,
        kind: "press.printed",
        // Today, and so the newest story the neighbor holds: it is the one raised.
        date: makeIsoDate(core.date),
        placeId: neighbor!.placeId,
        topic: row.topic ?? strongestQuestion(api, id)!.question,
        desiredChange: "enact",
        outletId: outlet.organizationId,
        facts: row.facts ? row.facts(chamber.id) : {},
      } as never,
      readers,
      readers,
    );
    for (
      let day = 0;
      day < 7 && !storiesHeard(api, id).some((r) => r.id === storyId);
      day += 1
    )
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
    expect(storiesHeard(api, me).some((r) => r.id === storyId)).toBe(
      row.playerHeard,
    );
    const talk = openConversation(core, me, id, { director });
    const shown: string[] = [
      `${row.title}: ${place.name} (${place.key}), seed pl5, ${row.kind} "${org.name}", the player ${row.playerHeard ? "heard" : "did not hear"} the story. ${neighbor!.givenName} ${neighbor!.familyName}:`,
    ];
    const pressed = row.playerHeard ? "yes" : "no";
    const asked = talk.lines.find((l) => l.kind === "news")!;
    expect(
      asked,
      `the neighbor asks about the story: ${talk.lines.map((l) => `${l.kind}: ${l.text}`).join(" | ")}`,
    ).toBeTruthy();
    if (row.asks) expect(asked.text).toMatch(row.asks);
    // The verb fits the medium: read of a paper only, the radio of a station only.
    if (row.kind !== "newspaper")
      expect(asked.text).not.toMatch(/\bread\b|paper/);
    if (row.kind !== "radio") expect(asked.text).not.toMatch(/radio/);
    // The player answers from their own record: yes only if it reached them.
    const moves = talk.choices.map((c) => c.move);
    expect(moves.includes("yes"), `yes offered: ${moves}`).toBe(
      row.playerHeard,
    );
    expect(moves.includes("no"), `no offered: ${moves}`).toBe(!row.playerHeard);
    for (let turn = 0; turn < 4 && talk.choices.length; turn += 1) {
      shown.push(
        `  They say: ${talk.lines.at(-1)?.text}`,
        `  You say: ${talk.choices.map((c) => `[${c.move}] ${c.text}`).join(" || ")}`,
      );
      const choice =
        talk.choices.find((c) => c.move === pressed) ?? talk.choices[0]!;
      if (turn === 0 && !row.playerHeard)
        expect(choice.text).toBe(
          row.told ? "No. Tell me what happened." : "No. I missed it.",
        );
      shown.push(`  Pressed: [${choice.move}] ${choice.text}`);
      say(core, talk, choice.key);
    }
    const mine = talk.lines.findIndex(
      (l) => l.speakerId === me && l.kind === "news",
    );
    // Their own view carries the stand, never a stand line and then the same
    // stand again; a no is answered with what the story reported where its
    // row holds it.
    const after = talk.lines.slice(mine + 1).map((l) => l.kind);
    const expected = row.told
      ? ["news-back", row.stand ? "news" : "own-view"]
      : ["own-view"];
    expect(
      after.slice(0, expected.length),
      `lines after the answer: ${talk.lines
        .slice(mine + 1)
        .map((l) => `${l.kind}: ${l.text}`)
        .join(" | ")}`,
    ).toEqual(expected);
    if (row.told) {
      // The telling already says how it came out: nothing after it waits to see.
      expect(
        talk.lines.map((l) => l.text).join(" "),
        talk.lines.map((l) => `${l.kind}: ${l.text}`).join(" | "),
      ).not.toMatch(/see how it comes out|We'll see|once .+ votes/);
      const back = talk.lines[mine + 1]!.text;
      expect(back).toMatch(row.told);
      expect(back).not.toMatch(/\d/);
      if (row.stand)
        expect(
          talk.lines[mine + 2]!.text,
          "the stand follows the story",
        ).toMatch(row.stand);
    }
    shown.push(
      `  Lines: ${talk.lines.map((l) => `${l.kind}/${l.speakerId === id ? "they" : "you"}: ${l.text}`).join(" | ")}`,
    );
    appendFileSync(
      path.join(tmpdir(), "outlet-ask-talk.txt"),
      shown.join("\n") + "\n",
    );
  }, 120_000);
