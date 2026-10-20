import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { allCases, bringCases, handleCase } from "./modules/constituent-cases";
import { lawInForce } from "./modules/laws";
import { townSeats } from "./modules/offices";
import { coreAPI } from "./state";
import type { CoreState } from "./types";

// A wage complaint under the federal minimum goes to the town's members of
// Congress (pool: office-casework-for-members-of-congress), and the member's
// help raises the worker's pay by the law's own rule. Places are drawn in turn
// until one where the federal floor is the one in force. The played world opens
// no cases early on and pays at or over the floor, so a few workers' pay is set
// below it to bring the complaint: this proves the routing and the handling,
// not that complaints arise.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");

it(`a federal-floor wage complaint reaches a member of Congress, who raises the pay (seed ${seed})`, () => {
  const tried: string[] = [];
  for (let life = 0; life < 24; life += 1) {
    const place = drawPlace(`${seed}:${life}`, "federal-casework");
    setBookkeeping(false);
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const answer = lawInForce(api, "minimum-wage");
    if (answer.governing?.level !== "federal" || answer.value === null) {
      tried.push(`${place.name} (${answer.governing?.level ?? "no floor"})`);
      continue;
    }
    const floor = answer.value;
    const members = townSeats(api)
      .filter(
        ({ office, seat, holder }) =>
          seat.coversTown &&
          holder?.personId &&
          (office.kind === "us-senate" || office.kind.startsWith("us-house")),
      )
      .map(({ holder }) => holder!.personId!);
    const where = `${place.name}, seed ${seed}:${life}`;
    expect(members.length, where).toBeGreaterThan(0);
    const state = core as CoreState;
    // Workers in town paid a dollar an hour: well under the floor.
    const underpaid: string[] = [];
    for (const commitment of state.work.commitments.values()) {
      if (underpaid.length >= 12) break;
      if (
        (commitment.endsAt === undefined || commitment.endsAt > core.date) &&
        core.people.has(commitment.personId) &&
        !members.includes(commitment.personId)
      ) {
        state.work.commitments.set(commitment.id, {
          ...commitment,
          hourlyMinor: 100,
        });
        underpaid.push(commitment.id);
      }
    }
    bringCases(api);
    const wage = allCases(api).filter(
      (row) =>
        row.problem === "paid-under-minimum-wage" &&
        underpaid.includes(String(row.facts.commitmentId)),
    );
    if (!wage.length) {
      tried.push(`${place.name} (no complaint brought)`);
      continue;
    }
    for (const row of wage) {
      expect(members, `${where}: ${row.id}`).toContain(row.officialId);
      expect(row.id.startsWith("case:"), where).toBe(true);
    }
    const one = wage[0]!;
    const commitmentId = String(one.facts.commitmentId);
    expect(state.work.commitments.get(commitmentId)!.hourlyMinor, where).toBe(
      100,
    );
    const done = handleCase(api, one.id, "help")!;
    expect(done.status, where).toBe("helped");
    expect(done.outcome, where).toBe("referred-pay-raised");
    expect(state.work.commitments.get(commitmentId)!.hourlyMinor, where).toBe(
      floor,
    );
    return;
  }
  throw new Error(
    `no drawn place had a federal floor and a complaint: ${tried.join("; ")} (seed ${seed})`,
  );
}, 3_600_000);
