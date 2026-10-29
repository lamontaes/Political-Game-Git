import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { billCatalog, provisionFor } from "../core2/bill-catalog";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { bodyOf, draftBill } from "../core2/modules/legislature";
import { townSeats } from "../core2/modules/offices";
import { coreAPI } from "../core2/state";
import { billTitleOf } from "../english/bill-names";
import { billItem } from "./office";
import { buildBenchWorld } from "./world";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const place = drawPlace(seed, "meeting-bill-title");

it(`the meeting's bill item carries the bill's real name, in ${place.name}, seed ${seed}`, () => {
  setBookkeeping(false);
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const { core } = world;
  const api = coreAPI(core);
  // A seat of the town's lawmaking body that someone holds (a council, a board).
  const council = townSeats(api).find(
    (seat) => seat.holder?.personId && bodyOf(api, seat.office.id),
  );
  expect(council, "a lawmaking seat with a holder").toBeDefined();
  const policies = billCatalog(api, "city").flatMap((subject) =>
    subject.topics.flatMap((topic) => topic.policies),
  );
  expect(policies.length).toBeGreaterThan(0);
  const seen = new Set<string>();
  for (const policy of policies)
    for (const operation of policy.operations) {
      const bill = draftBill(api, {
        bodyOfficeId: council!.office.id,
        sponsorId: council!.holder!.personId!,
        provisions: [
          provisionFor({ policyId: policy.id, operation, amount: 1000 }),
        ],
      });
      const shown = billItem(core, bill);
      const context = `${policy.id} ${operation}`;
      // The meeting shows the bill by its name; its sections are on the
      // paper, never a raw policy key and amount (golden-meeting-item-line).
      expect("provisions" in shown, context).toBe(false);
      // A real name, not the catalog's description of the policy.
      expect(shown.title, context).not.toBeNull();
      expect(shown.title!.toLowerCase(), context).not.toBe(
        policy.name.toLowerCase(),
      );
      expect(shown.title, context).toMatch(
        bill.form.kind === "ordinance" ? / Ordinance$/ : / Act$/,
      );
      expect(seen.has(shown.title!), `${context} repeats ${shown.title}`).toBe(
        false,
      );
      seen.add(shown.title!);
    }
}, 600_000);

it(`every bill a played year holds has a title composed from its sections, in ${place.name}, seed ${seed}`, () => {
  setBookkeeping(false);
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const { core } = world;
  advanceCore(core, addDays(makeIsoDate(core.date), 365));
  const bills = coreAPI(core)
    .moduleState("core2-legislature-v1")
    .table("bills")
    .rows() as unknown as {
    id: string;
    form: { kind: string };
    provisions: { kind: string; policyId?: string; operation?: string }[];
  }[];
  expect(bills.length).toBeGreaterThan(0);
  for (const bill of bills) {
    const title = billTitleOf(bill);
    expect(title, `${bill.id} has no title`).not.toBeNull();
    expect(title!.sections.length, bill.id).toBeGreaterThan(0);
    expect(title!.purpose.trim(), bill.id).not.toBe("");
  }
}, 900_000);
