import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { NEWS_MODULE_ID, type Story } from "./modules/news";
import { coreAPI } from "./state";

// A resident's parent who died in the year before day one is in the news
// archive (owner, Oct 14: the year before day one has news records). The
// death comes from the same life-table line that decides whether a parent is
// alive, so the survivor has no living parent of that kind; the story keeps
// the dated family record it came from, and the survivor heard it the day it
// happened. Places are drawn in turn until one has such a death.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");

it(`a parent's death in the year before day one is an archived story (seed ${seed})`, () => {
  const tried: string[] = [];
  for (let life = 0; life < 6; life += 1) {
    const place = drawPlace(`${seed}:${life}`, "past-deaths");
    setBookkeeping(false);
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const stories = (
      api
        .moduleState(NEWS_MODULE_ID)
        .table("stories")
        .rows() as unknown as Story[]
    ).filter((story) => story.facts.recordKind === "parent-died");
    if (!stories.length) {
      tried.push(place.name);
      continue;
    }
    for (const story of stories) {
      const where = `${place.name}, seed ${seed}:${life}, ${story.id}`;
      expect(story.date < gameStartDate(), where).toBe(true);
      const survivor = core.people.get(story.facts.survivorId!);
      expect(survivor?.alive, where).toBe(true);
      // The story keeps the dated family record it came from.
      const fact = survivor!.pastFacts?.find(
        (row) => row.id === story.facts.recordId,
      );
      expect(fact?.kind, where).toBe("family:parent-died");
      expect(fact?.date, where).toBe(story.date);
      // No living parent of that kind: the record says they died.
      const alive = [...survivor!.familyIds].some((id) => {
        const kin = survivor!.pastFacts?.find(
          (row) => row.facts?.otherPersonId === id,
        );
        return kin?.kind === `family:${story.facts.relation}`;
      });
      expect(alive, where).toBe(false);
      // The survivor heard it the day it happened.
      const heard = api
        .moduleState(NEWS_MODULE_ID)
        .table("heard")
        .get(`${survivor!.id}:${story.id}`) as unknown as
        { date: string } | undefined;
      expect(heard?.date, where).toBe(story.date);
    }
    return;
  }
  throw new Error(
    `no resident's parent died in the year before day one in ${tried.join("; ")} (seed ${seed})`,
  );
}, 3_600_000);
