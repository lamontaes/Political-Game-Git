/**
 * A party chair who dies is replaced the same day by the party's own members,
 * each backing the colleague they rate highest; the choice is kept as a record
 * and reported as news. In a random place.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildPopulation } from "./population";
import { createLifeCore } from "./life";
import { coreAPI } from "./state";
import { openOffices } from "./modules/offices";
import { openElections } from "./modules/elections";
import { openCampaigns } from "./modules/campaigns";
import {
  PARTIES_MODULE_ID,
  openParties,
  partiesHere,
  type ChairRow,
} from "./modules/parties";

const START = "2026-01-05";
const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`party-chair:${Date.now()}`).digest("hex");
const first = drawPlace(seed, "party-chair");
const title = `${first.name}, ${first.state} (${first.key}), seed ${seed}`;

describe(`party chairs (${title})`, () => {
  it("replaces a chair who dies the same day, by the members' own votes", () => {
    const tried: string[] = [];
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const drawn = attempt
        ? drawPlace(`${seed}:${attempt}`, "party-chair")
        : first;
      const where = `${drawn.name}, ${drawn.state} (${drawn.key}), seed ${seed}`;
      const core = createLifeCore(
        buildPopulation({
          seed,
          placeKey: drawn.key,
          startedAt: START,
          minimumPeople: 300,
        }),
      );
      openOffices(core, seed);
      openElections(core);
      openCampaigns(core);
      openParties(core);
      const api = coreAPI(core);
      const party = partiesHere(api)
        .filter((p) => p.leaderId)
        .sort((a, b) => b.share - a.share)[0];
      // Nonpartisan places (American Samoa) have no party to chair.
      if (!party) {
        tried.push(where);
        continue;
      }
      const leaderId = party.leaderId!;
      const news: string[] = [];
      api.subscribeEvents("party-chair-test", ["party-chair-chosen"], (_a, e) =>
        news.push(e.id),
      );
      api.updatePerson(leaderId, { alive: false });
      api.emit({
        id: `test-death:${leaderId}`,
        date: START,
        kind: "life.death",
        personIds: [leaderId],
        placeId: core.people.get(leaderId)!.placeId,
        source: { tag: "SOURCED", citation: "test", asOf: START },
      });
      const after = partiesHere(api).find((p) => p.id === party.id)!;
      const chairs = api
        .moduleState(PARTIES_MODULE_ID)
        .table("chairs")
        .query("byParty", [party.id]) as unknown as ChairRow[];
      expect(chairs, where).toHaveLength(1);
      const chair = chairs[0]!;
      expect(chair.date, where).toBe(START);
      expect(chair.cause).toBe("death");
      expect(chair.previousId).toBe(leaderId);
      expect(after.leaderId, where).toBe(chair.chosenId);
      expect(after.leaderId).not.toBe(leaderId);
      // A full, living member in town, chosen by the most votes cast.
      const chosen = core.people.get(chair.chosenId)!;
      expect(chosen.alive).toBe(true);
      expect(core.memberships.has(`${chosen.id}:${party.organizationId}`)).toBe(
        true,
      );
      const tally = new Map<string, number>();
      for (const backed of Object.values(chair.votes))
        tally.set(backed, (tally.get(backed) ?? 0) + 1);
      const most = Math.max(...tally.values());
      expect(tally.get(chair.chosenId), where).toBe(most);
      expect(Object.keys(chair.votes)).not.toContain(leaderId);
      // The press reads it as news the same day.
      expect(news, where).toContain(chair.id);
      return;
    }
    throw new Error(
      `no drawn place had a party with a chair (seed ${seed}): ${tried.join("; ")}`,
    );
  }, 900_000);
});
