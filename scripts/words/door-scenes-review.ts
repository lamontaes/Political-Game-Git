/**
 * Door scenes as a review page: builds the data for a click-through of every
 * door scene and every wording of it, from the game's own scene composer.
 * Development tooling; nothing here words anything. Every line is a bank
 * piece the composer said, and each line carries its piece key.
 *
 *   node --import tsx scripts/words/door-scenes-review.ts <seed> [versions] > review.json
 *   node scripts/words/door-scenes-review.mjs review.json scripts/words/door-scenes-review.html > page.html
 *
 * How it works: a drawn place's bench world gives real people for the resident
 * and the player. For each door kind (a signature ask, a vote ask) and each of
 * its arc variants (`src/director/data/arc-variants.json`), `composeSceneTalk`
 * composes the whole tree. The resident's first answer is decided by the world
 * (a petition record, the town's warmth), so each kind is composed once for each
 * answer the records can give (yes, undecided, no); the page lets the reader pick
 * the answer. Wordings: the composer picks pieces on the scene's cause id, so a
 * different cause id reads a different wording; `versions` of them are composed
 * for each scene and each is numbered. Ids read aloud as "4.2.7": scene 4,
 * wording 2, line 7 in reading order.
 *
 * Slot values the resident's records would give (the employer, the rent owed)
 * come from the drawn world where it has them; otherwise a marked sample.
 */
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { ageOnDate, makeIsoDate } from "../../src/core2/kernel/dates";
import { drawPlace } from "../core2-year/place";
import { corePlaceByKey } from "../../src/core2/place-lookup";
import { composeSceneTalk } from "../../src/director/scene-talk";
import type {
  PurposeType,
  SceneTalkLine,
  TreeNode,
} from "../../src/director/scene-talk";
import { SITUATION_LIBRARY } from "../../src/director/scheduling";
import variantFile from "../../src/director/data/arc-variants.json" with { type: "json" };
import placesFile from "../../src/bench/data/scene-places.json" with { type: "json" };
import type { Fact } from "../../src/english/scene-talk-words";
import { readFileSync } from "node:fs";

const [seed = "door-review", versionsArg = "6"] = process.argv.slice(2);
const VERSIONS = Number(versionsArg);

interface OutLine {
  id: string;
  who: string;
  role: "narrator" | "resident" | "you";
  text: string;
  key: string;
  move: string;
  tag?: string;
}
interface OutChoice {
  line: OutLine;
  next: OutNode | null;
}
interface OutNode {
  lines: OutLine[];
  choices: OutChoice[];
  end?: { label: string; keeps: string; close?: OutLine };
}

const DOORS = [
  { type: "door-signature", family: "ask-signature", about: "Signature" },
  { type: "door-ask", family: "ask-support", about: "Vote" },
] as const;

const ANSWERS = [
  { name: "yes", letter: "y", label: "They agree", lean: 1, favor: 0 },
  { name: "maybe", letter: "m", label: "They hold back", lean: 0, favor: 1 },
  { name: "no", letter: "n", label: "They decline", lean: -1, favor: 0 },
] as const;

