/**
 * A primary challenge is a scene (owner, Oct 14: "primary challenges"). In a
 * drawn place the player files for a race whose ballot carries party labels;
 * when someone files against them, the elections engine's rival-filed record
 * names the rival, and a member of the household brings the news home. When
 * the rival runs under the player's own party, the scene says so: the
 * same-party fact cites the cause record, and the lines that call it one
 * party play over the general ones. A rival of another party, or none, says
 * nothing of a party.
 */
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { applyChosenPerson } from "../bench/creator";
import { fileForOffice } from "../bench/government";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { ballot, playerContests } from "../core2/modules/elections";
import { partyOf, seatParty } from "../core2/candidate-pool";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { purposeScene, replyInScene } from "./purpose-scene";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(10).toString("hex");
const DRAWS = 6;
const WEEK = 7;
const LEAD_DAYS = 60;

it(`a rival from the player's own party is told as one, seed ${seed}`, () => {
  const tried: string[] = [];
  for (let draw = 0; draw < DRAWS; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "primary-challenge");
    const where = `${place.name} (${place.key}), seed ${seed}:${draw}`;
    setBookkeeping(false);
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const { core, director } = world;
    const me = world.playerId! as PersonId;
    applyChosenPerson(core, me, {
      givenName: "Pat",
      familyName: core.people.get(me)!.familyName,
      gender: "female",
      birthYear: 1985,
      birthMonth: 6,
      birthDay: 1,
    });
    const player = core.people.get(me)!;
    for (const id of [
      me,
      ...(core.households.get(player.householdId)?.memberIds ?? []),
    ])
      if (core.people.get(id)?.alive) director.watch(core, id as PersonId);
    const api = coreAPI(core);
    // A race whose seat runs under party labels, entered under the player's
    // own party, as the creator's party choice files it.
    const own = partyOf(api, me);
    if (!own) {
      tried.push(`${where}: the player has no party`);
      continue;
    }
    const filed = [...playerContests(api)]
      .filter(
        (c) =>
          c.electionDate >= addDays(makeIsoDate(core.date), LEAD_DAYS) &&
          seatParty(api, c),
      )
      .sort(
        (a, b) =>
          a.electionDate.localeCompare(b.electionDate) ||
          a.id.localeCompare(b.id),
      )
      .find((c) =>
        ["petitioning", "on-ballot"].includes(
          (
            fileForOffice(core, me, c.id, { party: own }) as {
              filing?: { status?: string };
            }
          ).filing?.status ?? "",
        ),
      );
    if (!filed) {
      tried.push(
        `${where}: no partisan race two months out the player could enter`,
      );
      continue;
    }
    const mine = own;
    const seen = new Set<string>();
    while (core.date < filed.electionDate) {
      advanceCore(
        core,
        [addDays(makeIsoDate(core.date), WEEK), filed.electionDate].sort()[0]!,
      );
      const book = director.ledger.people.get(me)!;
      for (const entry of book.schedule) {
        if (seen.has(entry.momentId)) continue;
        seen.add(entry.momentId);
        if (!entry.bindings.some((row) => row.typeKey === "rival-filed"))
          continue;
        const moment = book.momentsById.get(entry.momentId)!;
        const record = core.durableLog.get(moment.causeId as never)!;
        const rivalId = record.facts!.rivalId!;
        const theirs = ballot(api, filed.id).find(
          (f) => f.personId === rivalId,
        )?.party;
        const result = purposeScene(core, director, me, entry, {
          typeKey: "rival-filed",
        });
        expect(result?.kind, `${where}: ${moment.causeId}`).toBe("composed");
        if (result?.kind !== "composed") continue;
        const { scene } = result;
        const fact = scene.facts.find((row) => row.key === "same-party");
        const lines = [
          ...scene.talk.narration,
          ...(scene.talk.open ? [scene.talk.open] : []),
          scene.talk.state,
        ];
        if (theirs !== mine) {
          // Another party, or none: no line calls it the player's own.
          expect(fact, `${where}: ${moment.causeId} (${theirs})`).toBeFalsy();
          continue;
        }
        expect(fact?.recordIds, where).toContain(moment.causeId);
        expect(
          scene.talk.state.parts.some((key) =>
            /same-party|your-party|your-own-side|same-party-you-do/.test(key),
          ) || /party|own side/.test(scene.talk.state.text),
          `${where}: the statement says it is the player's party: ${scene.talk.state.text}`,
        ).toBe(true);
        const root = scene.talk.tree.replies.map((row) => row.line);
        expect(new Set(root.map((row) => row.move)).size, where).toBe(
          root.length,
        );
        const reply = replyInScene(core, director, me, entry, [0]);
        expect(reply, `${where}: the reply is written back`).toBeTruthy();
        if (process.env.SCENE_LOG)
          writeFileSync(
            process.env.SCENE_LOG,
            `PRIMARY CHALLENGE ${where}: ${filed.id}, cause ${moment.causeId}, party ${mine}, reply ${reply}\n${lines.map((row) => `  ${row.text}`).join("\n")}\n  replies: ${root.map((row) => row.text).join(" | ")}`,
          );
        return;
      }
    }
    tried.push(
      `${where}: ${filed.id} (${mine}) had no rival of the same party`,
    );
  }
  throw new Error(
    `no drawn race had a same-party rival: ${tried.join("; ")} (seed ${seed})`,
  );
}, 3_600_000);
