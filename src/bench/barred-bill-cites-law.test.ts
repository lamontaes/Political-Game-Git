// @vitest-environment node
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "./world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { coreAPI } from "../core2/state";
import { lawChain, enactLaw } from "../core2/modules/laws";
import { bodyOf, draftBill, members } from "../core2/modules/legislature";
import { townSeats } from "../core2/modules/offices";
import { provisionFor } from "../core2/bill-catalog";
import { menusFor } from "./legislature";

// A town's income-tax bill barred by the state names the law that bars it
// (words-blocked-bill-names-the-state-law): in a drawn place whose state
// bars a local income tax, the council's income-tax item is barred with the
// reason and nothing to cite (a starting law records no statute); after a
// state bill grants the power the item is open; after a second state bill
// withdraws it the item is barred again, citing that bill as the bill paper
// cites a law, from the authority source's own law row.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it("a barred income-tax bill names the state law that bars it", () => {
  setBookkeeping(false);
  const tried: string[] = [];
  for (let draw = 0; draw < 8; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "barred-bill-cites-law");
    const where = `${place.name} (${place.key}), seed ${seed}:${draw}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const council = townSeats(api).find(
      (row) =>
        row.office.level === "city" &&
        members(api, row.office.id).length > 1 &&
        bodyOf(api, row.office.id),
    );
    const item = () =>
      menusFor(api, "city", council!.office.id)
        .flatMap((menu) => menu.items)
        .find((row) => row.series === "income-tax") as
        { allowed: boolean; reason: string; citedAs?: string } | undefined;
    if (!council || !item() || item()!.allowed) {
      tried.push(
        `${where}: ${council ? "the state lets towns tax income" : "no council"}`,
      );
      continue;
    }
    const before = item()!;
    expect(before.reason, where).toBe("state-gives-no-local-tax");
    const state = lawChain(api).stateKey;
    const chamber = townSeats(api).find(
      (row) =>
        row.office.kind.startsWith("legislature-") &&
        bodyOf(api, row.office.id),
    );
    const sponsor = chamber
      ? (members(api, chamber.office.id)[0]?.personId ?? "sponsor")
      : "sponsor";
    // A state bill on the grant, as the legislature drafts one.
    const stateBill = (value: number) =>
      draftBill(api, {
        bodyOfficeId: chamber!.office.id,
        sponsorId: sponsor,
        provisions: [
          provisionFor({
            policyId: "law:local-income-tax-authority",
            operation: value ? "raise" : "lower",
            amount: value,
          }),
        ],
      });
    const enact = (value: number, measure: string) => {
      const bill = stateBill(value);
      enactLaw(api, {
        jurisdiction: state,
        level: "state",
        series: "local-income-tax-authority",
        value,
        effectiveDate: core.date,
        measureId: measure,
        citation: bill.id,
        terms: { enactedBy: bill.number, enactedByBill: bill.id },
      });
      return bill;
    };
    enact(1, "grant");
    const granted = item()!;
    const withdrawn = enact(0, "withdraw");
    const after = item()!;
    console.log(
      `${where}: before ${before.reason} cites ${before.citedAs ?? "nothing"}; granted ${granted.allowed}; withdrawn by ${withdrawn.number} -> ${after.reason} cites ${after.citedAs}; passed over: ${tried.join(" | ")}`,
    );
    expect(granted.allowed, where).toBe(true);
    expect(after.allowed, where).toBe(false);
    expect(after.citedAs, where).toContain(withdrawn.number);
    return;
  }
  throw new Error(
    `no drawn place's state bars a local income tax: ${tried.join(" | ")}`,
  );
}, 1_800_000);
