/**
 * A tie's lost hours run from the last day the two were together anywhere: a
 * talk on their row, or a sitting both sat (pool:
 * people-tie-lost-hours-ignore-sittings-since). Before, the row's part ran
 * from the row's last contact even when the two had sat together since, so a
 * colleague with an old talk on record pulled as if unseen for weeks.
 *
 * Drawn places: the case is any pair of colleagues on a state body whose
 * tie row's last contact is earlier than a sitting they have both sat since
 * (`lastTogether`). It is a relationship between two readings of the same
 * pair, so no number is pinned: the tie's lost hours are less than the row's
 * own from its last contact (what the old form read), and a pair whose last
 * day together is the row's own reads the row's. A place with no such pair
 * by the end of February (or only on that day itself) is named and passed over.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { hoursLost, lastTogether, tieHoursLost } from "./closeness";
import { gameStartDate } from "./game-start";
import { makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { bodyOf, memberKey, members } from "./modules/legislature";
import { townSeats } from "./modules/offices";
import { coreAPI, fillInPerson } from "./state";
import type { PersonId } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
process.stdout.write(`tie-lost-since-sitting: seed ${seed}\n`);

it("a colleague who sat with you since your last talk is missed from that sitting, not from the talk", () => {
  setBookkeeping(false);
  const passed: string[] = [];
  for (let draw = 0; draw < 12; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "tie-lost-since-sitting");
    const where = `${place.name} (${place.key}), draw ${seed}:${draw}`;
    process.stdout.write(`tie-lost-since-sitting: looking at ${where}\n`);
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const seat = townSeats(api).find(
      (r) =>
        r.office.level === "state" &&
        bodyOf(api, r.office.id) &&
        members(api, r.office.id).length >= 3 &&
        members(api, r.office.id).every((t) => t.personId),
    );
    if (!seat) {
      passed.push(`${where}: no state body with three seated members`);
      continue;
    }
    const ids = members(api, seat.office.id).map(memberKey).sort();
    for (const id of ids) fillInPerson(core, id);
    core.playerId = ids[0] as PersonId;
    advanceCore(core, makeIsoDate("2025-02-28"));
    let found: { a: PersonId; b: PersonId; last: string } | null = null;
    for (const x of ids)
      for (const y of ids) {
        if (x >= y || found) continue;
        const row = core.relationships.get(`${x}:${y}`);
        const last = lastTogether(core, x as PersonId, y as PersonId);
        if (row && last && last > row.lastContactDate && last < core.date)
          found = { a: x as PersonId, b: y as PersonId, last };
      }
    if (!found) {
      passed.push(
        `${where}: no pair sat together since their last talk and not today`,
      );
      continue;
    }
    const key = `${found.a}:${found.b}`;
    const row = core.relationships.get(key)!;
    const fromTalk = hoursLost(core, row);
    const tie = tieHoursLost(core, found.a, found.b);
    // The same tie with its row taken away leaves what the sittings alone
    // lost; the rest is the row's part of the tie.
    core.relationships.delete(key);
    const sittingsAlone = tieHoursLost(core, found.a, found.b);
    core.relationships.set(key, row);
    const rowPart = tie - sittingsAlone;
    process.stdout.write(
      `tie-lost-since-sitting: used ${where}; ${found.a} and ${found.b}, last talk ${row.lastContactDate}, last sitting ${found.last}, row's own ${fromTalk}, the tie's row part ${rowPart}; passed over ${passed.length}: ${passed.join("; ") || "none"}\n`,
    );
    // The row's part runs from the sitting, not the talk: less than the row's
    // own from its last contact, and still a loss since the sitting.
    expect(
      rowPart,
      `${where}: the row's part is missed from the sitting, not the talk`,
    ).toBeLessThan(fromTalk);
    expect(rowPart, where).toBeGreaterThan(0);
    return;
  }
  throw new Error(
    `no drawn place had colleagues who sat together since their last talk (seed ${seed}): ${passed.join("; ")}`,
  );
}, 900_000);
