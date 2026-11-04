/** Term fixtures test the reader; they are not natural-election proof. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { appliedOn } from "./law-reach/applied";
import { lobbyingBarredUntil } from "./law-reach/group-a-voting";
import { LOBBYING_BAN } from "./law-reach/voting-keys";
import { yesLevels } from "./modules/laws";
import { OFFICES_MODULE_ID, townSeats, type TermRow } from "./modules/offices";
import { POLICY_QUESTIONS } from "./policy-answers";
import { coreAPI } from "./state";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it(`continuous service is not a departure; a real gap uses the law's period (${replay})`, () => {
  setBookkeeping(false);
  const passed: string[] = [];
  for (let draw = 0; draw < 30; draw++) {
    const place = drawPlace(`${replay}:${draw}`, "lobbying-departure");
    const answer = POLICY_QUESTIONS[LOBBYING_BAN]!.answers[place.state];
    const period = answer?.lawTerms?.find(
      (t) => t.key === "period" && t.unit === "years",
    );
    if (answer?.answer !== "yes" || !period) {
      passed.push(`${place.name}: no researched numeric ban`);
      continue;
    }
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const core = world.core;
    const api = coreAPI(core);
    const resident = townSeats(api).find(
      ({ holder }) =>
        holder?.personId &&
        core.people.get(holder.personId)?.placeId === world.placeId,
    );
    if (!resident?.holder?.personId) {
      passed.push(`${place.name}: no resident officeholder`);
      continue;
    }
    const original = resident.holder;
    const personId = original.personId!;
    expect(core.people.get(personId)?.placeId).toBe(world.placeId);
    const law = yesLevels(api, LOBBYING_BAN).find(
      (l) => l.jurisdiction === place.state,
    );
    expect(law, `${place.name}: standing law`).toBeDefined();
    expect(law!.row.terms?.lawTerms).toBeDefined();
    expect(law!.row.terms!.lawTerms).toContainEqual(period);
    const table = api.moduleState(OFFICES_MODULE_ID).table("terms");
    const oldEnd = addDays(makeIsoDate(core.date), -2);
    const old: TermRow = {
      ...original,
      id: "fixture:old",
      startDate: addDays(oldEnd, -365),
      endDate: oldEnd,
      status: "ended",
      endedBy: "term ended",
    };
    const next: TermRow = {
      ...original,
      id: "fixture:next",
      startDate: oldEnd,
      endDate: null,
      status: "serving",
    };
    const put = (...rows: TermRow[]) => {
      for (const row of table.query("byPerson", [personId]))
        table.remove(row.id);
      for (const row of rows) table.put({ ...row });
    };
    put(old, next);
    expect(
      lobbyingBarredUntil(api, personId),
      "re-election is continuous",
    ).toBeNull();
    put(old, { ...next, seatId: `${next.seatId}:other-seat` });
    expect(
      lobbyingBarredUntil(api, personId),
      "another seat in the same office",
    ).toBeNull();

    // This date is in January, so adding even the six-month law has no
    // month-end ambiguity. Expected duration comes from the research row.
    const expected = new Date(`${oldEnd}T00:00:00Z`);
    expected.setUTCMonth(expected.getUTCMonth() + period.value * 12);
    const until = expected.toISOString().slice(0, 10);
    put(old, { ...next, startDate: addDays(oldEnd, 1) });
    expect(
      lobbyingBarredUntil(api, personId),
      "a later return does not erase the gap",
    ).toBe(until);
    const reach = appliedOn(api, LOBBYING_BAN).find(
      (r) => r.targetId === personId,
    );
    expect(reach?.lawId).toBe(law!.lawId);
    expect(reach?.target).toBe("person");
    put(old, { ...next, officeId: `${next.officeId}:other-office` });
    expect(
      lobbyingBarredUntil(api, personId),
      "a different office is not continuation",
    ).toBe(until);
    put({ ...old, endedBy: "re-elected" }, next);
    expect(
      lobbyingBarredUntil(api, personId),
      "opening's explicit re-election",
    ).toBeNull();
    expect(
      appliedOn(api, LOBBYING_BAN).some((r) => r.targetId === personId),
    ).toBe(false);
    put(old);
    expect(lobbyingBarredUntil(api, personId), "actual departure").toBe(until);
    process.stdout.write(
      `LOBBY ${place.name} (${place.key}), replay ${replay}, world ${place.seed}: person ${personId}; law ${law!.lawId}; period ${period.value} years; departure ${oldEnd}; barred until ${until}; passed over ${JSON.stringify(passed)}\n`,
    );
    return;
  }
  throw new Error(`No resident under a researched ban: ${passed.join("; ")}`);
});
