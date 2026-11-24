/**
 * A cause invite names what the cause is about, whatever kind of topic the
 * cause carries (director-cause-invite-unworded-for-budget-and-illness-causes).
 * A cause takes its topic from the event that formed it (drives.ts
 * `driveIdentity`): a policy question, a budget line or an illness. Before,
 * only a policy question had words, and an invite about a budget cut or an
 * illness was dropped with "no narration for join-cause can be worded".
 *
 * HAND-STAGED: the `cause.shared` record itself, as the drives engine's
 * `share-drive` writes it (actEvent: id, kind, the sharer as subject, the
 * player as the one told, the cause's topic). From that record on, the
 * director's matching, the cast and the scene are the engines' own.
 *
 * Pinned: Edgar, Wisconsin (5522550), seed edgar-petition-1.
 */
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { pairKey } from "../core2/kernel/ids";
import { advanceCore } from "../core2/life";
import { applyCoreEvent } from "../core2/state";
import type { PersonId } from "../core2/types";
import { causeTopicSaid } from "../english/policy-names";
import { purposeScene } from "./purpose-scene";

const PLACE = "5522550";
const SEED = "edgar-petition-1";
const where = `Edgar, Wisconsin (${PLACE}), seed ${SEED}`;

describe("a cause invite says what the cause is about", () => {
  for (const topic of ["budget-line:naturalResources", "health:stroke"])
    it(`${where}: an invite about ${topic} is staged and names it`, () => {
      const said = causeTopicSaid(topic);
      expect(said, topic).toBeTruthy();
      const previous = setBookkeeping(false);
      try {
        const { core, director, playerId } = buildBenchWorld(
          SEED,
          gameStartDate(),
          { twoLevel: true, placeKey: PLACE },
        );
        const id = playerId as PersonId;
        director.watch(core, id);
        const book = director.ledger.people.get(id)!;
        advanceCore(core, addDays(makeIsoDate(core.date), 1));
        // Someone the player knows from outside their home: the drives engine
        // tells only a tie, and an invite is asked of someone living apart.
        const home = core.people.get(id)!.householdId;
        const sharer = [...core.people.values()]
          .filter(
            (p) =>
              p.id !== id &&
              p.alive &&
              p.householdId !== home &&
              core.relationships.has(pairKey(id, p.id)),
          )
          .sort((a, b) => a.id.localeCompare(b.id))[0];
        expect(sharer, where).toBeTruthy();
        const driveId = `cause:${topic}`;
        const recordId = `cause.shared:${core.date}:${sharer!.id}:${id}:${driveId}`;
        applyCoreEvent(core, {
          id: recordId,
          date: core.date,
          kind: "cause.shared",
          personIds: [sharer!.id],
          witnessIds: [id],
          placeId: sharer!.placeId,
          topic,
          desiredChange: topic,
          // The share's pull on the one told, as share-drive sizes it from
          // the drive's strength; a middling strength here.
          stressImpulse: 0.5,
          moodImpulse: -0.5,
          source: {
            tag: "ESTIMATED",
            asOf: core.date,
            citation: "Hand-staged shared cause for the cause invite test.",
          },
        });
        let entry;
        for (let day = 0; day < 14 && !entry; day += 1) {
          advanceCore(core, addDays(makeIsoDate(core.date), 1));
          entry = book.schedule.find(
            (row) =>
              row.bindings.some((b) => b.typeKey === "cause-invite") &&
              book.momentsById.get(row.momentId)?.causeId === recordId,
          );
        }
        expect(entry, `${where}: no invite scheduled`).toBeTruthy();
        const result = purposeScene(core, director, id, entry!, {
          typeKey: "cause-invite",
        });
        expect(result?.kind, `${where}: ${JSON.stringify(result)}`).toBe(
          "composed",
        );
        if (result?.kind !== "composed") return;
        expect(
          result.scene.facts.find((f) => f.key === "cause")?.text,
          where,
        ).toBe(said);
      } finally {
        setBookkeeping(previous);
      }
    }, 120_000);
});
