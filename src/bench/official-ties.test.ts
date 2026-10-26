import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { coreAPI } from "../core2/state";
import { buildBenchWorld } from "./world";
import { knownCard } from "./card";

// Clicking a state legislator shows who they know in office: their ties to
// others serving in office, by tie record id, or an empty Knows block.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const OFFICES = "core2-offices-v1";

it("a state legislator's card lists their colleagues in office by tie record id", () => {
  const tried: string[] = [];
  for (let draw = 0; draw < 6; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "official-ties");
    const where = `${place.name} (${place.key}), seed ${seed}:${draw}`;
    setBookkeeping(false);
    const { core, playerId } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const offices = coreAPI(core).moduleState(OFFICES);
    const terms = offices.table("terms").rows() as unknown as {
      personId: string;
      officeId: string;
      status: string;
    }[];
    const kindOf = (officeId: string) =>
      (offices.table("offices").get(officeId) as { kind?: string } | undefined)
        ?.kind ?? "";
    const serving = new Set(
      terms
        .filter(
          (t) => t.status === "serving" && core.people.get(t.personId)?.alive,
        )
        .map((t) => t.personId),
    );
    const legislators = [
      ...new Set(
        terms
          .filter(
            (t) =>
              t.status === "serving" &&
              kindOf(t.officeId).startsWith("legislature-") &&
              core.people.has(t.personId),
          )
          .map((t) => t.personId),
      ),
    ].sort();
    if (!legislators.length) {
      tried.push(`${where}: no state legislator is a person on record`);
      continue;
    }
    let withColleagues = "";
    for (const id of legislators) {
      const card = knownCard(core, playerId!, id);
      expect(card.colleagues, `${where}: ${id} holds office`).not.toBeNull();
      // Every tie to someone else serving in office, by its record id.
      const expected = [...(core.relationshipsByPerson.get(id) ?? [])]
        .map((tieId) => core.relationships.get(tieId)!)
        .filter((row) => {
          const other = row.actorId === id ? row.otherId : row.actorId;
          return serving.has(other);
        })
        .map((row) => row.id);
      const shown = card.colleagues!.map((k) => k.recordId);
      for (const tieId of shown)
        expect(expected, `${where}: ${id} shows ${tieId}`).toContain(tieId);
      expect(shown.length, `${where}: ${id}`).toBe(
        Math.min(8, expected.length),
      );
      for (const k of card.colleagues!) {
        expect(k.name, `${where}: ${k.recordId}`).toMatch(/\S+ \S+/);
        expect(k.office, `${where}: ${k.recordId}`).toBeTruthy();
      }
      if (shown.length && !withColleagues)
        withColleagues = `${id} knows ${card
          .colleagues!.slice(0, 3)
          .map((k) => `${k.name}, ${k.office} (${k.recordId})`)
          .join("; ")}`;
    }
    console.log(
      `${where}: ${legislators.length} state legislators on record; ${withColleagues || "none knows anyone in office yet (gov-officials-legislators-know-no-one)"}`,
    );
    return;
  }
  throw new Error(
    `no drawn place had a state legislator on record: ${tried.join("; ")}`,
  );
}, 1_200_000);
