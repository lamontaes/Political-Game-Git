/**
 * How an outlet is said (Words lead, Nov 14: "KKFX", never "Kkfx"; a paper is
 * read in, a television station seen on, a radio station heard on, and a paper
 * takes "the"). Pinned at Creve Coeur, Illinois (seed pl5), a place with
 * newspapers, television stations and a radio station. Names are read from the
 * outlet's record, with no case rule guessed from their shape.
 */
import { appendFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { outletsHere } from "../core2/modules/press";
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
  // The bank's own outlet-naming lines for "did you see it": a line plays for
  // an outlet when every fact it requires is carried and none it excludes is.
  const bank = JSON.parse(
    readFileSync("data/english/parts/conversation.json", "utf8"),
  ) as unknown;
  const lines: {
    text: string;
    move: string;
    requires: string[];
    excludes: string[];
  }[] = [];
  const walk = (x: unknown): void => {
    if (Array.isArray(x)) return x.forEach(walk);
    if (!x || typeof x !== "object") return;
    const row = x as Record<string, unknown>;
    const text = row.text;
    const use = (row.uses as Record<string, unknown>[] | undefined)?.[0];
    if (
      typeof text === "string" &&
      text.includes("{outlet}") &&
      typeof row.move === "string" &&
      row.move.startsWith("news-answer-") &&
      use
    )
      lines.push({
        text,
        move: row.move,
        requires: (use.requiresFacts as string[] | undefined) ?? [],
        excludes: (use.excludesFacts as string[] | undefined) ?? [],
      });
    Object.values(row).forEach(walk);
  };
  walk(bank);
  const rows: string[] = [];
  for (const o of outletsHere(api).filter((x) => x.tier !== "national")) {
    const org = core.organizations.get(o.organizationId as never)!;
    const facts = outletFacts(core, org, ["test"]);
    const name = facts.outlet!.text;
    const the = facts["outlet-the"] ? `the ${name}` : name;
    // The news talk also carries "paper" or "broadcast" for the outlet's kind.
    const carried = new Set([
      ...Object.keys(facts),
      o.kind === "radio" || o.kind.includes("tele") ? "broadcast" : "paper",
    ]);
    const plays = lines.filter(
      (l) =>
        l.requires.every((f) => carried.has(f) || f === "outlet-said") &&
        !l.excludes.some((f) => carried.has(f)),
    );
    for (const l of plays)
      if (o.kind === "radio") {
        expect(
          l.text,
          `${name}: a station is never read in or seen on`,
        ).not.toMatch(/read it in|saw that on|watch/);
      }
    rows.push(
      `${place.name} (${place.key}), seed pl5: ${o.kind} "${name}" says: ${plays
        .map(
          (l) =>
            `"${l.text.replace("{outlet}", l.text.includes("read it in") ? the : name)}"`,
        )
        .join(" | ")}`,
    );
  }
  appendFileSync(
    path.join(tmpdir(), "outlet-telling-proof.txt"),
    rows.join("\n") + "\n",
  );
  expect(rows.length).toBeGreaterThan(0);
}, 120_000);
