/**
 * A campaign asks the player to help (owner, Nov 16: "There's not much I can do since I can't run for
 * anything"; his answer: "Work for someone else's campaign, a party committee or an appointed board
 * until a race opens"; crew list #9747, item 3a). A candidate from the player's own circle files; the
 * campaign's turn asks the people its lists reach to volunteer, and the player, who used to be skipped by
 * name, is asked too: the ask is kept and a `volunteer-asked` record names the campaign, the race and the
 * player. The player's yes in the scene puts them on the campaign's volunteers through the engine's own
 * ask, which writes `campaign-volunteer-joined`; a no stands for the race.
 *
 * Drawn places (skill drawn-place-tests): a place whose player has nobody in their circle who can file
 * for an open race is passed over and named.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildPopulation } from "./population";
import { advanceToFilingOpen } from "./gov-test-clock";
import { applyCoreEvent, coreAPI } from "./state";
import { createLifeCore } from "./life";
import type { CoreEventInput, CoreState, PersonId } from "./types";
import { openLaws } from "./modules/laws";
import { openOffices } from "./modules/offices";
import { openRecord } from "./modules/record";
import {
  fileCandidacy,
  openContests,
  openElections,
  type FilingRow,
} from "./modules/elections";
import {
  CAMPAIGNS_MODULE_ID,
  VOLUNTEER_ASKED_EVENT,
  VOLUNTEER_JOINED_EVENT,
  askForSupport,
  campaignFor,
  foldClosedRaceCauses,
  openCampaigns,
  reachablePeople,
} from "./modules/campaigns";
import { openParties } from "./modules/parties";
import { openPress } from "./modules/press";
import { viewsModule } from "./modules/views";

const START = "2026-01-05";
/** Places drawn before the test says no case was found. Engineering value. */
const PLACES = 6;
const runSeed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256")
    .update(`campaign-volunteer-ask:${Date.now()}`)
    .digest("hex");

/** A played-world slice with the engines a campaign reads, and a resident adult as the player. */
function world(salt: string) {
  const place = drawPlace(runSeed, salt);
  const core = createLifeCore(
    buildPopulation({
      seed: place.seed,
      placeKey: place.key,
      startedAt: START,
      minimumPeople: 300,
    }),
    { modules: [viewsModule] },
  );
  openLaws(core);
  openOffices(core, place.seed, core.date);
  openElections(core);
  openCampaigns(core);
  openParties(core);
  openRecord(core);
  openPress(core);
  return {
    core,
    api: coreAPI(core),
    where: `${place.name}, ${place.state} (${place.key}), run seed ${runSeed}, place seed ${place.seed}`,
  };
}

/** A filing by someone in the player's own circle, in a race whose filing is open: the case. */
function circleFiling(core: CoreState): FilingRow | null {
  const api = coreAPI(core);
  advanceToFilingOpen(core);
  const adults = [...core.people.values()].filter(
    (p) =>
      p.alive &&
      p.tier !== "husk" &&
      Number(core.date.slice(0, 4)) - Number(p.birthDate.slice(0, 4)) >= 30,
  );
  for (const player of adults) {
    const circle = [...player.familyIds, ...player.knownIds].filter((id) =>
      adults.some((a) => a.id === id),
    );
    if (!circle.length) continue;
    core.playerId = player.id as PersonId;
    for (const contest of openContests(api))
      for (const id of circle) {
        const result = fileCandidacy(api, {
          personId: id,
          contestId: contest.id,
          platform: [],
        });
        if (result.status === "refused") continue;
        const filing = result.filing;
        if (
          reachablePeople(api, campaignFor(api, filing.id)).includes(player.id)
        )
          return filing;
      }
  }
  return null;
}

const asksFor = (core: CoreState, playerId: string) =>
  [...core.durableLog.values()].filter(
    (e) => e.kind === VOLUNTEER_ASKED_EVENT && e.facts?.askedId === playerId,
  );

const reply = (core: CoreState, ask: CoreEventInput, move: string) =>
  applyCoreEvent(core, {
    id: `scene-reply:test:${ask.id}:${move}`,
    date: core.date,
    kind: "scene.reply",
    personIds: [ask.personIds[0]!, core.playerId!],
    placeId: core.people.get(core.playerId!)!.placeId,
    facts: { typeKey: "volunteer-ask", causeId: ask.id, move },
    source: { tag: "SOURCED", citation: "test", asOf: core.date },
  });

describe("a campaign asks the player to volunteer", () => {
  it("asks the player, keeps the ask, and a yes in the scene puts them on the campaign", () => {
    const passedOver: string[] = [];
    for (let n = 0; n < PLACES; n += 1) {
      const { core, api, where } = world(`volunteer-ask:${n}`);
      const filing = circleFiling(core);
      if (!filing) {
        passedOver.push(`${where}: no one in a player's circle could file`);
        continue;
      }
      const playerId = core.playerId!;
      askForSupport(api, filing.id);
      const asks = asksFor(core, playerId);
      expect(asks, where).toHaveLength(1);
      const ask = asks[0]!;
      expect(ask.facts?.filingId, where).toBe(filing.id);
      expect(ask.facts?.candidateId, where).toBe(filing.personId);
      // Asked again on the next turn the same day: the kept ask is not asked twice.
      askForSupport(api, filing.id);
      expect(asksFor(core, playerId), where).toHaveLength(1);
      expect(campaignFor(api, filing.id).volunteerIds, where).not.toContain(
        playerId,
      );
      reply(core, ask, "agree");
      expect(campaignFor(api, filing.id).volunteerIds, where).toContain(
        playerId,
      );
      const joined = core.durableLog.get(
        `${VOLUNTEER_JOINED_EVENT}:${filing.id}:${playerId}` as never,
      );
      expect(joined?.facts?.volunteerId, where).toBe(playerId);
      const kept = api
        .moduleState(CAMPAIGNS_MODULE_ID)
        .table("volunteerAsks")
        .get(String(ask.facts?.askId)) as unknown as { answer: string };
      expect(kept.answer, where).toBe("yes");
      // The answer stands only for the race: it goes when the race is counted.
      foldClosedRaceCauses(api, filing.contestId);
      expect(
        api
          .moduleState(CAMPAIGNS_MODULE_ID)
          .table("volunteerAsks")
          .get(String(ask.facts?.askId)),
        where,
      ).toBeFalsy();
      console.log(
        `volunteer ask: ${where}; passed over: ${passedOver.join(" | ") || "none"}`,
      );
      return;
    }
    throw new Error(
      `No case in ${PLACES} drawn places: ${passedOver.join(" | ")}`,
    );
  }, 600_000);
});
