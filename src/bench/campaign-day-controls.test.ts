/**
 * The campaign day from play: the choices the records offer come through the
 * bench view with the control names, and taking one runs the engine's own act
 * (owner ruling, Oct 14), in a random place drawn from all 56.
 */
import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "./world";
import { gameStartDate } from "../core2/game-start";
import { PLATFORM_QUESTIONS } from "../core2/campaign-views";
import { coreAPI } from "../core2/state";
import type { CoreState } from "../core2/types";
import { townSeats } from "../core2/modules/offices";
import {
  fileCandidacy,
  openContests,
  type FilingRow,
} from "../core2/modules/elections";
import {
  CAMPAIGNS_MODULE_ID,
  campaignFor,
  doorsKnockedOf,
} from "../core2/modules/campaigns";
import { interviewsFor } from "../core2/modules/press";
import { campaignDayChoices } from "../core2/campaign-day";
import { campaignAct, campaignDay, campaignView } from "./campaign";
import controls from "./data/controls.json" with { type: "json" };

const runSeed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256")
    .update(`campaign-day-controls:${Date.now()}`)
    .digest("hex");

const PLACES = 6;

/** The world as played, in a place drawn from all 56, and who could file there, richest first. */
function openWorld(purpose: string) {
  const place = drawPlace(runSeed, purpose);
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const where = `${place.name}, ${place.state} (${place.key}), run seed ${runSeed}, place seed ${place.seed}`;
  const startYear = Number(core.date.slice(0, 4));
  const adults = [...core.people.values()]
    .filter((p) => p.alive && startYear - Number(p.birthDate.slice(0, 4)) >= 35)
    .sort((a, b) => b.liquidMinor - a.liquidMinor || a.id.localeCompare(b.id));
  return { core: core as CoreState, api, adults, where };
}

/** A local filing (never federal or state) by a candidate who holds no seat, from the records. */
function fileLocal(
  core: CoreState,
  api: ReturnType<typeof coreAPI>,
  candidate: { id: string },
): FilingRow | null {
  if (townSeats(api).some((s) => s.holder?.personId === candidate.id))
    return null;
  core.playerId = candidate.id;
  for (const contest of openContests(api)) {
    if (contest.level === "federal" || contest.level === "state") continue;
    const filed = fileCandidacy(api, {
      personId: candidate.id,
      contestId: contest.id,
      platform: [`${PLATFORM_QUESTIONS[0]}=1`],
    });
    if (
      filed.status !== "refused" &&
      ["petitioning", "on-ballot"].includes(filed.filing.status ?? "")
    )
      return filed.filing;
  }
  return null;
}

/** The ids of the door causes the engine has recorded for one candidate. */
function doorCauseIds(api: ReturnType<typeof coreAPI>, personId: string) {
  return new Set(
    (
      api
        .moduleState(CAMPAIGNS_MODULE_ID)
        .table("causes")
        .rows() as unknown as { id: string; candidateId: string; act: string }[]
    )
      .filter((c) => c.candidateId === personId && c.act === "door")
      .map((c) => c.id),
  );
}

/**
 * One canvass, checked against the engine's records. The doors open as a
 * scene on a street, naming the households that answered, when someone
 * answered; on a day nobody did there is no scene and no household. The
 * households are the distinct households of the people the engine recorded
 * a door cause for on this canvass (one household can give several causes,
 * so this is not the count of causes reached). Returns whether anyone
 * answered.
 */
function checkCanvass(
  core: CoreState,
  api: ReturnType<typeof coreAPI>,
  personId: string,
  before: ReadonlySet<string>,
  taken: ReturnType<typeof campaignDay>,
  where: string,
): boolean {
  expect(taken.doorsKnocked, `doors knocked: ${where}`).toBeGreaterThan(0);
  const causes = api.moduleState(CAMPAIGNS_MODULE_ID).table("causes");
  const voters = new Set(
    [...doorCauseIds(api, personId)]
      .filter((id) => !before.has(id))
      .map((id) => (causes.get(id) as unknown as { voterId: string }).voterId)
      .filter((id) => core.people.get(id)?.alive),
  );
  const households = new Set(
    [...voters].map((id) => core.people.get(id)!.householdId),
  );
  expect(
    new Set(taken.households),
    `households that answered: ${where}`,
  ).toEqual(households);
  expect(taken.reached, `causes recorded: ${where}`).toBeGreaterThanOrEqual(
    voters.size,
  );
  if (voters.size > 0) {
    expect(taken.scene?.place, where).toMatch(/^door-knocking-/);
  } else {
    expect(
      taken.scene,
      `no scene when nobody answered: ${where}`,
    ).toBeUndefined();
    expect(taken.households, where).toEqual([]);
  }
  return voters.size > 0;
}

