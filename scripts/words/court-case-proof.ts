/**
 * A housemate's court case told through the words composer, proved in played
 * worlds (Words builder S3, Nov 14, 2026). Development tooling; nothing here
 * words anything, and shipped play never imports it.
 *
 *   node --import tsx scripts/words/court-case-proof.ts --seed <seed> [--draws 3]
 *
 * Each draw takes a place from all 56 by the seed and plays the bench's world
 * (`buildBenchWorld`, two-level). **Staged and labeled:** a bribe the
 * player's housemate paid is put on the corruption engine's record and the
 * justice engine's own charging step charges them; the verdict comes on the
 * engine's own trial day or at once with a plea. Everything after that (the
 * house's moments, the talk opened with the director's occasion, each
 * telling and its answers) is the engine's own. Prints each line with its
 * bearing and the facts it was composed from.
 */
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { advanceCore } from "../../src/core2/life";
import { addDays, ageOnDate, makeIsoDate } from "../../src/core2/kernel/dates";
import type { CoreState, PersonId } from "../../src/core2/types";
import {
  openConversation,
  say,
  subjectsBetween,
} from "../../src/director/conversation";
import { coreAPI } from "../../src/core2/state";
import {
  chargeDecision,
  JUSTICE_MODULE_ID,
  type CaseRow,
  type InvestigationRow,
} from "../../src/core2/modules/justice";
import {
  CORRUPTION_MODULE_ID,
  type CrimeRecord,
} from "../../src/core2/modules/corruption";
import { servingTermsOf } from "../../src/core2/modules/offices";
import { drawPlace } from "../core2-year/place";
import { gameStartDate } from "../../src/core2/game-start";
import bank from "../../data/english/parts/conversation.json";

const option = (name: string, fallback: string) => {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 ? (process.argv[at + 1] ?? fallback) : fallback;
};
const seed = option("seed", "court-case");
const draws = Number(option("draws", "3"));
// The staged evidence: strength of the case against them, the bribe's amount,
// and whether the offer was refused (the official reported it). The same
// seed names the same place, so cases vary on one pinned place.
const strength = Number(option("strength", "1"));
const amountMinor = Number(option("amount", "100000"));
const refused = option("refused", "no") === "yes";
// Money on hand the accused can put into a defense (the justice engine's own
// reading of a person's cash against a defense's cost), in dollars; staged.
const liquid = option("liquid", "");
// The player is the one charged, and a housemate asks them about it
// (the other way round: the talk's asks and the player's answers).
const playerCharged = option("player-charged", "no") === "yes";
// Per reply, how many other days' draws of the same reply to list, so every
// wording the bank can give for these facts is shown played.
const redraws = Number(option("redraws", "14"));
const KINDS = new Set(["charge", "conviction", "acquittal"]);
const bearings = new Map(
  (bank.parts as { key: string; bearing?: string }[]).map((row) => [
    row.key,
    row.bearing ?? "none",
  ]),
);
const bearingOf = (parts: readonly string[] | undefined) =>
  (parts ?? []).map((key) => bearings.get(key) ?? "none").join("+");
const nameOf = (core: CoreState, id: string) => {
  const row = core.people.get(id as PersonId);
  return row ? `${row.givenName} ${row.familyName}` : id;
};

