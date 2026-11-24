/**
 * A resident who reads two stories from the same paper on the same day can
 * bring up either one, each with the outlet that printed it. Before, a reader
 * held one fact per outlet (`printed:<outlet>:story`), so the second story
 * replaced the first and the first could no longer be brought up or traced to
 * its outlet (pool item tests-outcome-news-depauville-forgets-the-printer).
 *
 * Pinned at Auburn, Wyoming, where on Feb 25, 2025 the town's paper reached
 * the same readers with a board bill vote and the county police budget.
 */
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  NEWS_MODULE_ID,
  newsKey,
  storyOfReadEvent,
  type Story,
} from "../core2/modules/news";
import { coreAPI } from "../core2/state";
import { changesKnownTo } from "./bring-it-up";

const PLACES = [
  { name: "Auburn, Wyoming", seed: "9a4f2c7e1b03d865", key: "5604160" },
] as const;

describe.each(PLACES)(
  "two stories from one outlet on one day ($name)",
  (place) => {
    it("leaves the reader able to bring up each, named for its outlet", () => {
      setBookkeeping(false);
      const opening = gameStartDate();
      const world = buildBenchWorld(place.seed, opening, {
        twoLevel: true,
        placeKey: place.key,
      });
      const core = world.core;
      const api = coreAPI(core);
      const news = api.moduleState(NEWS_MODULE_ID);
      // Two printed stories arguing a change, from one outlet, heard by one
      // reader on one day: each one's reading names the reader a witness.
      const pair = () => {
        const byReader = new Map<string, Story[]>();
        for (const row of news.table("heard").rows() as unknown as {
          personId: string;
          storyId: string;
          date: string;
        }[]) {
          if (row.date !== core.date) continue;
          const story = news.table("stories").get(row.storyId) as unknown as
            Story | undefined;
          if (story?.kind !== "press.printed" || !story.desiredChange) continue;
          const key = `${row.personId}|${story.outletId}`;
          byReader.set(key, [...(byReader.get(key) ?? []), story]);
        }
        for (const [key, stories] of [...byReader].sort((a, b) =>
          a[0].localeCompare(b[0]),
        ))
          if (stories.length >= 2 && core.people.get(key.split("|")[0]!)?.alive)
            return { personId: key.split("|")[0]!, stories };
        return null;
      };
      let found: ReturnType<typeof pair> = null;
      let day = makeIsoDate(opening);
      for (let n = 0; n < 90 && !found; n += 1) {
        day = addDays(day, 1);
        advanceCore(core, day);
        found = pair();
      }
      expect(
        found,
        `${place.name}, seed ${place.seed}: a reader who heard two stories from one outlet on one day by ${day}`,
      ).toBeTruthy();
      const { personId, stories } = found!;
      const known = changesKnownTo(core, personId).filter(
        (change) => change.kind === "news.read",
      );
      for (const story of stories) {
        const where = `${place.name}, seed ${place.seed}: ${personId} on ${day}, ${story.id}`;
        const fact = core.knowledgeByPerson
          .get(personId)
          ?.get(`${newsKey(story.id)}:outlet`);
        expect(fact?.value, `${where}: which outlet printed it`).toBe(
          story.outletId,
        );
        expect(fact?.access, where).toBe("perceived");
        const change = known.find(
          (row) => storyOfReadEvent(row.eventId) === story.id,
        );
        expect(change, `${where}: can bring it up`).toBeTruthy();
        expect(change!.institutionId, where).toBe(story.outletId);
      }
      process.stdout.write(
        `${place.name}: ${personId} on ${day} heard ${stories.map((s) => s.id).join(" and ")}\n`,
      );
    }, 120_000);
  },
);