/**
 * One candidate's campaign day from the view. The result is "unfunded" when
 * the calls could not pay for the venue (so the next candidate is tried),
 * and `answered` says whether anyone answered any of the day's canvasses;
 * everything else is asserted.
 */
function play(
  core: CoreState,
  api: ReturnType<typeof coreAPI>,
  filing: FilingRow,
  where: string,
): { result: string; answered: boolean } {
  const personId = filing.personId;

  const view = campaignView(core, personId).campaigns.find(
    (c) => c.filing.id === filing.id,
  )!;
  // The campaign day has no list of acts: the doors, an event, an interview, the calls and a donor meeting, each named by a control.
  expect(
    view.outings.map((c) => c.outing),
    where,
  ).toEqual(["doors", "event", "interview", "calls", "party"]);
  expect("day" in view, `no Today list: ${where}`).toBe(false);
  for (const choice of view.outings)
    expect(
      (controls.campaignOutings as Record<string, string>)[choice.outing],
      `${choice.outing}: ${where}`,
    ).toBeTruthy();
  expect(view.outings.find((c) => c.outing === "doors")!.available, where).toBe(
    true,
  );
  expect(
    () =>
      campaignDay(core, "someone-else", { filingId: filing.id, kind: "rest" }),
    where,
  ).toThrow();

  // Canvass: the doors knocked on the campaign screen are the engine's own records.
  const firstDoors = doorCauseIds(api, personId);
  const taken = campaignDay(core, personId, {
    filingId: filing.id,
    kind: "canvass",
  });
  let answered = checkCanvass(core, api, personId, firstDoors, taken, where);
  expect(
    doorsKnockedOf(api, campaignFor(api, filing.id).id).length,
    where,
  ).toBe(taken.doorsKnocked);
  const after = campaignView(core, personId).campaigns.find(
    (c) => c.filing.id === filing.id,
  )!;
  expect(after.campaign.doors, where).toBe(taken.doorsKnocked);
  // Where the race stands says how many voters the doors reached, in the engine's words.
  const saidReached = Number(
    /(\d+) voters/.exec(after.standing[0] ?? "")?.[1] ?? Number.NaN,
  );
  expect(
    saidReached,
    `the voters reached, in the standing "${after.standing[0]}": ${where}`,
  ).toBeGreaterThanOrEqual(taken.reached);

  // An interview asked of an outlet that covers the race writes the engine's own interview row.
  const interview = view.outings.find((c) => c.outing === "interview")!;
  expect(
    townSeats(api).some((s) => s.holder?.personId === personId),
    `the candidate holds no seat: ${where}`,
  ).toBe(false);
  expect(interview.available, `an outlet covers the race: ${where}`).toBe(true);
  expect(interview.outletId, where).toBeTruthy();
  const asked = campaignDay(core, personId, {
    filingId: filing.id,
    kind: "interview",
    outletId: interview.outletId!,
  });
  const interviewId = asked.interview!.id;
  expect(asked.interview?.outletId, where).toBe(interview.outletId);
  expect(
    interviewsFor(api, personId).some((i) => i.id === asked.interview!.id),
    where,
  ).toBe(true);
  // An event needs the venue's price in the campaign's account: the calls raise it first, then the event is held.
  const eventControl = () =>
    campaignView(core, personId)
      .campaigns.find((c) => c.filing.id === filing.id)!
      .outings.find((c) => c.outing === "event")!;
  // The calls raise what donors give; knocking doors puts more people within reach of the next calls.
  // The days stop when the venue is paid for, or a calling day and a doors day both move nothing.
  const outing = (name: string) =>
    campaignView(core, personId)
      .campaigns.find((c) => c.filing.id === filing.id)!
      .outings.find((c) => c.outing === name)!;
  for (let day = 0; !eventControl().available; day++) {
    if (day > 400) throw new Error(`the campaign days never ran dry: ${where}`);
    const calls = campaignDay(core, personId, {
      filingId: filing.id,
      kind: "raise-money",
    });
    if (eventControl().available) break;
    if (!outing("doors").available) break;
    const knocked = doorCauseIds(api, personId);
    const households = doorsKnockedOf(api, filing.id).length;
    const doors = campaignDay(core, personId, {
      filingId: filing.id,
      kind: "canvass",
    });
    if (checkCanvass(core, api, personId, knocked, doors, where))
      answered = true;
    // Every door knocked, the canvass goes round again, so a doors day that
    // moves nothing is one that reaches no household not knocked before.
    if (
      calls.raisedMinor === 0 &&
      doorsKnockedOf(api, filing.id).length === households
    )
      break;
  }
  // What the donors left short of the venue, the candidate chooses to put
  // in from their own money (the player's own choice, by its control).
  if (!eventControl().available) {
    const short = campaignDayChoices(api, filing.id).find(
      (c) => c.kind === "event",
    )!;
    if (short.kind === "event") {
      const need = short.facts.venuePriceMinor - short.facts.cashMinor;
      const given = campaignAct(core, personId, {
        filingId: filing.id,
        kind: "contribute",
        amountMinor: need,
      }).answers[0]!.givenMinor;
      expect(given, `own money in: ${where}`).toBeLessThanOrEqual(need);
      if (given === need)
        expect(
          eventControl().available,
          `the venue is paid for: ${where}`,
        ).toBe(true);
    }
  }
  if (!eventControl().available) {
    const venue = campaignDayChoices(api, filing.id).find(
      (c) => c.kind === "event",
    )!;
    return {
      result:
        venue.kind === "event"
          ? `unfunded: cash ${venue.facts.cashMinor} of ${venue.facts.venuePriceMinor}, ${venue.facts.platformStances} stances`
          : "unfunded",
      answered,
    };
  }
  const causeIds = () =>
    (
      api
        .moduleState(CAMPAIGNS_MODULE_ID)
        .table("causes")
        .rows() as unknown as { id: string; candidateId: string; act: string }[]
    )
      .filter((c) => c.candidateId === personId && c.act === "speech")
      .map((c) => c.id);
  const before = new Set(causeIds());
  const held = campaignDay(core, personId, {
    filingId: filing.id,
    kind: "event",
  });
  expect(held.kind, where).toBe("event");
  const written = causeIds().filter((id) => !before.has(id));
  expect(
    written.length,
    `the event wrote the engine's cause rows (${written[0]}), interview ${interviewId}: ${where}`,
  ).toBe(held.reached);
  expect(
    written.length,
    `cause rows written by the event: ${where}`,
  ).toBeGreaterThan(0);

  process.stdout.write(
    `campaign day: ${where}; filing ${filing.id}; interview ${interviewId}; event causes ${written.slice(0, 3).join(", ")}\n`,
  );

  // Rest takes the day and writes no act.
  expect(
    campaignDay(core, personId, { filingId: filing.id, kind: "rest" }).reached,
    where,
  ).toBe(0);
  return { result: "done", answered };
}

