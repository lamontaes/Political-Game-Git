import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { localOfficeKit } from "./office-day-acts";
import { governments } from "./modules/budgets";
import { contractsOf } from "./modules/contracts";
import {
  cutRibbon,
  finishedProjects,
  ribbonOf,
  ribbonsToCut,
} from "./modules/projects";
import { coreAPI } from "./state";

// A public work is the year's award of a capital line to a town firm; it is
// finished when the next fiscal year takes over, and its ribbon is offered to
// the officeholder (office-cut-a-ribbon-needs-a-record-of).
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it(`a finished public work is offered as a ribbon, cut once, and recorded, seed ${seed}`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const place = drawPlace(seed, `projects:${attempt}`);
    tried.push(place.name);
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const events: { id: string; personIds: readonly string[] }[] = [];
    api.subscribeEvents("test-projects", ["ribbon-cut"], (_api, event) =>
      events.push(event as never),
    );
    // Live a month at a time until a finished work's ribbon is open (or two years pass).
    let open = ribbonsToCut(api);
    for (let month = 0; month < 26 && !open.length; month += 1) {
      advanceCore(core, addDays(makeIsoDate(core.date), 30));
      open = ribbonsToCut(api);
    }
    if (!open.length) continue;
    const where = `${place.name} [${place.key}], seed ${seed}`;
    const project = open[0]!;
    // The project is the award: its contractor, payments and cost are recorded.
    const award = contractsOf(api, project.governmentId).find(
      (row) => row.id === project.id,
    )!;
    expect(project.paidMinor, `${where} ${project.id}`).toBe(award.paidMinor);
    expect(project.paymentIds.length, `${where} ${project.id}`).toBeGreaterThan(
      0,
    );
    expect(core.organizations.has(project.contractorId), where).toBe(true);
    expect(
      finishedProjects(api, project.governmentId).some(
        (p) => p.id === project.id,
      ),
    ).toBe(true);
    // The office day offers it, citing the record.
    const kit = localOfficeKit({
      officesOf: () => ["office:test"],
      keep: () => undefined,
      prepared: () => null,
      clearPrepared: () => undefined,
      given: () => false,
      lastGiven: () => undefined,
    });
    const player = core.playerId!;
    const action = kit.acts.find((a) => a.id === "cut-ribbon")!;
    const offers = kit.providers["public-project"]!(
      api,
      core.people.get(player)!,
      action,
    );
    expect(
      offers.map((o) => o.targetId),
      `${where}: the office day offers the ribbon`,
    ).toContain(project.id);
    // Cutting it records the ribbon once and publishes it.
    const cut = cutRibbon(api, { projectId: project.id, cutBy: player });
    expect(cut, where).not.toBeNull();
    expect(ribbonOf(api, project.id)?.cutBy).toBe(player);
    expect(events.map((e) => e.id)).toContain(`ribbon-cut:${project.id}`);
    expect(cutRibbon(api, { projectId: project.id, cutBy: player })).toBeNull();
    expect(ribbonsToCut(api).some((p) => p.id === project.id)).toBe(false);
    expect(governments(api).some((g) => g.id === project.governmentId)).toBe(
      true,
    );
    expect(core.cashJournal.totals.grossDebitMinor).toBe(
      core.cashJournal.totals.grossCreditMinor,
    );
    process.stdout.write(
      `${where}: ${project.id} paid ${project.paymentIds.length} times, finished ${project.finishedOn}, ribbon cut ${ribbonOf(api, project.id)?.cutOn}\n`,
    );
    return;
  }
  throw new Error(
    `no drawn town finished a public work (${tried.join(", ")}; seed ${seed})`,
  );
}, 1_800_000);
