import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import type { PersonId } from "../core2/types";
import { isDemoted } from "../core2/counted-groups";
import { storyOfReadEvent } from "../core2/modules/news";
import { bringItUp } from "./bring-it-up";

// Everyone who brings a change up could have known it (AGENTS.md: nobody
// attributes a change to a law unless they learned of it). In a played year
// in a drawn place, every person who brings something up to someone they know
// says lines that cite a record showing how they learned it: a fact in the
// speaker's own knowledge (a news story they read, a conversation they were
// told in, a notice, a thing they saw) whose source the line cites and that
// they learned on or before the day of the talk. A record a line cites is
// dated on or before that day.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(10).toString("hex");
const SPEAKERS = 400;

it(`every line a person brings up cites how they learned it (seed ${seed})`, () => {
  setBookkeeping(false);
  const place = drawPlace(seed, "bring-it-up-knew");
  const where = `${place.name} (${place.key}), seed ${place.seed}`;
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  advanceCore(core, addDays(makeIsoDate(core.date), 365));
  const today = core.date;
  const people = [...core.people.values()]
    .filter((row) => row.alive && row.knownIds.size > 0)
    .sort((a, b) => a.id.localeCompare(b.id));
  let lines = 0;
  let speakers = 0;
  const wrong: string[] = [];
  const kinds = new Map<string, number>();
  for (const speaker of people) {
    if (speakers >= SPEAKERS) break;
    // Someone they know whom the world keeps whole: a person back in the
    // counts keeps no knowledge to be told (the two-level rule), so they would
    // be filled in first, as play fills in whoever the player meets.
    const listenerId = [...speaker.knownIds].sort().find((id) => {
      const other = core.people.get(id);
      return !!other?.alive && !isDemoted(other);
    }) as PersonId | undefined;
    if (!listenerId) continue;
    // What they held before they spoke: the talk is judged against it.
    const before = [
      ...(core.knowledgeByPerson.get(speaker.id)?.values() ?? []),
    ];
    const said = bringItUp(core, speaker.id, listenerId);
    if (!said) continue;
    speakers += 1;
    for (const line of said.lines) {
      lines += 1;
      const learnedFrom = line.sourceRecordIds.filter((id) =>
        before.some(
          (fact) =>
            fact.learnedAt <= today &&
            (fact.sourceId === id ||
              fact.key.includes(id) ||
              id.includes(fact.sourceId)),
        ),
      );
      const late = line.sourceRecordIds.filter(
        (id) => (core.durableLog.get(id as never)?.date ?? "") > today,
      );
      // The change itself was learned by this speaker, by the day of the talk.
      const facts = before;
      // A story they read or were told of is a fact of theirs under the
      // story's own key; a closing they saw is a fact whose source is the
      // record.
      const storyId = storyOfReadEvent(said.change.eventId);
      // ... or told of it (a fact under the telling's own key).
      const holds = facts.some(
        (fact) =>
          fact.learnedAt <= today &&
          (fact.key === `heard:${said.change.eventId}` ||
            (storyId && fact.key === `news:${storyId}`) ||
            fact.sourceId === said.change.eventId ||
            fact.key.includes(said.change.eventId)),
      );
      if (said.change.learnedAt > today || !holds)
        wrong.push(
          `${speaker.id}: change ${said.change.eventId} not in the speaker's knowledge by ${today} (demoted ${isDemoted(speaker)}, before ${before.length} facts, after ${core.knowledgeByPerson.get(speaker.id)?.size}, news keys after ${[...(core.knowledgeByPerson.get(speaker.id)?.keys() ?? [])].filter((k) => k.startsWith("news:")).length}, route ${said.change.route}, learnedAt ${said.change.learnedAt}, story ${storyId}; theirs: ${facts
            .filter((fact) => fact.key.includes("law-took-effect:law:US-AS"))
            .map(
              (fact) =>
                `${fact.key.slice(0, 40)}...${fact.key.slice(-30)}=>${fact.sourceId.slice(0, 40)}@${fact.learnedAt}/${fact.access}`,
            )
            .join(" | ")})`,
        );
      // What they believe caused it came from a record they hold: a blame
      // they were told, the record they saw, or a public role they know of.
      const cause = said.attribution;
      if (
        cause.how !== "unknown" &&
        cause.sourceId &&
        cause.sourceId !== said.change.eventId &&
        !facts.some(
          (fact) =>
            fact.sourceId === cause.sourceId ||
            fact.key.includes(cause.sourceId!),
        )
      )
        wrong.push(
          `${speaker.id}: blame (${cause.how}) cites ${cause.sourceId}, which the speaker holds no fact of`,
        );
      // The telling is on record and the listener holds the change (told that
      // day, or already told it before).
      const heard = core.knowledgeByPerson
        .get(listenerId)
        ?.get(`heard:${said.change.eventId}`);
      if (
        !core.eventIds.has(said.toldEventId) ||
        !heard ||
        heard.learnedAt > today
      )
        wrong.push(
          `${speaker.id}: the telling ${said.toldEventId} did not reach the listener by ${today} (event ${core.eventIds.has(said.toldEventId)}, heard ${heard?.learnedAt ?? "none"}, listener facts ${core.knowledgeByPerson.get(listenerId)?.size ?? 0})`,
        );
      kinds.set(said.change.kind, (kinds.get(said.change.kind) ?? 0) + 1);
      if (!learnedFrom.length || late.length)
        wrong.push(
          `${speaker.id}: "${line.text}" learned-from ${learnedFrom.length}, dated after the talk ${late.join(",")}; cites ${line.sourceRecordIds.join(", ")}`,
        );
    }
  }
  process.stdout.write(
    `BRING UP KNEW ${where}: ${speakers} speakers, ${lines} lines, by change kind ${[...kinds.entries()].map(([k, v]) => `${k} ${v}`).join(", ")}; ${wrong.length} lines with no record of how they learned it\n${wrong
      .slice(0, 6)
      .map((row) => `  ${row}`)
      .join("\n")}\n`,
  );
  expect(speakers, `${where}: nobody brought anything up`).toBeGreaterThan(0);
  expect(wrong, where).toEqual([]);
}, 3_600_000);
