import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { applyCoreEvent, coreAPI } from "../core2/state";
import { partiesHere } from "../core2/modules/parties";
import {
  seasonedOfficeholders,
  takeUnderWing,
} from "../core2/modules/candidacy";
import { playerContests } from "../core2/modules/elections";
import { purposeScene } from "./purpose-scene";
import type { PersonId } from "../core2/types";

// The mentor's advice names the party that asked the member to run and the day
// filing closes, each read from the ask's own record (`party-asked`) and cited
// to it. A place is drawn until one has a party with a seasoned officeholder
// and a race; the places passed over are named when none has.
it("the mentor's advice scene says the party and the filing day, cited to the party's ask", () => {
  setBookkeeping(false);
  const passed: string[] = [];
  for (let draw = 0; draw < 6; draw += 1) {
    const seed = `advice-facts:${draw}`;
    const place = drawPlace(seed, "advice-facts");
    const where = `${place.name} (${place.key}), seed ${seed}`;
    const { core, director, playerId } = buildBenchWorld(
      place.seed,
      gameStartDate(),
      { twoLevel: true, placeKey: place.key },
    );
    const api = coreAPI(core);
    const me = playerId as PersonId;
    director.watch(core, me);
    const book = director.ledger.people.get(me)!;
    const townId = core.people.get(me)!.placeId;
    const party = partiesHere(api).find(
      (row) => seasonedOfficeholders(api, row.id, townId).length > 0,
    );
    if (!party) {
      passed.push(`${where}: no party with a seasoned officeholder`);
      continue;
    }
    let contest = playerContests(api).find((row) => row.level !== "federal");
    for (let week = 0; week < 52 && !contest; week += 1) {
      advanceCore(core, addDays(makeIsoDate(core.date), 7));
      contest = playerContests(api).find((row) => row.level !== "federal");
    }
    if (!contest) {
      passed.push(`${where}: no race to run in`);
      continue;
    }
    const askId = `party-asked:${contest.id}:${party.id}:${me}`;
    const mentorId = takeUnderWing(api, me, party.id, askId);
    if (!mentorId) {
      passed.push(`${where}: no mentor took the member under their wing`);
      continue;
    }
    applyCoreEvent(core, {
      id: askId,
      date: core.date,
      kind: "party-asked",
      personIds: [me, party.leaderId as PersonId],
      placeId: townId,
      source: { tag: "SOURCED", citation: "test", asOf: core.date },
      facts: {
        askedId: me,
        chairId: party.leaderId ?? "",
        partyId: party.id,
        party: party.name,
        contestId: contest.id,
        office: contest.title,
        filingDeadline: contest.filingDeadline,
      },
    } as never);
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    // The director stages the ask for the party chair's recruit scene; the
    // mentor's scene reads the same moment.
    const entry = book.schedule.find(
      (row) =>
        book.momentsById.get(row.momentId)?.causeId === askId &&
        row.bindings.some((binding) => binding.typeKey === "party-recruit"),
    );
    if (!entry) {
      passed.push(`${where}: the ask was not staged`);
      continue;
    }
    const moment = book.momentsById.get(entry.momentId)!;
    book.momentsById.set(entry.momentId, {
      ...moment,
      label: "circumstance:mentor-weighs-in",
    });
    const result = purposeScene(
      core,
      director,
      me,
      {
        ...entry,
        bindings: [
          {
            typeKey: "advice",
            setting: { kind: "other-home", recordId: mentorId },
            roles: [
              { role: "adviser", personIds: [mentorId] },
              { role: "deciding", personIds: [me] },
            ],
          },
        ],
      } as never,
      { typeKey: "advice" },
    );
    expect(result?.kind, where).toBe("composed");
    if (result?.kind !== "composed") return;
    const byKey = new Map(result.scene.facts.map((row) => [row.key, row]));
    expect(byKey.get("office")?.text, where).toBeTruthy();
    expect(byKey.get("party")?.text, where).toBe(party.name);
    expect(byKey.get("deadline")?.text, where).toBeTruthy();
    for (const key of ["party", "deadline"])
      expect(byKey.get(key)?.recordIds, `${where}: ${key}`).toContain(
        moment.causeId,
      );
    expect(result.scene.talk.gaps, where).toEqual([]);
    return;
  }
  throw new Error(
    `no drawn place could stage the advice: ${passed.join("; ")}`,
  );
}, 240_000);
