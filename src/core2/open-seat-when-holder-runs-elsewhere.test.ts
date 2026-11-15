/**
 * A holder who files for another office is not on their own seat's ballot
 * (pool item gov-legislative-seat-has-no-serving-term-after-election).
 * Pinned to the world-races draw that found it: seed c72660ce…, which picks
 * New York's town and where the sitting member of the state House for
 * district 013 filed for US House district 19 on April 6, 2026. Before the
 * fix the one person was returned to their own seat and also won the House
 * seat; taking the House seat on January 3 ended the state seat's term and
 * left it with no serving term until a special election.
 */
import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import { buildPopulation } from "./population";
import { advanceCore, createLifeCore } from "./life";
import { coreAPI } from "./state";
import { openLaws } from "./modules/laws";
import { OFFICES_MODULE_ID, openOffices } from "./modules/offices";
import { openElections } from "./modules/elections";
import { openCampaigns } from "./modules/campaigns";
import { openParties } from "./modules/parties";
import { openVoting, openWorldRaces } from "./modules/voting";
import { openLegislature } from "./modules/legislature";
import { searchCorePlaces, corePlaceStateIdentities } from "./place-lookup";

const SEED = "c72660cec9f522959fd06ecba08f9899";
const pick = <T>(list: readonly T[], salt: string): T =>
  list[
    parseInt(
      createHash("sha256").update(`${SEED}:${salt}`).digest("hex").slice(0, 8),
      16,
    ) % list.length
  ]!;

it("a state seat whose holder filed for the US House has its own winner, and no one holds two seats", () => {
  const state = pick(
    [...corePlaceStateIdentities()].map((s) => s.jurisdictionKey).sort(),
    "state",
  );
  const places = [
    ...searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
      stateJurisdictionKey: state,
      scope: "locality",
    }),
  ].sort((a, b) => a.key.localeCompare(b.key));
  const core = createLifeCore(
    buildPopulation({
      seed: SEED,
      placeKey: pick(places, "place").key,
      startedAt: "2026-10-20",
      minimumPeople: 120,
    }),
  );
  openLaws(core);
  openOffices(core, SEED);
  openElections(core);
  openCampaigns(core);
  openParties(core);
  openVoting(core);
  openLegislature(core);
  openWorldRaces(core);
  const api = coreAPI(core);
  advanceCore(core, "2027-01-04");
  const terms = api
    .moduleState(OFFICES_MODULE_ID)
    .table("terms")
    .rows() as unknown as {
    id: string;
    seatId: string;
    personId: string | null;
    status: string;
  }[];
  const serving = (seatId: string) =>
    terms.filter((t) => t.seatId === seatId && t.status === "serving");
  const state013 = serving("seat:US-NY:lower:013:0");
  const house19 = serving("seat:US-NY:us-house:19");
  // Each seat has its holder, and they are two different people.
  expect(state013.length, "state seat lower 013").toBe(1);
  expect(house19.length, "US House 19").toBe(1);
  expect(state013[0]!.personId, "one person in both seats").not.toBe(
    house19[0]!.personId,
  );
  // Nobody holds two of the seats this ballot filled.
  const held = new Map<string, string>();
  for (const t of terms.filter((x) => x.status === "serving" && x.personId)) {
    const earlier = held.get(t.personId!);
    expect(earlier, `${t.personId} holds ${t.seatId} and ${earlier}`).toBe(
      undefined,
    );
    held.set(t.personId!, t.seatId);
  }
}, 120_000);
