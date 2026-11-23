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

// A candidate an attack ad ran against has it on record against whoever bought
// it (`campaign.attacked`). The drives engine answers by the loser's own
// temperament, so in a played stretch of the world some losers hold a grudge
// against the winner, and the one feeling read (feelingBetween) sees it.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const place = drawPlace(seed, "attack-grudge");

it(`an attack ad is on record against the one who bought it, and the candidates it ran against who hold a grudge are aimed at them, in ${place.name}, seed ${place.seed}`, () => {
  setBookkeeping(false);
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const where = `${place.name} [${place.key}], seed ${place.seed}`;
  const lost: { personId: string; winnerId: string; id: string }[] = [];
  coreAPI(core).subscribeEvents(
    "attack-grudge-test",
    ["campaign.attacked"],
    (_api, e) =>
      lost.push({
        id: e.id,
        personId: e.personIds[0]!,
        winnerId: e.facts!.attackerId!,
      }),
  );
  // Play month by month (up to five years) until a record of this kind is
  // on file; fail on none. Each person it names answers by their own
  // temperament (a grudge, proving themselves, a cause or carrying on), so
  // the claim is that the drives engine answered the record, and that a
  // grudge it formed feeds the one feeling read.
  const answered = () =>
    Object.entries(drivesReport(core).responsesByRule)
      .filter(([key]) => key.startsWith("campaign-attacked:"))
      .reduce((sum, [, n]) => sum + (n as number), 0);
  for (let month = 0; month < 60 && !answered(); month++)
    advanceCore(core, addDays(makeIsoDate(core.date), 30));
  expect(lost.length, `${where}: an attack ad ran`).toBeGreaterThan(0);
  expect(
    answered(),
    `${where}: ${lost.length} records on file (${lost
      .map((l) => l.id)
      .slice(0, 3)
      .join(", ")}), none answered by the drives engine`,
  ).toBeGreaterThan(0);
  const grudges = drivesReport(core).drives.filter((d) => d.kind === "grudge");
  for (const l of lost) {
    if (
      !grudges.some(
        (d) => d.personId === l.personId && d.targetId === l.winnerId,
      )
    )
      continue;
    expect(
      feelingBetween(core, l.personId as never, l.winnerId as never),
      `${where}: ${l.id}`,
    ).toBeLessThan(
      closenessBetween(core, l.personId as never, l.winnerId as never),
    );
  }
}, 1_800_000);
