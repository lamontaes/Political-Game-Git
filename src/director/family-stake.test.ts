/**
 * What a filing puts at stake at home, read from the household's own books
 * (owner, Nov 17, on the scene list: "Their savings and time are at stake.
 * That's a problem. That's why it keeps saying we only have 2 weeks of
 * savings. You took that literally... a lot of time that's just said
 * completely out of context"; the CTO's rule from that grade: money talk comes
 * from the household's actual books and only when they matter).
 *
 * In drawn places, residents of three kinds of household file for a local
 * race open to them:
 *
 * - a household the race strains: the filer puts their own money into the
 *   campaign (the campaign engine's `contributeOwnMoney`, the player's own
 *   choice on the campaign screen), and that money is what leaves the savings
 *   short of the race. The relative's stake is money, and its days are the
 *   ones the household's own records give;
 * - a household already short before the race (owner, Nov 17: "it keeps
 *   saying we only have 2 weeks of savings"): its savings fall short of the
 *   race whether or not anyone runs, the filer gives nothing and there is no
 *   young child, so the filing costs it nothing and nobody has a stake;
 * - a comfortable household: the filer gives nothing and has no young child
 *   at home. Nobody has a stake and the talk is not staged (the filing is the
 *   player's news at home instead);
 * - a working filer with a young child at home: the stake is time, naming the
 *   child and the employer the job's records hold.
 *
 * `GOLDEN_PATH_SEED` replays a draw; `STAKE_DRAWS` (default 4) sets how many
 * places are tried. Each place passed over is named with why.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import {
  addDays,
  ageOnDate,
  daysBetweenText,
  makeIsoDate,
} from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { contributeOwnMoney } from "../core2/modules/campaigns";
import { fileCandidacy, openContests } from "../core2/modules/elections";
import { filingClerkFor } from "../core2/modules/filing-clerk";
import { P } from "../core2/parameters";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId, PersonState } from "../core2/types";
import { spanSaid } from "../english/span-words";
import rulesFile from "./data/scene-talk-rules.json" with { type: "json" };
import { stakeOf } from "./family-stake";

const RULES = rulesFile.familyStakes;
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const DRAWS = Number(process.env.STAKE_DRAWS ?? 4);
const WEEKS = 60;

const alive = (core: CoreState, id: string) =>
  core.people.get(id as PersonId)?.alive
    ? core.people.get(id as PersonId)!
    : null;
const membersOf = (core: CoreState, person: PersonState) =>
  [...(core.households.get(person.householdId)?.memberIds ?? [])]
    .map((id) => alive(core, id))
    .filter((row): row is PersonState => !!row);
const adultOthers = (core: CoreState, person: PersonState) =>
  membersOf(core, person).filter(
    (row) =>
      row.id !== person.id &&
      ageOnDate(makeIsoDate(row.birthDate), makeIsoDate(core.date)) >=
        P.votingAge,
  );
const youngChild = (core: CoreState, person: PersonState) =>
  membersOf(core, person).some(
    (row) =>
      ageOnDate(makeIsoDate(row.birthDate), makeIsoDate(core.date)) <
      RULES.youngChildAge.value,
  );
/** The household's books as the stake reads them: savings, and costs less pay a day. */
const books = (core: CoreState, person: PersonState) => {
  const members = membersOf(core, person);
  const liquid = members.reduce((sum, row) => sum + row.liquidMinor, 0);
  const pay = members.reduce((sum, row) => {
    const job = row.jobId ? core.jobs.get(row.jobId) : undefined;
    return sum + (job && !job.endsAt ? job.wageDailyMinor : 0);
  }, 0);
  const gap =
    members.reduce((sum, row) => sum + row.livingCostDailyMinor, 0) - pay;
  return { liquid, gap };
};

