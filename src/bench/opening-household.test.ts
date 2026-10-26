/**
 * The first evening at home: after the anchor's lead-in, the narrator says who lives
 * under the player's roof and how each is family, from the household record
 * and the player's `family:<relation>` facts. A surname different from the
 * player's is explained by a record tying that person to a parent, or reported
 * here by name. A random place from all 56.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "./world";
import { openingFrames } from "./opening";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "../core2/game-start";
import { coreAPI } from "../core2/state";
import { composeHouseholdIntro } from "../director/household-intro";
import { relationPhrase } from "../english/journal-words";
import type { CoreState } from "../core2/types";

const runSeed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`opening-household:${Date.now()}`).digest("hex");

/** The living household members other than the player, with the relation their family fact records. */
function householdKin(core: CoreState, playerId: string) {
  const player = core.people.get(playerId)!;
  return (core.households.get(player.householdId)?.memberIds ?? [])
    .map((id) => core.people.get(id)!)
    .filter((row) => row.alive && row.id !== playerId)
    .map((member) => {
      const fact = (player.pastFacts ?? []).find(
        (row) =>
          row.kind.startsWith("family:") &&
          row.facts?.otherPersonId === member.id,
      );
      return {
        member,
        name: `${member.givenName} ${member.familyName}`,
        fact,
        phrase: fact
          ? relationPhrase(
              fact.kind.slice("family:".length),
              member.looks?.gender ?? "other",
              "scene",
            )
          : undefined,
      };
    });
}

describe("the first evening at home names the household", () => {
  const place = drawPlace(runSeed, "opening-household");
  const where = `${place.name}, ${place.state} (${place.key}), run seed ${runSeed}, place seed ${place.seed}`;
  console.log(where);
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const { core } = world;
  const playerId = world.playerId!;
  const story = world.director.ledger.opening!;
  const home = () =>
    openingFrames(core, playerId, story).frames.find(
      (frame) => frame.stage === "home",
    )!;

  it("says, after the anchor, who each person at home is to the player", () => {
    const frame = home();
    const narration = frame.lines.filter((row) => row.speaker === "narrator");
    const anchor = frame.lines.filter((row) => row.speaker !== "narrator");
    expect(anchor.length, where).toBeGreaterThan(0);
    // The anchor's lines come first, then the narrator's.
    expect(frame.lines.slice(0, anchor.length), where).toEqual(anchor);
    const kin = householdKin(core, playerId);
    expect(kin.length, `a household to introduce: ${where}`).toBeGreaterThan(0);
    // No bare presence: the line is a reason.
    for (const row of narration)
      expect(row.text, where).not.toMatch(/ (is|are) (here|with you|there)\b/);
    const castIds = new Set(frame.cast.map((row) => row.id));
    for (const { member, name, fact, phrase } of kin) {
      const line = narration.find((row) => row.text.includes(name));
      expect(
        line,
        `a narrated line for ${name} (${member.id}): ${where}`,
      ).toBeTruthy();
      if (castIds.has(member.id))
        expect(
          fact,
          `${name} stands in the room with no family fact: ${where}`,
        ).toBeTruthy();
      if (phrase)
        expect(
          line!.text.toLowerCase(),
          `${name} named with the relation "${phrase}": ${where}`,
        ).toContain(phrase.toLowerCase());
      // Why, by record: the family fact and the household.
      if (fact)
        expect(
          line!.sourceRecordIds,
          `${name}'s family fact: ${where}`,
        ).toContain(fact.id);
      expect(line!.sourceRecordIds, where).toContain(member.id);
    }
  });

  it("explains a different surname by a record, or reports which record lacks one", () => {
    const player = core.people.get(playerId)!;
    const kin = householdKin(core, playerId);
    const intro = composeHouseholdIntro(core, playerId);
    const lacking: string[] = [];
    for (const { member, name } of kin) {
      if (member.familyName === player.familyName) continue;
      const line = intro.lines.find((row) => row.personId === member.id)!;
      if (/ side\b/.test(line.text)) continue;
      lacking.push(
        `${name} (${member.id}) is not ${player.familyName}: no family fact ties them to a parent of ${player.givenName}`,
      );
      expect(intro.unexplained, where).toContain(member.id);
    }
    if (lacking.length) console.warn(`${where}\n${lacking.join("\n")}`);
    // Whatever the draw, every member the intro calls explained is, and none is reported twice.
    expect(new Set(intro.unexplained).size, where).toBe(
      intro.unexplained.length,
    );
  });

  it("gives a player the creator renamed a household that shares the chosen name", () => {
    const player = core.people.get(playerId)!;
    const { givenName, familyName: before } = player;
    const shared = householdKin(core, playerId).filter(
      (row) => row.member.familyName === before,
    );
    // What the creator does: a chosen name over the drawn household's.
    coreAPI(core).chooseIdentityV1(playerId, {
      givenName: "Bo",
      familyName: "Snider",
      birthDate: player.birthDate,
      looks: {},
    });
    try {
      const kin = householdKin(core, playerId);
      const intro = composeHouseholdIntro(core, playerId);
      const narration = home().lines.filter(
        (row) => row.speaker === "narrator",
      );
      for (const { name, phrase } of kin) {
        const line = narration.find((row) => row.text.includes(name));
        expect(line, `a narrated line for ${name}: ${where}`).toBeTruthy();
        if (phrase)
          expect(line!.text.toLowerCase(), where).toContain(
            phrase.toLowerCase(),
          );
      }
      // Everyone who carried the drawn name (${before}) now carries Snider,
      // so no surname at home is left unexplained.
      expect(
        shared.length,
        `a household shares the name: ${where}`,
      ).toBeGreaterThan(0);
      for (const { member } of shared)
        expect(member.familyName, where).toBe("Snider");
      expect(intro.unexplained, where).toEqual([]);
    } finally {
      coreAPI(core).chooseIdentityV1(playerId, {
        givenName,
        familyName: before,
        birthDate: player.birthDate,
        looks: {},
      });
    }
  });
}, 900_000);
