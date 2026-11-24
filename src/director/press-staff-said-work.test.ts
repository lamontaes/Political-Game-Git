/**
 * Someone who works at the paper says their work as one person's: "an
 * editor", never the occupation group's plural name ("I'm editors there").
 * Pinned to Salado, TX, seed review1:2 (Words lead, Nov 15: first meetings).
 */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "../core2/game-start";
import type { PersonId } from "../core2/types";
import { openConversation, say } from "./conversation";

it("says a press worker's job in the singular", () => {
  const { core, playerId } = buildBenchWorld("review1:2", gameStartDate(), {
    twoLevel: true,
    placeKey: "4864268",
  });
  const staff = [...core.jobs.values()].filter(
    (job) =>
      job.personId !== playerId &&
      /^(editors?|reporters?|chief executives?|news analysts.*)$/i.test(
        job.title ?? "",
      ) &&
      core.people.get(job.personId)?.tier !== "husk",
  );
  expect(staff.length, "the town has press staff to meet").toBeGreaterThan(0);
  const said: string[] = [];
  for (const job of staff) {
    let talk = openConversation(core, playerId, job.personId as PersonId);
    for (let turn = 0; turn < 4 && talk.choices.length; turn++)
      talk = say(core, talk, talk.choices[0]!.key);
    for (const line of talk.lines)
      if (line.speakerId === job.personId) said.push(line.text);
  }
  expect(
    said.filter((text) =>
      /\b(editors|reporters|chief executives)\b/i.test(text),
    ),
  ).toEqual([]);
  process.stdout.write(
    `PRESS WORK ${said.filter((text) => /editor|reporter|chief executive/i.test(text)).join(" | ")}\n`,
  );
}, 300_000);
