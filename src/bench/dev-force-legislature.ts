/**
 * Dev mode forces the legislature's scenes through the legislature's own writers (pool item
 * dev-force-every-scene-through-its-writer; owner, Nov 15: "a part of the dev mode should be able to
 * trace and force every scene to play"). Each recipe writes the cause record the way the engine
 * writes it in play, then runs the next day, and the director stages the scene from that record id
 * through its own scheduling:
 *  - `carry`: someone the player knows asks them to carry a bill (`askToCarry`, carry-asked);
 *  - `held`: the player's own bill, which its committee's chair holds unheard (`draftBill`,
 *    `castChairHearing`, the committee stage: bill-held-in-committee);
 *  - `presented`: a colleague's bill passes and reaches the player's desk as the executive
 *    (`draftBill`, the members' votes, `holdEveryChamber`: bill-presented);
 *  - `introduced`: the player introduces a bill (`draftBill`: office.introduced);
 *  - `count`: a colleague's bill goes to the floor one vote short, and the sponsor's count the
 *    evening before asks the player (`scheduleVote`, the members' votes, `askBeforeTheRoll`:
 *    vote-ahead).
 * A scene of the seat needs a seat: a player who holds none takes the town's seat in the state's
 * lower chamber (or the governorship, for the desk) through the offices engine's dev start
 * (`seatPlayerInStateOffice`), as a winner takes office. Every write is marked by the caller as
 * `scene-forced` and never counts as played.
 */
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import {
  askToCarry,
  authorityFor,
  bodyRow,
  castChairHearing,
  castMemberVote,
  chambersOf,
  committeeMemberKeys,
  draftBill,
  executiveOf,
  members,
  memberKey,
  scheduleVote,
  type Provision,
} from "../core2/modules/legislature";
import { OFFICES_MODULE_ID, type TermRow } from "../core2/modules/offices";
import {
  seatCoveringTown,
  seatPlayerInStateOffice,
} from "../core2/office-day-state";
import { coreAPI } from "../core2/state";
import type { CoreAPI, PersonId } from "../core2/types";
import type { DevMode } from "./dev-mode";
import { seatView } from "./legislature";

/** The legislature's situation types dev mode can force, by recipe. */
export const LEGISLATURE_SCENES: Readonly<
  Record<string, "carry" | "held" | "presented" | "introduced" | "count">
> = {
  // The count waits for the chamber's next sitting, so it goes first in a run of every recipe.
  "vote-asked": "count",
  "bill-carry": "carry",
  "hold-chair-sought": "held",
  "press-interview": "introduced",
  // The desk seats a player who is no executive as governor, so it goes last.
  "desk-visit": "presented",
};

/**
 * The legislature's types no recipe can force, each with why (a reason key of the scene view's
 * labels): a chair the leadership or seniority seats, a move only a member's own position makes, or
 * a word at the seat that reaches only a player living the day.
 */
export const LEGISLATURE_REASONS: Readonly<Record<string, string>> = {
  "bill-held-chair": "chair",
  "section-bargain": "members-decide",
  "vote-confirmed": "members-decide",
  "floor-debate": "lived",
  "hearing-witness": "lived",
  "lobby-remembers": "lived",
};

/** Why a recipe could not run in this world, a reason key of the scene view's labels. */
export type LegislatureRefusal =
  | "no-seat"
  | "no-colleague"
  | "no-question"
  | "no-committee"
  | "no-sitting"
  | "no-player";

export interface LegislatureForce {
  readonly recipe: "legislature";
  readonly way: string;
  readonly personId: string | null;
  /** The records the recipe wrote through the legislature's writers. */
  readonly written: readonly string[];
  /** The cause record the scene was staged from, where it was. */
  readonly causeRecords: readonly string[];
  readonly staged: boolean;
  /** The director's outcome for the moment and the types it held back, with why. */
  readonly outcome: string | null;
  readonly heldBack: readonly { typeKey: string; reason: string }[];
  /** The term the dev start seated the player in, where it had to. */
  readonly seated: string | null;
  readonly refused?: LegislatureRefusal;
}

