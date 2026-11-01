/**
 * A past race for the legislature counts its electorate's ballots (owner,
 * v0.73.0 playtest, Nov 1: "I can tell that's the generated number of people,
 * not the simulated amount of votes"; pool item
 * elections-past-race-votes-from-electorate). Its total is the ballots its
 * state or territory reported, a district's share of them or the whole for an
 * at-large seat, never the town's own full people; and its office is titled
 * as the chamber's record names its members, never a placeholder.
 *
 * Two places a run, both drawn from all 56 on a seed nobody chose
 * (GOLDEN_PATH_SEED pins it): the first drawn place, and the first drawn
 * place whose jurisdiction casts no presidential vote (read from the 2024
 * corpus), where the territory's own reported ballots must stand in.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { ageOnDate, makeIsoDate } from "./kernel/dates";
import { buildPriorElections } from "./past-elections";
import { pastTown } from "./past-bodies";
import { coreAPI } from "./state";

const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256")
    .update(`past-legislature:${Date.now()}`)
    .digest("hex")
    .slice(0, 16);
const DRAWS = 400;

const json = (path: string) =>
  JSON.parse(readFileSync(path, "utf8")) as unknown;
const presidential = new Map(
  (
    json("data/source/electoral-calibration-2024/corpus.json") as {
      presidentialByState: { stateUsps: string; totalVotes: number }[];
    }
  ).presidentialByState.map((r) => [r.stateUsps, r.totalVotes]),
);
const territory = (
  json("data/research/elections/territory-ballots.json") as {
    places: Record<
      string,
      { delegate?: { ballots: number }; governor?: { ballots: number } }
    >;
  }
).places;
const chambers = (
  json("data/research/offices/state-offices.json") as {
    places: Record<
      string,
      {
        legislature?: {
          chambers?: { chamber: string; memberTitle?: string }[];
        };
      }
    >;
  }
).places;
const usps = (state: string) => state.replace(/^US-/, "");
/** The ballots a jurisdiction reported for its whole electorate, from data. */
const reportedBallots = (state: string) =>
  presidential.get(usps(state)) ??
  territory[usps(state)]?.governor?.ballots ??
  territory[usps(state)]?.delegate?.ballots;

interface Row {
  readonly id: string;
  readonly seatId: string;
  readonly officeId: string;
  readonly date: string;
  readonly totalVotes: number;
  readonly source: { readonly tag: string };
}

function checkPlace(
  place: ReturnType<typeof drawPlace>,
  where: string,
): string {
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const town = pastTown(api, place.seed);
  const offices = new Map(
    (
      api
        .moduleState("core2-offices-v1")
        .table("offices")
        .rows() as unknown as {
        id: string;
        kind: string;
        title: string;
        seats: number;
      }[]
    ).map((o) => [o.id, o]),
  );
  const seats = new Map(
    (
      api.moduleState("core2-offices-v1").table("seats").rows() as unknown as {
        id: string;
        district: string | null;
      }[]
    ).map((s) => [s.id, s]),
  );
  // The town's own full people old enough to vote: the count a total read
  // from the town's people instead of its electorate would sit near.
  const opening = makeIsoDate(core.date);
  const named = [...(core.peopleByPlace.get(town.townPlaceId) ?? [])].filter(
    (id) => {
      const p = core.people.get(id);
      return (
        p?.alive &&
        ageOnDate(p.birthDate, opening) >= api.parameter("votingAge")
      );
    },
  ).length;
  const rows = (buildPriorElections(api, town) as unknown as Row[]).filter(
    (r) => offices.get(r.officeId)?.kind.startsWith("legislature-"),
  );
  expect(rows.length, `${where}: no past legislature race`).toBeGreaterThan(0);
  const reported = reportedBallots(place.state);
  const lines: string[] = [];
  for (const r of rows) {
    const office = offices.get(r.officeId)!;
    const seat = seats.get(r.seatId);
    const chamber = office.kind.replace(/^legislature-/, "");
    const title = chambers[place.state]?.legislature?.chambers?.find(
      (c) => c.chamber === chamber,
    )?.memberTitle;
    expect(
      title,
      `${where}: ${office.id} has no member title in data`,
    ).toBeTruthy();
    expect(office.title, `${where}: ${office.id} title`).toBe(title);
    // Never the town's own people: many times more than its named adults.
    expect(
      r.totalVotes,
      `${where}: ${r.id} counted ${r.totalVotes} against ${named} named adults`,
    ).toBeGreaterThan(named);
    // An estimated race counts its share of what the jurisdiction reported:
    // the whole for an at-large seat, its district's for the rest, at an
    // off-year to a presidential turnout, moved once by the world's spread.
    if (r.source.tag === "ESTIMATED" && reported) {
      const atLarge = /large/i.test(seat?.district ?? "");
      const share = reported / (atLarge ? 1 : Math.max(1, office.seats));
      expect(
        r.totalVotes,
        `${where}: ${r.id} counted ${r.totalVotes}, its share of ${reported} reported is ${Math.round(share)}`,
      ).toBeGreaterThanOrEqual(share * 0.3);
      expect(r.totalVotes).toBeLessThanOrEqual(share * 1.5);
      lines.push(
        `${r.seatId} ${r.date} "${office.title}" ${r.totalVotes} (share of ${reported} reported: ${Math.round(share * 0.3)} to ${Math.round(share * 1.5)})`,
      );
    } else
      lines.push(
        `${r.seatId} ${r.date} "${office.title}" ${r.totalVotes} (${r.source.tag})`,
      );
  }
  return `${where}: ${named} named adults; ${rows.length} past legislature races\n  ${lines.slice(0, 6).join("\n  ")}`;
}

it(`a past legislature race counts its electorate's ballots and titles its members from the record (seed ${seed})`, () => {
  setBookkeeping(false);
  try {
    const reports: string[] = [];
    let any: ReturnType<typeof drawPlace> | null = null;
    let noPresident: ReturnType<typeof drawPlace> | null = null;
    let anyDraw = 0;
    let noPresidentDraw = 0;
    for (let draw = 0; draw < DRAWS && !(any && noPresident); draw += 1) {
      const place = drawPlace(`${seed}:${draw}`, "past-legislature");
      const legislature = chambers[place.state]?.legislature?.chambers?.length;
      if (!legislature) continue;
      if (!any) [any, anyDraw] = [place, draw];
      if (!noPresident && !presidential.has(usps(place.state)))
        [noPresident, noPresidentDraw] = [place, draw];
    }
    expect(
      any,
      `seed ${seed}: no drawn place with a legislature`,
    ).not.toBeNull();
    expect(
      noPresident,
      `seed ${seed}: no drawn place without a presidential vote`,
    ).not.toBeNull();
    for (const [place, draw] of [
      [any!, anyDraw],
      [noPresident!, noPresidentDraw],
    ] as const)
      reports.push(
        checkPlace(
          place,
          `${place.name} (${place.key}), seed ${seed} draw ${draw}, world seed ${place.seed}`,
        ),
      );
    console.log(`past legislature votes:\n${reports.join("\n")}`);
  } finally {
    setBookkeeping(true);
  }
}, 900_000);
