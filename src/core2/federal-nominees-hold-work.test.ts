/**
 * The President names each cabinet secretary from a field of three, drawn as
 * full people of the played state (succession's nominate). Each of the field
 * lives in a town of the state, drawn by who lives in each (drawStateHome),
 * never the played town, whose own people are its counted residents. Each holds the
 * work that town's counts show (workFromHome), as every person filled in far
 * from the played town holds theirs. Before, all three lived at the state
 * itself, with no town and no work, so the two passed over sat near the top
 * of a governor's list for every post and nearly always said yes
 * (executive-federal-nominees-passed-over-have-no-work). The one confirmed
 * leaves that work for the post: from the first day, the post is their job.
 *
 * Pinned: Edgar, Wisconsin (5522550), seed edgar-petition-1.
 */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { workFromHome } from "./coarse-place";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { lawChain } from "./modules/laws";
import { officialOf } from "./modules/officials";
import { corePlaceByJurisdictionId } from "./place-lookup";
import { workHeld } from "./person-work";
import { coreAPI } from "./state";

const PLACE = "5522550";
const SEED = "edgar-petition-1";
const where = `Edgar, Wisconsin (${PLACE}), seed ${SEED}`;

it(`${where}: the President's cabinet field lives in towns of the state and holds their work`, () => {
  const previous = setBookkeeping(false);
  try {
    const { core } = buildBenchWorld(SEED, gameStartDate(), {
      twoLevel: true,
      placeKey: PLACE,
    });
    const api = coreAPI(core);
    const { stateKey, townPlaceId } = lawChain(api);
    const field = [...core.people.values()].filter((p) =>
      p.id.startsWith("official:cabinet:US:"),
    );
    expect(field.length, `${where}: the cabinet's fields`).toBeGreaterThan(20);
    const passedOver = field.filter(
      (p) => officialOf(api, p.id)?.ended !== null,
    );
    expect(passedOver.length, `${where}: passed over`).toBeGreaterThan(10);
    for (const person of field) {
      const home = corePlaceByJurisdictionId(person.placeId as never);
      expect(home, `${where}: ${person.id} lives in a town`).toBeTruthy();
      expect(person.placeId, `${where}: ${person.id}`).not.toBe(townPlaceId);
      expect(home!.stateJurisdictionKey ?? home!.key, where).toBe(stateKey);
      const drawn = workFromHome(core.seed, home!.key, person.id);
      const kept = person.pastFacts?.find((f) => f.kind === "identity:work");
      expect(kept?.facts?.title, `${where}: ${person.id}`).toBe(drawn?.title);
    }
    // Someone passed over still holds that work.
    for (const person of passedOver)
      expect(workHeld(core, person.id)?.title, where).toBeTruthy();
    // The one confirmed leaves it: from the first day the pay engine seats
    // them (official-pay's seat), the post is their job, and the work they
    // were filled in with is no longer what they hold.
    const seated = field.filter((p) => officialOf(api, p.id)?.ended === null);
    expect(seated.length, `${where}: secretaries`).toBeGreaterThan(10);
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    for (const person of seated) {
      const now = workHeld(core, person.id);
      expect(now?.jobId, `${where}: ${person.id}`).toMatch(
        new RegExp(`^job:office:[^]*:${person.id}$`),
      );
      expect(core.jobs.get(now!.jobId!)?.endsAt, where).toBeUndefined();
    }
  } finally {
    setBookkeeping(previous);
  }
}, 120_000);
