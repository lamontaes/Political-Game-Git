import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  ELECTIONS_MODULE_ID,
  type ContestRow,
  type FilingRow,
} from "../core2/modules/elections";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { purposeScene } from "./purpose-scene";

// A race's debate is a scene for each candidate in it. The meetings engine
// holds the debate a couple of weeks before the election and records it
// (debate, naming every candidate who is a full person); afterward another
// candidate on that record comes over to confront them, about the debate that
// just ended. Places are drawn in turn until one holds a debate between two
// candidates who are full people.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const ATTEMPTS = 4;
// Played to this many days before the town's next election day, ahead of the
// debate window, when the candidates on the ballot are watched.
const WATCH_BEFORE = 16;

it(`a debate is each candidate's rally-opponent scene, with another candidate from its record (seed ${seed})`, () => {
  const tried: string[] = [];
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const place = drawPlace(`${seed}:${attempt}`, "debate-opponent-scene");
    const where = `${place.name} (${place.key}), seed ${seed}:${attempt}`;
    setBookkeeping(false);
    const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const elections = api.moduleState(ELECTIONS_MODULE_ID);
    const contests = () =>
      elections.table("contests").rows() as unknown as ContestRow[];
    // The town's next election day past the debate window.
    const day = contests()
      .map((row) => row.electionDate)
      .filter((date) => date > addDays(makeIsoDate(core.date), WATCH_BEFORE))
      .sort()[0];
    if (!day) {
      tried.push(`${place.name} (no election ahead)`);
      continue;
    }
    advanceCore(core, addDays(makeIsoDate(day), -WATCH_BEFORE));
    // The candidates on that day's ballots who are full people, in races with
    // at least two of them.
    const racing = new Set(
      contests()
        .filter((row) => row.electionDate === day)
        .map((row) => row.id),
    );
    const byRace = new Map<string, string[]>();
    for (const row of elections
      .table("filings")
      .rows() as unknown as FilingRow[])
      if (
        racing.has(row.contestId) &&
        row.status === "on-ballot" &&
        core.people.has(row.personId)
      )
        byRace.set(row.contestId, [
          ...(byRace.get(row.contestId) ?? []),
          row.personId,
        ]);
    const candidates = [...byRace.values()]
      .filter((ids) => ids.length >= 2)
      .flat();
    for (const id of candidates) director.watch(core, id);
    advanceCore(core, addDays(makeIsoDate(day), -1));
    const debates = [...core.durableLog.values()].filter(
      (row) =>
        row.kind === "debate" &&
        row.personIds.length >= 2 &&
        row.personIds.every((id) => candidates.includes(id)),
    );
    if (!debates.length) {
      tried.push(place.name);
      continue;
    }
    for (const debate of debates)
      for (const candidateId of debate.personIds) {
        const here = `${where}: ${debate.id}: ${candidateId}`;
        const book = director.ledger.people.get(candidateId as PersonId)!;
        // The entry whose moment the debate itself caused (the debate's
        // answers are speech records whose ids carry the debate's id too).
        const entry = book.schedule.find(
          (row) => book.momentsById.get(row.momentId)?.causeId === debate.id,
        );
        const binding = entry?.bindings.find(
          (row) => row.typeKey === "rally-opponent",
        );
        expect(binding, `${here}: no rally-opponent scene`).toBeTruthy();
        const opponent = binding!.roles.find(
          (row) => row.role === "opponent",
        )!.personIds;
        expect(opponent.length, here).toBe(1);
        expect(opponent[0], here).not.toBe(candidateId);
        expect(debate.personIds, `${here}: the opponent debated`).toContain(
          opponent[0],
        );
        // The opponent speaks of the debate, in the lines that play, as
        // ordinary play says them, and the talk stands on its record.
        const result = purposeScene(
          core,
          director,
          candidateId as PersonId,
          entry!,
        );
        expect(result?.kind, here).toBe("composed");
        if (result?.kind !== "composed") continue;
        expect(result.scene.cause.id, here).toBe(debate.id);
        expect(
          result.scene.facts.find((row) => row.key === "debate")?.recordIds,
          here,
        ).toContain(debate.id);
        expect(
          result.scene.talk.narration.map((line) => line.text).join(" "),
          here,
        ).toMatch(/debate|cameras/);
      }
    return;
  }
  throw new Error(
    `no debate between two candidates who are full people in ${tried.join("; ")} (seed ${seed})`,
  );
}, 3_600_000);
