import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  BRIBE_OFFERED,
  SCANDAL_REPORTED,
  considerBribe,
} from "../core2/modules/corruption";
import { OFFICES_MODULE_ID, type TermRow } from "../core2/modules/offices";
import { P } from "../core2/parameters";
import { advancePlayerV1, resumePlayerV1 } from "../core2/player-v1";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import { composeScene } from "./scene";
import { purposeScene } from "./purpose-scene";
import { SITUATION_LIBRARY } from "./scheduling";
import type { Director } from "./ledger";

// Four scene kinds that had no way to start (return, apology, accusation,
// advice) now start from records the engines already write, each proven in a
// played world (`buildBenchWorld`, two-level) in a place drawn from all 56.
// The seed is fresh each run (GOLDEN_PATH_SEED pins one) except for the
// return, which waits on a release the justice engine writes only when a
// sentence ends: that one replays the place and seed the record count found
// it in (scripts/dialogue-batch/event-count.ts, seed "storydead:0").
//
//   return      justice.released (justice): a person comes home from prison
//   apology     floor-debate (legislature): the member who argued the other side
//   accusation  scandal.reported (corruption): someone close asks if it is true
//   advice      party-asked (candidacy): a known officeholder weighs in on running
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const DAY_PATTERN =
  /\d{4}-\d{2}-\d{2}|\b[a-z]+[-.:][a-z-]+:|\{|\}|undefined|\d{5,}/;

type Core = CoreState;

/**
 * Plays `personId` as the controlled person through `through`, taking each
 * scene's first offered choice, and hands every staged entry to `seen`.
 * Returns when the clock reaches the date or `seen` says stop.
 */
function playThrough(
  core: Core,
  director: Director,
  personId: PersonId,
  through: string,
  seen: (stop: { recordId: string }) => boolean,
): void {
  let packet = advancePlayerV1(core, {
    controlledPersonId: personId,
    through: { date: through as never, minuteOfDay: P.zero },
  });
  while (packet.kind !== "complete") {
    if (packet.kind === "stop") {
      for (const stop of packet.stop.modules) if (seen(stop)) return;
      packet = resumePlayerV1(core, { kind: "stop", pauseId: packet.pauseId });
    } else
      packet = resumePlayerV1(core, {
        kind: "choice",
        pauseId: packet.pauseId,
        offerId: packet.offers[P.zero]!.offerId,
      });
  }
  void director;
}

function clean(text: string, here: string) {
  expect(text, here).not.toMatch(DAY_PATTERN);
}