const officeKind = (api: CoreAPI, officeId: string) =>
  (
    api.moduleState(OFFICES_MODULE_ID).table("offices").get(officeId) as
      { kind?: string } | undefined
  )?.kind;

/** The bodies that make law where the person holds a serving seat. */
function bodiesHeld(api: CoreAPI, personId: string): string[] {
  return (
    api
      .moduleState(OFFICES_MODULE_ID)
      .table("terms")
      .query("byPerson", [personId]) as unknown as TermRow[]
  )
    .filter((term) => term.status === "serving")
    .map((term) => term.officeId)
    .filter(
      (officeId) =>
        !!bodyRow(officeKind(api, officeId) ?? "") &&
        members(api, officeId).some((term) => memberKey(term) === personId),
    )
    .sort();
}

/** A body whose executive the person is: a bill it passes goes to their desk. */
function bodyAtDesk(
  mode: DevMode,
  api: CoreAPI,
  personId: string,
): string | undefined {
  return mode
    .lawmakingBodies()
    .map((body) => body.id)
    .find((id) => {
      const term = executiveOf(api, id).term;
      return !!term && memberKey(term) === personId;
    });
}

/** The living members of a body other than the person, in key order. */
const colleagues = (api: CoreAPI, bodyOfficeId: string, personId: string) =>
  members(api, bodyOfficeId)
    .map(memberKey)
    .filter((id) => id !== personId && api.state.people.get(id)?.alive)
    .sort();

/** A section the body may pass: a question the member's own seat may draft, turned by the bills already drafted. */
function sectionFor(
  mode: DevMode,
  api: CoreAPI,
  memberId: string,
): Provision | undefined {
  const sections = seatView(mode.core, memberId)
    .questions.map((question): Provision => ({
      kind: "policy-question",
      question,
      value: 1,
    }))
    .filter((section) => authorityFor(api, section).allowed);
  if (!sections.length) return undefined;
  const drafted = api
    .moduleState("core2-legislature-v1")
    .table("bills")
    .rows().length;
  return sections[drafted % sections.length];
}

/**
 * Forces one of the legislature's situation types for the player through the legislature's own
 * writers, then runs the day the director stages it on.
 */
