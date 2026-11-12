import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { LEGISLATURE_MODULE_ID, members } from "../core2/modules/legislature";
import { OFFICES_MODULE_ID, type TermRow } from "../core2/modules/offices";
import { P } from "../core2/parameters";
import { advancePlayerV1, resumePlayerV1 } from "../core2/player-v1";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import { purposeScene } from "./purpose-scene";
import { wordPrintedStory } from "../bench/archive-words";
import { expectUpToFourDifferent } from "./reply-set-check";

// The floor before the roll (owner, Nov 8: members speak in session, for and
// against, recognized by the chair). A sitting member of a body is played
// through a year in a drawn place, as the bench plays it. The legislature
// records who rose for each bill and who against; the director stages the
// speaker's words to the player, who sits in the body; the press tells who
// spoke. Every scene stands on the floor-debate record, the speaker addresses
// the chair, and the four replies are four moves in plain words.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const ATTEMPTS = 4;
const DAYS = 365;

function localMember(core: CoreState): PersonId | null {
  const api = coreAPI(core);
  if (!core.modules.has(OFFICES_MODULE_ID)) return null;
  if (!core.modules.has(LEGISLATURE_MODULE_ID)) return null;
  const town = core.people.get(core.playerId!)?.placeId;
  const terms = api
    .moduleState(OFFICES_MODULE_ID)
    .table("terms")
    .query("byStatus", ["serving"]) as unknown as TermRow[];
  const local = terms
    .filter((term) => {
      const person = core.people.get(term.personId as PersonId);
      return (
        person?.alive === true &&
        person.placeId === town &&
        members(api, term.officeId).length > 1
      );
    })
    .sort(
      (a, b) =>
        a.officeId.localeCompare(b.officeId) || a.id.localeCompare(b.id),
    );
  return (local[0]?.personId as PersonId | undefined) ?? null;
}

it(`a member rises for or against a bill before the roll (seed ${seed})`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const place = drawPlace(`${seed}:${attempt}`, "floor-debate");
    const where = `${place.name} (${place.key}), seed ${seed}:${attempt}`;
    const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const personId = localMember(core);
    if (!personId) {
      tried.push(`${where}: no sitting member who is a full person`);
      continue;
    }
    core.focusPersonIds.add(personId);
    director.watch(core, personId);
    const book = director.ledger.people.get(personId)!;
    let found = 0;
    let packet = advancePlayerV1(core, {
      controlledPersonId: personId,
      through: {
        date: addDays(makeIsoDate(core.date), DAYS),
        minuteOfDay: P.zero,
      },
    });
    while (packet.kind !== "complete") {
      if (packet.kind === "stop") {
        for (const stop of packet.stop.modules) {
          const entry = book.schedule.find(
            (row) => row.momentId === stop.recordId,
          );
          const moment = book.momentsById.get(stop.recordId);
          if (
            !entry ||
            !moment ||
            !entry.bindings.some((row) => row.typeKey === "floor-debate")
          )
            continue;
          const result = purposeScene(core, director, personId, entry, {
            typeKey: "floor-debate",
          });
          if (result?.kind !== "composed") continue;
          found += 1;
          const { scene } = result;
          const here = `${where}: ${moment.causeId}`;
          expect(scene.purpose, here).toBe("floor-debate");
          const cause = core.durableLog.get(moment.causeId);
          expect(cause?.kind, here).toBe("floor-debate");
          expect(
            [cause!.facts!.forId, cause!.facts!.againstId],
            here,
          ).toContain(scene.askerId);
          expect(scene.askerId, here).not.toBe(personId);
          expect(
            scene.facts.some(
              (row) => row.key === "speaks-for" || row.key === "speaks-against",
            ),
            here,
          ).toBe(true);
          expect(scene.talk.state.text, here).toMatch(/^Thank you, Chair\./);
          const root = scene.talk.tree.replies.map((reply) => reply.line);
          expectUpToFourDifferent(root, here);
          for (const row of root)
            expect(["agree", "disagree", "ask", "deflect"], here).toContain(
              row.move,
            );
          for (const row of [scene.talk.state, ...root])
            expect(row.text, here).not.toMatch(
              /\d{4}-\d{2}-\d{2}|\b[a-z]+[-.:][a-z-]+:|\{|\}|undefined|\d{5,}/,
            );
          const told = wordPrintedStory(core, {
            id: `printed:test:${cause!.id}`,
            kind: "press.printed",
            date: cause!.date,
            topic: cause!.topic,
            facts: { sourceRecordId: cause!.id },
          } as never);
          expect(told, `${here}: the debate is worded`).toBeTruthy();
          if (found === 1)
            process.stdout.write(
              `FLOOR DEBATE ${here}\n  ${scene.talk.state.text}\n  ${told!.headline} / ${told!.lede}\n`,
            );
        }
        packet = resumePlayerV1(core, {
          kind: "stop",
          pauseId: packet.pauseId,
        });
      } else
        packet = resumePlayerV1(core, {
          kind: "choice",
          pauseId: packet.pauseId,
          offerId: packet.offers[P.zero]!.offerId,
        });
    }
    process.stdout.write(
      `FLOOR DEBATES ${where}: ${found} scenes in the year\n`,
    );
    if (found) return;
    tried.push(`${where}: no floor-debate scene in the year`);
  }
  throw new Error(`no floor-debate scene: ${tried.join("; ")} (seed ${seed})`);
}, 3_600_000);
