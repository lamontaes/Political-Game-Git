import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { LAWS_MODULE_ID } from "../core2/modules/laws";
import { officialsIn } from "../core2/modules/officials";
import { ownStance } from "../core2/officials-roster";
import { policyAuthority } from "../core2/policy-authority";
import type { LawRowInput } from "../core2/laws-starting";
import { coreAPI } from "../core2/state";

// The President asks Congress only for what Congress may answer and federal
// law does not have yet, and asks the governors only where the player's
// state answers the other way (CTO opening root-cause report, Oct 27). Each
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
    const president = officialsIn(api, "US:president")[0]!;
    const laws = api.moduleState(LAWS_MODULE_ID).table("laws");
    const lines: string[] = [];
    for (const sentence of story.address.sentences) {
      if (sentence.level !== "congress" && sentence.level !== "governors")
        continue;
      const question = sentence.sourceRecordIds
        .find((id) => id.startsWith("question:"))
        ?.slice("question:".length);
      if (!question) continue;
      const federal = sentence.level === "congress";
      const where = `${drawn.label}: "${sentence.text}"`;
      expect(
        policyAuthority(api, question, federal ? "federal" : "state").allowed,
        `${where} asks a level without the power`,
      ).toBe(true);
      expect(
        sentence.sourceRecordIds.some((id) => id.startsWith(POWERS)),
        `${where} cites no powers record`,
      ).toBe(true);
      const lawId = sentence.sourceRecordIds.find((id) =>
        id.startsWith(federal ? "law:US:" : "law:US-"),
      );
      expect(lawId, `${where} cites no law it read`).toBeTruthy();
      const law = (laws.rows() as unknown as LawRowInput[]).find(
        (row) => row.id === lawId,
      )!;
      const inForce = law.value === 1;
      const stance = ownStance(president.ideal, president.signature, question);
      // Congress: what federal law does not have yet. The governors: a law
      // the player's state answers the other way from the President.
      if (federal)
        expect(inForce, `${where} asks for federal law in force`).toBe(false);
      else
        expect(inForce, `${where} asks for what the state already has`).toBe(
          stance < 0,
        );
      lines.push(`${sentence.level} "${sentence.text}" ${question} ${lawId}`);
    }
    process.stdout.write(
      `ASKS ${drawn.label} (${world.place.displayName})\n${lines.join("\n") || "(none)"}\n`,
    );
  }, 600_000);
