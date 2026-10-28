import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { LAWS_MODULE_ID } from "../core2/modules/laws";
import { policyAuthority } from "../core2/policy-authority";
import type { LawRowInput } from "../core2/laws-starting";
import { coreAPI } from "../core2/state";

// The President asks Congress only for what Congress may answer and federal
// law does not have yet, and asks nothing of the player's state: the
// address is national only (owner, Oct 27: "nothing about your state"). Each
// ask cites the powers record and the law it read. Iowa City (the bench's
// own pick for seed 28c0b8150290) is the case that failed: the address
// asked Congress on stand-your-ground and abortion, both state powers and
// already Iowa law. Two more places are drawn from all 56.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const FAILED = "28c0b8150290";
const DATE = "2025-01-20";
const POWERS = "data/research/powers-catalog/";

const worlds = [
  { label: `the bench's pick for seed ${FAILED}`, seed: FAILED },
  ...[0, 1].map((at) => {
    const drawSeed = at ? `${seed}:${at}` : seed;
    const place = drawPlace(drawSeed, "opening-asks");
    return {
      label: `${place.name} (${place.key}), seed ${drawSeed}`,
      seed: place.seed,
      placeKey: place.key,
    };
  }),
];

for (const drawn of worlds)
  it(`the address asks each level only what it may answer and does not have, in ${drawn.label}`, () => {
    setBookkeeping(false);
    const world = buildBenchWorld(drawn.seed, DATE, {
      twoLevel: true,
      ...(drawn.placeKey ? { placeKey: drawn.placeKey } : {}),
    });
    const { core, director } = world;
    const api = coreAPI(core);
    const story = director.ledger.opening!;
    expect(story, "no opening story").toBeTruthy();
    const laws = api.moduleState(LAWS_MODULE_ID).table("laws");
    const lines: string[] = [];
    for (const sentence of story.address.sentences) {
      // National only (owner, Oct 27): no sentence is put to the player's
      // state or names it.
      expect(String(sentence.level), sentence.text).not.toMatch(
        /^(governors|towns)$/,
      );
      if (sentence.level !== "congress") continue;
      const question = sentence.sourceRecordIds
        .find((id) => id.startsWith("question:"))
        ?.slice("question:".length);
      if (!question) continue;
      const where = `${drawn.label}: "${sentence.text}"`;
      expect(
        policyAuthority(api, question, "federal").allowed,
        `${where} asks a level without the power`,
      ).toBe(true);
      expect(
        sentence.sourceRecordIds.some((id) => id.startsWith(POWERS)),
        `${where} cites no powers record`,
      ).toBe(true);
      const lawId = sentence.sourceRecordIds.find((id) =>
        id.startsWith("law:US:"),
      );
      expect(lawId, `${where} cites no law it read`).toBeTruthy();
      const law = (laws.rows() as unknown as LawRowInput[]).find(
        (row) => row.id === lawId,
      )!;
      const inForce = law.value === 1;
      // Congress: what federal law does not have yet.
      expect(inForce, `${where} asks for federal law in force`).toBe(false);
      lines.push(`${sentence.level} "${sentence.text}" ${question} ${lawId}`);
    }
    process.stdout.write(
      `ASKS ${drawn.label} (${world.place.displayName})\n${lines.join("\n") || "(none)"}\n`,
    );
  }, 600_000);