setBookkeeping(false);
const place = drawPlace(seed, "door-review");
const { core } = buildBenchWorld(place.seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
const start = makeIsoDate(core.date);
const town = corePlaceByKey(place.key)?.context.jurisdiction.id;
const adults = [...core.people.values()]
  .filter(
    (row) =>
      row.alive &&
      row.placeId === town &&
      row.tier !== "husk" &&
      ageOnDate(makeIsoDate(row.birthDate), start) >= 25,
  )
  .sort((a, b) => a.id.localeCompare(b.id));
if (adults.length < VERSIONS + 2) throw new Error("not enough adults");
const player = adults[0]!;
const residents = adults.slice(1);
const orgs = [...core.organizations.values()].sort((a, b) =>
  a.id.localeCompare(b.id),
);

const fact = (text: string, ids: string[] = []): Fact => ({
  text,
  sourceRecordIds: ids.length ? ids : ["door-review:sample"],
});

/** The slots a door line can hold, from the world where it has the record, else a marked sample. */
function factsFor(i: number, family: string): Record<string, Fact> {
  const resident = residents[i % residents.length]!;
  const house = core.households.get(resident.householdId);
  const kin = (house?.memberIds ?? [])
    .map((id) => core.people.get(id))
    .find((row) => row && row.id !== resident.id);
  const org = orgs[i % Math.max(1, orgs.length)];
  return {
    name: fact(`${resident.givenName} ${resident.familyName}`, [resident.id]),
    self: fact(player.givenName, [player.id]),
    office: fact(family === "ask-signature" ? "commissioner" : "mayor"),
    place: fact(place.name),
    employer: fact(org?.name ?? "the plant", org ? [org.id] : []),
    relative: fact(kin?.givenName ?? "her mother", kin ? [kin.id] : []),
    since: fact("a few months"),
    owed: fact("$900"),
    deadline: fact("the end of the month"),
  };
}

function typeOf(typeKey: string, purpose: string, family?: string) {
  const base = (
    SITUATION_LIBRARY as unknown as { types: PurposeType[] }
  ).types.find((row) => row.key === typeKey)!;
  return { ...base, purpose, ...(family ? { family } : {}) } as PurposeType;
}

let counter = 0;
function line(
  ids: { next(): string },
  l: SceneTalkLine,
  playerName: string,
): OutLine {
  const role =
    l.role === "narrator"
      ? "narrator"
      : l.speaker === playerName
        ? "you"
        : "resident";
  return {
    id: ids.next(),
    who: l.role === "narrator" ? "" : role === "you" ? "You" : l.speaker,
    role,
    text: l.text,
    key: l.parts.join(" + "),
    move: l.move,
    ...(l.tag ? { tag: l.tag } : {}),
  };
}

function walk(
  node: TreeNode,
  ids: { next(): string },
  playerName: string,
): OutNode {
  const out: OutNode = {
    lines: node.lines.map((l) => line(ids, l, playerName)),
    choices: [],
  };
  if (node.end?.ending || node.end?.close)
    out.end = {
      label: node.end.ending?.label ?? "",
      keeps: node.end.ending?.keeps ?? "none",
      ...(node.end.close
        ? { close: line(ids, node.end.close, playerName) }
        : {}),
    };
  for (const reply of node.replies)
    out.choices.push({
      line: line(ids, reply.line, playerName),
      next: reply.next ? walk(reply.next, ids, playerName) : null,
    });
  return out;
}

const scenes: unknown[] = [];
const playerName = `${player.givenName} ${player.familyName}`;
let sceneNo = 0;
const places = placesFile.situationPlaces as Record<string, string[]>;
const parts = JSON.parse(
  readFileSync("data/english/parts/scene-talk.json", "utf8"),
) as {
  parts: {
    key: string;
    text: string;
    uses: {
      purpose?: string;
      step?: string;
      move?: string;
      role?: string;
      requiresFacts?: string[];
    }[];
  }[];
};
for (const door of DOORS) {
  const variants = (
    variantFile.families as unknown as Record<
      string,
      { variants: Record<string, { purpose: string; onlyFor?: unknown }> }
    >
  )[door.family]!.variants;
  for (const [variantName, variant] of Object.entries(variants)) {
    sceneNo += 1;
    const purpose = variantName === "plain" ? door.family : variant.purpose;
    const pieces = parts.parts.filter((p) =>
      p.uses.some((u) => u.purpose === purpose),
    ).length;
    const versions: unknown[] = [];
    const own = parts.parts.filter((p) =>
      p.uses.some((u) => u.purpose === purpose),
    );
    for (let v = 1; v <= VERSIONS; v += 1) {
      const answers: unknown[] = [];
      for (const answer of ANSWERS) {
        const resident = residents[(v - 1) % residents.length]!;
        const result = composeSceneTalk(
          core,
          undefined,
          {
            causeId: `door-review:${purpose}:${v}`,
            askerId: resident.id,
            askedId: player.id,
          },
          typeOf(
            door.type,
            purpose,
            variantName === "plain" ? undefined : door.family,
          ),
          factsFor(v - 1, door.family),
          { standing: { lean: answer.lean, favor: answer.favor } },
          { includeHeld: process.env.REVIEW_SHIPPED ? false : true },
        );
        if (result.kind !== "composed") {
          answers.push({
            answer: answer.name,
            label: answer.label,
            skipped: result.reason,
          });
          continue;
        }
        const n = { i: 0 };
        const ids = {
          next: () => `${sceneNo}.${v}${answer.letter}.${(n.i += 1)}`,
        };
        const talk = result.talk;
        answers.push({
          answer: answer.name,
          label: answer.label,
          opening: [
            ...talk.narration,
            ...(talk.open ? [talk.open] : []),
            ...talk.intro,
            talk.state,
          ].map((l) => line(ids, l, playerName)),
          tree: walk(talk.tree, ids, playerName),
        });
      }
      versions.push({ v, answers });
    }
    counter += 1;
    const shownKeys = new Set<string>();
    const collect = (node: OutNode) => {
      for (const l of node.lines)
        for (const k of l.key.split(" + ")) shownKeys.add(k);
      if (node.end?.close)
        for (const k of node.end.close.key.split(" + ")) shownKeys.add(k);
      for (const c of node.choices) {
        for (const k of c.line.key.split(" + ")) shownKeys.add(k);
        if (c.next) collect(c.next);
      }
    };
    for (const v of versions as {
      answers: { opening?: OutLine[]; tree?: OutNode }[];
    }[])
      for (const a of v.answers) {
        for (const l of a.opening ?? [])
          for (const k of l.key.split(" + ")) shownKeys.add(k);
        if (a.tree) collect(a.tree);
      }
    const bankRows = parts.parts
      .filter((p) => shownKeys.has(p.key) || own.includes(p))
      .map((p, i) => {
        const use = p.uses.find((u) => u.purpose === purpose) ?? p.uses[0]!;
        return {
          id: `${sceneNo}.b${i + 1}`,
          key: p.key,
          step: use.step,
          move: use.move,
          role: use.role,
          text: p.text,
          requires: use.requiresFacts ?? [],
          shown: shownKeys.has(p.key),
          family: use.purpose !== purpose,
        };
      });
    scenes.push({
      bank: bankRows,
      id: String(sceneNo),
      door: door.about,
      variant: variantName,
      purpose,
      pieces,
      picture: places[`${door.type}:other-home`] ?? null,
      versions,
    });
  }
}
process.stdout.write(
  JSON.stringify(
    {
      seed,
      place: { name: place.name, key: place.key, seed: place.seed },
      commit: process.env.REVIEW_COMMIT ?? "",
      generated: new Date().toISOString().slice(0, 10),
      scenes,
    },
    null,
    1,
  ),
);
void counter;
