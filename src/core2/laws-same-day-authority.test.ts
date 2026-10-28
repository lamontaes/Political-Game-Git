/**
 * Of two state laws on one power that take effect the same day, the later
 * enacted governs, whichever table holds it: a policy question's answer (the
 * enactments table) or the power's own statute (the laws table). Played in
 * the bench world, in a place drawn from the states whose own law grants
 * their places a minimum wage at the opening (read from the research).
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import labor from "../../data/research/laws/starting-law-2026/labor-workforce.json" with { type: "json" };
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { stableHash } from "./kernel/ids";
import { placeLocalities } from "./places";
import { governmentUnitsForPlace } from "./reference/government-units";
import { advanceCore } from "./life";
import { draftBill } from "./modules/legislature";
import { enactLaw, lawChain, lawInForce, yesLevels } from "./modules/laws";
import { townSeats } from "./modules/offices";
import { coreAPI } from "./state";
import type { CoreAPI } from "./types";

const seed = process.env.SAME_DAY_SEED ?? randomBytes(8).toString("hex");
const QUESTION =
  "us-policy-positions:labor-workforce.local-minimum-wage-authority";
const SERIES = "local-minimum-wage-authority";

const answers = (
  labor as unknown as {
    questions: Record<string, { answers: Record<string, { answer?: string }> }>;
  }
).questions[QUESTION]!.answers;
/** The states whose own law grants the authority at the opening, from the research. */
const granting = Object.keys(answers)
  .filter((k) => answers[k]!.answer === "yes")
  .sort();

/** A town in a granting state, with a seated council member, drawn by the seed. */
function town(salt: string) {
  const tried: string[] = [];
  for (let n = 0; n < 12; n += 1) {
    const hash = stableHash(`${seed}:${salt}:${n}`);
    const state = granting[parseInt(hash.slice(0, 8), 16) % granting.length]!;
    const localities = [...placeLocalities(state)]
      .filter((p) =>
        governmentUnitsForPlace(p.sourceGeoid ?? p.key).some(
          (u) => u.unitType === "municipality",
        ),
      )
      .sort((a, b) => a.key.localeCompare(b.key));
    if (!localities.length) continue;
    const place =
      localities[parseInt(hash.slice(8, 16), 16) % localities.length]!;
    const { core } = buildBenchWorld(hash, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const council = townSeats(api).find(
      (s) => s.office.kind === "council" && s.holder?.personId,
    );
    const where = `${place.displayName} (${place.key}), seed ${hash}`;
    if (yesLevels(api, QUESTION).length > 0 && council)
      return { core, api, council, where };
    tried.push(
      `${where}: ${council ? "no grant at the opening" : "no council member"}`,
    );
  }
  throw new Error(
    `no drawn town with the grant and a council: ${tried.join("; ")}`,
  );
}

const enact = (api: CoreAPI, series: string, value: 0 | 1, tag: string) =>
  enactLaw(api, {
    jurisdiction: lawChain(api).stateKey,
    level: "state",
    series,
    value,
    effectiveDate: addDays(makeIsoDate(api.state.date), 1),
    measureId: `test:${tag}`,
    citation: "Same-day authority test",
  });

/** The council drafts a local wage a dollar over the floor, two days on: the authority it drafted under. */
function draftNextDay(
  core: ReturnType<typeof town>["core"],
  api: CoreAPI,
  council: ReturnType<typeof town>["council"],
) {
  advanceCore(core, addDays(makeIsoDate(core.date), 2));
  const floor = lawInForce(api, "minimum-wage").value ?? 0;
  const bill = draftBill(api, {
    bodyOfficeId: council.office.id,
    sponsorId: council.holder!.personId!,
    provisions: [
      {
        kind: "law-amount",
        series: "minimum-wage",
        value: floor + 100,
        unit: "minor/hour",
      },
    ],
  });
  return { bill, authority: bill.authority[0]! };
}

it(`the later of a same-day repeal and grant governs a council's wage bill (seed ${seed})`, () => {
  setBookkeeping(false);
  try {
    // The repeal is enacted first, the grant second, both in force tomorrow:
    // the grant governs.
    {
      const { core, api, council, where } = town("grant-last");
      enact(api, QUESTION, 0, "repeal-question");
      const grant = enact(api, SERIES, 1, "grant-statute");
      const { bill, authority } = draftNextDay(core, api, council);
      expect(authority.allowed, `${where}: ${bill.id}`).toBe(true);
      expect(authority.source, `${where}: ${bill.id}`).toBe(grant.id);
      console.info(
        `same-day authority: ${where}: ${bill.id} drafted under ${authority.source}`,
      );
    }
    // The grant is enacted first, the repeal second: the repeal governs.
    {
      const { core, api, council, where } = town("repeal-last");
      const grant = enact(api, SERIES, 1, "grant-statute");
      enact(api, QUESTION, 0, "repeal-question");
      const { bill, authority } = draftNextDay(core, api, council);
      expect(authority.allowed, `${where}: ${bill.id}`).toBe(false);
      expect(authority.source, `${where}: ${bill.id}`).not.toBe(grant.id);
      console.info(
        `same-day authority: ${where}: ${bill.id} refused under ${authority.source}`,
      );
    }
  } finally {
    setBookkeeping(true);
  }
}, 900_000);
