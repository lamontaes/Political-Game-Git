import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { closenessBetween, feelingBetween } from "./closeness";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { drivesReport } from "./modules/drives";
import { coreAPI } from "./state";

// A person an election count leaves out has the loss on record against the
// winner (`race.lost`). The drives engine answers by the loser's own
// temperament, so in a played stretch of the world some losers hold a grudge
// against the winner, and the one feeling read (feelingBetween) sees it.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const place = drawPlace(seed, "race-lost-grudge");

it(`a race lost is on record against its winner, and losers who hold a grudge are aimed at them, in ${place.name}, seed ${place.seed}`, () => {
  setBookkeeping(false);
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const where = `${place.name} [${place.key}], seed ${place.seed}`;
  const lost: { personId: string; winnerId: string; id: string }[] = [];
  coreAPI(core).subscribeEvents(
    "race-lost-grudge-test",
    ["race.lost"],
    (_api, e) =>
      lost.push({
        id: e.id,
        personId: e.personIds[0]!,
        winnerId: e.facts!.winnerId!,
      }),
  );
  // Play month by month (up to five years) until a loser holds a grudge
  // against their winner; fail on none, naming the races passed over.
  const grudged = () => {
    const grudges = drivesReport(core).drives.filter(
      (d) => d.kind === "grudge",
    );
    return lost.filter((l) =>
      grudges.some(
        (d) => d.personId === l.personId && d.targetId === l.winnerId,
      ),
    );
  };
  let aimed = grudged();
  for (let month = 0; month < 60 && !aimed.length; month++) {
    advanceCore(core, addDays(makeIsoDate(core.date), 30));
    aimed = grudged();
  }
  expect(lost.length, `${where}: a race was lost`).toBeGreaterThan(0);
  expect(
    aimed.length,
    `${where}: ${lost.length} losses on record (${lost
      .map((l) => l.id)
      .slice(0, 5)
      .join(", ")}), none held as a grudge`,
  ).toBeGreaterThan(0);
  const holder = aimed[0]!;
  expect(
    feelingBetween(core, holder.personId as never, holder.winnerId as never),
    `${where}: ${holder.id}`,
  ).toBeLessThan(
    closenessBetween(core, holder.personId as never, holder.winnerId as never),
  );
}, 1_800_000);
