/* global process, console */
// Roadmap M2-03, filing in person, as the play screen files, headless, in the
// place the golden-path runner draws (GOLDEN_PATH_SEED, GOLDEN_PATH_PLACE_KEY).
// The player is the resident who turns 18 soonest. First they walk into the
// office that takes filings for a contest whose rules they don't meet (an
// age, residency or deadline its records name) and name it: the clerk says
// the rule that stops them and offers no way to file. At 18 they walk in
// where a contest they can enter files, state a platform and file once: they
// are on the ballot, and a second filing is refused. No one gathers signatures or pays a
// fee (owner, Oct 13; src/core2/modules/elections.ts). Exits nonzero naming
// each failed clause.
// Usage: node --max-old-space-size=8192 --import tsx src/bench/m2-03-check.ts
import { buildBenchWorld } from "./world";
import { BenchPlayer } from "./player";
import { governmentView, fileForOffice } from "./government";
import { chooseAtCounter, openBenchFilingVisit } from "./filing";
import { gameStartDate } from "../core2/game-start";
import { setBookkeeping } from "../core2/bookkeeping";
import { coreAPI } from "../core2/state";
import { ballot } from "../core2/modules/elections";
import { addDays, makeIsoDate } from "../core2/kernel/dates";

const seed = process.env.GOLDEN_PATH_SEED ?? "m2-03-check";
const placeKey = process.env.GOLDEN_PATH_PLACE_KEY;
const failures: string[] = [];
const check = (ok: unknown, message: string) => {
  if (!ok) failures.push(message);
};

setBookkeeping(false);
const w = buildBenchWorld(seed, gameStartDate(), {
  twoLevel: true,
  ...(placeKey ? { placeKey } : {}),
});
const me = w.playerId!;
const player = new BenchPlayer(w.core, w.director);
player.select(me);
const where = `${w.place.displayName} (${w.place.key}), seed ${seed}`;
const report: Record<string, unknown> = { place: where, player: me };

/** Live until the date, the character answering its own choices. */
function liveUntil(date: string) {
  for (let guard = 0; w.core.date < date && guard < 400; guard++) {
    if (player.pollingPlace) player.leavePolls();
    const packet =
      player.packet?.kind === "stop"
        ? player.packet
        : player.advance(
            "calendar",
            addDays(makeIsoDate(player.packet?.at.date ?? w.core.date), 7),
          ).packet;
    if (packet.kind === "stop")
      player.resume({ kind: "stop", pauseId: packet.pauseId });
  }
}

/** Walk in where the contest files, name it, and file if the counter offers it. */
function visitCounter(contestId: string, filedWith: string) {
  let visit = openBenchFilingVisit(w.core, me, filedWith, 12 * 60);
  const greeting = visit.visit.lines.length;
  const pick = visit.visit.choices.find(
    (row) => row.action.kind === "pick" && row.action.contestId === contestId,
  );
  if (!pick) return { visit, greeting, picked: false, offeredFile: false };
  visit = chooseAtCounter(w.core, visit, pick.key);
  const file = visit.visit.choices.find((row) => row.action.kind === "file");
  // The platform the overlay asks for: the player is for its first question.
  const question = visit.overlay?.questions[0];
  if (file)
    visit = chooseAtCounter(w.core, visit, file.key, {
      platform: question ? [`${question}=1`] : [],
    });
  return { visit, greeting, picked: true, offeredFile: Boolean(file) };
}

// 1. Ineligible: told the rule in words, and no way to file.
const young = governmentView(w.core, me).contests.find((c) =>
  c.checks.some((k) => !k.met),
);
if (!young)
  failures.push(`${where}: no open contest has a rule the player doesn't meet`);
