/**
 * M3-04 (first slice): an enacted ordinance changes records on its effective
 * date and reaches specific named people, with a non-money effect (a right,
 * an eligibility, a rule with its enforcer and penalty, a price or a
 * compliance duty); a repeal ends the effect. Through the council: draft,
 * vote, executive, enactment, the laws calendar.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { govReport } from "./gov-test-report";
import { buildPopulation } from "./population";
import { advanceCore, createLifeCore } from "./life";
import { coreAPI } from "./state";
import { openLaws } from "./modules/laws";
import { openOffices, townSeats } from "./modules/offices";
import { openElections } from "./modules/elections";
import { openCampaigns } from "./modules/campaigns";
import { openRecord } from "./modules/record";
import { draftBill, holdVote, openLegislature } from "./modules/legislature";
import { effectsOn, openLawEffects } from "./modules/law-effects";
import effects from "./data/laws/policy-effects.json" with { type: "json" };
import { governmentUnitsForPlace } from "./reference/government-units";
import { searchCorePlaces, corePlaceStateIdentities } from "./place-lookup";

const START = "2026-01-05";
const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`effects:${Date.now()}`).digest("hex");
const states = [...corePlaceStateIdentities()]
  .map((s) => s.jurisdictionKey)
  .sort();
function pick<T>(list: readonly T[], salt: string): T {
  const hash = createHash("sha256").update(`${seed}:${salt}`).digest("hex");
  return list[parseInt(hash.slice(0, 8), 16) % list.length]!;
}
const after = (date: string, days: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000)
    .toISOString()
    .slice(0, 10);

describe("M3-04 laws change specific people's records", () => {
  it("an enacted policy reaches named people with a non-money effect on its date, and a repeal ends it", () => {
    let passed: { question: string; bill: string } | null = null;
    let report: Record<string, unknown> = {};
    for (let attempt = 0; attempt < 20 && !passed; attempt += 1) {
      const state = pick(states, `state:${attempt}`);
      const places = [
        ...searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
          stateJurisdictionKey: state,
          scope: "locality",
        }),
      ]
        // A town with its own government (and so a council).
        .filter((p) =>
          governmentUnitsForPlace(p.sourceGeoid ?? p.key).some(
            (u) => u.unitType === "municipality",
          ),
        )
        .sort((a, b) => a.key.localeCompare(b.key));
      if (!places.length) continue;
      const key = pick(places, `place:${attempt}`).key;
      const core = createLifeCore(
        buildPopulation({
          seed,
          placeKey: key,
          startedAt: START,
          minimumPeople: 200,
        }),
      );
      openLaws(core);
      openOffices(core, seed);
      openElections(core);
      openCampaigns(core);
      openRecord(core);
      openLegislature(core);
      openLawEffects(core);
      const api = coreAPI(core);
      const council = townSeats(api).find(
        (s) => s.office.kind === "council" && s.holder?.personId,
      );
      if (!council) continue;
      for (const question of Object.keys(effects.effects)) {
        // A policy a wider law already sets here isn't the town's to repeal.
        if (
          [...core.people.keys()].some((id) =>
            effectsOn(api, id).some(
              (e) => e.question === question && e.endedOn === null,
            ),
          )
        )
          continue;
        const bill = draftBill(api, {
          bodyOfficeId: council.office.id,
          sponsorId: council.holder!.personId!,
          provisions: [{ kind: "policy-question", question, value: 1 }],
        });
        if (bill.status === "blocked") continue;
        const result = holdVote(api, bill.id);
        if (!["enacted", "signed", "overridden"].includes(result.status))
          continue;
        advanceCore(core, after(api.state.date, 31));
        const reached = [...core.people.keys()].filter((id) =>
          effectsOn(api, id).some(
            (e) => e.question === question && e.endedOn === null,
          ),
        );
        expect(reached.length, `${key} ${question}`).toBeGreaterThan(0);
        const one = effectsOn(api, reached[0]!).find(
          (e) => e.question === question,
        )!;
        expect([
          "eligibility",
          "right",
          "compliance",
          "price",
          "rule",
        ]).toContain(one.kind);
        expect(one.enforcer.length).toBeGreaterThan(0);
        expect(api.knows(reached[0]!, `law-effect:${question}`)?.value).toBe(
          one.kind,
        );
        // Repeal: a second ordinance answering no.
        const repeal = draftBill(api, {
          bodyOfficeId: council.office.id,
          sponsorId: council.holder!.personId!,
          provisions: [{ kind: "policy-question", question, value: -1 }],
        });
        const repealed = holdVote(api, repeal.id);
        if (["enacted", "signed", "overridden"].includes(repealed.status)) {
          advanceCore(core, after(api.state.date, 31));
          expect(
            effectsOn(api, reached[0]!).find((e) => e.question === question)!
              .endedOn,
          ).not.toBeNull();
        }
        passed = { question, bill: bill.number };
        report = {
          place: key,
          seed,
          question,
          bill: bill.number,
          reached: reached.length,
          oneEffect: one,
          repeal: repealed.status,
        };
        break;
      }
    }
    expect(
      passed,
      "no council passed any cataloged policy in twenty towns",
    ).not.toBeNull();
    govReport("law-effects", JSON.stringify(report));
  });
});
