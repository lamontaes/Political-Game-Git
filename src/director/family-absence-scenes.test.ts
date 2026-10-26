import { createHash, randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { DEPARTURE_FACT, MOVED_AWAY_EVENT } from "../core2/modules/moves";
import { openConversation } from "./conversation";
import { composeScene } from "./scene";

// A household member's absence is a scene when a record explains it (owner,
// Oct 25): a member who moves away is told at home by someone still in the
// house, citing the move's own record, and the talk raises it with four
// replies. A news scene never stands without the record that earns it.
// Places are drawn in turn until a year of one has a move out of a watched
// household that leaves someone at home to tell it.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const DRAWS = 6;
const DAYS = 365;
const STEP = 30;

it(`a member who moves away is told at home in one scene citing the move (seed ${seed})`, () => {
  const tried: string[] = [];
  for (let life = 0; life < DRAWS; life += 1) {
    const place = drawPlace(
      createHash("sha256").update(`${seed}:${life}`).digest("hex"),
      "family-absence",
    );
    setBookkeeping(false);
    const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    // Every member of a household of three or more, so someone stays to tell.
    for (const household of core.households.values())
      if (household.memberIds.length >= 3)
        for (const id of household.memberIds)
          if (core.people.get(id)?.alive) director.watch(core, id);
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const end = addDays(gameStartDate(), DAYS);
    for (let day = STEP; ; day += STEP) {
      advanceCore(core, addDays(gameStartDate(), Math.min(day, DAYS)));
      for (const [personId, book] of director.ledger.people)
        for (const entry of book.schedule) {
          const moment = book.momentsById.get(entry.momentId);
          if (!moment || moment.label !== `feeling:event:${MOVED_AWAY_EVENT}`)
            continue;
          const record = core.durableLog.get(moment.causeId);
          const departure = JSON.parse(
            String(record?.facts?.[DEPARTURE_FACT] ?? "{}"),
          ) as { householdId?: string; withIds?: string[] };
          const home = core.people.get(personId)?.householdId;
          if (departure.householdId !== home || !home) continue;
          const binding = entry.bindings.find(
            (row) => row.typeKey === "news-arrives",
          );
          const at = `${where}, ${personId}, ${moment.causeId}`;
          // One scene now, at home, about the one who left, told by someone
          // still in the house.
          expect(binding, at).toBeDefined();
          expect(entry.outcome, at).toBe("scene-now");
          const about = binding!.roles.find((r) => r.role === "about")!;
          expect(departure.withIds, at).toContain(about.personIds[0]);
          const bearer = binding!.roles.find((r) => r.role === "bearer")!
            .personIds[0]!;
          // The bearer stayed: they are not among those who left, nor the
          // one being told (they may move later in the year themselves).
          expect(departure.withIds, at).not.toContain(bearer);
          expect(bearer, at).not.toBe(personId);
          // The scene stands on the move's record and cites it.
          const scene = composeScene(core, director, personId, entry)!;
          expect(scene.typeKey, at).toBe("news-arrives");
          expect(
            scene.narration.flatMap((line) => line.sourceRecordIds),
            at,
          ).toContain(moment.causeId);
          const narration = scene.narration.map((line) => line.text).join(" ");
          expect(narration, at).not.toMatch(/\{|\}|undefined/);
          // The one at home raises the move by the family record, with four
          // replies to answer it.
          const talk = openConversation(core, personId, bearer, {
            director,
            occasionId: entry.momentId,
          });
          const said = talk.lines.map((line) => line.text);
          expect(
            said.some((line) => /moved (away|out of town)/.test(line)),
            `${at}: ${said.join(" / ")}`,
          ).toBe(true);
          expect(talk.choices.length, at).toBe(4);
          // Every news scene in the year stands on a record.
          for (const other of director.ledger.people.values())
            for (const row of other.schedule)
              if (row.bindings.some((b) => b.typeKey === "news-arrives")) {
                const cause = other.momentsById.get(row.momentId)?.causeId;
                expect(
                  Boolean(
                    cause &&
                    (core.durableLog.has(cause) || core.jobs.has(cause)),
                  ),
                  `${where}: ${row.momentId} has no cause record`,
                ).toBe(true);
              }
          process.stdout.write(
            `FAMILY ABSENCE ${at}: ${narration} ${said.join(" ")} [${talk.choices.map((c) => c.text).join(" | ")}]\n`,
          );
          return;
        }
      if (day >= DAYS || core.date >= end) break;
    }
    tried.push(`${where}: no move out of a watched household`);
  }
  throw new Error(
    `no drawn place had a move out of a watched household in a year: ${tried.join("; ")}`,
  );
}, 3_600_000);
