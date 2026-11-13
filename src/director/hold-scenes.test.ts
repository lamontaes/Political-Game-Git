import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { billOf, memberKey, members } from "../core2/modules/legislature";
import { townSeats } from "../core2/modules/offices";
import { coreAPI } from "../core2/state";
import { spokenDesignation } from "../english/bill-names";
import { purposeScene } from "./purpose-scene";
import { expectUpToFourDifferent } from "./reply-set-check";

// A committee that holds a bill without a hearing is a scene for the people its
// record names. The legislature records the hold (bill-held-in-committee, with
// the chair); the chair is asked for a hearing by the bill's sponsor, and a
// committee member is asked to press the chair. Both are cast from the record
// and the bill, and say its number. Places are drawn in turn until one's
// legislature holds a bill.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const DAYS = 90;
/** The bodies whose members the director follows here. */
const WATCHED_LEVELS = ["city", "county", "state"];

it(`a held bill is a hearing ask for the chair, from its record (seed ${seed})`, () => {
  const tried: string[] = [];
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const place = drawPlace(`${seed}:${attempt}`, "hold-scenes");
    setBookkeeping(false);
    const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    for (const row of townSeats(api))
      if (WATCHED_LEVELS.includes(row.office.level))
        for (const term of members(api, row.office.id)) {
          const key = memberKey(term);
          if (core.people.get(key)?.alive) director.watch(core, key);
        }
    advanceCore(core, addDays(makeIsoDate(core.date), DAYS));
    // The holds of the bodies watched above (city, county, state, the
    // record's own `level`); a federal committee's chair and members are
    // officials elsewhere, whom the director here does not follow.
    const all = [...core.durableLog.values()].filter(
      (row) => row.kind === "bill-held-in-committee",
    );
    const holds = all.filter((row) =>
      WATCHED_LEVELS.includes(row.facts?.level ?? ""),
    );
    const where = `${place.name} (${place.key}), seed ${seed}:${attempt}`;
    if (!holds.length) {
      tried.push(
        `${place.name}: ${all.length ? `only ${all.length} hold(s) of a body at another level (${[...new Set(all.map((row) => row.facts?.level))].join(", ")})` : "no hold"}`,
      );
      continue;
    }
    let chairScenes = 0;
    for (const hold of holds) {
      const bill = billOf(api, hold.facts!.billId!);
      const chair = hold.facts!.chair!;
      const sceneFor = (personId: string, typeKey: string) => {
        const entry = director.ledger.people
          .get(personId as never)
          ?.schedule.find((row) => row.momentId.includes(hold.id));
        return {
          entry,
          binding: entry?.bindings.find((row) => row.typeKey === typeKey),
        };
      };
      const check = (personId: string, typeKey: string) => {
        const { entry, binding } = sceneFor(personId, typeKey);
        if (!binding) return false;
        expect(
          binding.roles.find((row) => row.role === "sponsor")!.personIds,
          `${where}: ${hold.id}`,
        ).toEqual([bill.sponsorId]);
        const result = purposeScene(core, director, personId as never, entry!, {
          typeKey,
        });
        expect(result?.kind, `${where}: ${hold.id}`).toBe("composed");
        if (result?.kind !== "composed") return false;
        const said = spokenDesignation(bill.number, bill.form.kind);
        const fact = (key: string) =>
          result.scene.facts.find((row) => row.key === key);
        expect(fact("bill")?.text).toBe(said);
        expect(fact("bill")?.recordIds).toContain(hold.id);
        expect(result.scene.cause.id).toBe(hold.id);
        expect(result.scene.askerId).toBe(bill.sponsorId);
        expect(result.scene.askedId).toBe(personId);
        expect(
          result.scene.talk.lines.some((line) => line.text.includes(said)),
          `${where}: ${personId}`,
        ).toBe(true);
        // Up to four replies, all different stances (owner, Nov 10).
        expectUpToFourDifferent(
          result.scene.talk.tree.replies.map((reply) => reply.line),
          `${where}: ${personId}`,
        );
        return true;
      };
      if (hold.personIds.includes(chair as never) && chair !== bill.sponsorId)
        if (director.ledger.people.has(chair as never))
          if (check(chair, "bill-held-chair")) chairScenes += 1;
      // A chair who heard the bill held nothing: no hold scene cites a hearing.
    }
    expect(
      chairScenes,
      `${where}: no chair was asked for a hearing`,
    ).toBeGreaterThan(0);
    // A bill the committee heard is not held: no hold scene names its record.
    for (const hearing of [...core.durableLog.values()].filter(
      (row) => row.kind === "committee-hearing",
    ))
      for (const book of director.ledger.people.values())
        expect(
          book.schedule.some(
            (row) =>
              row.momentId.includes(hearing.id) &&
              row.bindings.some((b) => b.typeKey.startsWith("bill-held")),
          ),
        ).toBe(false);
    return;
  }
  throw new Error(`no place held a bill in ${DAYS} days: ${tried.join(", ")}`);
}, 600_000);