it(`a filing's stake at home is what the race costs that household (seed ${seed})`, () => {
  const passed: string[] = [];
  let strained = "";
  let comfortable = "";
  let short = "";
  let time = "";
  for (
    let draw = 0;
    draw < DRAWS && !(strained && comfortable && short && time);
    draw++
  ) {
    const drawSeed = draw === 0 ? seed : `${seed}:${draw}`;
    const place = drawPlace(drawSeed, "family-stake");
    const where = `${place.name} (${place.key}), seed ${drawSeed}`;
    setBookkeeping(false);
    const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const local = () =>
      openContests(api).filter(
        (row) =>
          row.level !== "federal" &&
          row.level !== "state" &&
          daysBetweenText(core.date, row.electionDate) > 30,
      );
    for (let week = 0; week < WEEKS && !local().length; week++)
      advanceCore(core, addDays(makeIsoDate(core.date), 7));
    const races = local().sort((a, b) => a.id.localeCompare(b.id));
    if (!races.length) {
      passed.push(`${where}: no local race open in ${WEEKS} weeks`);
      continue;
    }
    const clerks = new Set(
      races.map((race) => filingClerkFor(api, race.id)?.personId),
    );
    const homes = new Set<string>();
    const candidates = [...core.people.values()]
      .filter(
        (p) =>
          p.alive &&
          p.id !== core.playerId &&
          !clerks.has(p.id) &&
          adultOthers(core, p).length > 0,
      )
      .sort((a, b) => a.id.localeCompare(b.id));
    const gate = RULES.runwayShortfall.value;
    /** Files one resident in the first local race that takes them; the filing id, or null. */
    const file = (person: PersonState) => {
      for (const race of races) {
        const result = fileCandidacy(api, {
          personId: person.id,
          contestId: race.id,
          platform: [],
        });
        if (["petitioning", "on-ballot"].includes(result.status ?? ""))
          return { filing: result.filing, race };
      }
      return null;
    };
    const cases: {
      kind: "strained" | "comfortable" | "short" | "time";
      person: PersonState;
      filingId: string;
      raceDays: number;
    }[] = [];
    const want = (kind: "strained" | "comfortable" | "short" | "time") =>
      !cases.some((row) => row.kind === kind) &&
      !{ strained, time, short, comfortable }[kind];
    for (const person of candidates) {
      if (homes.has(person.householdId)) continue;
      const child = youngChild(core, person);
      const { liquid, gap } = books(core, person);
      const raceDays = daysBetweenText(core.date, races[0]!.electionDate);
      // A household the filer's own money can strain: its savings carry the
      // race today, and the filer holds enough to put it under the gate.
      const target = Math.floor(raceDays * (1 - gate)) - 1;
      const give = liquid - Math.max(0, target) * gap;
      const kind =
        !child &&
        gap > 0 &&
        liquid / gap >= raceDays &&
        give > 0 &&
        give <= person.liquidMinor &&
        want("strained")
          ? "strained"
          : child && person.jobId && want("time")
            ? "time"
            : !child &&
                gap > 0 &&
                liquid / gap < raceDays * (1 - gate) - 2 &&
                want("short")
              ? "short"
              : !child &&
                  (gap <= 0 ||
                    (liquid - Math.floor(person.liquidMinor / 100)) / gap >=
                      raceDays) &&
                  want("comfortable")
                ? "comfortable"
                : null;
      if (!kind) continue;
      homes.add(person.householdId);
      director.watch(core, person.id);
      core.focusPersonIds.add(person.id);
      const filed = file(person);
      if (!filed) continue;
      const days = daysBetweenText(core.date, filed.race.electionDate);
      if (kind === "strained") {
        // The player's own choice on the campaign screen, through the
        // campaign engine's own call, the day they file.
        const given = contributeOwnMoney(api, filed.filing.id, give);
        expect(given, `${where}: own money not given`).toBe(give);
      } else if (kind === "comfortable" && person.liquidMinor > 0)
        // A little of the filer's own money that leaves the house carried:
        // money given is not by itself a stake.
        contributeOwnMoney(
          api,
          filed.filing.id,
          Math.floor(person.liquidMinor / 100),
        );
      cases.push({ kind, person, filingId: filed.filing.id, raceDays: days });
      if (cases.length === 4) break;
    }
    // The day closes and the director stores the filing's moment.
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    for (const row of cases) {
      const causeId = `candidate-filed:${row.filingId}`;
      const here = `${where}: ${row.kind} ${row.person.id} (${causeId})`;
      const entry = director.ledger.people
        .get(row.person.id)
        ?.schedule.find((e) => e.momentId.includes(causeId));
      expect(entry, `${here}: no moment`).toBeTruthy();
      const staged = entry!.bindings.find((b) => b.typeKey === "family-filing");
      const stakes = adultOthers(core, row.person).map((other) => ({
        other,
        stake: stakeOf(core, row.person.id, causeId, other.id),
      }));
      if (row.kind === "comfortable" || row.kind === "short") {
        // No stake: no money talk, and no scene; the filing is news at home.
        for (const { stake } of stakes) expect(stake, here).toBeNull();
        expect(staged, `${here}: staged with no stake`).toBeUndefined();
        if (row.kind === "short") {
          const { liquid, gap } = books(core, row.person);
          short = `${here}: savings carry ${spanSaid(Math.floor(liquid / gap))} of a ${spanSaid(row.raceDays - 1)} race, and nobody was staged`;
        } else comfortable = here;
        continue;
      }
      const found = stakes.find((s) => s.stake)?.stake;
      if (row.kind === "strained") {
        expect(
          found?.kind,
          `${here}: the race's cost gave no money stake`,
        ).toBe("money");
        // The days the household's own savings carry, after the race's cost.
        const after = books(core, row.person);
        expect(found!.facts.cushion?.text, here).toBe(
          spanSaid(Math.floor(after.liquid / after.gap)),
        );
        expect(found!.facts.remaining?.text, here).toBe(
          spanSaid(row.raceDays - 1),
        );
        expect(found!.facts["gave-own"]?.recordIds, here).toContain(
          `${row.filingId}|${row.person.id}`,
        );
        expect(staged, `${here}: a strained house was not staged`).toBeTruthy();
        strained = `${here}: cushion "${found!.facts.cushion!.text}", race "${found!.facts.remaining!.text}"`;
      } else {
        expect(found?.kind, `${here}: no time stake`).toBe("time");
        const child = found!.facts.child!;
        expect(alive(core, child.recordIds[0]!)?.givenName, here).toBe(
          child.text,
        );
        expect(found!.facts["stake-time"]!.recordIds, here).toContain(
          row.person.jobId,
        );
        expect(staged, `${here}: a time stake was not staged`).toBeTruthy();
        time = `${here}: child ${child.text}, employer ${found!.facts.employer?.text ?? "(not said)"}`;
      }
    }
    for (const kind of ["strained", "comfortable", "short", "time"])
      if (!cases.some((row) => row.kind === kind))
        passed.push(`${where}: no ${kind} household filed`);
  }
  process.stdout.write(
    `family-stake (seed ${seed})\n  strained: ${strained}\n  comfortable: ${comfortable}\n  short: ${short}\n  time: ${time}\n  passed over: ${passed.join("; ") || "none"}\n`,
  );
  expect(strained, `no strained household: ${passed.join("; ")}`).toBeTruthy();
  expect(
    comfortable,
    `no comfortable household: ${passed.join("; ")}`,
  ).toBeTruthy();
  expect(
    short,
    `no household short before the race: ${passed.join("; ")}`,
  ).toBeTruthy();
  expect(
    time,
    `no working filer with a young child: ${passed.join("; ")}`,
  ).toBeTruthy();
}, 900_000);
