/**
 * A relative's death, serious illness or prison term told at home through the
 * words composer, proved in played worlds (Words builder, Nov 14, 2026).
 * Development tooling; nothing here words anything, and shipped play never
 * imports it.
 *
 *   node --import tsx scripts/words/relative-news-proof.ts --seed <seed> [--days 365] [--draws 3] [--talks 2]
 *
 * Each draw takes a place from all 56 by the seed and plays the bench's world
 * (`buildBenchWorld`, two-level) day by day. Nothing is staged: the day an
 * adult of the player's household has news of a relative on record (the
 * director's moment for it), the player talks with them through the engine
 * (`openConversation`, `say`): the telling, the replies offered and each
 * answer back, one talk per reply. Prints the place, seed, record ids and every
 * line as played, with the facts each line was composed from.
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
import { beginSeriousIllness } from "../../src/core2/modules/health";
import { familyFactsOf } from "../../src/core2/modules/people";
import { drawPlace } from "../core2-year/place";
import { gameStartDate } from "../../src/core2/game-start";
import bank from "../../data/english/parts/conversation.json";

/** The bearing each bank piece carries, by its key. */
const bearings = new Map(
  (bank.parts as { key: string; bearing?: string }[]).map((row) => [
    row.key,
    row.bearing ?? "none",
  ]),
);
const bearingOf = (parts: readonly string[] | undefined) =>
  (parts ?? []).map((key) => bearings.get(key) ?? "none").join("+");

const option = (name: string, fallback: string) => {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 ? (process.argv[at + 1] ?? fallback) : fallback;
};
const seed = option("seed", "relative-news");
const days = Number(option("days", "365"));
const draws = Number(option("draws", "1"));
const wanted = Number(option("talks", "2"));
const stage = option("stage", "");
const KINDS = new Set(["death-news", "illness-news", "prison-news"]);

const nameOf = (core: CoreState, id: string) => {
  const row = core.people.get(id as PersonId);
  return row ? `${row.givenName} ${row.familyName}` : id;
};

setBookkeeping(false);
for (let draw = 0; draw < draws; draw += 1) {
  const place = drawPlace(`${seed}:${draw}`, "relative-news");
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const { core, director } = world;
  const playerId = world.playerId!;
  // The director watches the player and the house, as the play loop does.
  director.watch(core, playerId);
  for (const id of core.households.get(
    core.people.get(playerId)!.householdId as never,
  )?.memberIds ?? [])
    director.watch(core, id);
  console.log(
    `\n## ${place.name} (draw ${seed}:${draw}, place seed ${place.seed}), player ${nameOf(core, playerId)}`,
  );
  const told = new Set<string>();
  let talks = 0;
  let passedOver = 0;
  for (let day = 0; day < days && talks < wanted; day += 1) {
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    if (stage === "illness" && day === 1) {
      // STAGED, never natural: the health engine's own onset is started for
      // the first living relative of the player who lives elsewhere.
      const home = core.households.get(
        core.people.get(playerId)!.householdId as never,
      );
      const kin = [...familyFactsOf(core.people.get(playerId)!).keys()].find(
        (id) => core.people.get(id)?.alive && !home?.memberIds.includes(id),
      );
      if (kin && beginSeriousIllness(coreAPI(core), kin))
        console.log(
          `  STAGED on ${core.date}: dev illness for ${nameOf(core, kin)} (${kin}), not a natural event`,
        );
    }
    const household = core.households.get(
      core.people.get(playerId)!.householdId as never,
    );
    if (!household) continue;
    for (const id of household.memberIds) {
      const person = core.people.get(id);
      if (!person?.alive || id === playerId) continue;
      if (ageOnDate(makeIsoDate(person.birthDate), makeIsoDate(core.date)) < 18)
        continue;
      for (const subject of subjectsBetween(core, id, playerId, director)) {
        if (!KINDS.has(subject.kind) || told.has(subject.id)) continue;
        told.add(subject.id);
        // The talk the director's household scene opens: the occasion is the
        // player's own moment for the news (its cause is the record).
        const cause = subject.id.slice(subject.kind.length + 1);
        const occasion = director.ledger.people
          .get(playerId)
          ?.moments.find((m) => m.causeId === cause);
        const first = openConversation(core, playerId, id, {
          director,
          ...(occasion ? { occasionId: occasion.id } : {}),
        });
        const line = first.lines.find((l) => l.kind === subject.kind);
        if (!line) {
          passedOver += 1;
          console.log(
            `\n### ${core.date}: ${subject.kind} ${subject.id}: the talk opened another subject first: ${first.lines.map((l) => l.text).join(" / ") || "(nothing)"}`,
          );
          continue;
        }
        talks += 1;
        if (process.env.PROOF_DEBUG)
          console.log(
            `  DEBUG heard keys with illness: ${[...(core.knowledgeByPerson.get(playerId) ?? [])].map(([k]) => k).filter((k) => k.includes("illness-news")).join(" | ") || "(none)"}`,
          );
        const row = familyFactsOf(core.people.get(playerId)!).get(
          subject.aboutId as PersonId,
        );
        console.log(
          `\n### ${core.date}: ${subject.kind}, record ${subject.id}; ${nameOf(core, id)} (${id}) tells the player about ${nameOf(core, subject.aboutId as string)} (${row?.relation ?? "relation unrecorded"})`,
        );
        console.log(
          `  teller's own word for them: ${subject.facts.kin?.text ?? "(none on record; the listener's word is used)"}`,
        );
        console.log(
          `  ${nameOf(core, id)}: ${line.text}  {bearing: ${bearingOf(line.wording?.parts)}} [${line.wording?.facts.join(", ")}; ${line.sourceRecordIds.join(", ")}]`,
        );
        for (const choice of first.choices)
          console.log(`  - offered: ${choice.text} (${choice.move})`);
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
          console.log(
            `  > You: ${choice.text}\n    ${nameOf(core, id)}: ${back.join(" / ") || "(says nothing more)"}\n    offered next: ${talk.choices.map((c) => c.text).join(" | ") || "(nothing; the talk ends)"}`,
          );
        }
      }
    }
  }
  if (!talks) console.log(`  no relative's news told in ${days} days`);
  if (passedOver)
    console.log(`  passed over: ${passedOver} (another subject first)`);
}
