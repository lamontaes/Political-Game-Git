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
import { PARTIES_MODULE_ID } from "../core2/modules/parties";
import { P } from "../core2/parameters";
import { advancePlayerV1, resumePlayerV1 } from "../core2/player-v1";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import { variantArc, variantFamilies } from "./arc-variant";
import { partyOfficeholders } from "./circumstance";
import { purposeScene } from "./purpose-scene";
import type { Director } from "./ledger";
import { expectUpToFourDifferent } from "./reply-set-check";

// Two political scenes start from records the engines already write, each
// proven in a played world: the day after the press carries a taken bribe,
// someone close to the official asks whether it is true (`bribe-accused`), and
// the day after a party asks the player to run, a seated officeholder of that
// party weighs in (`mentor-weighs-in`).

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

const ADVICE_DRAWS = 6;
const DAY_PATTERN =
  /\d{4}-\d{2}-\d{2}|\b[a-z]+[-.:][a-z-]+:|\{|\}|undefined|\d{5,}/;
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

/** Whether any party in town has a seated officeholder who has held a seat a year or more (read from the records). */
function partyHasVeteran(core: CoreState): boolean {
  if (!core.modules.has(PARTIES_MODULE_ID)) return false;
  return (
    coreAPI(core)
      .moduleState(PARTIES_MODULE_ID)
      .table("parties")
      .rows() as unknown as { id: string; leaderId: string | null }[]
  ).some(
    (party) =>
      !!party.leaderId &&
      partyOfficeholders(
        core,
        {
          personIds: [party.leaderId as PersonId],
          facts: { partyId: party.id },
        },
        core.date,
      ).length > 0,
  );
}

