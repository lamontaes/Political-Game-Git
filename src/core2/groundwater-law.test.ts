/** Native played-year evidence, followed by explicit controlled law edge cases. */
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { coreAPI, fillInPerson } from "./state";
import { enactLaw, lawChain, lawInForce } from "./modules/laws";
import { residentsRuntime } from "./modules/residents";
import { limitOutsideSales } from "./residents-economy";

const question =
  "us-policy-positions:agriculture-natural-resources.limit-groundwater-withdrawal";
it("reads withdrawal law at farm production and removes its limit on repeal", () => {
  const draw = process.env.LAW_LINK_DRAW
    ? JSON.parse(readFileSync(process.env.LAW_LINK_DRAW, "utf8"))
    : drawPlace(randomBytes(32).toString("hex"), "session-a-groundwater");
  setBookkeeping(false);
  try {
    const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: draw.key,
    });
    const api = coreAPI(core);
    const table = api.moduleState("business").table("operating");
    const records = new Map<string, unknown>();
    const receipts = new Map<string, unknown>();
    const owners = new Map<string, unknown>();
    const started = performance.now();
    for (let day = 0; day < 365; day++) {
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
      for (const row of table.rows()) {
        if (!String(row.cause).startsWith(`law:${question}:`)) continue;
        const org = core.organizations.get(String(row.organizationId));
        const owner = api
          .moduleState("business")
          .table("owners")
          .get(String(row.organizationId));
        if (owner?.ownerId) {
          core.focusPersonIds.add(String(owner.ownerId));
          const person = fillInPerson(core, String(owner.ownerId));
          owners.set(String(owner.ownerId), {
            id: owner.ownerId,
            name: `${person?.givenName} ${person?.familyName}`,
          });
        }
        const key = `${row.id}:${row.cause}:${core.date.slice(0, 7)}`;
        if (records.has(key)) continue;
        records.set(key, {
          date: core.date,
          row,
          org,
          owner: api
            .moduleState("business")
            .table("owners")
            .get(String(row.organizationId)),
          flows: [...(residentsRuntime(core)?.flows.values() ?? [])]
            .filter(
              (f) =>
                f.payeeId === row.organizationId && f.kind === "outside-sales",
            )
            .map((f) => ({ ...f })),
        });
      }
      for (const receipt of core.cashJournal.detailedReceipts.values()) {
        if (!receipt.sourceRef.id.startsWith("owner-draw:")) continue;
        receipts.set(receipt.id, {
          id: receipt.id,
          date: receipt.date,
          sourceRef: receipt.sourceRef,
          postings: receipt.postings,
          owners: [...receipt.owners],
        });
      }
    }
    const evidence = {
      draw,
      seconds: (performance.now() - started) / 1000,
      modules: core.modules.size,
      date: core.date,
      law: lawInForce(api, question),
      records: [...records.values()],
      owners: [...owners.values()],
      receipts: [...receipts.values()],
      journal: core.cashJournal.totals,
    };
    if (process.env.LAW_LINK_PROOF)
      writeFileSync(process.env.LAW_LINK_PROOF, JSON.stringify(evidence));
    expect(core.cashJournal.totals.grossDebitMinor).toBe(
      core.cashJournal.totals.grossCreditMinor,
    );
    // These changes are controlled edge cases, not native-world acceptance evidence.
    const changeLaw = (value: number) => {
      for (const level of lawChain(api).levels)
        enactLaw(api, {
          jurisdiction: level.jurisdiction,
          level: level.level,
          series: question,
          value,
          effectiveDate: core.date,
          measureId: `fixture:groundwater:${value}`,
          citation: "Controlled law case after the native generated year.",
        });
      advanceCore(core, addDays(makeIsoDate(core.date), 32));
    };
    changeLaw(1);
    const rules = table
      .rows()
      .filter((r) => String(r.cause).startsWith(`law:${question}:`));
    const compared: string[] = [];
    for (const row of rules) {
      const flows = [...(residentsRuntime(core)?.flows.values() ?? [])].filter(
        (f) =>
          f.payeeId === row.organizationId &&
          f.kind === "outside-sales" &&
          !f.endedAt,
      );
      const amounts = flows.map((f) => f.amountMinor);
      limitOutsideSales(core, String(row.organizationId), 1);
      const factor =
        1 -
        Number(row.share) *
          api.parameter("businessGroundwaterOutputElasticity");
      flows.forEach((f, i) =>
        expect(
          Math.abs(amounts[i]! - f.amountMinor * factor),
        ).toBeLessThanOrEqual(1),
      );
      limitOutsideSales(core, String(row.organizationId), factor);
      compared.push(...flows.map((f) => f.id));
    }
    changeLaw(0);
    expect(
      table
        .rows()
        .filter((r) => String(r.cause).startsWith(`law:${question}:`)),
    ).toHaveLength(0);
    if (process.env.LAW_LINK_PROOF)
      writeFileSync(
        process.env.LAW_LINK_PROOF,
        JSON.stringify({
          ...evidence,
          controlled: { rules: rules.length, compared },
        }),
      );
  } finally {
    setBookkeeping(true);
  }
  // A drawn farm town's year took 156 seconds at two workers on a 4-core
  // container, past the 120 seconds it had; about twice that.; re-measured at 189 s the same way.
}, 300_000);
