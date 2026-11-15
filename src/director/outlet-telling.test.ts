/**
 * How an outlet is said (Words lead, Nov 14: "KKFX", never "Kkfx"; a paper is
 * read in, a television station seen on, a radio station heard on, and a paper
 * takes "the"). Pinned at Creve Coeur, Illinois (seed pl5), a place with
 * newspapers, television stations and a radio station. Names are read from the
 * outlet's record, with no case rule guessed from their shape.
 */
import { appendFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { outletMedium, outletsHere } from "../core2/modules/press";
import { wordConversationMove } from "../english/conversation-words";
import type { Fact } from "../english/conversation-words";
import { coreAPI } from "../core2/state";
import { outletFacts } from "./conversation";

it("an outlet is said as its record has it, with its medium and whether it takes 'the'", () => {
  const place = drawPlace("pl5", "police-log");
  setBookkeeping(false);
  const core = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  }).core;
  const api = coreAPI(core);
  const said = outletsHere(api)
    .filter((o) => o.tier !== "national")
    .map((o) => {
      const org = core.organizations.get(o.organizationId as never)!;
      return {
        kind: o.kind,
        name: org.name,
        facts: outletFacts(core, org, ["test"]),
      };
    });
  const where = `${place.name} (${place.key}), seed pl5: ${said.map((s) => `${s.kind}=${s.name}`).join(", ")}`;
  for (const s of said) expect(s.facts.outlet?.text, where).toBe(s.name);
  const radio = said.filter((s) => s.kind === "radio");
  expect(radio.length, where).toBeGreaterThan(0);
  for (const s of radio) {
    expect(s.name, where).toMatch(/^[KW][A-Z]{3}$/);
    expect(Object.keys(s.facts).sort(), where).toEqual([
      "outlet",
      "outlet-radio",
    ]);
  }
  for (const s of said.filter((s) => s.kind === "television"))
    expect(Object.keys(s.facts).sort(), where).toEqual([
      "outlet",
      "outlet-television",
    ]);
  const papers = said.filter((s) => s.kind === "newspaper");
  expect(papers.length, where).toBeGreaterThan(0);
  for (const s of papers)
    expect(Object.keys(s.facts).sort(), where).toEqual([
      "outlet",
      "outlet-paper",
      "outlet-the",
    ]);
}, 120_000);

// A played file for the readers: each kind of outlet at Creve Coeur, its name
// and facts as the talk now carries them, and the talk's own existing frames
// that name an outlet, filled with the name (the frames that choose a kind's
// verb and "the" are the Words lead's and M5's next lines).
it("writes each outlet's name and facts as the talk carries them (played file)", () => {
  const place = drawPlace("pl5", "police-log");
  setBookkeeping(false);
  const core = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  }).core;
  const api = coreAPI(core);
  // The lines the news talk says for this outlet, chosen by the engine's own
  // wording choice (wordConversationMove) from the facts the game carries:
  // the outlet's facts, plus "paper" or "broadcast" as the story's carrier.
  const said = (facts: Record<string, Fact>, choice: "yes" | "no") => {
    const out = new Set<string>();
    // Four pinned seeds, chosen so that a television station is seen on (0) and not
    // watched (24): named, never drawn.
    for (const n of [0, 2, 3, 24]) {
      const line = wordConversationMove({
        seed: `outlet-telling:${n}`,
        subject: "news",
        part: "answers",
        speakerId: "speaker" as never,
        traits: {},
        facts,
        momentKey: `outlet-telling:${choice}:${n}`,
        stage: choice === "yes" ? "heard" : "not-heard",
        keys: [choice],
      });
      if (line?.text) out.add(line.text);
    }
    return [...out].sort();
  };
  const rows: string[] = [];
  for (const o of outletsHere(api).filter((x) => x.tier !== "national")) {
    const org = core.organizations.get(o.organizationId as never)!;
    const facts: Record<string, Fact> = {
      ...outletFacts(core, org, ["test"]),
      [outletMedium(o.kind) === "paper" ? "paper" : "broadcast"]: {
        text: "",
        sourceRecordIds: ["test"],
      },
    };
    const name = facts.outlet!.text;
    const yes = said(facts, "yes");
    const no = said(facts, "no");
    if (outletMedium(o.kind) === "television") {
      expect(yes).toContain(`I saw that on ${name}.`);
      expect(no).toContain(`I don't watch ${name} much. What happened?`);
    }
    if (o.kind === "radio")
      for (const line of [...yes, ...no])
        expect(
          line,
          `${name}: a station is never read in, seen on or watched`,
        ).not.toMatch(/read it in|saw that|watch/);
    if (outletMedium(o.kind) === "television")
      for (const line of [...yes, ...no])
        expect(
          line,
          `${name}: a television station is not heard on`,
        ).not.toMatch(/heard that on|listen/);
    rows.push(
      `${place.name} (${place.key}), seed pl5: ${o.kind} "${name}" (facts ${Object.keys(facts).join(", ")})\n  yes: ${yes.join(" | ")}\n  no: ${no.join(" | ")}`,
    );
  }
  appendFileSync(
    path.join(tmpdir(), "outlet-telling-proof.txt"),
    rows.join("\n") + "\n",
  );
  expect(rows.length).toBeGreaterThan(0);
}, 120_000);
