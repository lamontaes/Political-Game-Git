/**
 * The civic family in play: a place drawn from all 56, built as the game
 * builds it (`buildBenchWorld`, two-level, every module), plays its first
 * two months. Two residents who faced about the same case for a civic
 * decision (believing a story they heard, passing it on, joining or going
 * to a party or a group, filing a claim, following the news), one leaning
 * toward it and one away, decided differently; the test names both, and
 * the membership the yes side took when it was joining.
 */
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../tests/golden-path/place";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { addDays } from "./kernel/dates";
import { PARTIES_MODULE_ID, type PartyRow } from "./modules/parties";
import { coreAPI } from "./state";
import { RUN_SEED } from "./trait-test-kit";
import {
  describePair,
  livesIn,
  opposedPairs,
  playWeighing,
} from "./trait-pairs";

const seed = `${RUN_SEED}:civic-played`;
const place = drawPlace(seed, "trait-wiring");
const label = `${place.name} (${place.key}), seed ${seed.slice(0, 12)}`;

/** The civic decisions a played window weighs for named actors (all formula decisions). */
const CIVIC = {
  "conversation.believe-claim": null,
  "news.pass-on": null,
  "parties.join": null,
  "parties.attend": null,
  "interest-groups.member-join": null,
  "interest-groups.employer-join": null,
  "jobs-benefits.file-claim": null,
  "press.follow-news": null,
  "press.accept-interview": null,
  "meetings.take-part": null,
  "meetings.hold-town-hall": null,
  "voting.turnout": null,
  "voting.exit-poll": null,
} as const;

const JOINS = new Set(["parties.join", "interest-groups.member-join"]);

describe(`civic decisions in a played window, ${label}`, () => {
  it("two people in the same case who lean opposite ways decide differently, by record", () => {
    const start = gameStartDate();
    const world = buildBenchWorld(seed, start, {
      twoLevel: true,
      placeKey: place.key,
    });
    const calls = playWeighing(world.core, addDays(start, 62), CIVIC);
    const pairs = opposedPairs(calls, {
      among: livesIn(world.core, world.placeId),
    });
    const partyOrganizations = new Set(
      (
        coreAPI(world.core)
          .moduleState(PARTIES_MODULE_ID)
          .table("parties")
          .rows() as unknown as PartyRow[]
      ).map((party) => party.organizationId),
    );
    // A party joining is a membership in the party's organization; a group
    // joining is one in any other organization.
    const membership = (decisionId: string, actorId: string) =>
      [...world.core.memberships.keys()].find((key) => {
        if (!key.startsWith(`${actorId}:`)) return false;
        const party = partyOrganizations.has(key.slice(actorId.length + 1));
        return decisionId === "parties.join" ? party : !party;
      });
    const lines = pairs.map((pair) =>
      describePair(
        pair,
        JOINS.has(pair.decisionId)
          ? membership(pair.decisionId, pair.yes.actorId)
          : undefined,
      ),
    );
    console.log(
      `civic pairs at ${label}, ${calls.length} weighed calls:\n${lines.join("\n")}`,
    );
    expect(
      pairs.length,
      `${calls.length} civic calls at ${label}`,
    ).toBeGreaterThan(0);
    for (const pair of pairs.filter((p) => JOINS.has(p.decisionId)))
      expect(
        membership(pair.decisionId, pair.yes.actorId),
        `${pair.decisionId}: ${pair.yes.actorId}'s membership at ${label}`,
      ).toBeDefined();
  }, 600_000);
});
