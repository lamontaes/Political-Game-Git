import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { LEGISLATURE_MODULE_ID, members } from "../core2/modules/legislature";
import { OFFICES_MODULE_ID, type TermRow } from "../core2/modules/offices";
import { OUTCOME_WEB_MODULE_ID } from "../core2/outcome-web-model";
import { P } from "../core2/parameters";
import { advancePlayerV1, resumePlayerV1 } from "../core2/player-v1";
import { coreAPI } from "../core2/state";
import { TERM_MEASURES } from "../core2/term-read";
import type { CoreState, PersonId } from "../core2/types";
import { purposeScene } from "./purpose-scene";
import { expectUpToFourDifferent } from "./reply-set-check";

// The day after a crowd forms against the town's term (a protest or a strike
// from the public-action engine), someone who lives with a sitting official
// asks the question the crowd raised: is the job worth it? A sitting member of
// a body is played through a year in a drawn place, as the bench plays it,
// with the web's rows for the town written the way the web writes them (rents
// and jobs rising over a term, a year after it opened). The scene stands on
// the civic record, its cast is the official's own household, and it composes
// with the crowd's demand and size.
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

it(`a crowd against the term brings the question home to the official (seed ${seed})`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const place = drawPlace(`${seed}:${attempt}`, "office-doubt");
    const where = `${place.name} (${place.key}), seed ${seed}:${attempt}`;
    const { core, director, placeId } = buildBenchWorld(
      place.seed,
      gameStartDate(),
      { twoLevel: true, placeKey: place.key },
    );
    const personId = localMember(core);
    if (!personId) {
      tried.push(`${where}: no sitting member who is a full person`);
      continue;
    }
    const api = coreAPI(core);
    const web = api.moduleState(OUTCOME_WEB_MODULE_ID).table("months");
    const change: Record<string, number> = {
      "housing.rent": 0.3,
      "labor.unemployment": 0.4,
    };
    for (const [at, month] of [
      "2025-01",
      "2026-01",
      "2026-02",
      "2026-03",
    ].entries()) {
      const values: Record<string, number> = {};
      for (const key of TERM_MEASURES) {
        const factor = Object.entries(change).find(([prefix]) =>
          key.startsWith(prefix),
        )?.[1];
        values[key] = 100 * (1 + (factor ?? 0) * (Math.max(at - 1, 0) / 2));
      }
      web.put({
        id: `web:${placeId}:${month}`,
        placeId,
        month,
        date: `${month}-02`,
        values,
        bases: values,
        effects: {},
        engineSources: {},
      } as never);
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
            !entry.bindings.some((row) => row.typeKey === "office-doubt")
          )
            continue;
          const result = purposeScene(core, director, personId, entry, {
            typeKey: "office-doubt",
          });
          if (result?.kind !== "composed") continue;
          found += 1;
          const { scene } = result;
          const here = `${where}: ${moment.causeId}`;
          expect(scene.purpose, here).toBe("office-doubt");
          // The cause is the crowd's civic record, and the cast lives with the official.
          const cause = core.durableLog.get(moment.causeId);
          expect(["civic.protest", "civic.strike"], here).toContain(
            cause?.kind,
          );
          expect(scene.askerId, here).not.toBe(personId);
          const asker = core.people.get(scene.askerId)!;
          const official = core.people.get(personId)!;
          expect(asker.householdId, here).toBe(official.householdId);
          // Up to four replies, all different stances, in plain words (owner, Nov 10).
          const root = scene.talk.tree.replies.map((reply) => reply.line);
          expectUpToFourDifferent(root, here);
          for (const row of root)
            expect(["tell", "comfort", "promise", "deflect"], here).toContain(
              row.move,
            );
          for (const row of [scene.talk.state, ...root])
            expect(row.text, here).not.toMatch(
              /\d{4}-\d{2}-\d{2}|\b[a-z]+[-.:][a-z-]+:|\{|\}|undefined|\d{5,}/,
            );
          if (found === 1)
            process.stdout.write(
              `OFFICE DOUBT ${here}\n  ${scene.talk.state.text}\n`,
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
    if (found) return;
    tried.push(`${where}: no office-doubt scene in the year`);
  }
  throw new Error(`no office-doubt scene: ${tried.join("; ")} (seed ${seed})`);
}, 3_600_000);
