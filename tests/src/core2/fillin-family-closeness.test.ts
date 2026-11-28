/**
 * A filled-in person's family tie to a full relative opens at the hours their
 * records give (`openingClosenessHours`), as every opening family tie does,
 * not at a stand-in. A place drawn from all 56; set GOLDEN_PATH_SEED to
 * reproduce a run.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../../scripts/core2-year/place";
import { buildBenchWorld } from "../../../src/bench/world";
import { setBookkeeping } from "../../../src/core2/bookkeeping";
import { currentCloseness, levelFromHours } from "../../../src/core2/closeness";
import { countedResidents } from "../../../src/core2/electorate";
import { gameStartDate } from "../../../src/core2/game-start";
import { parameter } from "../../../src/core2/parameters";
import { fillInPerson } from "../../../src/core2/state";
import { pairKey } from "../../../src/core2/kernel/ids";
import { residentPerson } from "../../../src/core2/modules/residents";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it(`a filled-in person's family tie opens at the recorded closeness (seed ${seed})`, () => {
  setBookkeeping(false);
  for (let draw = 0; draw < 6; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "fillin-family");
    const where = `${place.name} (${place.key}), run seed ${seed} draw ${draw}, world seed ${place.seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const found = countedResidents(core)
      .map((voter) => residentPerson(core, voter.id))
      .find(
        (person) =>
          person && [...person.familyIds].some((id) => core.people.has(id)),
      );
    if (!found) continue;
    const relative = [...found.familyIds].find((id) => core.people.has(id))!;
    const actor = fillInPerson(core, found.id);
    const tie = core.relationships.get(pairKey(actor.id, relative));
    expect(tie, `${where}: no family tie`).toBeDefined();
    // Not the old stand-in of half an hour: the tie holds the closeness the records give.
    const p = (key: string) => parameter(key, core.data.parameters);
    expect(currentCloseness(core, tie!), where).toBeGreaterThanOrEqual(
      levelFromHours(p, 0.5) - 1e-9,
    );
    return;
  }
  console.log(
    `seed ${seed}: no drawn place had a counted person with a full relative`,
  );
}, 300_000);
