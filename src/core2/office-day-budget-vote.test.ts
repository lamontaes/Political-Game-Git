/**
 * The year's budget is voted at its body's meeting, on that meeting's panel,
 * and nothing is cast in the player's name without their press (pool item
 * office-board-vote-cast-for-the-player-without-a-stop-again; CTO, Nov 13,
 * 04:18Z: "Decide for me" casts the player's own position, a silent player
 * abstains). The budget's public hearing used to cast the player's own vote
 * on the hearing day, and the adoption's roll call counted the player's seat
 * from their position without reading what they pressed. Danville, Iowa is the
 * playtest's place and seed (Nov 13); the sweep draws three places from all 56
 * with a seated player and plays each to its first budget vote. Set
 * GOLDEN_PATH_SEED to reproduce the draw.
 */
import { randomBytes } from "node:crypto";
import { afterAll, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { calendarItems } from "../bench/calendar";
import { meetingSceneView } from "../bench/office";
import { BenchPlayer } from "../bench/player";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import {
  billOf,
  bodyOf,
  budgetHearingOf,
  castMemberVote,
  LEGISLATURE_MODULE_ID,
  memberKey,
  members,
  type BillRow,
} from "./modules/legislature";
import {
  adjourn,
  meetingInProgress,
  OFFICE_DAY_MODULE_ID,
  officeActsOf,
  takeUpItem,
  upcomingMeeting,
  type MeetingRow,
} from "./modules/office-day";
import { BUDGETS_MODULE_ID, type BudgetRow } from "./modules/budgets";
import { townSeats } from "./modules/offices";
import { coreAPI, type CoreState } from "./state";
import type { CoreAPI } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const before = setBookkeeping(false);
afterAll(() => {
  setBookkeeping(before);
});

/** The playtest's place and seed: the mayor's budget, heard Jun 1, voted Jul 1, 2025. */
const DANVILLE = {
  key: "1918435",
  name: "Danville, Iowa",
  seed: "4b0fc31d-ba59-4168-8b84-d7c0e3f826b6",
};
const LOCAL = ["city", "township", "county"];

const reasons = (packet: unknown): string[] =>
  (
    (packet as { stop?: { modules?: { reasonKey: string }[] } })?.stop
      ?.modules ?? []
  ).map((m) => m.reasonKey);

/** A seated member of a town or county body that meets, played; the one named when asked for. */
function seated(place: { key: string; seed: string }, familyName?: string) {
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const core = world.core as CoreState;
  const api = coreAPI(core);
  const seats = townSeats(api).filter(
    (s) =>
      s.holder?.personId &&
      LOCAL.includes(s.office.level) &&
      bodyOf(api, s.office.id) &&
      members(api, s.office.id).length > 1,
  );
  const seat = familyName
    ? seats.find((s) => s.holder?.identity.familyName === familyName)
    : seats[0];
  if (!seat?.holder?.personId) return null;
  const me = seat.holder.personId;
  const player = new BenchPlayer(core, world.director);
  player.select(me);
  return { core, api, me, player, officeId: seat.office.id };
}

/** The budget bill the player's body heard, once the hearing is held. */
function heardBudget(api: CoreAPI, officeId: string): BillRow | undefined {
  const hearings = api
    .moduleState(LEGISLATURE_MODULE_ID)
    .table("budgetHearings")
    .rows() as unknown as { billId: string; heldOn: string }[];
  return hearings
    .map((h) => billOf(api, h.billId))
    .filter((b): b is BillRow => !!b && b.bodyOfficeId === officeId)
    .sort((a, b) => a.introduced.localeCompare(b.introduced))[0];
}

/** The day the budget's meeting votes it: its agenda placement. */
const voteDay = (api: CoreAPI, billId: string) =>
  (
    api
      .moduleState(OFFICE_DAY_MODULE_ID)
      .table("agendaItems")
      .get(billId) as unknown as { date: string } | undefined
  )?.date;

/**
 * Play day by day until `until` says stop. At each meeting the player is held
 * at, `atMeeting` decides; any other stop or choice is answered as a player
 * would, by going on.
 */
function play(
  s: NonNullable<ReturnType<typeof seated>>,
  until: () => boolean,
  atMeeting: (meeting: MeetingRow) => void,
  guardDays = 420,
) {
  for (let guard = 0; guard < guardDays * 3 && !until(); guard += 1) {
    if (s.player.pollingPlace) s.player.leavePolls();
    const packet = s.player.packet;
    const meeting =
      packet?.kind === "stop" && reasons(packet).includes("office-day.meeting")
        ? meetingInProgress(s.api)
        : undefined;
    if (meeting && meeting.audience === undefined) {
      atMeeting(meeting);
      const after = meetingInProgress(s.api);
      if (after?.id === meeting.id && after.status !== "adjourned")
        adjourn(s.api, meeting.id);
      continue;
    }
    if (packet?.kind === "stop")
      s.player.resume({ kind: "stop", pauseId: packet.pauseId });
    else if (packet?.kind === "choice")
      s.player.resume({ kind: "own-choice", pauseId: packet.pauseId });
    else s.player.advance("day");
  }
}

const choiceOf = (api: CoreAPI, billId: string, memberId: string) =>
  api
    .moduleState(LEGISLATURE_MODULE_ID)
    .table("choices")
    .get(`${billId}|${memberId}`) as unknown as { vote?: string } | undefined;

/** Press every open item at a held meeting with the vote given; returns the items pressed. */
function pressAll(
  api: CoreAPI,
  meeting: MeetingRow,
  vote: "yes" | "no",
  pressed: Map<string, string>,
) {
  for (const id of [...meeting.agenda]) {
    if (billOf(api, id).status !== "drafted") continue;
    if (meetingInProgress(api)?.takenUp.includes(id)) continue;
    takeUpItem(api, meeting.id, id, vote);
    pressed.set(id, vote);
  }
}

/**
 * Every vote of the player's seat on the record: each must be one they
 * pressed, or an abstention (a silent player abstains). Names the bill and
 * the path that cast it.
 */
function unpressed(
  api: CoreAPI,
  me: string,
  pressed: ReadonlyMap<string, string>,
): string[] {
  const legislature = api.moduleState(LEGISLATURE_MODULE_ID);
  const rows = legislature.table("votes").rows() as unknown as {
    id: string;
    billId: string;
    memberId: string;
    vote: string;
    override?: boolean;
  }[];
  const bad: string[] = [];
  for (const row of rows) {
    if (row.memberId !== me || row.vote === "abstain") continue;
    const bill = billOf(api, row.billId);
    const path = row.override
      ? "override roll (legislature.ts runOverride)"
      : bill?.budgetFor ||
          (bill as { kind?: string } | undefined)?.kind === "budget"
        ? "budget roll (legislature.ts councilBudget)"
        : "floor vote (legislature.ts countVote)";
    if (row.override) {
      bad.push(`${bill?.number} ${row.billId}: ${row.vote} by ${path}`);
      continue;
    }
    if (pressed.get(row.billId) !== row.vote)
      bad.push(
        `${bill?.number} ${row.billId}: ${row.vote} by ${path}, pressed ${pressed.get(row.billId) ?? "nothing"}`,
      );
  }
  for (const act of officeActsOf(api, me))
    if (act.kind === "vote" && act.how !== "did")
      bad.push(
        `${billOf(api, act.recordId)?.number} ${act.recordId}: "${act.detail}, Decided for me" on ${act.date} without a press (office-day.ts ownVote)`,
      );
  return bad;
}

it("Danville: the mayor's budget waits on the Jul 1 meeting panel and is cast only by the player's press", () => {
  const s = seated(DANVILLE, "Pugh")!;
  expect(s, "Quinn Pugh's council seat").not.toBeNull();
  const { api, me } = s;
  const pressed = new Map<string, string>();
  let budgetAt: string | null = null;
  let budgetId: string | null = null;
  play(
    s,
    () =>
      s.core.date > "2025-07-10" ||
      (!!budgetId && billOf(api, budgetId).status !== "drafted"),
    (meeting) => {
      const budget = heardBudget(api, s.officeId);
      if (budget && meeting.agenda.includes(budget.id)) {
        budgetAt = meeting.date;
        budgetId = budget.id;
        // Nothing of the player's is on the record before the stop.
        expect(choiceOf(api, budget.id, me)).toBeUndefined();
        expect(
          officeActsOf(api, me).filter((a) => a.recordId === budget.id),
        ).toEqual([]);
        // The panel draws it as any item: its number, title and status.
        const view = meetingSceneView(s.core, me, meeting.startMinute);
        const item = view?.items.find((i) => i.billId === budget.id);
        expect(item?.number, DANVILLE.name).toBeTruthy();
        console.log(
          `danville budget on the panel ${meeting.id}: ${item?.number} "${item?.title}" ${item?.status}`,
        );
      }
      pressAll(api, meeting, "yes", pressed);
    },
  );
  const budget = heardBudget(api, s.officeId)!;
  // No vote of the player's is cast that they did not press: on the train this
  // named "2025-6 ...: yes by budget roll" and the hearing day's "Decided for me".
  expect(unpressed(api, me, pressed)).toEqual([]);
  expect(budgetAt, "the budget's meeting held the player").toBe("2025-07-01");
  expect(voteDay(api, budget.id)).toBe("2025-07-01");
  const hearing = budgetHearingOf(
    api,
    budget.budgetFor!.governmentId,
    budget.budgetFor!.fiscalYear,
  )!;
  expect(hearing.heldOn).toBe("2025-06-01");
  const acts = officeActsOf(api, me).filter((a) => a.recordId === budget.id);
  expect(acts.map((a) => `${a.date} ${a.how} ${a.detail}`)).toEqual([
    "2025-07-01 did yes",
  ]);
  console.log(
    `danville ${budget.number} ${billOf(api, budget.id).status}; acts ${acts.length}`,
  );
}, 1_800_000);

it("Danville: the player's no decides the budget, and last year's budget carries", () => {
  const outcome = (vote: "yes" | "no") => {
    const s = seated(DANVILLE, "Pugh")!;
    const { api, me } = s;
    const pressed = new Map<string, string>();
    let budgetId: string | null = null;
    let seen: unknown = null;
    play(
      s,
      () =>
        s.core.date > "2025-07-10" ||
        (!!budgetId && billOf(api, budgetId).status !== "drafted"),
      (meeting) => {
        const budget = heardBudget(api, s.officeId);
        if (budget && meeting.agenda.includes(budget.id)) {
          budgetId = budget.id;
          // Fixture (an edge case the drawn world rarely gives): two other
          // members have cast "no", so the player's seat decides it.
          const others = members(api, s.officeId)
            .map(memberKey)
            .filter((k) => k !== me)
            .sort()
            .slice(0, 2);
          for (const k of others) castMemberVote(api, budget.id, k, "no");
          takeUpItem(api, meeting.id, budget.id, vote);
          pressed.set(budget.id, vote);
          seen = meetingSceneView(s.core, me, meeting.startMinute)?.items.find(
            (i) => i.billId === budget.id,
          );
        }
        pressAll(api, meeting, "yes", pressed);
      },
    );
    const bill = billOf(api, budgetId!);
    const budget = (
      api
        .moduleState(BUDGETS_MODULE_ID)
        .table("budgets")
        .rows() as unknown as BudgetRow[]
    ).find(
      (b) => (b.adoptedBy as { bill?: { id: string } }).bill?.id === budgetId,
    )!;
    return { bill, budget, seen, me, api, pressed };
  };
  const no = outcome("no");
  const yes = outcome("yes");
  console.log(
    `danville deciding vote: no -> ${no.bill.status}, adopted by ${no.budget.adoptedBy.kind} (${(no.budget.adoptedBy as { carried?: string }).carried}); yes -> ${yes.bill.status}, adopted by ${yes.budget.adoptedBy.kind}; the panel then shows ${JSON.stringify(no.seen)}`,
  );
  expect(no.bill.status).toBe("failed");
  expect(no.budget.adoptedBy.kind).toBe("carried");
  expect((no.budget.adoptedBy as { carried?: string }).carried).toBe(
    "rejected",
  );
  expect(yes.bill.status).toBe("enacted");
  expect(yes.budget.adoptedBy.kind).toBe("vote");
  expect(unpressed(no.api, no.me, no.pressed)).toEqual([]);
}, 1_800_000);

it("no vote of the player's seat is on the record that the player did not press, through a budget year in three drawn places", () => {
  const proved: string[] = [];
  const passedOver: string[] = [];
  for (let draw = 0; draw < 12 && proved.length < 3; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "budget-vote-sweep");
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const s = seated(place);
    if (!s) {
      passedOver.push(`${where}: no seated member`);
      continue;
    }
    const { api, core, me } = s;
    const pressed = new Map<string, string>();
    const start = core.date;
    const limit = new Date(Date.parse(`${start}T00:00:00Z`) + 400 * 86_400_000)
      .toISOString()
      .slice(0, 10);
    play(
      s,
      () => {
        const budget = heardBudget(api, s.officeId);
        return (
          core.date >= limit ||
          (!!budget && billOf(api, budget.id).status !== "drafted")
        );
      },
      (meeting) => pressAll(api, meeting, "yes", pressed),
    );
    const budget = heardBudget(api, s.officeId);
    if (!budget || billOf(api, budget.id).status === "drafted") {
      passedOver.push(`${where}: no budget voted by ${core.date}`);
      continue;
    }
    expect(
      unpressed(api, me, pressed),
      `${where}: votes on the player's seat they did not press`,
    ).toEqual([]);
    const onPanel = pressed.has(budget.id);
    // A body that meets takes its budget at a meeting that held the player.
    if (voteDay(api, budget.id))
      expect(onPanel, `${where}: ${budget.number} on the panel`).toBe(true);
    proved.push(
      `${where}: ${budget.number} ${billOf(api, budget.id).status} on ${voteDay(api, budget.id) ?? "the budgets calendar"}, ${pressed.size} items pressed through ${core.date}`,
    );
  }
  console.log(
    `budget-vote-sweep:\n${proved.join("\n")}\npassed over: ${passedOver.join("; ")}`,
  );
  expect(proved.length, `passed over: ${passedOver.join("; ")}`).toBe(3);
}, 3_600_000);

