import { expect, it } from "vitest";
import { buildBenchWorld } from "../../bench/world";
import { setBookkeeping } from "../bookkeeping";
import { gameStartDate } from "../game-start";
import { leanedYes } from "../trait-decisions";
import { coreAPI } from "../state";
import { attendCase, partiesHere, partyMemberIds } from "./parties";

// A party met every month before the world opens: at the opening, the chair
// already has a tie with each member who would have come by the meeting's own
// rule (parties-opening-chair-knows-no-members). Pinned to one named place
// and seed (Breathedsville, Maryland), where both parties have members who
// would come and members who would stay home.
const PLACE = "2409400";
const SEED = "eb7bf5962b7c91580493e25b412315491d7919f3bfaa5fc6b44a1b5435f719d5";

it("a party chair opens knowing the members who come to its meetings", () => {
  setBookkeeping(false);
  const { core } = buildBenchWorld(SEED, gameStartDate(), {
    twoLevel: true,
    placeKey: PLACE,
  });
  const api = coreAPI(core);
  const tied = (a: string, b: string) =>
    core.relationships.has(a < b ? `${a}:${b}` : `${b}:${a}`);
  let come = 0;
  let stay = 0;
  for (const party of partiesHere(api)) {
    const chair = party.leaderId;
    if (!chair) continue;
    for (const id of partyMemberIds(api, party.id)) {
      if (id === chair) continue;
      const member = core.people.get(id as never)!;
      const comes = leanedYes(
        core,
        member,
        "parties.attend",
        "attend",
        "stay-home",
        attendCase(core, member),
      );
      if (comes) {
        come += 1;
        expect(tied(id, chair), `${id} would come`).toBe(true);
      } else stay += 1;
    }
  }
  // Both kinds are there, so the test reads the rule and not a world where
  // everyone comes or no one does.
  expect(come).toBeGreaterThan(0);
  expect(stay).toBeGreaterThan(0);
}, 120_000);
