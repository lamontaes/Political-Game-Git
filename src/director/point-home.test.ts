/**
 * After the address point on the first evening, what the point would do to
 * this household, from its own records (CTO, Nov 19 10:48Z on #9750: the
 * second related subject after an address point). In places drawn from all
 * 56, the first evening is played: each relative in the room who opens on a
 * point of the President's address is answered, and what they could raise
 * next is read the way the talk reads it (`subjectsBetween` with the talk).
 *
 * - Where a household member's job or the household's money gives a reason
 *   on the pointed question (`viewReason`, either side), the `point-home`
 *   subject is offered, naming that person and the reason, every fact citing
 *   records that exist in the world.
 * - Where no member has one, no `point-home` subject is offered.
 *
 * Only the player's household hears the address, and few of the address's
 * questions have a reason row (conversation-rules.json stands.reasonFits).
 * When the player's household has no reason but the address's question has
 * a row, a resident whose household has one is chosen and the place is built
 * again with them as the player (drawn-place-tests: choose the person the
 * case covers). Every place passed over is named with its question and why.
 * Set GOLDEN_PATH_SEED to replay a run.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { openingArrivalMinute } from "../bench/opening";
import { roomIds } from "../bench/scene";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import type { CoreState, PersonId } from "../core2/types";
import rules from "./data/conversation-rules.json" with { type: "json" };
import {
  openConversation,
  say,
  subjectsBetween,
  takesStands,
} from "./conversation";
import { addressPoints } from "./opening-facts";
import { viewReason } from "./view-learned";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const DRAWS = 6;
const POINT = "address-point";
const POINT_HOME = "point-home";
const FITS = rules.stands.reasonFits.questions as Record<string, unknown>;

type Built = ReturnType<typeof buildBenchWorld>;

/** The reason the household has on the question, found as the rule reads it: the listener first, the speaker last. */
function expectedReason(
  core: CoreState,
  speakerId: PersonId,
  listenerId: PersonId,
  question: string,
) {
  const speaker = core.people.get(speakerId)!;
  const members = core.households
    .get(speaker.householdId)!
    .memberIds.filter((id) => core.people.get(id)?.alive);
  const order = [
    ...members.filter((id) => id === listenerId),
    ...members.filter((id) => id !== listenerId && id !== speakerId),
    ...members.filter((id) => id === speakerId),
  ];
  for (const personId of order)
    for (const side of ["for", "against"] as const) {
      const reason = viewReason(core, personId, question, side);
      if (reason) return { personId, reason };
    }
  return null;
}

/** Whether a record id is a row the world holds. */
const exists = (core: CoreState, id: string) =>
  core.people.has(id as PersonId) ||
  core.jobs.has(id as never) ||
  core.organizations.has(id as never) ||
  core.households.has(id as never);

/**
 * Plays the first evening in a built world: every relative in the room who
 * opens on the address's point is answered, and the subject offered after it
 * is checked both ways. Returns the witnesses found and what was passed over.
 */
function playEvening(
  built: Built,
  where: string,
): { found: string[]; passed: string[] } {
  const core = built.core;
  const director = built.director;
  const me = built.playerId as PersonId;
  const minute = openingArrivalMinute(core, me);
  const room = roomIds(core, me, undefined, minute) as PersonId[];
  const found: string[] = [];
  const passed: string[] = [];
  for (const otherId of room) {
    let talk = openConversation(core, me, otherId, {
      director,
      presentIds: room,
      minuteOfDay: minute,
    });
    const opened = talk.lines.find((line) => line.speakerId === otherId);
    if (opened?.kind !== POINT || !talk.choices[0]) {
      passed.push(`${otherId} opened on ${opened?.kind ?? "nothing"}`);
      continue;
    }
    talk = say(core, talk, talk.choices[0].key);
    const question = talk.pointed?.[0];
    expect(question, `${where}: ${otherId} made no point`).toBeTruthy();
    const home = subjectsBetween(core, otherId, me, director, talk).find(
      (row) => row.kind === POINT_HOME,
    );
    const expected = takesStands(core, otherId)
      ? expectedReason(core, otherId, me, question!)
      : null;
    if (!expected) {
      expect(
        home,
        `${where}: ${otherId} offered point-home with no reason on ${question}`,
      ).toBeUndefined();
      passed.push(`${otherId}: no household reason on ${question}`);
      continue;
    }
    const at = `${where}: ${otherId} on ${question}`;
    expect(home, `${at}: no point-home subject offered`).toBeDefined();
    const facts = home!.facts;
    const { personId, reason } = expected;
    expect(home!.tie?.kind, at).toBe("frame");
    expect(home!.tie?.recordIds, at).toEqual(reason.recordIds);
    const kind = reason.reason === "work" ? "point-work" : "point-money";
    expect(facts[kind]?.sourceRecordIds, at).toEqual(reason.recordIds);
    if (reason.reason === "work") {
      const [jobId, employerId] = reason.recordIds;
      expect(core.jobs.get(jobId as never)?.organizationId, at).toBe(
        employerId,
      );
      expect(facts.employer?.text, at).toBeTruthy();
      expect(facts.employer?.sourceRecordIds, at).toEqual(reason.recordIds);
    } else
      expect(core.households.has(reason.recordIds[0] as never), at).toBe(true);
    // The person, named as the rule names them.
    if (personId === me) expect(facts.you?.sourceRecordIds, at).toEqual([me]);
    else if (personId === otherId)
      expect(facts.mine?.sourceRecordIds, at).toEqual([otherId]);
    else
      expect(facts.name, at).toEqual({
        text: core.people.get(personId)!.givenName,
        sourceRecordIds: [personId],
      });
    // Every fact cites records the world holds.
    for (const [key, fact] of Object.entries(facts)) {
      expect(fact.sourceRecordIds.length, `${at}: ${key}`).toBeGreaterThan(0);
      for (const id of fact.sourceRecordIds)
        expect(exists(core, id), `${at}: ${key} cites ${id}`).toBe(true);
    }
    const said = talk.lines.find((line) => line.kind === POINT_HOME);
    found.push(
      `${at}: point-home for ${personId === me ? "the player" : personId} (${reason.reason}, ${reason.recordIds.join(" ")})${said ? `, said: "${said.text}"` : ", offered after the relative's own view"}`,
    );
  }
  return { found, passed };
}