else {
  const counter = visitCounter(young.contest.id, young.filingOffice.filedWith);
  // What the clerk says once the player names the office: its terms, then
  // one line for each rule that stops the filing.
  const lines = counter.visit.visit.lines;
  const named = lines.findIndex((line) => line.speaker === "player");
  const ruleLines = lines
    .slice(named + 1)
    .filter((line) => line.speaker === "clerk");
  const unmet = young.checks.filter((k) => !k.met).length;
  report.ineligible = {
    unmet: young.checks.filter((k) => !k.met).map((k) => k.rule),
    contestId: young.contest.id,
    filedWith: young.filingOffice.filedWith,
    clerkSaid: ruleLines.map((line) => line.text),
  };
  check(
    counter.greeting > 0,
    `${where}: nobody greets the player at ${young.filingOffice.filedWith}`,
  );
  check(
    counter.picked,
    `${where}: ${young.contest.id} is not offered at its own filing office`,
  );
  check(
    !counter.offeredFile,
    `${where}: an ineligible player was offered a way to file for ${young.contest.id}`,
  );
  check(
    named >= 0 && ruleLines.length >= 1 + unmet,
    `${where}: the clerk did not say the rule that stops the player (${ruleLines.length} lines)`,
  );
  check(
    !ballot(coreAPI(w.core), young.contest.id).some((f) => f.personId === me),
    `${where}: an ineligible player is on the ballot for ${young.contest.id}`,
  );
}

// 2. At 18: file once, with a platform, at the real office; on the ballot.
const born = w.core.people.get(me)!.birthDate;
const eighteenth = `${Number(born.slice(0, 4)) + 18}${born.slice(4)}`;
if (w.core.date <= eighteenth) liveUntil(addDays(makeIsoDate(eighteenth), 1));
const gov = governmentView(w.core, me);
const enterable = gov.contests.find((c) => c.checks.every((k) => k.met));
if (!enterable)
  failures.push(`${where}: at 18 there is no contest the player can enter`);
else {
  const counter = visitCounter(
    enterable.contest.id,
    enterable.filingOffice.filedWith,
  );
  const overlay = counter.visit.overlay;
  check(
    overlay,
    `${where}: naming ${enterable.contest.id} showed no filing overlay`,
  );
  const result = counter.visit.result as
    | {
        status: string;
        filing?: { id: string; platform: string[]; filedWith: string };
      }
    | undefined;
  report.filed = {
    contestId: enterable.contest.id,
    title: enterable.contest.title,
    filedWith: enterable.filingOffice.filedWith,
    date: w.core.date,
    result,
  };
  check(
    counter.offeredFile,
    `${where}: an eligible 18-year-old was offered no way to file`,
  );
  check(
    (result?.filing?.platform.length ?? 0) > 0,
    `${where}: the filing kept no platform`,
  );
  check(
    result?.status === "on-ballot",
    `${where}: filing for ${enterable.contest.id} came back ${result?.status ?? "with nothing"}`,
  );
  check(
    result?.filing?.filedWith === enterable.filingOffice.filedWith,
    `${where}: the filing names ${result?.filing?.filedWith}, not ${enterable.filingOffice.filedWith}`,
  );
  check(
    ballot(coreAPI(w.core), enterable.contest.id).some(
      (f) => f.personId === me,
    ),
    `${where}: the player is not on the ballot for ${enterable.contest.id}`,
  );
  // Once: a second filing for the same contest is refused.
  const second = fileForOffice(w.core, me, enterable.contest.id) as {
    status: string;
    unmet?: { rule: string }[];
  };
  report.second =
    second.status === "refused"
      ? second.unmet?.map((u) => u.rule)
      : second.status;
  check(
    second.status === "refused" &&
      second.unmet?.some((u) => u.rule === "already-filed"),
    `${where}: a second filing for ${enterable.contest.id} came back ${second.status}`,
  );
}

console.log(JSON.stringify(report, null, 2));
if (failures.length) {
  console.error(`M2-03 FAIL:\n${failures.join("\n")}`);
  process.exit(1);
}
console.log(`M2-03 passed: ${where}`);
