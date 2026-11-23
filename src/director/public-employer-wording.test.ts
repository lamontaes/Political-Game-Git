import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import type { PersonId } from "../core2/types";
import { employerInTalk } from "./employer-in-talk";

// A person works for a government and is with it, never at it, and an
// employer said again is never "work" inside a frame that already says work
// (item words-i-work-for-a-public-employer-is-said-as-people-say-it).
// Pinned place and seed: Kingston (place key 3238100), world seed "c1"
// (Account lead, Nov 15).
const PLACE_KEY = "3238100";
const SEED = "c1";

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