export function forceLegislatureScene(
  mode: DevMode,
  typeKey: string,
): LegislatureForce {
  const way = LEGISLATURE_SCENES[typeKey];
  if (!way) throw new Error("No such situation type.");
  const api = coreAPI(mode.core);
  const playerId = mode.core.playerId as PersonId | undefined;
  const refuse = (
    refused: LegislatureRefusal,
    seated: string | null = null,
    wrote: readonly string[] = [],
  ) =>
    ({
      recipe: "legislature",
      way,
      personId: playerId ?? null,
      written: wrote,
      causeRecords: [],
      staged: false,
      outcome: null,
      heldBack: [],
      seated,
      refused,
    }) as const;
  if (!playerId || !mode.director || !mode.core.people.get(playerId)?.alive)
    return refuse("no-player");
  if (!mode.director.ledger.people.has(playerId))
    mode.director.watch(mode.core, playerId);
  const book = mode.director.ledger.people.get(playerId)!;

  // The seat the scene needs: the desk of a body for the executive's visit, a member's seat else.
  let seated: string | null = null;
  let body: string | undefined;
  if (way === "presented") {
    body = bodyAtDesk(mode, api, playerId);
    if (!body) {
      if (!seatCoveringTown(api, "governor")) return refuse("no-seat");
      seated = seatPlayerInStateOffice(api, {
        personId: playerId,
        role: "governor",
      }).termId;
      body = bodyAtDesk(mode, api, playerId);
    }
  } else {
    body = bodiesHeld(api, playerId)[0];
    if (!body) {
      if (!seatCoveringTown(api, "legislator")) return refuse("no-seat");
      const held = seatPlayerInStateOffice(api, {
        personId: playerId,
        role: "legislator",
      });
      seated = held.termId;
      body = bodiesHeld(api, playerId)[0];
    }
  }
  if (!body) return refuse("no-seat", seated);
  const colleague = colleagues(api, body, playerId)[0];
  if (!colleague && way !== "introduced" && way !== "held")
    return refuse("no-colleague", seated);
  const drafter =
    way === "presented" || way === "count" ? colleague! : playerId;
  const section = sectionFor(mode, api, drafter);
  if (!section) return refuse("no-question", seated);

  const scheduled = book.schedule.length;
  const written: string[] = [];
  const day = () => mode.advance(addDays(makeIsoDate(mode.core.date), 1));
  if (way === "carry") {
    const player = mode.core.people.get(playerId)!;
    // Family first, then the people they know, each in id order.
    const alive = (ids: Iterable<string>) =>
      [...ids]
        .filter((id) => id !== playerId && mode.core.people.get(id)?.alive)
        .sort();
    const asker =
      alive(player.familyIds)[0] ?? alive(player.knownIds)[0] ?? colleague!;
    const row = askToCarry(api, {
      askerId: asker,
      memberId: playerId,
      bodyOfficeId: body,
      provisions: [section],
    });
    written.push(`carry-asked:${row.id}`);
    day();
  } else if (way === "introduced") {
    const bill = draftBill(api, {
      bodyOfficeId: body,
      sponsorId: playerId,
      provisions: [section],
    });
    written.push(bill.id);
    day();
  } else if (way === "held") {
    const bill = draftBill(api, {
      bodyOfficeId: body,
      sponsorId: playerId,
      provisions: [section],
    });
    const first = chambersOf(api, bill)[0]!;
    if (!committeeMemberKeys(api, bill.id, first).length)
      return refuse("no-committee", seated, [bill.id]);
    // The chair holds it unheard: the committee stage decides by the chair's cast choice.
    castChairHearing(api, bill.id, first, false);
    mode.decideAt(bill.id, undefined, {});
    written.push(bill.id, `committee:${bill.id}:${first}`);
    day();
  } else if (way === "presented") {
    const bill = draftBill(api, {
      bodyOfficeId: body,
      sponsorId: colleague!,
      provisions: [section],
    });
    // Every member votes for it in every chamber and each committee hears it.
    mode.decideAt(bill.id, members(api, body).length, { chairHears: true });
    written.push(bill.id);
    day();
  } else {
    // The sponsor's count: the chamber stands even without the player, so the player's vote is the
    // one it needs. The committee's members vote for it, the rest of the chamber splits evenly, and
    // one stays out where the count is odd; the sponsor asks the player the evening before the roll.
    const bill = draftBill(api, {
      bodyOfficeId: body,
      sponsorId: colleague!,
      provisions: [section],
    });
    const chamber = chambersOf(api, bill)[0]!;
    for (const each of chambersOf(api, bill))
      castChairHearing(api, bill.id, each, true);
    const committee = new Set(committeeMemberKeys(api, bill.id, chamber));
    const others = members(api, chamber)
      .map(memberKey)
      .filter((id) => id !== playerId)
      .sort(
        (a, b) =>
          Number(b === colleague) - Number(a === colleague) ||
          Number(committee.has(b)) - Number(committee.has(a)) ||
          a.localeCompare(b),
      );
    const half = Math.floor(others.length / 2);
    others.forEach((id, index) =>
      castMemberVote(
        api,
        bill.id,
        id,
        index < half ? "yes" : index < 2 * half ? "no" : "abstain",
      ),
    );
    scheduleVote(api, bill.id);
    const ran = mode.runUntil({
      kind: "vote-ahead",
      person: playerId,
      cap: 200,
    });
    written.push(bill.id, ...ran.records);
    if (ran.reason !== "event") return refuse("no-sitting", seated, written);
    day();
  }

  const fresh = book.schedule.slice(scheduled);
  const bound = fresh.find((row) =>
    row.bindings.some((binding) => binding.typeKey === typeKey),
  );
  const moment = bound ? book.momentsById.get(bound.momentId) : undefined;
  return {
    recipe: "legislature",
    way,
    personId: playerId,
    written,
    causeRecords: moment ? [moment.causeId] : [],
    staged: !!bound,
    outcome: bound?.outcome ?? null,
    heldBack: fresh.flatMap((row) =>
      (row.heldBack ?? []).filter((held) => held.typeKey === typeKey),
    ),
    seated,
  };
}
