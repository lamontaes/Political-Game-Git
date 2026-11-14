/**
 * The clerk and the filing fee (Words lead, Nov 14, carried with #8722): in
 * drawn places (fixed seed, replay with FILING_FEE_TALK_SEED) the clerk names
 * the fee once when the race has one, says it is paid when a candidate who
 * holds it files, and, for a candidate short of it, says so, says how long
 * they have, and offers "I'll come back with it", whose reply is recorded.
 * A race with no fee gets no fee line. The lines as played are written to
 * FILING_FEE_TALK_OUT when it is set, for the second words reader.
 */
import { appendFileSync } from "node:fs";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  ELECTIONS_MODULE_ID,
  checkEligibility,
  filingOfficeFor,
  playerContests,
} from "../core2/modules/elections";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { chooseAtCounter, openBenchFilingVisit } from "./filing";
import { buildBenchWorld } from "./world";

const seed = process.env.FILING_FEE_TALK_SEED ?? "fee-talk-7";
const ATTEMPTS = 12;
const out = process.env.FILING_FEE_TALK_OUT;

it(`the clerk names the fee once, says it is paid, or tells a candidate short of it how long they have (seed ${seed})`, () => {
  setBookkeeping(false);
  const seen = { paid: "", short: "", free: "" };
  const tried: string[] = [];
  const note = (text: string) => {
    process.stdout.write(`${text}\n`);
    if (out) appendFileSync(out, `${text}\n`);
  };
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    if (seen.paid && seen.short && seen.free) break;
    const place = drawPlace(seed, `filing-fee-talk:${attempt}`);
    const where = `${place.name} (${place.key}), seed ${seed}:${attempt}`;
    const { core, playerId } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const town = core.people.get(playerId!)?.placeId;
    const grown = [...core.people.values()]
      .filter(
        (row) =>
          row.alive &&
          row.tier !== "husk" &&
          row.placeId === town &&
          row.birthDate < "1990-01-01",
      )
      .sort((a, b) => a.id.localeCompare(b.id));
    const filedIn = (id: string) =>
      new Set(
        (
          api
            .moduleState(ELECTIONS_MODULE_ID)
            .table("filings")
            .query("byPerson", [id]) as unknown as {
            contestId: string;
            status: string;
          }[]
        )
          .filter(
            (row) => row.status === "petitioning" || row.status === "on-ballot",
          )
          .map((row) => row.contestId),
      );
    // The first case of each kind in the resident list and the open races.
    const find = () => {
      const first = core.playerId;
      let got: { person: PersonId; contestId: string; kind: string } | null =
        null;
      for (const person of grown) {
        core.playerId = person.id as PersonId;
        for (const contest of playerContests(api)) {
          if (filedIn(person.id).has(contest.id)) continue;
          const checks = checkEligibility(api, person.id, contest.id);
          const fee = checks.find((c) => c.rule === "filing-fee");
          const others = checks.filter(
            (c) => c.rule !== "filing-fee" && !c.met,
          );
          if (others.length) continue;
          const kind = !fee ? "free" : fee.met ? "paid" : "short";
          if (!seen[kind as keyof typeof seen]) {
            got = {
              person: person.id as PersonId,
              contestId: contest.id,
              kind,
            };
            break;
          }
        }
        if (got) break;
      }
      core.playerId = first;
      return got;
    };
    let found = find();
    for (let week = 0; week < 104 && !found; week += 1) {
      advanceCore(core, addDays(makeIsoDate(core.date), 7));
      found = find();
    }
    if (!found) {
      tried.push(`${where}: no new case`);
      continue;
    }
    const me = found.person;
    core.playerId = me;
    const filedWith = filingOfficeFor(api, found.contestId).filedWith;
    let state = openBenchFilingVisit(core, me, filedWith, 10 * 60);
    if (!state.visit.clerkId) {
      tried.push(`${where}: ${filedWith} has no clerk`);
      continue;
    }
    const pick = `pick:${found.contestId}`;
    if (!state.visit.choices.some((row) => row.key === pick)) {
      tried.push(`${where}: race not offered at ${filedWith}`);
      continue;
    }
    const cash = core.people.get(me)!.liquidMinor;
    state = chooseAtCounter(core, state, pick);
    const talk = state.visit.lines.map((l) => `${l.speaker}: ${l.text}`);
    const feeLines = state.visit.lines.filter((line) =>
      /fee|to file|It's \$|\$\d/.test(line.text),
    );
    note(`\n## ${found.kind} — ${where}, cash $${Math.floor(cash / 100)}`);
    for (const line of talk) note(`- ${line}`);
    if (found.kind === "free") {
      expect(
        state.visit.lines.some((l) =>
          /filing fee|fee to file|to file\./.test(l.text),
        ),
        where,
      ).toBe(false);
      seen.free = where;
    } else {
      // The sum is named once, by the clerk, from the filing rules.
      const sums = state.visit.lines.filter(
        (l) => l.speaker === "clerk" && /\$[\d,]+/.test(l.text),
      );
      expect(
        sums.length,
        `${where}: the fee is said once ${JSON.stringify(feeLines)}`,
      ).toBeGreaterThanOrEqual(1);
      if (found.kind === "paid") {
        const file = state.visit.choices.find((row) => row.control === "file");
        expect(file, where).toBeTruthy();
        state = chooseAtCounter(core, state, file!.key, { platform: [] });
        const after = state.visit.lines.slice(talk.length);
        for (const line of after) note(`- ${line.speaker}: ${line.text}`);
        expect(
          after.some(
            (l) =>
              l.speaker === "clerk" && /receipt|paid|on the list/i.test(l.text),
          ),
          `${where}: the clerk says it is paid`,
        ).toBe(true);
        expect(core.people.get(me)!.liquidMinor, where).toBeLessThan(cash);
        seen.paid = where;
      } else {
        const back = state.visit.choices.find((row) => row.key === "come-back");
        expect(back, `${where}: a way to say they will come back`).toBeTruthy();
        expect(
          state.visit.lines.some((l) => /closes|until/.test(l.text)),
          `${where}: the clerk says how long they have`,
        ).toBe(true);
        const before = core.people.get(me)!.liquidMinor;
        state = chooseAtCounter(core, state, "come-back");
        note(`- player: ${back!.text}`);
        expect(state.visit.lines.at(-1)!.text, where).toBe(back!.text);
        expect(
          core.durableLog.has(
            `scene-reply:filing-counter:${found.contestId}:${me}:`,
          ),
          `${where}: the reply is recorded`,
        ).toBe(true);
        expect(core.people.get(me)!.liquidMinor, where).toBe(before);
        seen.short = where;
      }
    }
  }
  expect(
    Boolean(seen.paid && seen.short && seen.free),
    `not every case was found in ${ATTEMPTS} drawn places: ${JSON.stringify(seen)}; ${tried.join("; ")} (seed ${seed})`,
  ).toBe(true);
}, 1_800_000);
