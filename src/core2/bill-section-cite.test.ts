/**
 * A bill section cites the law it amends by the record the player's world
 * keeps (owner, Oct 27: real data only calibrates, and laws in force stay
 * the real starting law). A law in force when the game began cites the
 * statute its research recorded, or nothing: its research source (a web
 * page, a survey, a note) only calibrated the row. A law passed in play
 * cites the bill that enacted it, by its designation and form.
 */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { composeBill } from "../english/bill-sections";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { billValueInForce, enactLaw, lawInForce } from "./modules/laws";
import {
  billOf,
  billSections,
  bodyJurisdiction,
  bodyReach,
  draftBill,
  memberKey,
  members,
} from "./modules/legislature";
import { townSeats } from "./modules/offices";
import { coreAPI } from "./state";

/**
 * Pinned to two places that gave two wrong answers when a test took the first level's wage row: a
 * state whose floor is above the nation's (Dale City, Virginia) and one whose floor ties the
 * nation's (Rhinelander, Wisconsin), where the bill amends the nation's row. The law "passed in
 * play" is staged through the laws module's own enactment (`enactLaw`, as the legislature calls it
 * when a bill passes): what the test proves is how the next section cites it, not how the body
 * votes, so it needs no played days.
 */
const PLACES = [
  {
    name: "Dale City, Virginia",
    key: process.env.BILL_CITE_PLACE_A ?? "5121088",
    seed:
      process.env.BILL_CITE_SEED_A ??
      "47f7857949a3a62878b3eb94a67104767ff11155b08c552f7051d1e006e2e4e8",
  },
  {
    name: "Rhinelander, Wisconsin",
    key: process.env.BILL_CITE_PLACE_B ?? "5567200",
    seed:
      process.env.BILL_CITE_SEED_B ??
      "599137bd9f211c930716542e3e18c2eb01c25214e82da4ae3969909b90cf5df2",
  },
];

it.each(PLACES)(
  "a section cites a law passed in play by its bill and a starting law by its recorded statute or nothing ($name)",
  ({ name, key, seed }) => {
    const where = `${name} (${key}), world seed ${seed}`;
    setBookkeeping(false);
    const { core } = buildBenchWorld(seed, gameStartDate(), {
      twoLevel: true,
      placeKey: key,
    });
    const api = coreAPI(core);
    const bodies = [
      ...new Map(
        townSeats(api)
          .filter((row) => members(api, row.office.id).length > 0)
          .map((row) => [row.office.id, row.office] as const),
      ).values(),
    ];
    const body =
      bodies.find((o) => o.level === "state" && o.id.endsWith("-lower")) ??
      bodies.find((o) => o.level === "state") ??
      bodies[0];
    expect(body, `${where}: a body with members`).toBeDefined();
    // At the opening: the wage floor in force is a starting law, calibrated
    // from research. A bill amending it says the old and new amounts and
    // cites nothing.
    // The row a bill amends is the one the drafting reader gives the body's own jurisdiction: the
    // highest wage floor among the nation and its governing levels, the nation's where they tie.
    const start = billValueInForce(
      api,
      { kind: "law-amount", series: "minimum-wage" },
      bodyJurisdiction(api, body!.id),
    ).row;
    expect(start, `${where}: no wage floor in force`).toBeTruthy();
    expect(
      start!.terms?.enactedByBill,
      `${where}: ${start!.id}`,
    ).toBeUndefined();
    const raise = draftBill(api, {
      bodyOfficeId: body!.id,
      sponsorId: memberKey(members(api, body!.id)[0]!),
      provisions: [
        {
          kind: "law-amount",
          series: "minimum-wage",
          value: (start!.value ?? 0) + 100,
          unit: start!.unit ?? "minor/hour",
        },
      ],
    });
    const [section] = billSections(api, raise);
    expect(section!.before.lawId, `${where}: ${raise.id}`).toBe(start!.id);
    expect(section!.before.statute, `${where}: ${raise.id}`).toBeNull();
    expect(section!.before.statuteForm, `${where}: ${raise.id}`).toBeNull();
    const text = (
      composeBill({
        ...raise,
        before: billSections(api, raise).map((s) => s.before),
      })?.text ?? []
    ).join(" ");
    expect(text, `${where}: ${raise.id}`).not.toBe("");
    expect(text, `${where}: ${raise.id}`).not.toContain("amending");
    for (const source of [start!.source].flat())
      expect(text, `${where}: ${raise.id} quotes ${source}`).not.toContain(
        String(source),
      );

    // A starting law whose research recorded its statute (the state's grant
    // of local minimum-wage authority) is cited by that statute, as Issues
    // names it: laws in force stay the real starting law.
    const grant = lawInForce(api, "local-minimum-wage-authority").levels.find(
      (l) => l.row,
    )?.row;
    const cite = grant?.terms?.cite;
    if (grant && typeof cite === "string") {
      const change = draftBill(api, {
        bodyOfficeId: body!.id,
        sponsorId: memberKey(members(api, body!.id)[0]!),
        provisions: [
          {
            kind: "law-amount",
            series: "local-minimum-wage-authority",
            value: (grant.value ?? 0) > 0 ? 0 : 1,
          },
        ],
      });
      const [granted] = billSections(api, change);
      expect(granted!.before.lawId, `${where}: ${change.id}`).toBe(grant.id);
      expect(granted!.before.statute, `${where}: ${grant.id}`).toBe(cite);
      expect(granted!.before.statuteForm, `${where}: ${grant.id}`).toBeNull();
    }

    // A law a body passed in play, in force here: the raise above becomes law through the laws
    // module's own enactment, and a new section on the same amount amends it.
    const law = enactLaw(api, {
      jurisdiction: bodyJurisdiction(api, body!.id),
      level: bodyReach(api, body!.id),
      series: "minimum-wage",
      value: (start!.value ?? 0) + 100,
      unit: start!.unit ?? "minor/hour",
      effectiveDate: api.state.date,
      measureId: raise.id,
      citation: `${raise.number}, enacted by the bill's own record`,
      terms: { enactedByBill: raise.id },
    });
    const enacting = billOf(api, raise.id);
    const again = draftBill(api, {
      bodyOfficeId: body!.id,
      sponsorId: memberKey(members(api, body!.id)[0]!),
      provisions: [
        {
          kind: "law-amount",
          series: "minimum-wage",
          value: (law.value ?? 0) + 100,
          ...(law.unit ? { unit: law.unit } : {}),
        },
      ],
    });
    const [cited] = billSections(api, again);
    expect(cited!.before.lawId, `${where}: ${again.id}`).toBe(law.id);
    expect(cited!.before.statute, `${where}: ${law.id}`).toBe(enacting.number);
    expect(cited!.before.statuteForm, `${where}: ${law.id}`).toBe(
      enacting.form.kind,
    );
  },
  120_000,
);
