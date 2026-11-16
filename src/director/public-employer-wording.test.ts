import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { ENCOUNTERS } from "../core2/encounters";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import {
  acceptJobOffer,
  JOBS_MODULE_ID,
  jobOffersFor,
} from "../core2/modules/jobs";
import { openConversation, say } from "./conversation";
import { employerInTalk } from "./employer-in-talk";

// A person works for a government and is with it, never at it, and an
// employer said again is never "work" inside a frame that already says work
// (item words-i-work-for-a-public-employer-is-said-as-people-say-it).
// Pinned place and seed: Kingston (place key 3238100), world seed "c1"
// (Account lead, Nov 15).
const PLACE_KEY = "3238100";
const SEED = "c1";
// What talk never says of the talk's own place's government: its full name
// ("the government of Nevada", "the County of Lander"), and never "at" it.
const OWN_FULL = "(?:the government of|the County of|the Village of)";
const BAD = new RegExp(
  [
    "\\bwork(?:s|ing|ed)?\\s+(?:over\\s+)?(?:at|for|with)\\s+work\\b",
    "\\bI(?:'m| am)\\s+with\\s+work\\b",
    `\\b(?:at|for|with)\\s+${OWN_FULL}`,
    "\\bwork(?:s|ing|ed)?\\s+(?:over\\s+)?at\\s+the (?:state|county|federal)",
    "\\bI(?:'m| am)\\s+(?:over\\s+)?at\\s+the (?:state|county|federal)",
  ].join("|"),
  "i",
);
const GOOD = /\b(?:for|with) the (?:state|county)\b/i;

it("an employer is said as people say it (Kingston, seed c1)", () => {
  setBookkeeping(false);
  const { core, director, playerId } = buildBenchWorld(SEED, "2025-01-20", {
    twoLevel: true,
    placeKey: PLACE_KEY,
  });
  const me = playerId as PersonId;
  advanceCore(core, addDays(makeIsoDate(core.date), 2));
  // The player holds a job, so the other person can ask and give back their
  // own work (the jobs module's staged offer, accepted through its own call).
  const api = coreAPI(core);
  const positions = api.moduleState(JOBS_MODULE_ID).table("positions");
  const open = (
    positions.rows() as {
      id: string;
      status: string;
      organizationId: string;
      title: string;
      hourlyMinor: number;
    }[]
  ).find((row) => row.status === "open");
  if (open) {
    const id = `job-offer:${open.id}:${me}`;
    positions.put({ ...open, offeredTo: me, offerId: id } as never);
    api
      .moduleState(JOBS_MODULE_ID)
      .table("offers")
      .put({
        id,
        personId: me,
        positionId: open.id,
        organizationId: open.organizationId,
        offeredBy: me,
        title: open.title,
        hourlyMinor: open.hourlyMinor,
        fit: 1,
        offeredAt: core.date,
        deadline: core.date,
        status: "pending",
      } as never);
    for (const offer of jobOffersFor(api, me))
      if (offer.status === "pending") acceptJobOffer(api, offer.id);
  }
  const mine = core.people.get(me)!.householdId;
  const others = [...core.people.values()]
    .filter(
      (row) => row.alive && row.tier !== "husk" && row.householdId !== mine,
    )
    .slice(0, 150);
  for (const other of others)
    coreAPI(core).meet(me, other.id as PersonId, {
      placeId: other.householdId,
      sourceId: `name-once:${other.id}`,
      cause: ENCOUNTERS.causes.metOnVisit,
      hours: 2,
    });
  advanceCore(core, addDays(makeIsoDate(core.date), 4));
  let seen = 0;
  let right = 0;
  const wrong: string[] = [];
  for (const other of others) {
    const talk = openConversation(core, me, other.id as PersonId, {
      director,
      minuteOfDay: 11 * 60,
    });
    for (let turn = 0; turn < 14 && talk.choices.length; turn += 1)
      say(
        core,
        talk,
        talk.choices[(turn + others.indexOf(other)) % talk.choices.length]!.key,
      );
    for (const line of talk.lines) {
      if (line.speakerId !== other.id) continue;
      seen += 1;
      if (BAD.test(line.text)) wrong.push(line.text);
      if (GOOD.test(line.text)) right += 1;
    }
  }
  expect(seen).toBeGreaterThan(0);
  expect(
    right,
    "lines that say a government with its preposition",
  ).toBeGreaterThan(0);
  expect(wrong).toEqual([]);
}, 120_000);

it("another place's government keeps its record's name (said as null here), the talk's own state is 'the state' (Kingston, seed c1)", () => {
  setBookkeeping(false);
  const { core, playerId } = buildBenchWorld(SEED, "2025-01-20", {
    twoLevel: true,
    placeKey: PLACE_KEY,
  });
  const me = playerId as PersonId;
  const other = [...core.people.values()].find(
    (row) =>
      row.alive &&
      row.id !== me &&
      row.placeId === core.people.get(me)!.placeId,
  )!;
  const treasury = (key: string, name: string) => ({
    kind: "government-treasury",
    name: `${name} treasury`,
    governmentFacts: { governmentKey: key },
  });
  expect(
    employerInTalk(core, treasury("US-NV", "Nevada"), other.id as PersonId, me),
  ).toBe("the state");
  expect(
    employerInTalk(core, treasury("US-OH", "Ohio"), other.id as PersonId, me),
  ).toBeNull();
  expect(
    employerInTalk(
      core,
      treasury("US-DC", "District of Columbia"),
      other.id as PersonId,
      me,
    ),
  ).toBeNull();
  expect(
    employerInTalk(core, treasury("US-GU", "Guam"), other.id as PersonId, me),
  ).toBeNull();
  // A county's own government, said by its record's class word.
  expect(
    employerInTalk(
      core,
      {
        kind: "employer",
        name: "County of Lander",
        classification: "service:county-government",
      },
      other.id as PersonId,
      me,
    ),
  ).toBe("the county");
  // A school system is said by its name, as a business is: no talk says "the school district".
  expect(
    employerInTalk(
      core,
      {
        kind: "employer",
        name: "Island Falls Public Schools",
        classification: "service:school",
      },
      other.id as PersonId,
      me,
    ),
  ).toBeNull();
  // A department keeps its name.
  expect(
    employerInTalk(
      core,
      {
        kind: "employer",
        name: "Kingston Fire Department",
        classification: "service:fire",
      },
      other.id as PersonId,
      me,
    ),
  ).toBeNull();
});
