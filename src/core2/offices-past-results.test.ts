/**
 * The share a sitting U.S. House or Senate holder won by last time is the race's
 * real result as this world drifts it (src/core2/offices-past-results.ts), not a draw
 * inside the office kind's band. Pinned: Shubert, Nebraska (3145225), the seed
 * national-opinion.test.ts names.
 */
import type { IncomingMessage } from "node:http";
import { expect, it } from "vitest";
import { handleDev } from "../bench/dev-api";
import type { OpeningView } from "../bench/dev-views/opening";
import SOURCES from "../bench/dev-views/opening-sources.json" with { type: "json" };
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { coreAPI } from "./state";
import { OFFICES_MODULE_ID, type TermRow } from "./modules/offices";
import { realResult, recordedRaceShare } from "./offices-past-results";

const PLACE = {
  name: "Shubert, Nebraska",
  key: "3145225",
  seed: "4f084788fb52adfd1e9edfff00040a02e8e8447e725934bd60a26d12fa07322f",
};

const request = { method: "GET" } as unknown as IncomingMessage;

it(`records each congressional holder's last share from the real race (${PLACE.name})`, async () => {
  setBookkeeping(false);
  const where = `${PLACE.name} (${PLACE.key}), world seed ${PLACE.seed}`;
  const world = buildBenchWorld(PLACE.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: PLACE.key,
  });
  const api = coreAPI(world.core);
  const offices = api.moduleState(OFFICES_MODULE_ID);
  const congress = (
    offices.table("offices").rows() as unknown as {
      id: string;
      kind: string;
      jurisdiction: string;
    }[]
  ).filter((o) => o.kind === "us-house" || o.kind === "us-senate");
  expect(
    congress.length,
    `${where}: the state's House and Senate`,
  ).toBeGreaterThan(1);
  let recorded = 0;
  for (const office of congress) {
    const usps = office.jurisdiction.split("-").at(-1)!;
    const seats = offices
      .table("seats")
      .query("byOffice", [office.id]) as unknown as { id: string }[];
    for (const seat of seats) {
      const terms = offices
        .table("terms")
        .query("bySeatStatus", [seat.id, "serving"]) as unknown as TermRow[];
      for (const term of terms) {
        if (!term.elected) continue;
        const race = {
          officeKind: office.kind,
          seatId: seat.id,
          usps,
          party: term.party,
          date: term.elected.date,
        };
        const real = realResult(race);
        if (!real) continue;
        recorded += 1;
        // The term keeps the real result as this world drifts it, the same
        // number past-elections writes on the race (one lookup, one key).
        expect(term.elected.share, `${where}: ${term.id}`).toBe(
          recordedRaceShare(PLACE.seed, race)!.share,
        );
        expect(
          Math.abs(term.elected.share - real.share),
          `${where}: ${term.id} within the drift of ${real.share}`,
        ).toBeLessThanOrEqual(0.02 + 1e-9);
      }
    }
  }
  expect(
    recorded,
    `${where}: serving holders whose race the research records`,
  ).toBeGreaterThan(0);

  // Dev mode's "How this world opened" reads the same record for the town's House seat:
  // the real result moved by the world's drift, keyed by the seat and election day.
  const ask = async (query: string): Promise<OpeningView> => {
    let answer: { status: number; value: unknown } | undefined;
    await handleDev(
      request,
      new URL(`http://bench/api/dev/opening?${query}`),
      (status, value) => (answer = { status, value }),
      () => ({
        core: world.core,
        director: world.director,
        placeId: world.placeId,
      }),
    );
    expect(answer?.status, `${where}: ${query}`).toBe(200);
    return answer!.value as OpeningView;
  };
  const seats = (await ask("subject=office")).choices.office;
  const house = seats.find((c) => c.id.includes(":us-house:"));
  expect(house, `${where}: the town's House seat`).toBeDefined();
  const term = (
    offices
      .table("terms")
      .query("bySeatStatus", [house!.id, "serving"]) as unknown as TermRow[]
  )[0]!;
  const row = (await ask(`subject=office&id=${house!.id}`)).rows.find(
    (r) => r.label === "Share of the vote last time",
  );
  expect(row?.made, where).toBe(SOURCES.kinds["world-offset"]);
  expect(row?.drawKey, where).toBe(`${house!.id}:${term.elected!.date}:share`);
  expect(row?.value, where).toBe(
    `${(term.elected!.share * 100).toFixed(1)}% in 2024`,
  );
}, 30_000);