/**
 * Bodies whose rule sets no meeting on the fiscal year's first day, read from
 * built worlds' calendars (pinned, not drawn at run time): the plain case, and
 * a member appointed to a vacant seat after that meeting's agenda was posted.
 */
const BUDGET_DAY_PLACES = [
  {
    key: "2044375",
    name: "Manter, Kansas",
    seed: "4fa6d48a7167e5a108a04fad7d9c719348096af73d27978b399b2a6a8e9ff653",
    case: "seated all year",
  },
  {
    key: "4657340",
    name: "Salem, South Dakota",
    seed: "bd3f195533ac260072eb213f76c1dbef4845a0a92f8c812ee554a2befad28f57",
    case: "appointed on 2025-12-30, after the agenda was posted",
  },
];

it.each(BUDGET_DAY_PLACES)(
  "a body with no regular meeting on the budget's day meets that day: on the player's calendar the day before, and the player held at its hour ($name, $case)",
  (place) => {
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const s = seated(place);
    expect(s, `${where}: a seated member`).not.toBeNull();
    const { api, core, me } = s!;
    const pressed = new Map<string, string>();
    let regularThatDay: boolean | null = null;
    let seatedDayBefore = false;
    let listedDayBefore = false;
    let heldAt: string | null = null;
    play(
      s!,
      () => {
        const budget = heardBudget(api, s!.officeId);
        const day = budget ? voteDay(api, budget.id) : undefined;
        // The day before the vote: the calendar the player opens.
        if (budget && day && regularThatDay === null) {
          const before = new Date(Date.parse(`${day}T00:00:00Z`) - 86_400_000)
            .toISOString()
            .slice(0, 10);
          if (core.date === before) {
            regularThatDay = upcomingMeeting(api, s!.officeId)?.date === day;
            seatedDayBefore = members(api, s!.officeId).some(
              (term) => term.personId === me,
            );
            listedDayBefore = calendarItems(core, me).some(
              (item) =>
                item.kind === "meeting" &&
                item.date === day &&
                item.recordIds.includes(s!.officeId),
            );
          }
        }
        return (
          core.date >= "2026-01-03" ||
          (!!budget && billOf(api, budget.id).status !== "drafted")
        );
      },
      (meeting) => {
        const budget = heardBudget(api, s!.officeId);
        if (budget && meeting.agenda.includes(budget.id)) heldAt = meeting.date;
        pressAll(api, meeting, "yes", pressed);
      },
    );
    const budget = heardBudget(api, s!.officeId);
    const day = budget ? voteDay(api, budget.id) : undefined;
    expect(budget, `${where}: a budget heard by ${core.date}`).toBeTruthy();
    expect(day, `${where}: the budget's vote day`).toBe("2026-01-01");
    expect(seatedDayBefore, `${where}: the player sits on ${day}`).toBe(true);
    expect(
      regularThatDay,
      `${where}: ${day} is not a regular meeting day`,
    ).toBe(false);
    expect(
      listedDayBefore,
      `${where}: the ${day} meeting on the calendar the day before`,
    ).toBe(true);
    expect(heldAt, `${where}: held at the ${day} meeting`).toBe(day);
    expect(pressed.get(budget!.id), `${where}: ${budget!.number} pressed`).toBe(
      "yes",
    );
    expect(billOf(api, budget!.id).status, where).not.toBe("drafted");
    expect(unpressed(api, me, pressed)).toEqual([]);
  },
  600_000,
);
