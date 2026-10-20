import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { gameStartDate } from "../core2/game-start";
import { PAST_MODULE_ID, type PublicFigureRow } from "../core2/past-module";
import { coreAPI } from "../core2/state";
import { buildBenchWorld } from "./world";
import { knownCard, publicSentences } from "./card";
import { publicKnowledgeOf } from "../core2/past-public";

// The person card for a public figure the viewer has not met reads what the
// public knows (owner, Oct 14, 2026: everyone knows the president, their
// governor, their members of Congress and their mayor, distinct from having
// met them). The bench world on a seed nobody chose, every module installed.
const seed = process.env.CARD_PUBLIC_SEED ?? randomBytes(8).toString("hex");
const world = buildBenchWorld(seed, gameStartDate(), { twoLevel: true });
const api = coreAPI(world.core);

describe(`the card of a public figure (${world.place.key}, seed ${seed})`, () => {
  const figures = api
    .moduleState(PAST_MODULE_ID)
    .table("figures")
    .rows() as unknown as PublicFigureRow[];
  const president = figures.find((f) => f.officeId.endsWith(":president"))!;

  it("shows what the public knows of the president, who the player has not met", () => {
    const card = knownCard(world.core, world.playerId!, president.personId);
    expect(card.known).toBe(false);
    expect(card.publicKnowledge, president.id).not.toBeNull();
    expect(card.publicKnowledge!.met).toBe(false);
    expect(card.publicKnowledge!.id, president.id).toBe(president.id);
    expect(card.publicKnowledge!.positions.length).toBeGreaterThan(0);
  });

  it("shows nothing for someone who is not a public figure", () => {
    const other = [...world.core.people.values()].find(
      (p) =>
        p.alive &&
        p.id !== world.playerId &&
        !figures.some((f) => f.personId === p.id),
    )!;
    expect(
      knownCard(world.core, world.playerId!, other.id).publicKnowledge,
    ).toBeNull();
  });
});

describe(`the sentences about a public figure (${world.place.key}, seed ${seed})`, () => {
  it("words the president's party and service from the public record, citing its id", () => {
    const figures = api
      .moduleState(PAST_MODULE_ID)
      .table("figures")
      .rows() as unknown as PublicFigureRow[];
    const president = figures.find((f) => f.officeId.endsWith(":president"))!;
    const card = knownCard(world.core, world.playerId!, president.personId);
    const name = card.name;
    // The parts are held until graded, so nothing reaches the card in play.
    expect(card.publicSentences).toEqual([]);
    const lines = publicSentences(
      world.core,
      president.personId,
      publicKnowledgeOf(api, world.playerId!, president.personId),
      true,
    );
    if (president.party)
      expect(lines.map((l) => l.text)).toContain(
        `${name} is a ${president.party}.`,
      );
    expect(
      lines.some((l) => /has been the .+ since [A-Z][a-z]+ \d/.test(l.text)),
    ).toBe(true);
    for (const line of lines)
      expect(line.sourceRecordIds).toContain(president.id);
  });
});