setBookkeeping(false);
for (let draw = 0; draw < draws; draw += 1) {
  const place = drawPlace(`${seed}:${draw}`, "court-case");
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const { core, director } = world;
  const playerId = world.playerId!;
  const api = coreAPI(core);
  director.watch(core, playerId);
  const home = core.households.get(
    core.people.get(playerId)!.householdId as never,
  );
  for (const id of home?.memberIds ?? []) director.watch(core, id);
  const housemate = (home?.memberIds ?? []).find((id) => {
    const person = core.people.get(id);
    return (
      id !== playerId &&
      person?.alive &&
      ageOnDate(makeIsoDate(person.birthDate), makeIsoDate(core.date)) >= 18
    );
  });
  const accused = playerCharged ? playerId : housemate;
  // Who speaks to the player: the accused, or the housemate asking.
  const partner = playerCharged ? housemate : accused;
  console.log(
    `\n## ${place.name} (draw ${seed}:${draw}, place seed ${place.seed}), player ${nameOf(core, playerId)}`,
  );
  if (!housemate || !accused || !partner) {
    console.log("  no adult housemate to charge in this place; skipped");
    continue;
  }
  if (liquid !== "")
    core.people.get(accused)!.liquidMinor = Number(liquid) * 100;
  const table = (name: string) =>
    api.moduleState(JUSTICE_MODULE_ID).table(name);
  // An official who is not the accused or the player: the one who refused.
  const otherId = [...core.people.keys()].find(
    (id) =>
      id !== accused &&
      id !== playerId &&
      core.people.get(id)?.alive &&
      servingTermsOf(api, id).length > 0,
  );
  const crime: CrimeRecord = {
    id: `crime:court-case:${seed}:${draw}`,
    kind: "bribe",
    date: core.date,
    offererId: accused,
    officialId: refused || playerCharged ? (otherId ?? housemate!) : playerId,
    amountMinor,
    subjectId: "",
    offered: true,
    taken: !refused,
    reasons: {},
  } as CrimeRecord;
  api
    .moduleState(CORRUPTION_MODULE_ID)
    .table("crimes")
    .put(crime as never);
  const investigation: InvestigationRow = {
    id: `investigation:court-case:${seed}:${draw}`,
    complaintIds: [],
    crimeId: crime.id,
    prosecutorOfficeId: "office:court-case",
    prosecutorPersonId: null,
    opened: true,
    date: core.date,
    reasons: {},
    targets: [
      { personId: accused, crimeIds: [crime.id], evidence: [], strength },
    ],
    status: "open",
  };
  table("investigations").put(investigation as never);
  chargeDecision(api, investigation.id);
  const caseId = `case:${investigation.id}:${accused}`;
  console.log(
    `  STAGED on ${core.date}: ${nameOf(core, accused)} (${accused}) paid a bribe (${crime.id}; strength ${strength}, amount ${amountMinor / 100}, ${refused ? "refused and reported" : "taken"}); the justice engine's own charging step made ${caseId}`,
  );
  const told = new Set<string>();
  const tell = (advance = true) => {
    if (advance) advanceCore(core, addDays(makeIsoDate(core.date), 1));
    for (const subject of subjectsBetween(
      core,
      accused,
      playerCharged ? partner : playerId,
      director,
    )) {
      if (!KINDS.has(subject.kind) || told.has(subject.id)) continue;
      told.add(subject.id);
      const occasion = director.ledger.people
        .get(playerId)
        ?.moments.find((m) => subject.id.endsWith(m.causeId));
      const first = openConversation(core, playerId, partner, {
        director,
        ...(occasion ? { occasionId: occasion.id } : {}),
      });
      const line = first.lines.find((l) => l.kind.startsWith(subject.kind));
      if (!line) {
        console.log(
          `\n### ${core.date}: ${subject.kind}: the talk opened another subject first: ${first.lines.map((l) => l.text).join(" / ") || "(nothing)"}`,
        );
        continue;
      }
      console.log(
        `\n### ${core.date}: ${subject.kind}, record ${subject.id}; ${nameOf(core, partner)} ${playerCharged ? "asks the player" : "tells the player"}`,
      );
      console.log(
        `  ${nameOf(core, partner)}: ${line.text}  {bearing: ${bearingOf(line.wording?.parts)}} [${line.wording?.facts.join(", ")}]`,
      );
      for (const choice of first.choices)
        console.log(`  - offered: ${choice.text} (${choice.move})`);
      // The same opening on other days' draws: the other wordings of the
      // line and of the choices (labeled: only the day id moves).
      {
        const lines = new Set<string>();
        const offered = new Set<string>();
        const realDay = core.date;
        for (let k = 1; k <= redraws; k += 1) {
          (core as { date: string }).date = addDays(makeIsoDate(realDay), k);
          const again = openConversation(core, playerId, partner, {
            director,
            ...(occasion ? { occasionId: occasion.id } : {}),
          });
          const row = again.lines.find((l) => l.kind.startsWith(subject.kind));
          if (row) lines.add(row.text);
          for (const c of again.choices) offered.add(c.text);
        }
        (core as { date: string }).date = realDay;
        console.log(
          `    line also drawn on other days: ${[...lines].join(" | ") || "(none)"}`,
        );
        console.log(
          `    choices also drawn on other days: ${[...offered].join(" | ") || "(none)"}`,
        );
      }
      for (const choice of first.choices) {
        const talk = Object.fromEntries(
          Object.entries(first).map(([key, value]) => [
            key,
            Array.isArray(value) ? [...value] : value,
          ]),
        ) as typeof first;
        const from = talk.lines.length;
        say(core, talk, choice.key);
        const back = talk.lines
          .slice(from)
          .filter((l) => l.speakerId !== playerId)
          .map(
            (l) =>
              `${l.text} {bearing: ${bearingOf(l.wording?.parts)}} [${l.wording?.facts.join(", ")}]`,
          );
        // The same reply on other days' draws, from the same record: every
        // wording the bank can give for these facts, played (labeled: only the
        // draw's day id moves; nothing else in the world does).
        const drawn = new Set<string>();
        const realDate = core.date;
        for (let k = 1; k <= redraws; k += 1) {
          const other = Object.fromEntries(
            Object.entries(first).map(([key, value]) => [
              key,
              Array.isArray(value) ? [...value] : value,
            ]),
          ) as typeof first;
          (core as { date: string }).date = addDays(makeIsoDate(realDate), k);
          const before = other.lines.length;
          say(core, other, choice.key);
          for (const l of other.lines.slice(before))
            if (l.speakerId !== playerId) drawn.add(l.text);
        }
        (core as { date: string }).date = realDate;
        console.log(
          `  > You: ${choice.text}\n    ${nameOf(core, partner)}: ${back.join(" / ") || "(says nothing more)"}\n    offered next: ${talk.choices.map((c) => c.text).join(" | ") || "(nothing; the talk ends)"}`,
        );
        console.log(
          `    also drawn on other days (${redraws}): ${[...drawn].join(" | ") || "(nothing)"}`,
        );
      }
    }
  };
  tell(false);
  tell();
  const charged = table("cases").get(caseId) as unknown as CaseRow;
  if (charged.trialDate) {
    advanceCore(core, addDays(makeIsoDate(charged.trialDate), 1));
    console.log(
      `  trial day ${charged.trialDate} passed on the engine's own clock`,
    );
  }
  tell();
  // The sentencing or verdict, when the engine's own clock reaches it.
  for (let day = 0; day < 120 && told.size < 2; day += 1) tell();
}