it(
  "shows the day's choices with control names and runs the one taken through the engine",
  () => {
    // The places are redrawn until a candidate has held an event and some
    // canvass has been answered; a draw where nobody answered still ran the
    // nobody-answered checks.
    const tried: string[] = [];
    let held = false;
    let answeredAt = "";
    for (let n = 0; n < PLACES; n++) {
      const { core, api, adults, where } = openWorld(
        `campaign-day-controls:${n}`,
      );
      let filed = 0;
      const notes: string[] = [];
      for (const candidate of adults.slice(0, 60)) {
        if (filed >= 5) break;
        const filing = fileLocal(core, api, candidate);
        if (!filing) continue;
        filed++;
        const { result, answered } = play(core, api, filing, where);
        if (answered && !answeredAt) answeredAt = `${where}, ${filing.id}`;
        notes.push(`${result}${answered ? ", answered" : ", nobody answered"}`);
        if (result === "done") {
          held = true;
          break;
        }
      }
      tried.push(`${where} (${filed} filed; ${notes.join("; ")})`);
      if (held && answeredAt) {
        process.stdout.write(`canvass answered: ${answeredAt}\n`);
        return;
      }
    }
    throw new Error(
      `${held ? "" : "no candidate could pay for an event; "}${answeredAt ? "" : "no canvass was answered; "}in ${PLACES} places: ${tried.join(" | ")}`,
    );
    // One drawn place, built and played through its campaign days, took 196
    // seconds on a 4-core container (Springville, Utah); up to PLACES of them.
  },
  PLACES * 250_000,
);
