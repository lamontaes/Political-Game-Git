/**
 * A council whose town's charter is not compiled carries the usual name of
 * its kind of body in its state through a played year, and the legislature
 * reads that record when it words a bill's enacting clause
 * (gov-municipal-body-name-uncompiled-towns). A place is drawn from all 56 on
 * a seed nobody chose; BODY_NAMES_SEED pins one.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import bodyNames from "./data/offices/body-names.json" with { type: "json" };
import { gameStartDate } from "./game-start";
import { localGoverningBodyName } from "./gov-rules/local-governing-body-rules";
import { addDays } from "./kernel/dates";
import { advanceCore } from "./life";
import { LEGISLATURE_MODULE_ID, type BillRow } from "./modules/legislature";
import { townSeats } from "./modules/offices";
import { governmentTitleName } from "./offices-local";
import { governmentUnit } from "./reference/government-units";
import { coreAPI } from "./state";

const seed = process.env.BODY_NAMES_SEED ?? randomBytes(8).toString("hex");
const byKind = bodyNames.municipalByKind as Record<string, { value: string }>;
const byState = bodyNames.municipalByState as Record<
  string,
  Record<string, { value: string }>
>;

it(`an uncompiled town's council is named from its state's table all year and its bills are ordained by it (seed ${seed})`, () => {
  const tried: string[] = [];
  for (let draw = 0; draw < 12; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "body-names-year");
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const council = townSeats(api).find(
      (s) => s.office.kind === "council",
    )?.office;
    const unit = council ? governmentUnit(council.jurisdiction) : null;
    const words = unit?.name.trim().split(" ") ?? [];
    const kind = words[1] === "OF" ? words[0]!.toLowerCase() : "";
    if (!council || !unit || localGoverningBodyName(unit) || !byKind[kind]) {
      tried.push(`${where}: no uncompiled council of a listed kind`);
      continue;
    }
    const usual = byState[unit.stateUsps]?.[kind] ?? byKind[kind]!;
    const expected = `${governmentTitleName(words.slice(2).join(" "))} ${usual.value}`;
    advanceCore(core, addDays(gameStartDate(), 365));
    const record = townSeats(api).find(
      (s) => s.office.id === council.id,
    )?.office;
    expect(record?.bodyName, `${where}: ${council.id}`).toBe(expected);
    // The legislature reads the record when it words the body's bills.
    const bills = (
      api
        .moduleState(LEGISLATURE_MODULE_ID)
        .table("bills")
        .rows() as unknown as BillRow[]
    ).filter((bill) => bill.bodyOfficeId === council.id);
    expect(bills.length, `${where}: bills on ${council.id}`).toBeGreaterThan(0);
    for (const bill of bills)
      expect(bill.form.enactingClause, `${where}: ${bill.id}`).toContain(
        expected,
      );
    process.stdout.write(
      `BODY NAME ${where}: ${unit.id} (${unit.name}, ${unit.stateUsps}) ${council.id} is "${record!.bodyName}" on ${core.date}; ${bills.length} bills, e.g. ${bills[0]!.id}: "${bills[0]!.form.enactingClause}"\n`,
    );
    return;
  }
  throw new Error(
    `no drawn place with an uncompiled council: ${tried.join("; ")}; ${seed}`,
  );
}, 3_600_000);
