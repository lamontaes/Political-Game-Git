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

/** Places are drawn in turn until one has a press person, a seated local office, and a rule that fills it by appointment. */
const DRAWS = 8;

/** One drawn place: every press person is made the best-suited resident, a local holder moves away, and the replacement is read. Undefined where there is nothing to vacate or the rule holds an election instead of appointing. */
function attempt(draw: number) {
  const drawSeed = `${seed}-${draw}`;
  const place = drawPlace(drawSeed, "vacancy-press");
  const world = buildBenchWorld(drawSeed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const core = world.core;
  const api = coreAPI(core);
  // A day in, so the press has opened its books (the staff index is a day's).
  advanceCore(core, addDays(makeIsoDate(core.date), 2));
  const press = [...core.people.values()].filter(
    (p) => p.alive && p.tier !== "husk" && pressConflict(api, p.id),
  );
  const held = townSeats(api).filter(
    (s) =>
      s.holder?.personId &&
      ["city", "county", "township"].includes(s.office.level) &&
      s.office.elected,
  );
  if (!press.length || !held.length) return undefined;
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
  ).find((v) => v.seatId === seat.id);
  const where = `${place.name} (${place.key}), seed ${drawSeed}, seat ${seat.id}`;
  expect(vacancy, `${where}: no vacancy recorded`).toBeDefined();
  if (vacancy!.status !== "filled" || !vacancy!.filledBy) return undefined;
  // The vacancy names the term that filled the seat; the term names the person.
  const term = api
    .moduleState(OFFICES_MODULE_ID)
    .table("terms")
    .get(vacancy!.filledBy) as unknown as { personId?: string } | undefined;
  const replacement = term?.personId;
  expect(
    replacement,
    `${where}: term ${vacancy!.filledBy} names no one`,
  ).toBeDefined();
  expect(replacement, where).not.toBe(personId);
  expect(core.people.has(replacement!), `${where}: ${replacement}`).toBe(true);
  // Whoever filled the seat, they are not a reporter, an editor or an outlet's owner.
  expect(pressConflict(api, replacement!), where).toBeNull();
  return `${where}: vacancy ${vacancy!.id} filled by ${vacancy!.filledBy} (person ${replacement}), ${press.length} press people passed over`;
}

describe("a vacated seat", () => {
  it("is never filled by a reporter, an editor or an outlet's owner", () => {
    let proof: string | undefined;
    for (let draw = 0; draw < DRAWS && !proof; draw++) proof = attempt(draw);
    expect(
      proof,
      `none of ${DRAWS} drawn places (seed ${seed}) had a press person and a local seat the rule fills by appointment`,
    ).toBeDefined();
    console.log(`WIRED ${proof}`);
  }, 1_800_000);
});
