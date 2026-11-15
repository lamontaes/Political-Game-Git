/**
 * An outlet's name is said as its record has it, wherever a person names it:
 * a reporter's call letters stay capitals ("KZBY", never "Kzby") when they
 * say where they work. Pinned to Salado, Texas (4864268), seed review1:2,
 * where the paper's staff meet the player (Words lead, Nov 15).
 */
import { appendFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "../core2/game-start";
import type { PersonId } from "../core2/types";
import { openConversation, say } from "./conversation";
import { donorAskFacts } from "./donor-ask-facts";

it("says an outlet's name as its record has it when its staff say where they work", () => {
  const { core, playerId } = buildBenchWorld("review1:2", gameStartDate(), {
    twoLevel: true,
    placeKey: "4864268",
  });
  const outlets = [...core.organizations.values()].filter(
    (org) => org.kind === "media",
  );
  expect(outlets.length, "the town has outlets").toBeGreaterThan(0);
  const staff = [...core.jobs.values()].filter(
    (job) =>
      job.personId !== playerId &&
      outlets.some((org) => org.id === job.organizationId) &&
      core.people.get(job.personId)?.tier !== "husk",
  );
  expect(staff.length, "an outlet has staff to meet").toBeGreaterThan(0);
  const said: string[] = [];
  for (const job of staff) {
    let talk = openConversation(core, playerId, job.personId as PersonId);
    for (let turn = 0; turn < 4 && talk.choices.length; turn++)
      talk = say(core, talk, talk.choices[0]!.key);
    for (const line of talk.lines)
      if (line.speakerId === job.personId) said.push(line.text);
  }
  appendFileSync(
    path.join(tmpdir(), "outlet-name-said.txt"),
    `Salado, Texas (4864268), seed review1:2, outlets ${outlets.map((org) => org.name).join(", ")}:\n${said
      .filter((text) =>
        outlets.some((org) =>
          text.toLowerCase().includes(org.name.toLowerCase()),
        ),
      )
      .map((text) => `  ${text}`)
      .join("\n")}\n`,
  );
  // The donor ask names the employer through the same function.
  const asked = staff.flatMap((job) => {
    const org = outlets.find((entry) => entry.id === job.organizationId);
    const employer = donorAskFacts(
      core,
      job.personId as PersonId,
      "outlet-name-said",
      undefined,
      () => 0,
    ).employer?.text;
    return org && employer ? [{ name: org.name, employer }] : [];
  });
  expect(asked.length, "a donor ask names an outlet").toBeGreaterThan(0);
  for (const row of asked)
    expect(row.employer, "the employer is said as recorded").toContain(
      row.name,
    );
  appendFileSync(
    path.join(tmpdir(), "outlet-name-said.txt"),
    `Donor ask employer: ${asked.map((row) => row.employer).join(" | ")}\n`,
  );
  const wrong = said.filter((text) =>
    outlets.some((org) => {
      const at = text.toLowerCase().indexOf(org.name.toLowerCase());
      return at >= 0 && !text.includes(org.name);
    }),
  );
  expect(wrong, `said: ${said.join(" | ")}`).toEqual([]);
  expect(
    said.some((text) => outlets.some((org) => text.includes(org.name))),
    `an outlet's name is said at all: ${said.join(" | ")}`,
  ).toBe(true);
}, 300_000);
