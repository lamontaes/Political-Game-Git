import { preStartHistory } from "../core2/pre-start";
import { FAMILY_PARTNERED } from "../core2/modules/people";
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { corePlaceByJurisdictionId } from "../core2/place-lookup";
import type { PersonId } from "../core2/types";
import { composeJournal } from "./journal";

// The journal from day one (play-first-10-journal-from-day-one). On the first
// evening the journal's opening chapter tells where the family came from,
// each parent (the one who raised the player, or the one who lived apart, by
// the household each is in) and each brother and sister (by their birth
// against the player's), each line citing the family fact that records them.
// Places are drawn in turn until the player has a parent and a sibling.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const ATTEMPTS = 6;

it(`the first evening's journal names the family from their records (seed ${seed})`, () => {
  const tried: string[] = [];
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const place = drawPlace(`${seed}:${attempt}`, "journal-opening");
    const where = `${place.name} (${place.key}), seed ${seed}:${attempt}`;
    setBookkeeping(false);
    const { core, director, playerId } = buildBenchWorld(
      place.seed,
      gameStartDate(),
      { twoLevel: true, placeKey: place.key },
    );
    const player = core.people.get(playerId!)!;
    const family = (player.pastFacts ?? []).filter(
      (fact) =>
        ["family:parent", "family:other-parent", "family:sibling"].includes(
          fact.kind,
        ) && core.people.get(fact.facts?.otherPersonId ?? "")?.alive,
    );
    if (
      !family.some((fact) => fact.kind !== "family:sibling") ||
      !family.some((fact) => fact.kind === "family:sibling")
    ) {
      tried.push(`${place.name} (no parent and sibling on record)`);
      continue;
    }
    // Play watches the player and their household (src/bench/player.ts).
    director.watch(core, player.id);
    for (const id of core.households.get(player.householdId)?.memberIds ?? [])
      if (id !== player.id) director.watch(core, id as PersonId);
    const [opening] = composeJournal(core, director, player.id);
    expect(opening, `${where}: no opening chapter`).toBeDefined();
    const lines = opening!.lines;
    const told = new Set<string>();
    for (const fact of family) {
      const relative = core.people.get(fact.facts!.otherPersonId!)!;
      if (told.has(relative.id)) continue;
      told.add(relative.id);
      const line = lines.find(
        (row) =>
          row.sourceRecordIds.includes(fact.id) &&
          row.sourceRecordIds.includes(relative.id),
      );
      const here = `${where}: ${fact.kind} ${relative.id} (${fact.id})`;
      expect(line, here).toBeDefined();
      // By relation and name: "My mother Helen raised me."
      expect(line!.text, here).toContain(relative.givenName);
      // Told as part of a memoir entry of several sentences, never a bare
      // fact on a line of its own (owner, Oct 27).
      expect(
        line!.text.split(/(?<=\.)\s+/).length,
        `${here}: "${line!.text}" is one bare sentence`,
      ).toBeGreaterThan(1);
      console.log(`JOURNAL OPENING ${here}: "${line!.text}"`);
    }
    // Where the family came from comes before the people in it, when the
    // record names the place; how the parents met, before both.
    const lineOf = (id: string) =>
      lines.findIndex((row) => row.sourceRecordIds.includes(id));
    const firstPerson = Math.min(
      ...family.map((fact) => lineOf(fact.id)).filter((at) => at >= 0),
    );
    // Where the family came from: the place of the player's recorded birth
    // in the run, when the family lives somewhere else now.
    const roots = preStartHistory(core, {
      kind: "person.birth",
      personId: player.id,
    }).find((row) => row.placeId && row.placeId !== player.placeId);
    const origin = roots
      ? corePlaceByJurisdictionId(roots.placeId as never)
      : null;
    if (roots && origin) {
      const at = lineOf(roots.id);
      expect(at, `${where}: no roots line`).toBeGreaterThanOrEqual(0);
      expect(lines[at]!.text, where).toContain(origin.displayName);
      expect(at, `${where}: roots after a person`).toBeLessThanOrEqual(
        firstPerson,
      );
    }
    // The day the player's parents set up home, from the people engine's run.
    const parents = family
      .filter((fact) =>
        ["family:parent", "family:other-parent"].includes(fact.kind),
      )
      .map((fact) => fact.facts!.otherPersonId!);
    const met = parents.length
      ? preStartHistory(core, {
          kind: FAMILY_PARTNERED,
          personId: parents[0] as never,
        }).find((row) =>
          parents.every((id) => row.personIds?.includes(id as never)),
        )
      : undefined;
    if (met && corePlaceByJurisdictionId((met.placeId ?? "") as never)) {
      const at = lineOf(met.id);
      expect(at, `${where}: no line for ${met.id}`).toBeGreaterThanOrEqual(0);
      expect(at, `${where}: the parents met after`).toBeLessThanOrEqual(
        firstPerson,
      );
    }
    console.log(
      `JOURNAL OPENING ${where}: ${lines.map((row) => `"${row.text}"`).join(" ")}`,
    );
    return;
  }
  throw new Error(
    `no parent and sibling on record in ${tried.join("; ")} (seed ${seed})`,
  );
}, 1_800_000);
