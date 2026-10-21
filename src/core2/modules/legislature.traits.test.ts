/**
 * What a legislator's own traits do to the legislature's decisions, in a
 * played world of a place drawn from all 56 (the place and seed are named in
 * every failure): sitting attendance, a vote on a bill, a committee chair's
 * hearing, the executive's signature and the poison pill. Each measures the
 * audit's own gap: the pick rate of the third of people leaning most toward
 * an option against the third leaning least, net of the same gap with
 * personality flat, against the odds ratio the decision's weight was fitted to.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { PLATFORM_QUESTIONS } from "../campaign-views";
import type { PersonState } from "../types";
import {
  playedWorld,
  thirdsGap,
  townAdults,
  withFlatTraits,
} from "../../../tests/traits/support";
import {
  chairHearsBill,
  draftBill,
  executiveLean,
  memberPosition,
  missesSitting,
  movesPill,
} from "./legislature";
import { townSeats } from "./offices";

let ctx: ReturnType<typeof playedWorld>;
let people: PersonState[];
let bodyOfficeId: string;
let billId: string;

beforeAll(() => {
  ctx = playedWorld("legislature-traits");
  people = townAdults(ctx.core);
  const seat = townSeats(ctx.api).find((s) => s.holder?.personId);
  if (!seat) throw new Error(`No town seat holder in ${ctx.where}`);
  bodyOfficeId = seat.office.id;
  const bill = draftBill(ctx.api, {
    bodyOfficeId,
    sponsorId: seat.holder!.personId!,
    provisions: [
      {
        kind: "policy-question",
        question: PLATFORM_QUESTIONS[0]!,
        value: 1,
      },
    ],
  });
  billId = bill.id;
}, 240_000);

const bounds = (target: number) => [target / 2.5, target * 3] as const;

describe("legislature traits", () => {
  it("circumstances decide most sittings and temperament a few: legislature.attend-sitting", () => {
    // The vote's closeness runs from a unanimous chamber (0) toward a tie (1);
    // the grid straddles where the seat's pull stops outweighing the evening.
    const grid = [0, 0.02, 0.04, 0.06, 0.08, 0.1, 0.15, 0.25, 0.5, 1];
    const attendedBy = (closeness: number) =>
      people.filter(
        (p) =>
          !missesSitting(ctx.api, p.id, billId, bodyOfficeId, 0, closeness),
      ).length;
    const own = grid.map(attendedBy);
    const flat = withFlatTraits(people, () => grid.map(attendedBy));
    const label = `${ctx.where}: own ${own}, flat ${flat}, of ${people.length}`;
    // A closer vote brings more members to the sitting, with or without temperament.
    expect(flat.at(-1)!, label).toBeGreaterThanOrEqual(flat[0]!);
    expect(own.at(-1)!, label).toBeGreaterThanOrEqual(own[0]!);
    const turned = own.reduce((sum, n, i) => sum + Math.abs(n - flat[i]!), 0);
    // ... but for a small share of all the sittings: circumstances give the same answer with or without it.
    expect(turned / (people.length * grid.length), label).toBeLessThan(0.25);
  }, 120_000);

  it("votes follow party and district first and temperament at its calibrated size: legislature.member-position", () => {
    const gap = thirdsGap(
      ctx.core,
      people,
      "legislature.member-position",
      "yes",
      "no",
      (p) => memberPosition(ctx.api, billId, p.id).total > 0,
    );
    const target = Math.exp(
      Math.abs(
        // The fitted target: the default study at r = .2, thirds of a normal trait.
        ((Math.PI / Math.sqrt(3)) * 0.2 * 2.18) / Math.sqrt(1 - 0.2 ** 2),
      ),
    );
    const [low, high] = bounds(target);
    expect(gap.net, `${ctx.where}: ${JSON.stringify(gap)}`).toBeGreaterThan(
      low,
    );
    expect(gap.net, `${ctx.where}: ${JSON.stringify(gap)}`).toBeLessThan(high);
    // Most positions are settled by the record, not by temperament: the
    // trait part of a position is smaller than the rest for most members.
    const parts = people.map((p) => memberPosition(ctx.api, billId, p.id));
    const smaller = parts.filter(
      (row) => Math.abs(row.trait) < Math.abs(row.total - row.trait),
    ).length;
    expect(smaller / parts.length, ctx.where).toBeGreaterThan(0.6);
  }, 120_000);

  it("a chair's temperament tips only the hearings that were close: legislature.hold-hearing", () => {
    const gap = thirdsGap(
      ctx.core,
      people,
      "legislature.hold-hearing",
      "hear",
      "bury",
      (p) =>
        chairHearsBill(
          ctx.api,
          p.id,
          memberPosition(ctx.api, billId, p.id).total,
        ),
    );
    expect(gap.rateTop, ctx.where).toBeGreaterThanOrEqual(gap.rateBottom);
    expect(gap.net, `${ctx.where}: ${JSON.stringify(gap)}`).toBeGreaterThan(
      1.05,
    );
  }, 120_000);

  it("an executive's temperament adds to their position on a bill: legislature.sign-or-veto", () => {
    const gap = thirdsGap(
      ctx.core,
      people,
      "legislature.sign-or-veto",
      "sign",
      "veto",
      (p) => executiveLean(ctx.api, billId, p.id).lean >= 0,
    );
    expect(gap.rateTop, ctx.where).toBeGreaterThanOrEqual(gap.rateBottom);
    expect(gap.net, `${ctx.where}: ${JSON.stringify(gap)}`).toBeGreaterThan(
      1.05,
    );
  }, 120_000);

  it("a member who stands far against a bill moves a pill whatever their temperament: legislature.poison-pill", () => {
    // Far past the bar nobody holds back; far below it nobody moves.
    const far = people.filter((p) => movesPill(ctx.api, p.id, 3)).length;
    const none = people.filter((p) => movesPill(ctx.api, p.id, -3)).length;
    expect(far / people.length, ctx.where).toBeGreaterThan(0.95);
    expect(none / people.length, ctx.where).toBeLessThan(0.05);
    // Near the bar temperament decides.
    const gap = thirdsGap(
      ctx.core,
      people,
      "legislature.poison-pill",
      "pill-move",
      "pill-hold",
      (p) => movesPill(ctx.api, p.id, 0.5),
    );
    expect(gap.rateTop, ctx.where).toBeGreaterThanOrEqual(gap.rateBottom);
    expect(gap.net, `${ctx.where}: ${JSON.stringify(gap)}`).toBeGreaterThan(
      1.05,
    );
  }, 120_000);
});
