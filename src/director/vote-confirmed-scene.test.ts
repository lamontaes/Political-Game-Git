import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { memberKey, members } from "../core2/modules/legislature";
import { townSeats } from "../core2/modules/offices";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { purposeScene } from "./purpose-scene";
import { SITUATION_LIBRARY } from "./scheduling";

// A vote traded in committee comes due on the floor. When a holdout traded
// their vote for their own section at the committee's markup, the legislature
// records it again on the floor day (vote-promise), and the bill's sponsor
// comes to the member to make sure of the vote they promised: the member's
// vote-confirmed scene, about that bill. Places are drawn in turn until one's
// legislators who are full people made a committee trade that reached the floor.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const DAYS = 90;
const ATTEMPTS = 4;

it(`a vote traded in committee is the member's vote-confirmed scene on the floor day, with the sponsor (seed ${seed})`, () => {
  const tried: string[] = [];
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const place = drawPlace(`${seed}:${attempt}`, "vote-confirmed-scene");
    const where = `${place.name} (${place.key}), seed ${seed}:${attempt}`;
    setBookkeeping(false);
    const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    // The town's, county's and state's legislators who are full people.
    for (const row of townSeats(api))
      if (["city", "county", "state"].includes(row.office.level))
        for (const term of members(api, row.office.id)) {
          const key = memberKey(term);
          if (core.people.get(key)?.alive) director.watch(core, key);
        }
    advanceCore(core, addDays(makeIsoDate(core.date), DAYS));
    // The promises of watched members to sponsors who are full people.
    const promises = [...core.durableLog.values()].filter(
      (row) =>
        row.kind === "vote-promise" &&
        director.ledger.people.has(String(row.facts?.memberId) as PersonId) &&
        core.people.has(String(row.facts?.sponsorId) as PersonId),
    );
    if (!promises.length) {
      tried.push(place.name);
      continue;
    }
    for (const promise of promises) {
      const memberId = String(promise.facts!.memberId) as PersonId;
      const sponsorId = String(promise.facts!.sponsorId);
      const here = `${where}: ${promise.id}`;
      const book = director.ledger.people.get(memberId)!;
      const entry = book.schedule.find((row) =>
        row.momentId.includes(promise.id),
      );
      const binding = entry?.bindings.find(
        (row) => row.typeKey === "vote-confirmed",
      );
      if (!binding) {
        // One sitting covers a day for the same people, and the same scene
        // with the same people is not staged again within the repeat window
        // (scheduling.ts): this sponsor already came asking after a promise
        // of this member's, that day or within the window.
        const from = addDays(
          makeIsoDate(promise.date),
          -SITUATION_LIBRARY.scheduling.repeatDays,
        );
        const asked = book.schedule.find(
          (row) =>
            row !== entry &&
            row.date <= promise.date &&
            row.date > from &&
            row.bindings.some(
              (other) =>
                other.typeKey === "vote-confirmed" &&
                other.roles
                  .find((role) => role.role === "colleague")!
                  .personIds.includes(sponsorId as PersonId),
            ),
        );
        expect(asked, `${here}: no vote-confirmed scene`).toBeTruthy();
        continue;
      }
      expect(
        binding.roles.find((row) => row.role === "colleague")!.personIds,
        here,
      ).toEqual([sponsorId]);
      expect(binding.setting, here).toEqual({
        kind: "office",
        recordId: promise.facts!.officeId,
      });
      // The sponsor asks after the promise, in the lines that play, as
      // ordinary play says them, and the talk stands on the record.
      const result = purposeScene(core, director, memberId, entry!);
      expect(result?.kind, here).toBe("composed");
      if (result?.kind !== "composed") continue;
      expect(result.scene.cause.id, here).toBe(promise.id);
      expect(
        result.scene.facts.find((row) => row.key === "your-promise")?.recordIds,
        here,
      ).toContain(promise.id);
      const bill = result.scene.facts.find((row) => row.key === "bill")!;
      expect(bill.recordIds, here).toContain(promise.id);
      expect(result.scene.talk.state.text, here).toContain(bill.text);
      // The setup says the member promised the vote.
      expect(
        result.scene.talk.narration.map((line) => line.text).join(" "),
        here,
      ).toMatch(/promised|told/);
    }
    return;
  }
  throw new Error(
    `no committee trade by a watched member reached the floor in ${DAYS} days in ${tried.join("; ")} (seed ${seed})`,
  );
}, 3_600_000);
