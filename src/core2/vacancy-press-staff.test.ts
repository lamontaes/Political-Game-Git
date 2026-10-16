/**
 * A vacated local seat is not filled by the press, in the world the owner
 * plays: the bench world, a place and seed nobody chose, every module
 * installed. The town's reporters, editors and outlet owners live there and
 * would otherwise be among the best-suited residents; the rule that keeps
 * them off the ballot keeps them out of the appointment too. To make the
 * check bite, every one of them is made the best-suited resident in town
 * before the seat is vacated.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { MOVED_AWAY_EVENT } from "./modules/moves";
import {
  townSeats,
  OFFICES_MODULE_ID,
  type VacancyRow,
} from "./modules/offices";
import { pressConflict } from "./press-conflict";
import { coreAPI } from "./state";
import { drawPlace } from "../../scripts/core2-year/place";

const seed = process.env.VACANCY_PRESS_SEED || randomBytes(8).toString("hex");
const place = drawPlace(seed, "vacancy-press");
console.log(`vacancy-press-staff: ${place.name} (${place.key}), seed ${seed}`);
const world = buildBenchWorld(seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
const core = world.core;
const api = coreAPI(core);
// A day in, so the press has opened its books (the staff index is a day's).
advanceCore(core, addDays(makeIsoDate(core.date), 2));

describe(`a vacated seat (${place.name}, seed ${seed})`, () => {
  it("is never filled by a reporter, an editor or an outlet's owner", () => {
    const press = [...core.people.values()].filter(
      (p) => p.alive && p.tier !== "husk" && pressConflict(api, p.id),
    );
    const held = townSeats(api).filter(
      (s) =>
        s.holder?.personId &&
        ["city", "county", "township"].includes(s.office.level) &&
        s.office.elected,
    );
    console.log(
      "counts",
      press.length,
      held.length,
      townSeats(api)
        .filter((s) => s.holder?.personId)
        .map(
          (s) => s.office.level + ":" + s.office.kind + ":" + s.office.elected,
        )
        .slice(0, 8)
        .join(","),
    );
    // A place with no press people or no local seat has nothing to check.
    if (!press.length || !held.length) return;
    // They are the best fit for any seat: the most sociable, dutiful and reliable.
    for (const person of press)
      for (const trait of [
        "people-mind-v1:sociability",
        "personality-v1:facet-duty-bound",
        "people-mind-v1:reliability",
      ])
        (person.traits as Record<string, number>)[trait] = 1e6;
    const { seat, holder } = held[0]!;
    const personId = holder!.personId!;
    const elsewhere = core.people.get(personId)!.placeId;
    api.updatePerson(personId, { tier: "husk" });
    api.emit({
      id: `${MOVED_AWAY_EVENT}:${personId}:${core.date}`,
      date: core.date,
      kind: MOVED_AWAY_EVENT,
      personIds: [personId],
      placeId: elsewhere,
      topic: elsewhere,
      source: { tag: "ESTIMATED", citation: "test", asOf: core.date },
      facts: { [`person:${personId}:residence`]: elsewhere },
    });
    const vacancy = (
      api
        .moduleState(OFFICES_MODULE_ID)
        .table("vacancies")
        .rows() as unknown as VacancyRow[]
    ).find((v) => v.seatId === seat.id)!;
    const now = townSeats(api).find((s) => s.seat.id === seat.id)!.holder;
    console.log(
      `seat ${seat.id}: vacancy ${vacancy.status}, holder ${now?.personId ?? "none"}, ${press.length} press people`,
    );
    if (now?.personId) expect(pressConflict(api, now.personId)).toBeNull();
  });
});
