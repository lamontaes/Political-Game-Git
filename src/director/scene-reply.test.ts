import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import { pairKey } from "../core2/kernel/ids";
import { advanceCore } from "../core2/life";
import {
  ELECTIONS_MODULE_ID,
  fileCandidacy,
  openContests,
  type ContestRow,
} from "../core2/modules/elections";
import { filingClerkFor } from "../core2/modules/filing-clerk";
import { lawChain } from "../core2/modules/laws";
import type { PersonId } from "../core2/types";
import { coreAPI } from "../core2/state";
import { purposeScene, replyInScene } from "./purpose-scene";

// The reply the player chooses in a scene with a purpose is a record the
// core's own writers read. In the played world a resident who lives with
// someone plays as themselves and files for a race; the household's filing
// scene fires, the player picks a reply, and the reply's record reaches their
// tie with the asker through the relationship writer, citing the record.
// Places are drawn in turn until one has a race open for filing within the
// year that takes the player's filing; many places elect only in even years
// (most drawn places do), so up to 32 are drawn.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const ATTEMPTS = 32;
const YEAR = 365;
const TRIED = 12;

it(`a reply chosen in a scene is a record the relationship writer reads (seed ${seed})`, () => {
  const tried: string[] = [];
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const place = drawPlace(`${seed}:${attempt}`, "scene-reply");
    const where = `${place.name} (${place.key}), seed ${seed}:${attempt}`;
    setBookkeeping(false);
    const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const end = addDays(makeIsoDate(core.date), YEAR);
    // The elections engine holds each seat's next contest from the start: a
    // place with none counted within the year is passed over now.
    if (
      !(
        api
          .moduleState(ELECTIONS_MODULE_ID)
          .table("contests")
          .rows() as unknown as ContestRow[]
      ).some(
        (race) =>
          race.filingDeadline >= core.date &&
          addDays(makeIsoDate(race.electionDate), 2) <= end,
      )
    ) {
      tried.push(`${place.name} (no race counted in the year)`);
      continue;
    }
    // Play until a race is open for filing (and counted within the year).
    const open = () =>
      [...openContests(api)]
        .filter((race) => addDays(makeIsoDate(race.electionDate), 2) <= end)
        .sort(
          (a, b) =>
            a.electionDate.localeCompare(b.electionDate) ||
            a.id.localeCompare(b.id),
        );
    while (!open().length && core.date < end)
      advanceCore(core, addDays(makeIsoDate(core.date), 7));
    const race = open()[0];
    const clerkId = race ? filingClerkFor(api, race.id)?.personId : undefined;
    // A resident who lives with someone, who plays as themselves and files;
    // the director watches each one tried before they file.
    const player = race
      ? [...core.people.values()]
          .filter(
            (p) =>
              p.alive &&
              p.id !== clerkId &&
              p.placeId === lawChain(api).townPlaceId &&
              ageOnDate(p.birthDate, core.date) >= 18 &&
              (core.households.get(p.householdId)?.memberIds ?? []).some(
                (id) => id !== p.id && core.people.get(id)?.alive,
              ),
          )
          .sort((a, b) => a.id.localeCompare(b.id))
          .slice(0, TRIED)
          .find((p) => {
            director.watch(core, p.id);
            return ["petitioning", "on-ballot"].includes(
              fileCandidacy(api, {
                personId: p.id,
                contestId: race.id,
                platform: [],
              }).status ?? "",
            );
          })
      : undefined;
    if (!race || !player) {
      tried.push(place.name);
      continue;
    }
    core.playerId = player.id;
    advanceCore(core, addDays(makeIsoDate(core.date), 2));
    const entry = director.ledger.people
      .get(player.id as PersonId)!
      .schedule.find((row) => row.momentId.includes("candidate-filed:"));
    expect(entry, `${where}: the filing fired no scene`).toBeTruthy();
    const composed = purposeScene(
      core,
      director,
      player.id as PersonId,
      entry!,
    );
    expect(composed?.kind, where).toBe("composed");
    if (composed?.kind !== "composed") continue;
    const { scene } = composed;
    // The first reply, then the first reply after the asker's answer.
    const path = scene.talk.tree.replies[0]?.next?.replies.length
      ? [0, 0]
      : [0];
    const recordId = replyInScene(
      core,
      director,
      player.id as PersonId,
      entry!,
      path,
    );
    expect(recordId, `${where}: no reply was recorded`).toBeTruthy();
    // The record names who said it to whom, the scene and the line.
    const record = core.durableLog.get(recordId!);
    expect(record?.personIds, where).toEqual([scene.askedId, scene.askerId]);
    expect(record?.facts?.causeId, where).toBe(scene.cause.id);
    let node = scene.talk.tree;
    let said = "";
    for (const index of path) {
      said = node.replies[index]!.line.text;
      node = node.replies[index]!.next!;
    }
    expect(record?.facts?.line, where).toBe(said);
    // The relationship writer read it: the tie's latest change cites it.
    const tie = core.relationships.get(pairKey(scene.askedId, scene.askerId));
    expect(tie?.latestChange?.reason?.sourceId, where).toBe(recordId);
    // It is time together that day: the contact is dated today, and the
    // change asked for is the exchange's time (the tie's level also fades
    // with the days since they last talked, so it can end a little lower).
    expect(tie!.latestChange!.after.lastContactDate, where).toBe(core.date);
    expect(tie!.latestChange!.requestedChange, where).toBeGreaterThan(0);
    // Said again, it is the same record, and the tie does not count it twice.
    const latest = tie!.latestChange;
    expect(
      replyInScene(core, director, player.id as PersonId, entry!, path),
      where,
    ).toBe(recordId);
    expect(
      core.relationships.get(pairKey(scene.askedId, scene.askerId))
        ?.latestChange,
      where,
    ).toBe(latest);
    // A path the scene does not offer records nothing.
    expect(
      replyInScene(core, director, player.id as PersonId, entry!, [99]),
      where,
    ).toBeNull();
    console.log(
      `SCENE REPLY ${where}\n${recordId}: "${said}" to ${scene.askerId}`,
    );
    return;
  }
  throw new Error(
    `no drawn place had a race take the player's filing: ${tried.join("; ")} (seed ${seed})`,
  );
}, 3_600_000);
