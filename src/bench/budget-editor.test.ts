/**
 * The bench lets a mayor or county executive edit the budget the "Send the
 * budget" act sends (office-budget-season-bench-editor): in the season, the
 * office view lists the budget's lines with the change set for each, a pick
 * sets one, and the act sends exactly those changes, which the council votes.
 * A place is drawn from all 56 on a seed nobody chose (BUDGET_EDITOR_SEED pins
 * one); one without a mayor or county executive with a government is redrawn.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { budgetPriorities, governments } from "../core2/modules/budgets";
import { memberKey } from "../core2/modules/legislature";
import { officeHost } from "../core2/modules/office-day";
import { townSeats } from "../core2/modules/offices";
import { budgetProposalDue, officeActHandlers } from "../core2/office-day-acts";
import { coreAPI } from "../core2/state";
import { budgetLinePick, officeView } from "./office";
import { buildBenchWorld } from "./world";

const seed = process.env.BUDGET_EDITOR_SEED ?? randomBytes(8).toString("hex");

it("a mayor sets lines of the budget to send and the act sends exactly those", () => {
  const tried: string[] = [];
  for (let draw = 0; draw < 8; draw++) {
    const place = drawPlace(`${seed}:${draw}`, "budget-editor");
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const mayor = townSeats(api).find(
      (s) => s.office.kind === "mayor" && s.holder?.personId,
    );
    const city = governments(api).find((g) => g.level === "city");
    if (!mayor || !city) {
      tried.push(`${where}: no mayor or city government`);
      continue;
    }
    const mayorId = memberKey(mayor.holder!);
    // Out of season there is no budget to edit.
    expect(officeView(core, mayorId).budget ?? null, where).toBeNull();
    expect(() => budgetLinePick(core, mayorId, "any", 1), where).toThrow();
    // Into the season: the lead time before the next fiscal year.
    const lead = api.parameter("budgetProposalLeadDays");
    const year = Number(core.date.slice(0, 4));
    const next =
      `${year}-${city.fiscalYearStart}` > core.date
        ? `${year}-${city.fiscalYearStart}`
        : `${year + 1}-${city.fiscalYearStart}`;
    const open = addDays(makeIsoDate(next), -(lead - 1));
    if (core.date < open) advanceCore(core, open);
    if (core.date > open || !budgetProposalDue(api, officeHost, mayorId)) {
      tried.push(`${where}: the season was not open on ${open}`);
      continue;
    }
    const view = officeView(core, mayorId).budget!;
    expect(view.governmentId, where).toBe(city.id);
    expect(view.lines.length, `${where}: budget lines`).toBeGreaterThan(1);
    expect(
      view.lines.every((l) => l.changeMinor === 0),
      where,
    ).toBe(true);
    const [first, second] = view.lines;
    // Set two lines, one up and one down; a line left alone stays unchanged.
    const up = Math.round(first!.amountMinor * 0.1);
    const down = -Math.round(second!.amountMinor * 0.2);
    budgetLinePick(core, mayorId, first!.line, up);
    const after = budgetLinePick(core, mayorId, second!.line, down);
    const set = Object.fromEntries(
      after
        .budget!.lines.filter((l) => l.changeMinor !== 0)
        .map((l) => [l.line, l.changeMinor]),
    );
    expect(set, where).toEqual({ [first!.line]: up, [second!.line]: down });
    expect(
      () => budgetLinePick(core, mayorId, "no-such-line", 1),
      where,
    ).toThrow();
    // Setting a line back to nothing takes it out.
    budgetLinePick(core, mayorId, second!.line, 0);
    expect(
      Object.keys(
        officeHost.prepared(api, mayorId, "propose-budget")!.budget!.changes,
      ),
      where,
    ).toEqual([first!.line]);
    // The act sends exactly what was set.
    officeActHandlers(officeHost)["propose-budget"]!(api, mayorId, {} as never);
    expect(budgetPriorities(api, city.id)?.changes, where).toEqual({
      [first!.line]: up,
    });
    process.stdout.write(
      `${where}: mayor ${mayorId} sent ${first!.line} ${up > 0 ? "+" : ""}${up} for ${city.id}\n`,
    );
    return;
  }
  throw new Error(
    `no mayor with an open budget season in 8 draws: ${tried.join("; ")} (seed ${seed})`,
  );
}, 1_800_000);
