/**
 * The street stop after a vote of the player's body (Fable B's walk, Deep
 * River, Washington, Nov 11; `words-street-stop-says-the-bill-twice-and-
 * claims-a-vote-not-cast`). In places drawn from all 56, a sitting member of
 * a town or county body is played for a year; when a resident stops them
 * about a measure (the `law-reaches` street stops: vote-read-street,
 * law-reached-street, law-news-street), the scene is composed and checked:
 *   - the opening hails the official and does not name the measure;
 *   - the measure is said once in the box, and by its name, never a number;
 *   - no reply says the player voted unless the roll holds their row.
 * Places where no such stop fires in the year are named and passed over, so
 * the test never passes by the luck of the draw.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { LEGISLATURE_MODULE_ID, members } from "../core2/modules/legislature";
import { OFFICES_MODULE_ID, type TermRow } from "../core2/modules/offices";
import { advancePlayerV1, resumePlayerV1 } from "../core2/player-v1";
import { P } from "../core2/parameters";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import { CIRCUMSTANCES } from "./circumstance";
import { purposeScene } from "./purpose-scene";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const DRAWS = 12;
const DAYS = 365;
/** The street stops a law or a vote brings (law-reaches). */
const STREET = new Set(
  CIRCUMSTANCES.rows
    .filter((row) => row.typeKey === "constituent-stop")
    .map((row) => row.id),
);

/** A sitting member of a town or county body who is a full person in town. */
function localMember(core: CoreState): PersonId | null {
  if (!core.modules.has(OFFICES_MODULE_ID)) return null;
  if (!core.modules.has(LEGISLATURE_MODULE_ID)) return null;
  const api = coreAPI(core);
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

it(`a resident who stops a member about a measure says it once and by its name, and no reply claims a vote not cast (seed ${seed})`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  let checked = 0;
  for (let attempt = 0; attempt < DRAWS; attempt += 1) {
    const place = drawPlace(`${seed}:${attempt}`, "constituent-stop-scene");
    const where = `${place.name} (${place.key}), seed ${seed}:${attempt}`;
    const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const member = localMember(core);
    if (!member) {
      tried.push(`${place.name}: no sitting member of a body in town`);
      continue;
    }
    core.playerId = member;
    core.focusPersonIds.add(member);
    director.watch(core, member);
    const book = director.ledger.people.get(member)!;
    const check = (momentId: string) => {
      const entry = book.schedule.find((row) => row.momentId === momentId);
      const moment = book.momentsById.get(momentId);
      const row = moment?.label.startsWith("circumstance:")
        ? CIRCUMSTANCES.rows.find(
            (item) => `circumstance:${item.id}` === moment.label,
          )
        : undefined;
      if (!entry || !row || !STREET.has(row.id)) return;
      const scene = purposeScene(core, director, member, entry, {
        includeHeld: true,
      });
      if (scene?.kind !== "composed") return;
      const talk = scene.scene.talk;
      const box = [talk.open, talk.state]
        .filter(Boolean)
        .map((line) => line!.text);
      const facts = new Map(
        scene.scene.facts.map((fact) => [fact.key, fact.text]),
      );
      process.stdout.write(
        `STREET ${where} ${row.id}: ${box.join(" / ")} / choices: ${talk.tree.replies
          .map((reply) => reply.line.text)
          .join(" | ")}\n`,
      );
      // The opening greets; it names no measure.
      if (talk.open)
        expect(
          talk.open.text,
          `${where}: the open names the measure`,
        ).not.toMatch(/\b(?:Ordinance|Resolution|Act|Bill|budget|tax|law)\b/i);
      // No fact's words are said twice in one box.
      for (const value of facts.values())
        if (value.length > 3)
          expect(
            box.filter((text) => text.includes(value)).length,
            `${where}: "${value}" twice in one box: ${box.join(" / ")}`,
          ).toBeLessThan(P.two);
      // The measure is said by its name, never its number.
      expect(box.join(" "), where).not.toMatch(
        /\b(?:Ordinance|Resolution|Act|Bill) \d/,
      );
      // No reply says the player voted unless their row is on the roll.
      for (const reply of talk.tree.replies)
        if (/\bI voted\b/.test(reply.line.text))
          expect(
            facts.has("voted-for") || facts.has("voted-against"),
            `${where}: "${reply.line.text}" with no vote on the roll`,
          ).toBe(true);
      checked += 1;
    };
    const resume = (input: Parameters<typeof resumePlayerV1>[1]) => {
      try {
        return resumePlayerV1(core, input);
      } catch (error) {
        if (core.people.get(member)?.alive) throw error;
        return undefined;
      }
    };
    let packet: ReturnType<typeof advancePlayerV1> | undefined =
      advancePlayerV1(core, {
        controlledPersonId: member,
        through: {
          date: addDays(makeIsoDate(core.date), DAYS),
          minuteOfDay: P.zero,
        },
      });
    while (packet && packet.kind !== "complete") {
      if (packet.kind === "stop") {
        for (const stop of packet.stop.modules) check(stop.recordId);
        packet = resume({ kind: "stop", pauseId: packet.pauseId });
      } else
        packet = resume({
          kind: "choice",
          pauseId: packet.pauseId,
          offerId: packet.offers[P.zero]!.offerId,
        });
    }
    if (checked) return;
    tried.push(`${place.name}: no street stop about a measure in the year`);
  }
  throw new Error(
    `no resident stopped a member about a measure in ${DRAWS} draws: ${tried.join("; ")} (seed ${seed})`,
  );
}, 3_600_000);
