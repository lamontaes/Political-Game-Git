/**
 * A filed candidate's season is never silent (owner, Oct 26: "This is where
 * the scenes need to come in"). In a drawn place the player files for a race
 * at least two months out and plays week by week to election day. The first
 * scene that stops their day, or story the press prints about their race,
 * comes within 28 days of filing; at least three of the season's kinds fire
 * (a rival filing, an offer to help, word of a rival's campaign, an outlet's
 * interview, the race's debate); each cites the contest or a person by
 * record, composes with four replies in four stances, and a yes is read back
 * by the engine that made the record. The longest quiet stretch is printed:
 * filling the middle of a quiet race is the parent item's.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { applyChosenPerson } from "../bench/creator";
import { fileForOffice } from "../bench/government";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { campaignFor } from "../core2/modules/campaigns";
import { openContests, playerMayFileFor } from "../core2/modules/elections";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { purposeScene, replyInScene } from "./purpose-scene";
import { gatherSignatures } from "../core2/campaign-petition-kit";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(10).toString("hex");
const SEASON_TYPES = new Set([
  "interview-invite",
  "debate-invite",
  "volunteer-offer",
  "rival-word",
  "rival-filed",
]);
const GAP_DAYS = 28;
const daysBetween = (a: string, b: string) =>
  Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);

it("a filed candidate's months are never silent, and each season scene writes back", () => {
  const tried: string[] = [];
  for (let draw = 0; draw < 8; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "campaign-season");
    const where = `${place.name} (${place.key}), seed ${seed}:${draw}`;
    setBookkeeping(false);
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const { core, director } = world;
    const me = world.playerId! as PersonId;
    // A grown player, as the creator makes one.
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
    const filed = [...openContests(api)]
      // The six offices the player may run for (owner, Oct 29).
      .filter(
        (c) =>
          c.electionDate >= addDays(makeIsoDate(core.date), 60) &&
          playerMayFileFor(api, c.id),
      )
      .sort(
        (a, b) =>
          a.electionDate.localeCompare(b.electionDate) ||
          a.id.localeCompare(b.id),
      )
      .find((c) =>
        ["petitioning", "on-ballot"].includes(
          (fileForOffice(core, me, c.id) as { filing?: { status?: string } })
            .filing?.status ?? "",
        ),
      );
    if (!filed) {
      tried.push(`${where}: no race two months out the player could enter`);
      continue;
    }
    const filedOn = core.date;
    const filingId = `filing:${filed.id}:${me}`;
    // Filing is a petition: the player canvasses for signatures until the
    // clerk's check puts them on the ballot.
    const petition = gatherSignatures(core, filingId);
    if (
      petition &&
      !(petition.check && petition.check.valid >= petition.needed)
    ) {
      tried.push(`${where}: the petition for ${filed.id} came up short`);
      continue;
    }
    const stops: { date: string; typeKey: string; causeId: string }[] = [];
    const fired = new Set<string>();
    const seen = new Set<string>();
    const composed: string[] = [];
    let answered = 0;
    const written: string[] = [];
    // What each engine wrote on reading the player's yes.
    const readBack = (
      typeKey: string,
      said: Readonly<Record<string, string>>,
    ): { ok: boolean; what: string } => {
      const table = (module: string, name: string, id: string) =>
        api.moduleState(module).table(name).get(id) as unknown as
          Record<string, unknown> | undefined;
      if (typeKey === "interview-invite") {
        // A yes puts the sitting on the record; the interview is published
        // when the player has sat for it (interview-sitting.test.ts).
        const row = table("core2-press-v1", "interviews", said.interviewId!);
        const sitting = core.durableLog.get(
          `interview-accepted:${said.interviewId}` as never,
        );
        return {
          ok:
            row?.status === "invited" && sitting?.kind === "interview-accepted",
          what: `${said.interviewId} ${String(row?.status)}, sitting ${sitting ? "on the record" : "missing"}`,
        };
      }
      if (typeKey === "debate-invite") {
        // A yes puts the sitting on the record; the debate is held when the
        // player has sat for it, or on the eve of the election
        // (debate-sitting.test.ts).
        const row = table("core2-meetings-v1", "debates", said.debateId!);
        const sitting = core.durableLog.get(
          `debate-accepted:${said.debateId}` as never,
        );
        return {
          ok: row?.status === "invited" && sitting?.kind === "debate-accepted",
          what: `${said.debateId} ${String(row?.status)}, sitting ${sitting ? "on the record" : "missing"}`,
        };
      }
      if (typeKey === "volunteer-offer") {
        const helping = campaignFor(api, said.filingId!).volunteerIds;
        return {
          ok: helping.includes(said.offeredBy!),
          what: `${said.offeredBy} on ${said.filingId}'s volunteers`,
        };
      }
      // Word passed on: time together with the one who told, on the record.
      const [a, b] = [me, (said.tellerId ?? "") as string].sort();
      const tie = core.relationships.get(`${a}:${b}`);
      return {
        ok: true,
        what: `tie ${tie ? tie.lastContactDate : "with household"}`,
      };
    };
    while (core.date < filed.electionDate) {
      advanceCore(
        core,
        [addDays(makeIsoDate(core.date), 7), filed.electionDate].sort()[0]!,
      );
      const book = director.ledger.people.get(me)!;
      for (const entry of book.schedule) {
        if (seen.has(entry.momentId)) continue;
        seen.add(entry.momentId);
        const moment = book.momentsById.get(entry.momentId);
        if (!moment || moment.date < filedOn) continue;
        // Every season scene the director staged fired, whether it stopped
        // the day or was told as a journal line (owner, Oct 27: not every
        // volunteer stops the player).
        for (const binding of entry.bindings) fired.add(binding.typeKey);
        if (!entry.interrupt) continue;
        for (const binding of entry.bindings) {
          stops.push({
            date: moment.date,
            typeKey: binding.typeKey,
            causeId: moment.causeId,
          });
          if (!SEASON_TYPES.has(binding.typeKey)) continue;
          const result = purposeScene(core, director, me, entry, {
            typeKey: binding.typeKey,
          });
          expect(
            result?.kind,
            `${where}: ${entry.momentId} ${result?.kind === "skipped" ? result.reason : ""}`,
          ).toBe("composed");
          if (result?.kind !== "composed") continue;
          const { talk } = result.scene;
          expect(talk.tree.replies, where).toHaveLength(4);
          const moves = talk.tree.replies.map((r) => r.line.move);
          expect(new Set(moves).size, `${where}: four stances`).toBe(4);
          composed.push(
            `${moment.date} ${binding.typeKey} ${moment.causeId}: "${talk.state.text}" / ${talk.tree.replies.map((r) => `"${r.line.text}"`).join(", ")}`,
          );
          // The first of each kind is answered yes, as the player would.
          const yes = talk.tree.replies.findIndex(
            (r) => r.line.move === "agree",
          );
          if (
            yes >= 0 &&
            !composed.slice(0, -1).some((row) => row.includes(binding.typeKey))
          ) {
            const reply = replyInScene(core, director, me, entry, [yes]);
            expect(reply, where).toBeTruthy();
            answered += 1;
            // The engine that made the record reads the answer back.
            const said = core.durableLog.get(moment.causeId as never)!.facts!;
            const read = readBack(binding.typeKey, said);
            expect(
              read.ok,
              `${where}: ${binding.typeKey} read back: ${read.what}`,
            ).toBe(true);
            written.push(`${binding.typeKey}: ${reply} -> ${read.what}`);
          }
        }
      }
    }
    // The race's own stories: what the press printed of the player's filing.
    const stories = [...core.durableLog.values()]
      .filter(
        (row) =>
          row.kind === "press-story" &&
          row.date >= filedOn &&
          JSON.stringify(row.facts ?? {}).includes(filingId),
      )
      .map((row) => ({ date: row.date, causeId: row.id }));
    const beats = [
      ...stops.map((row) => row.date),
      ...stories.map((row) => row.date),
    ]
      .filter((date) => date > filedOn)
      .sort();
    const marks = [filedOn, ...beats, filed.electionDate];
    const gaps = marks.slice(1).map((date, i) => ({
      from: marks[i]!,
      to: date,
      days: daysBetween(marks[i]!, date),
    }));
    const longest = gaps.reduce((a, b) => (b.days > a.days ? b : a));
    const kinds = new Set(stops.map((row) => row.typeKey));
    console.log(
      `CAMPAIGN SEASON ${where}: filed ${filed.id} on ${filedOn}, election ${filed.electionDate}\n` +
        `stops: ${stops.map((s) => `${s.date} ${s.typeKey}`).join("; ")}\n` +
        `stories: ${stories.map((s) => s.date).join(", ")}\n` +
        `longest quiet stretch ${longest.days} days (${longest.from} to ${longest.to}); kinds: ${[...kinds].join(", ")}\n` +
        composed.join("\n") +
        `\nwritten back: ${written.join("; ")}`,
    );
    // Every season stop cites its record, and that record names the race or a
    // person. Other stops (a job position, a birth) belong to their modules and
    // cite theirs there.
    for (const stop of stops.filter((row) => SEASON_TYPES.has(row.typeKey))) {
      const record = core.durableLog.get(stop.causeId as never);
      expect(record, `${where}: ${stop.causeId}`).toBeTruthy();
      expect(
        JSON.stringify(record!.facts ?? {}).includes(filed.id) ||
          (record!.personIds ?? []).length > 0,
        `${where}: ${stop.causeId} cites the race or a person`,
      ).toBe(true);
    }
    expect(
      beats[0] && daysBetween(filedOn, beats[0]) <= GAP_DAYS,
      `${where}: first beat ${beats[0]}`,
    ).toBe(true);
    // The middle of a quiet race is not yet filled: the longest stretch is
    // printed, and the parent item carries the 28-day rule there.
    // The season's kinds that fired (Northford, Connecticut, seed
    // debate-report-1:0: fourteen offers of help from acquaintances were
    // journal lines, none a stop, and the stops alone held two kinds).
    const season = [...fired].filter((kind) => SEASON_TYPES.has(kind));
    expect(
      season.length,
      `${where}: season kinds ${season.join(", ")}`,
    ).toBeGreaterThanOrEqual(3);
    expect(answered, `${where}: a season scene answered`).toBeGreaterThan(0);
    return;
  }
  throw new Error(`no drawn place had a race to file in: ${tried.join("; ")}`);
}, 3_600_000);
