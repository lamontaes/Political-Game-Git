import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  ballot,
  fileCandidacy,
  incumbentOf,
  openContests,
  type ContestRow,
} from "../core2/modules/elections";
import { advancePlayerV1, resumePlayerV1 } from "../core2/player-v1";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { purposeScene } from "./purpose-scene";

// A player who files after others is told, the day after, who is already on
// the ballot: the candidates named from their candidacy records, the
// incumbent or the party each runs under (circumstance rival-known-late). A
// candidate who was on the ballot first is still told of the player's filing
// by the elections engine's rival-filed record (the original cause). In a
// drawn place the world's candidates file as the contest opens; the player
// files after them and lives on their own clock.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const ATTEMPTS = 14;

it(`the player who files last is told who is already running (seed ${seed})`, () => {
  const tried: string[] = [];
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const place = drawPlace(`${seed}:${attempt}`, "rival-filed-late");
    const where = `${place.name} (${place.key}), seed ${seed}:${attempt}`;
    setBookkeeping(false);
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const { core, director } = world;
    const api = coreAPI(core);
    const me = world.playerId as PersonId;
    const end = addDays(makeIsoDate(core.date), 330);
    const contested = () =>
      [...openContests(api)]
        .filter((row: ContestRow) => makeIsoDate(row.electionDate) <= end)
        .filter((row) =>
          ballot(api, row.id).some((filing) => filing.personId !== me),
        )
        .sort((a, b) => a.id.localeCompare(b.id))[0];
    for (let day = 0; !contested() && day < 330; day += 7)
      advanceCore(core, addDays(makeIsoDate(core.date), 7));
    const race = contested();
    if (!race) {
      tried.push(
        `${place.name}: no race with a candidate already on the ballot`,
      );
      continue;
    }
    const earlier = ballot(api, race.id).map((row) => row.personId);
    for (const id of earlier) {
      director.watch(core, id as PersonId);
      core.focusPersonIds.add(id as PersonId);
    }
    director.watch(core, me);
    const filed = fileCandidacy(api, {
      personId: me,
      contestId: race.id,
      platform: [],
    });
    if (!["petitioning", "on-ballot"].includes(filed.status ?? "")) {
      tried.push(`${place.name}: ${filed.status}`);
      continue;
    }
    let packet = advancePlayerV1(core, {
      controlledPersonId: me,
      through: { date: addDays(makeIsoDate(core.date), 6), minuteOfDay: 1439 },
    });
    for (let guard = 0; packet.kind !== "complete" && guard < 500; guard += 1)
      packet = resumePlayerV1(core, {
        kind: packet.kind === "choice" ? "own-choice" : "stop",
        pauseId: packet.pauseId,
      });
    const book = director.ledger.people.get(me)!;
    const entry = book.schedule.find(
      (row) =>
        row.bindings.some((b) => b.typeKey === "rival-filed") &&
        book.momentsById.get(row.momentId)?.label ===
          "circumstance:rival-known-late",
    );
    if (!entry) {
      tried.push(`${place.name}: no household member to tell the player`);
      continue;
    }
    const moment = book.momentsById.get(entry.momentId)!;
    const result = purposeScene(core, director, me, entry, {
      typeKey: "rival-filed",
    });
    expect(result?.kind, `${where}: ${JSON.stringify(result)}`).toBe(
      "composed",
    );
    if (result?.kind !== "composed") continue;
    const { scene } = result;
    const fact = (key: string) => scene.facts.find((row) => row.key === key);
    const filings = ballot(api, race.id).filter((row) => row.personId !== me);
    expect(fact("already-filed")?.text, where).toBe(String(filings.length));
    // A list names three, then counts (Fable A, Nov 13, rule 2): with more
    // than three, the first two to file and how many others.
    const inOrder = [...filings].sort(
      (a, b) => a.filedOn.localeCompare(b.filedOn) || a.id.localeCompare(b.id),
    );
    const named = inOrder.length > 3 ? inOrder.slice(0, 2) : inOrder;
    for (const row of filings) {
      expect(fact("rivals")?.recordIds, where).toContain(row.id);
      const person = core.people.get(row.personId as PersonId)!;
      if (!named.includes(row)) continue;
      expect(fact("rivals")?.text, where).toContain(
        `${person.givenName} ${person.familyName}`,
      );
      const incumbent = incumbentOf(api, race.id);
      if (incumbent?.personId === row.personId)
        expect(fact("rivals")?.text, where).toContain(
          `incumbent ${person.givenName}`,
        );
    }
    if (inOrder.length > 3)
      expect(fact("rivals")?.text, where).toMatch(/ and \w+ others$/);
    // A party is never said before every name.
    expect(fact("rivals")?.text, where).not.toMatch(/ candidate /);
    expect(scene.cause.id, where).toBe(moment.causeId);
    expect(scene.talk.state.text, where).toContain(
      fact("rivals")!.text.split(" and ")[0]!,
    );
    expect(scene.talk.state.text, where).not.toMatch(/[{}]|undefined/);

    // The original cause still plays for a candidate who filed first.
    const first = earlier
      .map((id) => director.ledger.people.get(id as PersonId))
      .find((other) =>
        other?.schedule.some((row) =>
          row.bindings.some((b) => b.typeKey === "rival-filed"),
        ),
      );
    process.stdout.write(
      `RIVAL FILED LATE ${where}: ${race.id}, player ${me} filed after ${filings.map((row) => row.id).join(", ")}; the day after (${moment.date}) "${scene.talk.state.text}" from ${moment.causeId}; earlier filers told by rival-filed: ${first ? `${first.personId} (${first.schedule.find((row) => row.bindings.some((b) => b.typeKey === "rival-filed"))!.momentId})` : "none had a household to tell them"}\n`,
    );
    return;
  }
  throw new Error(
    `no late filing was told: ${tried.join("; ")} (seed ${seed})`,
  );
}, 1_800_000);