describe("the dead scene kinds start from records an engine writes", () => {
  it(`the return: a person released from prison comes home to their kin (DC, seed storydead:0)`, () => {
    setBookkeeping(false);
    const place = drawPlace("storydead:0", "event-count");
    const where = `${place.name} (${place.key}), seed storydead:0`;
    const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    // The bribery sentences of the town's first year end after the court's
    // custody months: the justice engine writes the release on the day.
    advanceCore(core, addDays(makeIsoDate(core.date), 200));
    const sentenced = [...(core.logByKind.get("justice.imprisoned") ?? [])]
      .map((id) => core.durableLog.get(id as never)!)
      .filter((row) => row.personIds.some((id) => core.people.has(id)));
    expect(sentenced.length, `${where}: sentences`).toBeGreaterThan(0);
    let lastRelease = core.date as string;
    for (const row of sentenced) {
      const released = row.facts?.releaseDate;
      if (released && released > lastRelease) lastRelease = released;
      for (const id of row.personIds)
        if (core.people.has(id)) {
          director.watch(core, id);
          for (const kin of core.people.get(id)!.familyIds)
            if (core.people.has(kin)) director.watch(core, kin);
        }
    }
    advanceCore(core, addDays(makeIsoDate(lastRelease as never), 3));
    const releases = [...(core.logByKind.get("justice.released") ?? [])]
      .map((id) => core.durableLog.get(id as never)!)
      .filter((row) => row.personIds.some((id) => core.people.has(id)));
    expect(
      releases.length,
      `${where}: a release in the record`,
    ).toBeGreaterThan(0);
    let scenes = 0;
    for (const [personId, book] of director.ledger.people)
      for (const entry of book.schedule) {
        const binding = entry.bindings.find((row) => row.typeKey === "return");
        if (!binding) continue;
        const moment = book.momentsById.get(entry.momentId)!;
        const here = `${where}: ${personId}, ${moment.causeId}`;
        expect(moment.causeId, here).toMatch(/^justice\.released:/);
        expect(core.durableLog.get(moment.causeId)?.kind, here).toBe(
          "justice.released",
        );
        const returning = binding.roles.find((row) => row.role === "returning");
        const waiting = binding.roles.find((row) => row.role === "waiting");
        expect(returning?.personIds.length, here).toBe(1);
        expect(waiting?.personIds.length, here).toBeGreaterThan(0);
        // The released person is in the record; the waiting are not them.
        expect(core.durableLog.get(moment.causeId)!.personIds, here).toContain(
          returning!.personIds[0],
        );
        expect(waiting!.personIds, here).not.toContain(returning!.personIds[0]);
        const scene = composeScene(core, director, personId, entry);
        expect(scene, here).toBeTruthy();
        const lead = scene!.narration.map((row) => row.text);
        expect(lead.length, here).toBeGreaterThan(0);
        for (const text of lead) clean(text, here);
        if (!scenes)
          process.stdout.write(`RETURN ${here}\n  ${lead.join(" / ")}\n`);
        scenes += 1;
      }
    expect(
      scenes,
      `${where}: a return scene for ${releases[0]!.id}`,
    ).toBeGreaterThan(0);
  }, 3_600_000);

  it(`the apology: the member who argued the other side comes to the player after a floor debate (seed ${seed})`, () => {
    setBookkeeping(false);
    const tried: string[] = [];
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const place = drawPlace(`${seed}:${attempt}`, "dead-kinds-apology");
      const where = `${place.name} (${place.key}), seed ${seed}:${attempt}`;
      const open = () =>
        buildBenchWorld(place.seed, gameStartDate(), {
          twoLevel: true,
          placeKey: place.key,
        });
      // The first floor debate that names two full people who live in town:
      // the first of them is the one played.
      const first = open();
      advanceCore(first.core, addDays(makeIsoDate(first.core.date), 60));
      const town = first.core.people.get(first.core.playerId!)?.placeId;
      const debate = [...(first.core.logByKind.get("floor-debate") ?? [])]
        .map((id) => first.core.durableLog.get(id as never)!)
        .find((row) =>
          row.personIds.every(
            (id) =>
              first.core.people.get(id)?.alive === true &&
              first.core.people.get(id)?.placeId === town,
          ),
        );
      if (!debate) {
        tried.push(`${where}: no floor debate between two full residents`);
        continue;
      }
      const meId = debate.personIds[P.zero] as PersonId;
      const { core, director } = open();
      core.focusPersonIds.add(meId);
      director.watch(core, meId);
      const book = director.ledger.people.get(meId)!;
      let found = 0;
      playThrough(
        core,
        director,
        meId,
        addDays(makeIsoDate(debate.date), 5),
        (stop) => {
          const entry = book.schedule.find(
            (row) => row.momentId === stop.recordId,
          );
          const moment = book.momentsById.get(stop.recordId);
          if (
            !entry ||
            !moment ||
            !entry.bindings.some((row) => row.typeKey === "apology")
          )
            return false;
          const result = purposeScene(core, director, meId, entry, {
            typeKey: "apology",
          });
          if (result?.kind !== "composed") return false;
          const here = `${where}: ${moment.causeId}`;
          const { scene } = result;
          expect(scene.purpose, here).toBe("owed-apology");
          const cause = core.durableLog.get(moment.causeId);
          expect(cause?.kind, here).toBe("floor-debate");
          expect(cause?.personIds, here).toContain(meId);
          // The wronged is the other side of the same debate.
          expect(cause?.personIds, here).toContain(scene.askerId);
          expect(scene.askerId, here).not.toBe(meId);
          const root = scene.talk.tree.replies.map((reply) => reply.line);
          expect(new Set(root.map((row) => row.move)), here).toEqual(
            new Set(["apologize", "tell", "deflect", "confront"]),
          );
          for (const row of [scene.talk.state, ...root]) clean(row.text, here);
          process.stdout.write(`APOLOGY ${here}\n  ${scene.talk.state.text}\n`);
          found += 1;
          return true;
        },
      );
      if (found) return;
      tried.push(`${where}: no apology scene after ${debate.id}`);
    }
    throw new Error(`no apology scene: ${tried.join("; ")} (seed ${seed})`);
  }, 3_600_000);

  it(`the accusation: someone close asks whether the reported bribe is true (seed ${seed})`, () => {
    setBookkeeping(false);
    const tried: string[] = [];
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const place = drawPlace(`${seed}:${attempt}`, "dead-kinds-accusation");
      const where = `${place.name} (${place.key}), seed ${seed}:${attempt}`;
      const { core, director, playerId } = buildBenchWorld(
        place.seed,
        gameStartDate(),
        { twoLevel: true, placeKey: place.key },
      );
      const api = coreAPI(core);
      const me = playerId as PersonId;
      core.focusPersonIds.add(me);
      director.watch(core, me);
      const book = director.ledger.people.get(me)!;
      // The player's day starts, so the director reads them as the controlled person.
      advancePlayerV1(core, {
        controlledPersonId: me,
        through: {
          date: addDays(makeIsoDate(core.date), 1) as never,
          minuteOfDay: P.zero,
        },
      });
      const adults = [...core.people.values()]
        .filter(
          (person) =>
            person.alive &&
            person.tier !== "husk" &&
            person.id !== me &&
            person.birthDate <= "2000-01-01",
        )
        .sort(
          (a, b) => b.liquidMinor - a.liquidMinor || a.id.localeCompare(b.id),
        )
        .slice(0, 80);
      let reported: string | undefined;
      let offers = 0;
      for (const offerer of adults) {
        const record = considerBribe(api, {
          offererId: offerer.id,
          officialId: me,
          stakeMinor: 50000000,
          subjectId: `fixture-contract:${offerer.id}`,
        });
        if (!record?.pending) continue;
        offers += 1;
        // The player takes it in the scene (the reply the scene writes).
        api.emit({
          id: `scene.reply:test:${record.id}`,
          date: core.date,
          kind: "scene.reply",
          personIds: [me, offerer.id],
          placeId: core.people.get(me)!.placeId,
          facts: {
            typeKey: "bribe-offer",
            causeId: `${BRIBE_OFFERED}:${record.id}`,
            ending: "took-it",
          },
          source: { tag: "SOURCED", asOf: core.date, citation: "test" },
        });
        // The briber's favor is not delivered: the corruption engine's own
        // consequence of that is a soured tie (bribe-unrewarded), and a party to
        // a taken bribe whose tie sours may tell someone, who may take it to
        // the press. Nothing here rolls: their traits decide.
        api.relationship(offerer.id, me, "contact", -500, undefined, {
          cause: "bribe-unrewarded",
          sourceId: record.id,
        });
        const out = [...(core.logByKind.get(SCANDAL_REPORTED) ?? [])]
          .map((id) => core.durableLog.get(id as never)!)
          .find((row) => row.facts?.crimeId === record.id);
        if (out) {
          reported = out.id;
          break;
        }
      }
      if (!reported) {
        tried.push(`${where}: ${offers} bribes taken, none reached the press`);
        continue;
      }
      let found = 0;
      playThrough(
        core,
        director,
        me,
        addDays(makeIsoDate(core.date), 4),
        (stop) => {
          const entry = book.schedule.find(
            (row) => row.momentId === stop.recordId,
          );
          const moment = book.momentsById.get(stop.recordId);
          if (
            !entry ||
            !moment ||
            !entry.bindings.some((row) => row.typeKey === "accusation")
          )
            return false;
          const result = purposeScene(core, director, me, entry, {
            typeKey: "accusation",
          });
          if (result?.kind !== "composed") return false;
          const here = `${where}: ${moment.causeId}`;
          const { scene } = result;
          expect(scene.purpose, here).toBe("conflict-accuse");
          expect(moment.causeId, here).toBe(reported);
          expect(scene.askerId, here).not.toBe(me);
          const asker = core.people.get(scene.askerId)!;
          expect(
            asker.knownIds.has(me) ||
              core.people.get(me)!.knownIds.has(asker.id),
            here,
          ).toBe(true);
          const root = scene.talk.tree.replies.map((reply) => reply.line);
          expect(new Set(root.map((row) => row.move)), here).toEqual(
            new Set(["tell", "deny", "confront", "offer", "lie"]),
          );
          for (const row of [scene.talk.state, ...root]) clean(row.text, here);
          process.stdout.write(
            `ACCUSATION ${here}\n  ${scene.talk.state.text}\n`,
          );
          found += 1;
          return true;
        },
      );
      if (found) return;
      tried.push(`${where}: no accusation scene after ${reported}`);
    }
    throw new Error(`no accusation scene: ${tried.join("; ")} (seed ${seed})`);
  }, 3_600_000);

  it(`the advice: a known officeholder weighs in the day after a party asks the player to run (seed ${seed})`, () => {
    setBookkeeping(false);
    const tried: string[] = [];
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const place = drawPlace(`${seed}:${attempt}`, "dead-kinds-advice");
      const where = `${place.name} (${place.key}), seed ${seed}:${attempt}`;
      const open = () =>
        buildBenchWorld(place.seed, gameStartDate(), {
          twoLevel: true,
          placeKey: place.key,
        });
      // A member a party asks to run who knows someone holding a seat: the
      // first of them, from an uncontrolled replay of the filing season.
      const first = open();
      const holders = (core: Core) => {
        const terms = coreAPI(core)
          .moduleState(OFFICES_MODULE_ID)
          .table("terms");
        return (id: PersonId) =>
          (terms.query("byPerson", [id]) as unknown as TermRow[]).some(
            (term) => term.status === "serving",
          );
      };
      let asked: { id: string; date: string; meId: PersonId } | undefined;
      for (let month = 0; month < 12 && !asked; month += 1) {
        advanceCore(first.core, addDays(makeIsoDate(first.core.date), 30));
        const holds = holders(first.core);
        asked = [...(first.core.logByKind.get("party-asked") ?? [])]
          .map((id) => first.core.durableLog.get(id as never)!)
          .map((row) => ({
            id: row.id,
            date: row.date,
            meId: row.personIds[P.zero] as PersonId,
          }))
          .find(
            ({ meId }) =>
              first.core.people.get(meId)?.alive === true &&
              [...first.core.people.get(meId)!.knownIds].some(holds),
          );
      }
      if (!asked) {
        tried.push(`${where}: no asked member who knows an officeholder`);
        continue;
      }
      const { core, director } = open();
      core.focusPersonIds.add(asked.meId);
      director.watch(core, asked.meId);
      const book = director.ledger.people.get(asked.meId)!;
      let found = 0;
      playThrough(
        core,
        director,
        asked.meId,
        addDays(makeIsoDate(asked.date), 6),
        (stop) => {
          const entry = book.schedule.find(
            (row) => row.momentId === stop.recordId,
          );
          const moment = book.momentsById.get(stop.recordId);
          if (
            !entry ||
            !moment ||
            !entry.bindings.some((row) => row.typeKey === "advice")
          )
            return false;
          const result = purposeScene(core, director, asked!.meId, entry, {
            typeKey: "advice",
          });
          if (result?.kind !== "composed") return false;
          const here = `${where}: ${moment.causeId}`;
          const { scene } = result;
          expect(scene.purpose, here).toBe("mentor-advice");
          expect(moment.causeId, here).toBe(asked!.id);
          expect(core.durableLog.get(moment.causeId)?.kind, here).toBe(
            "party-asked",
          );
          // The adviser holds a seat and the player knows them.
          expect(holders(core)(scene.askerId as PersonId), here).toBe(true);
          expect(
            core.people
              .get(asked!.meId)!
              .knownIds.has(scene.askerId as PersonId),
            here,
          ).toBe(true);
          const root = scene.talk.tree.replies.map((reply) => reply.line);
          expect(new Set(root.map((row) => row.move)), here).toEqual(
            new Set(["ask", "disagree", "thank", "tell"]),
          );
          for (const row of [scene.talk.state, ...root]) clean(row.text, here);
          process.stdout.write(`ADVICE ${here}\n  ${scene.talk.state.text}\n`);
          found += 1;
          return true;
        },
      );
      if (found) return;
      tried.push(`${where}: no advice scene after ${asked.id}`);
    }
    throw new Error(`no advice scene: ${tried.join("; ")} (seed ${seed})`);
  }, 3_600_000);

  it("keeps the four kinds off the waiting list", () => {
    const keys = ["return", "apology", "accusation", "advice"];
    for (const key of keys) {
      const type = SITUATION_LIBRARY.types.find((row) => row.key === key)!;
      expect(type.causes.length, key).toBeGreaterThan(0);
      expect(
        type.causes.every((cause) => !cause.awaitingProducer),
        key,
      ).toBe(true);
    }
  });
});
