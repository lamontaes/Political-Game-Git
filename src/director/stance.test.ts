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
  fileCandidacy,
  openContests,
  type FilingRow,
} from "../core2/modules/elections";
import { resultOf } from "../core2/modules/voting";
import { coreAPI } from "../core2/state";
import { openConversation } from "./conversation";
import { edgeBand, stanceRaises, STANCE_DATA } from "./stance";
import stanceBank from "../../data/english/parts/stance.json" with { type: "json" };

// A boast, a threat and an alarm are raised from a recorded moment of the
// speaker's own, and the edge of the line is their traits' lean through the
// shared trait-act table (owner: arrogance, anger and fear).
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const place = drawPlace(seed, "stance");
const stanceTexts = new Set(
  (stanceBank.parts as { text: string }[]).map((part) => part.text),
);

it("the edge band slides across the lean, never flipping at one value", () => {
  const bands = [-1, -0.5, -0.01, 0.01, 0.5, 1].map(edgeBand);
  expect(bands).toEqual([
    "edge-0",
    "edge-1",
    "edge-1",
    "edge-2",
    "edge-3",
    "edge-3",
  ]);
  expect(new Set(bands).size).toBe(STANCE_DATA.levels);
});

it(`the winner of a count boasts and a candidate who lost to the player threatens, in ${place.name}, seed ${seed}`, () => {
  setBookkeeping(false);
  const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  // Residents stand for the same town seat, so there is a count with a loser.
  const contest = openContests(api).find(
    (row) => row.family === "municipalOffice" || row.family === "countyOffice",
  );
  expect(contest, "a local contest open for filing").toBeTruthy();
  const town = [...core.people.values()]
    .filter((p) => p.alive && p.id !== core.playerId)
    .sort((a, b) => a.id.localeCompare(b.id));
  const filings: FilingRow[] = [];
  for (const person of town) {
    if (filings.length >= 4) break;
    director.watch(core, person.id);
    const result = fileCandidacy(api, {
      personId: person.id,
      contestId: contest!.id,
      platform: [],
    });
    if (result.status === "on-ballot") filings.push(result.filing);
  }
  expect(filings.length, "residents who can file").toBeGreaterThan(1);
  // Everyone on the ballot is watched, those the world put there too once
  // the filing deadline has passed.
  advanceCore(core, addDays(makeIsoDate(contest!.electionDate), -1));
  const ballot = (
    api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("filings")
      .rows() as unknown as FilingRow[]
  ).filter(
    (row) => row.contestId === contest!.id && core.people.has(row.personId),
  );
  for (const row of ballot) director.watch(core, row.personId);
  advanceCore(core, addDays(makeIsoDate(contest!.electionDate), 3));
  const result = resultOf(api, contest!.id);
  const winnerId = result?.winnerId;
  expect(winnerId, "a winner").toBeTruthy();
  const stood = ballot.map((row) => row.personId);
  expect(stood).toContain(winnerId);
  const said: string[] = [];
  let boasts = 0;
  let threats = 0;
  const winnerMoments = director.ledger.people.get(winnerId!)?.moments ?? [];
  for (const loserId of stood.filter((id) => id !== winnerId)) {
    const boast = stanceRaises(core, winnerId!, loserId, winnerMoments).find(
      (row) => row.kind === "boast",
    );
    expect(boast, `${winnerId} has a boast`).toBeTruthy();
    // The loser walks up to the winner on the day after the count.
    const heard = openConversation(core, loserId, winnerId!, { director });
    const line = heard.lines.find((row) => row.kind === "boast-reply");
    expect(boast!.stage).toBe(edgeBand(boast!.lean));
    expect(boast!.sourceRecordIds).toContain(`election-result:${contest!.id}`);
    // Whether the count is what they talk about is the talk's weighing of
    // their recent moments; when it is, the line is the boast's.
    if (line) {
      expect(stanceTexts.has(line.text)).toBe(true);
      boasts += 1;
      said.push(
        `${winnerId} boasts to ${loserId} (${boast!.stage}, lean ${boast!.lean.toFixed(2)}): "${line.text}" [${boast!.sourceRecordIds.join(", ")}]`,
      );
    }
    // The loser, in front of the winner, threatens.
    const lost = director.ledger.people.get(loserId)?.moments ?? [];
    const threat = stanceRaises(core, loserId, winnerId!, lost).find(
      (row) => row.kind === "threat",
    );
    expect(threat, `${loserId} has a threat`).toBeTruthy();
    // The winner's night of the count is the scene the loser comes to.
    const night = winnerMoments.find(
      (m) => m.causeId === `election-result:${contest!.id}`,
    );
    const talk = openConversation(core, winnerId!, loserId, {
      director,
      ...(night ? { occasionId: night.id } : {}),
    });
    const threatened = talk.lines.find((row) => row.kind === "threat-reply");
    if (threatened) {
      expect(stanceTexts.has(threatened.text)).toBe(true);
      threats += 1;
      said.push(
        `${loserId} threatens ${winnerId} (${threat!.stage}, lean ${threat!.lean.toFixed(2)}): "${threatened.text}" [${threat!.sourceRecordIds.join(", ")}]`,
      );
    }
  }
  expect(boasts, "a spoken boast").toBeGreaterThan(0);
  expect(threats, "a spoken threat").toBeGreaterThan(0);
  console.log(`STANCE ${place.name} ${seed}\n${said.join("\n")}`);
}, 900_000);

it(`a person whose health took a serious turn raises the alarm with someone they know, in ${place.name}, seed ${seed}`, () => {
  setBookkeeping(false);
  const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const people = [...core.people.values()]
    .filter((p) => p.alive && p.id !== core.playerId)
    .sort((a, b) => a.id.localeCompare(b.id));
  for (const person of people) director.watch(core, person.id);
  const alarmLabels = STANCE_DATA.stances.alarm!.momentLabels;
  let sick: { id: string; label: string } | undefined;
  for (let month = 0; month < 13 && !sick; month += 1) {
    advanceCore(core, addDays(makeIsoDate(core.date), 30));
    for (const person of people) {
      const moment = (
        director.ledger.people.get(person.id)?.moments ?? []
      ).find((m) => alarmLabels.includes(m.label) && m.date <= core.date);
      if (moment && core.people.get(person.id)?.alive) {
        sick = { id: person.id, label: moment.label };
        break;
      }
    }
  }
  expect(
    sick,
    "someone watched fell seriously ill within the year",
  ).toBeTruthy();
  const speaker = core.people.get(sick!.id)!;
  // Someone they know, else the player who meets them.
  const listenerId =
    [...speaker.familyIds, ...speaker.knownIds].find(
      (id) => id !== sick!.id && core.people.get(id)?.alive,
    ) ?? core.playerId!;
  const moments = director.ledger.people.get(sick!.id)!.moments;
  const alarm = stanceRaises(core, sick!.id, listenerId!, moments).find(
    (row) => row.kind === "alarm",
  );
  expect(alarm, "an alarm from the illness record").toBeTruthy();
  const talk = openConversation(core, listenerId!, sick!.id, { director });
  const line = talk.lines.find((row) => row.kind === "alarm-reply");
  console.log(
    `ALARM ${place.name} ${seed} ${sick!.id} (${alarm!.stage}, lean ${alarm!.lean.toFixed(2)}) to ${listenerId}: ${line ? `"${line.text}"` : "(the talk was about something heavier)"} [${alarm!.sourceRecordIds.join(", ")}]`,
  );
  if (line) expect(stanceTexts.has(line.text)).toBe(true);
}, 900_000);
