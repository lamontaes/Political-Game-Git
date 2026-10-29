/**
 * A bill section cites the law it amends by the record the player's world
 * keeps (owner, Oct 27: real data only calibrates, and laws in force stay
 * the real starting law). A law in force when the game began cites the
 * statute its research recorded, or nothing: its research source (a web
 * page, a survey, a note) only calibrated the row. A law passed in play
 * cites the bill that enacted it, by its designation and form. A random
 * place from all 56, played until its bodies have passed laws of their own.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { composeBill } from "../english/bill-sections";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import type { LawRowInput } from "./laws-starting";
import { LAWS_MODULE_ID, lawInForce } from "./modules/laws";
import {
  billOf,
  billSections,
  draftBill,
  memberKey,
  members,
} from "./modules/legislature";
import { townSeats } from "./modules/offices";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
/** Places tried before giving up on a law passed in play that a section amends. */
const DRAWS = 4;
/** Days played, long enough for a body's first laws to take effect. */
const DAYS = 150;

it(`a section cites a law passed in play by its bill and a starting law by its recorded statute or nothing (seed ${seed})`, () => {
  const tried: string[] = [];
  for (let draw = 0; draw < DRAWS; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "bill-section-cite");
    const where = `${place.name} (${place.key}), run seed ${seed} draw ${draw}, world seed ${place.seed}`;
    setBookkeeping(false);
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
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
    if (!body) {
      tried.push(`${where}: no body with members`);
      continue;
    }
    // At the opening: the wage floor in force is a starting law, calibrated
    // from research. A bill amending it says the old and new amounts and
    // cites nothing.
    const floor = lawInForce(api, "minimum-wage");
    const start = floor.levels.find((l) => l.row)?.row;
    expect(start, `${where}: no wage floor in force`).toBeTruthy();
    expect(
      start!.terms?.enactedByBill,
      `${where}: ${start!.id}`,
    ).toBeUndefined();
    const raise = draftBill(api, {
      bodyOfficeId: body.id,
      sponsorId: memberKey(members(api, body.id)[0]!),
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
        bodyOfficeId: body.id,
        sponsorId: memberKey(members(api, body.id)[0]!),
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

    // Played on: a law a body passed in play, in force here, that a new
    // section on the same question or amount would amend.
    advanceCore(core, addDays(makeIsoDate(gameStartDate()), DAYS));
    const passed = (
      api
        .moduleState(LAWS_MODULE_ID)
        .table("laws")
        .rows() as unknown as LawRowInput[]
    ).filter(
      (row) =>
        typeof row.terms?.enactedByBill === "string" &&
        lawInForce(api, row.series).levels.find((l) => l.row)?.row?.id ===
          row.id,
    );
    const law = passed[0];
    if (!law) {
      tried.push(`${where}: no law passed in play in force after ${DAYS} days`);
      continue;
    }
    const enacting = billOf(api, String(law.terms!.enactedByBill));
    const provision = enacting.provisions.find(
      (p) => p.question === law.series || p.series === law.series,
    )!;
    const again = draftBill(api, {
      bodyOfficeId: enacting.bodyOfficeId,
      sponsorId: memberKey(members(api, enacting.bodyOfficeId)[0]!),
      provisions: [
        provision.kind === "policy-question"
          ? {
              kind: "policy-question",
              question: law.series,
              value: (law.value ?? 0) > 0 ? 0 : 1,
            }
          : {
              kind: "law-amount",
              series: law.series,
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
    console.log(
      `${where}: the starting floor ${start!.id} cites nothing; ${again.number} amends ${law.id}, citing ${enacting.number} (${enacting.id})`,
    );
    return;
  }
  throw new Error(`no law passed in play to amend: ${tried.join("; ")}`);
}, 600_000);