/** A resident whose household has a reason on the question, as a listener a housemate who takes stands would tell. */
function residentCovered(core: CoreState, question: string): PersonId | null {
  for (const household of core.households.values()) {
    const members = household.memberIds.filter(
      (id) => core.people.get(id)?.alive,
    );
    for (const speakerId of members)
      for (const listenerId of members)
        if (
          speakerId !== listenerId &&
          takesStands(core, speakerId) &&
          expectedReason(core, speakerId, listenerId, question)
        )
          return listenerId;
  }
  return null;
}

it(
  "after the address point, the talk offers what the point would do to the household, from its records, and only then",
  { timeout: 1_800_000 },
  () => {
    setBookkeeping(false);
    const passedOver: string[] = [];
    const found: string[] = [];
    for (let draw = 0; draw < DRAWS && !found.length; draw += 1) {
      const place = drawPlace(
        draw === 0 ? seed : `${seed}:${draw}`,
        "point-home",
      );
      const where = `${place.name} (${place.key}), run seed ${seed}, draw ${draw}, place seed ${place.seed}`;
      const options = { twoLevel: true, placeKey: place.key };
      const built = buildBenchWorld(place.seed, gameStartDate(), options);
      const questions = addressPoints(built.director.ledger.opening!)
        .filter((row) => row.kind === "policy")
        .map((row) => row.question);
      const evening = playEvening(built, where);
      found.push(...evening.found);
      if (found.length) break;
      const fitted = questions.filter((question) => FITS[question]);
      // The player's household has no reason: a resident whose household
      // has one on the address's question is made the player.
      const covered = fitted
        .map((question) => residentCovered(built.core, question))
        .find(Boolean);
      if (!covered) {
        passedOver.push(
          `${where}: address on ${questions.join(", ") || "no policy question"} (${fitted.length ? "a reason row, but no household in the world has a reason" : "no reason row"}); the evening: ${evening.passed.join("; ") || "nobody in the room"}`,
        );
        continue;
      }
      const person = built.core.people.get(covered)!;
      const again = buildBenchWorld(place.seed, gameStartDate(), {
        ...options,
        playerBirthDate: person.birthDate,
        ...(person.looks?.gender ? { playerGender: person.looks.gender } : {}),
      });
      const asked = addressPoints(again.director.ledger.opening!)
        .filter((row) => row.kind === "policy")
        .map((row) => row.question);
      if (again.playerId !== covered || asked.join() !== questions.join()) {
        passedOver.push(
          `${where}: built again for ${covered}, the player was ${again.playerId} on ${asked.join(", ")}`,
        );
        continue;
      }
      const replay = playEvening(again, `${where}, played as ${covered}`);
      found.push(...replay.found);
      if (!replay.found.length)
        passedOver.push(
          `${where}, played as ${covered}: ${replay.passed.join("; ") || "nobody in the room"}`,
        );
    }
    process.stdout.write(
      `point-home:\n${[...found, ...passedOver.map((row) => `passed over ${row}`)].join("\n")}\n`,
    );
    expect(
      found,
      `no drawn place had a first-evening household with a reason on the address's point; passed over:\n${passedOver.join("\n")}`,
    ).not.toEqual([]);
  },
);
