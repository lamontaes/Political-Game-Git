/**
 * A new adult who lives with family can file where the law charges a fee
 * (pool item play-stop-new-adult-with-no-money-cannot-file-where-a-fee-is-charged):
 * the adults of the candidate's household cover what the candidate does not
 * hold, each by their own journal payment to the filing government's
 * treasury. Before, the counter read only the candidate's own cash, so the
 * player here, who holds nothing while their parent holds the fee many times
 * over, could never file.
 *
 * The place is pinned (no drawn test): Bennington, Kansas, with the place
 * seed its world is built from; the council's filing is open on the day read.
 */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { governments } from "./modules/budgets";
import {
  checkEligibility,
  fileCandidacy,
  openContests,
} from "./modules/elections";
import { coreAPI } from "./state";

const PLACE = {
  name: "Bennington, Kansas",
  key: "2006075",
  seed: "d3e80a0a852ebb1850f1420f52bfa167ccf63d7cd1446c0457af35a5162a3507",
  day: "2025-04-26",
} as const;

it(`a candidate with no money of their own files when their household holds the fee, and the household member who paid is on the journal, at ${PLACE.name}`, () => {
  const was = setBookkeeping(false);
  try {
    const world = buildBenchWorld(PLACE.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: PLACE.key,
    });
    const { core } = world;
    const api = coreAPI(core);
    advanceCore(core, makeIsoDate(PLACE.day));
    const me = world.playerId!;
    const where = `${PLACE.name} (${PLACE.key}), place seed ${PLACE.seed}, ${core.date}`;
    const player = () => core.people.get(me as never)!;
    const contest = openContests(api)
      .filter((row) => row.id.includes(":council:"))
      .sort((a, b) => a.id.localeCompare(b.id))
      .find((row) =>
        checkEligibility(api, me, row.id, null).some(
          (check) => check.rule === "filing-fee",
        ),
      );
    expect(
      contest,
      `${where}: a council race with a filing fee is open`,
    ).toBeDefined();
    const checks = checkEligibility(api, me, contest!.id, null);
    const fee = checks.find((check) => check.rule === "filing-fee")!;
    const feeMinor = Number(fee.required.slice(1).replaceAll(",", "")) * 100;
    // The case: the candidate alone cannot pay, and the household can.
    expect(
      player().liquidMinor,
      `${where}: the player's own cash against the fee ${fee.required}`,
    ).toBeLessThan(feeMinor);
    const others = (core.households.get(player().householdId)?.memberIds ?? [])
      .filter((id) => id !== me)
      .map((id) => core.people.get(id)!);
    const cashOf = () =>
      new Map(
        others.map((member) => [
          member.id,
          core.people.get(member.id)!.liquidMinor,
        ]),
      );
    const before = cashOf();
    const ownBefore = player().liquidMinor;
    expect(
      [...before.values()].reduce((sum, minor) => sum + minor, 0),
      `${where}: the household's other members' cash`,
    ).toBeGreaterThanOrEqual(feeMinor - ownBefore);
    expect(
      fee.met,
      `${where}: the fee check ${fee.required}, has ${fee.actual}`,
    ).toBe(true);
    expect(
      checks.filter((check) => !check.met).map((check) => check.rule),
      `${where}: every check is met`,
    ).toEqual([]);
    const level = contest!.level === "township" ? "city" : contest!.level;
    const treasury =
      governments(api).find((row) => row.level === level) ??
      governments(api).find((row) => row.level === "state");
    const treasuryBefore = core.organizations.get(
      treasury!.organizationId as never,
    )!.liquidMinor;
    const result = fileCandidacy(api, {
      personId: me,
      contestId: contest!.id,
      platform: [],
      party: null,
    });
    expect(result.status, `${where}: filing for ${contest!.id}`).not.toBe(
      "refused",
    );
    // The candidate paid what they held; the household paid the rest, to the cent.
    const ownPaid = ownBefore - player().liquidMinor;
    expect(ownPaid, `${where}: the player's own part`).toBe(
      Math.min(ownBefore, feeMinor),
    );
    const after = cashOf();
    const paidBy = [...before]
      .map(([id, minor]) => ({ id, paid: minor - after.get(id)! }))
      .filter((row) => row.paid !== 0);
    expect(
      paidBy.reduce((sum, row) => sum + row.paid, 0),
      `${where}: the household's part of ${fee.required}`,
    ).toBe(feeMinor - ownPaid);
    expect(
      core.organizations.get(treasury!.organizationId as never)!.liquidMinor -
        treasuryBefore,
      `${where}: ${treasury!.name} took in the fee`,
    ).toBe(feeMinor);
    process.stdout.write(
      `FILING FEE ${where}: ${me} held $${Math.floor(ownBefore / 100)} against ${fee.required}; ${paidBy.map((row) => `${row.id} paid $${(row.paid / 100).toFixed(2)}`).join(", ")}; ${treasury!.name} took in $${(feeMinor / 100).toFixed(2)}; filing ${result.status}\n`,
    );
  } finally {
    setBookkeeping(was);
  }
}, 300_000);
