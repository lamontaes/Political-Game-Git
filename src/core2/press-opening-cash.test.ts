/**
 * A local news outlet opens with the cash a small firm holds against its
 * payroll, so its second payday does not fall before its first month's
 * revenue; a national outlet's money stays outside the town. A random place
 * from all 56 whose town has local outlets.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { coreAPI } from "./state";
import { openingEmployerCashBufferPrior } from "./opening-capital";
import { outletsHere, pressParameter, PRESS_MODULE_ID } from "./modules/press";
import { advanceCore } from "./life";
import { addDays, makeIsoDate } from "./kernel/dates";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it("opens each local outlet with its buffer days of payroll in cash", () => {
  const tried: string[] = [];
  for (let draw = 0; draw < 10; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "press-opening-cash");
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    tried.push(`${place.name} (${place.key})`);
    const core = world.core;
    const api = coreAPI(core);
    const local = outletsHere(api).filter((o) => o.tier === "local");
    if (!local.length) continue;
    const where = `${place.name}, seed ${seed}:${draw}`;
    for (const outlet of local) {
      const payroll =
        pressParameter("editorAnnualPayMinor") +
        outlet.reporterIds.length * pressParameter("reporterAnnualPayMinor");
      const days = openingEmployerCashBufferPrior(
        core.seed,
        outlet.organizationId,
        "all-small-businesses",
      ).bufferDays;
      const held = api
        .accounts()
        .balance(`cash:${outlet.organizationId}:residual`);
      expect(held, `${where}, ${outlet.id}`).toBeGreaterThan(0);
      expect(held, `${where}, ${outlet.id}`).toBe(
        Math.round((days * payroll) / pressParameter("daysPerYear")),
      );
    }
    for (const outlet of outletsHere(api).filter((o) => o.tier === "national"))
      expect(
        api.accounts().balance(`cash:${outlet.organizationId}:residual`),
        where,
      ).toBe(0);
    // Opening cash is already present. When the real day hooks enroll the
    // outlets as employers, they must not fund that startup a second time.
    const localAccounts = new Set(
      local.map((outlet) => api.accounts().main(outlet.organizationId)),
    );
    const extraStartupCash: { recordId: string; amountMinor: number }[] = [];
    const post = api.postJournal.bind(api);
    api.postJournal = (entry) => {
      if (
        entry.sourceRef.kind === "accounts.transfer" &&
        entry.sourceRef.id.startsWith("working-capital:")
      ) {
        const amountMinor = entry.postings.reduce(
          (sum, row) =>
            sum +
            (localAccounts.has(row.accountId) && row.deltaMinor > 0
              ? row.deltaMinor
              : 0),
          0,
        );
        if (amountMinor > 0)
          extraStartupCash.push({
            recordId: entry.sourceRef.id,
            amountMinor,
          });
      }
      return post(entry);
    };
    try {
      advanceCore(core, addDays(makeIsoDate(core.date), 2));
    } finally {
      api.postJournal = post;
    }
    const enrolled = api
      .moduleState(PRESS_MODULE_ID)
      .table("employerEnrollment")
      .rows();
    if (!enrolled.length) {
      tried.push(`${where}: no outlet enrolled in the first two days`);
      continue;
    }
    expect(
      extraStartupCash,
      `${where}: startup cash was already funded`,
    ).toEqual([]);
    console.log(
      `PRESS STARTUP ${where}: ${enrolled.map((row) => row.id).join(", ")}; no second startup payment`,
    );
    return;
  }
  throw new Error(`No town with local outlets: ${tried.join("; ")}`);
}, 3_600_000);
