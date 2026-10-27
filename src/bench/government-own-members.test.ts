/**
 * Politics names the player's own members first: their U.S. senators, their
 * one U.S. representative and one state legislator per chamber of their
 * state, then the President, the Vice President and each chamber's leader by
 * post. Every other legislator stays reachable behind the State and Federal
 * filters. A place is drawn from all 56; set GOLDEN_PATH_SEED to reproduce.
 */
import { createHash, randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "../core2/game-start";
import { officesOfState, townSeats } from "../core2/modules/offices";
import { coreAPI } from "../core2/state";
import { governmentView, politicsStates, stateLegislators } from "./government";
import { buildBenchWorld } from "./world";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it("lists the player's own members first, leaders by post, and every other member behind the filters", () => {
  const place = drawPlace(seed, "politics-own-members");
  const where = `${place.name} (${place.key}), seed ${place.seed}`;
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const core = world.core;
  const api = coreAPI(core);
  const view = governmentView(core, core.playerId!);
  const own = view.keyPeople.filter((k) => k.own);
  const kinds = (kind: string) =>
    townSeats(api).filter(({ office }) => office.kind === kind).length;
  const reason = (r: string) => own.filter((k) => k.reasons.includes(r));
  // The player's own: one member for each seat that covers the town, so at
  // most two U.S. senators, at most one member of the House, and one state
  // legislator per district seat (every member where a chamber sits at
  // large, as Guam's does).
  const chambers = officesOfState(api, place.state).filter((office) =>
    office.kind.startsWith("legislature-"),
  ).length;
  const legislatorSeats = townSeats(api).filter(({ office }) =>
    office.kind.startsWith("legislature-"),
  ).length;
  expect(reason("own-us-senator").length, where).toBe(kinds("us-senate"));
  expect(reason("own-us-senator").length, where).toBeLessThanOrEqual(2);
  expect(reason("own-us-representative").length, where).toBe(kinds("us-house"));
  expect(
    kinds("us-house") + kinds("us-house-delegate"),
    where,
  ).toBeLessThanOrEqual(1);
  expect(reason("own-state-legislator").length, where).toBe(legislatorSeats);
  expect(legislatorSeats, where).toBeGreaterThanOrEqual(chambers);
  // The player's own come first, then everyone else.
  const firstOther = view.keyPeople.findIndex((k) => !k.own);
  expect(
    view.keyPeople.slice(firstOther).some((k) => k.own),
    `${where}: an own member listed after a leader`,
  ).toBe(false);
  // Nobody is listed only for being one of the state's legislators.
  for (const k of view.keyPeople)
    expect(
      k.reasons.some((r) => r !== "state-legislator"),
      `${where}: ${k.name} (${k.reasons.join(", ")})`,
    ).toBe(true);
  // A leader is named by post and chamber; one from another state names it.
  const leaders = view.keyPeople.filter(
    (k) => k.reasons.includes("chamber-leader") && !k.own,
  );
  expect(leaders.length, where).toBeGreaterThan(0);
  for (const k of leaders) {
    expect(k.post, `${where}: ${k.name}'s post`).toBeTruthy();
    expect(k.chamber, `${where}: ${k.name}'s chamber`).toBeTruthy();
    expect(k.stateName, `${where}: ${k.name}'s state`).toBeTruthy();
  }
  // Every other member is behind the filters: the player's own state lists
  // its whole legislature, and any state lists its members of Congress.
  const legislature = stateLegislators(core, place.state, "state");
  expect(legislature.length, where).toBeGreaterThan(chambers);
  for (const k of reason("own-state-legislator"))
    expect(
      legislature.some((row) => row.holder?.personId === k.personId) ||
        legislature.some(
          (row) =>
            `${row.holder?.givenName} ${row.holder?.familyName}` === k.name,
        ),
      `${where}: ${k.name} in the state filter`,
    ).toBe(true);
  const others = politicsStates()
    .map((s) => s.key)
    .filter((key) => key !== place.state)
    .sort();
  const other =
    others[
      Number.parseInt(
        createHash("sha256").update(seed).digest("hex").slice(0, 8),
        16,
      ) % others.length
    ]!;
  const congress = stateLegislators(core, other, "federal");
  const senators = congress.filter((row) => row.title === "U.S. Senator");
  expect(senators.length, `${where}: ${other}'s senators`).toBeLessThanOrEqual(
    2,
  );
  expect(
    congress.filter((row) => row.title !== "U.S. Senator").length,
    `${where}: ${other}'s House members`,
  ).toBeGreaterThan(0);
  for (const row of congress)
    expect(row.holder?.familyName, `${where}: ${row.seatId}`).toBeTruthy();
  process.stdout.write(
    `OWN MEMBERS ${where}: ${own.map((k) => `${k.officeTitle} ${k.name}`).join("; ")}; leaders ${leaders.map((k) => `${k.post} ${k.chamber} ${k.name} (${k.stateName})`).join("; ")}; ${other} in Congress: ${senators.length} senators, ${congress.length - senators.length} House\n`,
  );
}, 600_000);