describe("the political asks: a bribe in the press and a party that asks you to run", () => {
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
      // Briber candidates are people the player has a tie with (a tie that can
      // sour), the closest first.
      const tied = [...(core.relationshipsByPerson.get(me) ?? [])]
        .map((id) => core.relationships.get(id)!)
        .map((row) => (row.actorId === me ? row.otherId : row.actorId))
        .filter((id) => {
          const person = core.people.get(id);
          return (
            person?.alive === true &&
            person.tier !== "husk" &&
            person.birthDate <= "2000-01-01"
          );
        });
      const adults = [...new Set(tied)]
        .map((id) => core.people.get(id)!)
        .sort(
          (a, b) => b.liquidMinor - a.liquidMinor || a.id.localeCompare(b.id),
        )
        .slice(0, 80);
      let reported: string | undefined;
      let offers = 0;
      const takenIds = new Set<string>();
      for (const offerer of adults) {
        const record = considerBribe(api, {
          offererId: offerer.id,
          officialId: me,
          stakeMinor: 50000000,
          subjectId: `fixture-contract:${offerer.id}`,
        });
        if (!record?.pending) continue;
        offers += 1;
        takenIds.add(record.id);
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
        // A tie sours and the telling comes with the day's close.
        playThrough(
          core,
          director,
          me,
          addDays(makeIsoDate(core.date), 2),
          () => false,
        );
        reported = [...(core.logByKind.get(SCANDAL_REPORTED) ?? [])]
          .map((id) => core.durableLog.get(id as never)!)
          .find((row) => takenIds.has(String(row.facts?.crimeId)))?.id;
      }
      if (!reported && takenIds.size) {
        // The corruption engine's telling is rare (SG-P15-bribe-falling-out-rare)
        // and no draw is promised one, so the report is written in the engine's
        // own shape for the first bribe taken: this proves the director's side
        // (the circumstance, the type, the scene), not the telling.
        const crimeId = [...takenIds][0]!;
        const listener = [...tied].find((id) => id !== me)!;
        reported = `${crimeId}:reported:${listener}:${core.date}`;
        api.emit({
          id: reported,
          date: core.date,
          kind: SCANDAL_REPORTED,
          personIds: [me],
          witnessIds: [listener],
          placeId: core.people.get(me)!.placeId,
          publicRecord: true,
          news: true,
          facts: { crimeId, officialId: me },
          source: {
            tag: "SOURCED",
            citation:
              "Someone who learned of a recorded bribe took it to the press.",
            asOf: core.date,
          },
        });
      }
      if (!reported) {
        tried.push(`${where}: ${offers} bribes taken, none reached the press`);
        continue;
      }
      let found = 0;
      const skipped: string[] = [];
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
          // A scene the director staged but could not word is named, never
          // passed over in silence.
          if (result?.kind === "skipped") skipped.push(result.reason);
          if (result?.kind !== "composed") return false;
          const here = `${where}: ${moment.causeId}`;
          const { scene } = result;
          // The accusation plays one of its family's arcs, picked from the
          // complaint's records (#8079; owner, Nov 8: one kind of scene,
          // several arcs): the plain one or a variant, each with its replies.
          expect(variantFamilies()[scene.purpose], here).toBe(
            "conflict-accuse",
          );
          const arc = variantArc(scene.purpose) as
            { replies: readonly string[] } | undefined;
          const moves = arc?.replies ?? [
            "tell",
            "deny",
            "confront",
            "offer",
            "lie",
          ];
          expect(moment.causeId, here).toBe(reported);
          expect(scene.askerId, here).not.toBe(me);
          const asker = core.people.get(scene.askerId)!;
          expect(
            asker.knownIds.has(me) ||
              core.people.get(me)!.knownIds.has(asker.id),
            here,
          ).toBe(true);
          const root = scene.talk.tree.replies.map((reply) => reply.line);
          expectUpToFourDifferent(root, here);
          for (const row of root) expect(moves, here).toContain(row.move);
          for (const row of [scene.talk.state, ...root]) clean(row.text, here);
          process.stdout.write(
            `ACCUSATION ${here}\n  ${scene.talk.state.text}\n`,
          );
          found += 1;
          return true;
        },
      );
      if (found) return;
      tried.push(
        `${where}: no accusation scene after ${reported}${skipped.length ? ` (${skipped.join("; ")})` : ""}`,
      );
    }
    throw new Error(`no accusation scene: ${tried.join("; ")} (seed ${seed})`);
  }, 3_600_000);

  it(`the advice: a seated officeholder of the party weighs in the day after a party asks the player to run (seed ${seed})`, () => {
    setBookkeeping(false);
    const tried: string[] = [];
    // Places are drawn from the run's seed, never named. A town where no party has
    // a seated veteran in town is read off the built world's records and skipped
    // before the months are played, so a bad draw costs one build, not two worlds
    // and a year. The test fails, naming every place it read, if none qualifies.
    const draws = Array.from(
      { length: ADVICE_DRAWS },
      (_, at) => `${seed}:${at}`,
    );
    for (const [attempt, drawSeed] of draws.entries()) {
      const place = drawPlace(drawSeed, "dead-kinds-advice");
      const where = `${place.name} (${place.key}), seed ${drawSeed} (attempt ${attempt})`;
      const open = () =>
        buildBenchWorld(place.seed, gameStartDate(), {
          twoLevel: true,
          placeKey: place.key,
        });
      // A member a party asks to run, whose party has a seated veteran in town: the
      // first of them, from an uncontrolled replay of the filing season.
      const first = open();
      if (!partyHasVeteran(first.core)) {
        tried.push(`${where}: no party has a seated veteran in town`);
        continue;
      }
      let asked:
        { id: string; date: string; meId: PersonId; row: unknown } | undefined;
      for (let month = 0; month < 12 && !asked; month += 1) {
        advanceCore(first.core, addDays(makeIsoDate(first.core.date), 30));
        asked = [...(first.core.logByKind.get("party-asked") ?? [])]
          .map((id) => first.core.durableLog.get(id as never)!)
          .map((row) => ({
            id: row.id,
            date: row.date,
            meId: row.personIds[P.zero] as PersonId,
            row,
          }))
          .find(
            ({ meId, row }) =>
              first.core.people.get(meId)?.alive === true &&
              partyOfficeholders(first.core, row, row.date).length > 0,
          );
      }
      if (!asked) {
        tried.push(
          `${where}: no asked member with a seated officeholder of the party in town`,
        );
        continue;
      }
      const { core, director } = open();
      // The same world replayed to the day before the ask: the asked member may
      // be filled in as a full person only along the way (a counted resident the
      // party's chair knows), so they are watched from there, not from day one.
      advanceCore(core, addDays(makeIsoDate(asked.date), -P.one));
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
          // The scene stands on a party's ask of this member. A member can be asked
          // for two seats the same day (the governor's, the attorney general's); the
          // director takes one scene a day, so the moment's cause is whichever ask
          // the record names, and the adviser is checked against that ask.
          const ask = core.durableLog.get(moment.causeId)!;
          expect(ask?.kind, here).toBe("party-asked");
          expect(ask.personIds[P.zero], here).toBe(asked!.meId);
          // The adviser is a seated officeholder of the party that asked.
          expect(partyOfficeholders(core, ask, ask.date), here).toContain(
            scene.askerId,
          );
          const root = scene.talk.tree.replies.map((reply) => reply.line);
          expectUpToFourDifferent(root, here);
          for (const row of root)
            expect(["ask", "disagree", "thank", "tell"], here).toContain(
              row.move,
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
});
