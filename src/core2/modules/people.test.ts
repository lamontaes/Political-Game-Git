import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { addDays, makeIsoDate } from "../../simulation/dates";
import { enrichCivicInputs } from "../civic-inputs";
import { currentCloseness } from "../closeness";
import { buildDeepPast } from "../deep-past";
import { advanceCore, createLifeCore } from "../life";
import { buildPopulation } from "../population";
import type { CoreInput } from "../types";

const seed = "p15-people-module";
let input: CoreInput | undefined;
const opening = () =>
  (input ??= enrichCivicInputs(
    buildDeepPast(
      buildPopulation({ seed, startedAt: "2021-01-01", minimumPeople: 300 }),
    ),
  ));

function run(targetKind: string, days: number) {
  const core = createLifeCore(opening());
  (core as { data: typeof core.data }).data = {
    ...core.data,
    actions: core.data.actions.map((action) =>
      action.id === "contact-known-person" ? { ...action, targetKind } : action,
    ),
  };
  const hash = createHash("sha256");
  let decisions = 0;
  advanceCore(core, addDays(makeIsoDate(core.date), days), {
    controller: (decision) => {
      decisions += 1;
      hash.update(
        `${decision.date}|${decision.actorId}|${decision.selected?.definition.id}|${decision.selected?.targetId}\n`,
      );
      return undefined;
    },
  });
  return { core, decisions, digest: hash.digest("hex") };
}

describe("P15 people module", () => {
  it("offers one untied acquaintance without changing any decision", () => {
    const narrowed = run("contact-candidate", 21);
    const everyone = run("known-person", 21);
    expect(narrowed.decisions).toBeGreaterThan(0);
    expect(narrowed.digest).toBe(everyone.digest);
  });

  it("keeps people who live together close and lets distant ties fade", () => {
    const { core } = run("contact-candidate", 28);
    const shared = [...core.relationships.values()].filter((row) => {
      const a = core.people.get(row.actorId)!;
      const b = core.people.get(row.otherId)!;
      return a.householdId === b.householdId && a.tier !== "husk";
    });
    expect(shared.length).toBeGreaterThan(0);
    for (const row of shared)
      expect(currentCloseness(core, row)).toBeGreaterThan(0.5);
    const apart = [...core.relationships.values()].find((row) => {
      const a = core.people.get(row.actorId)!;
      const b = core.people.get(row.otherId)!;
      return (
        a.householdId !== b.householdId && row.lastContactDate === "2021-01-01"
      );
    });
    expect(apart).toBeDefined();
    expect(currentCloseness(core, apart!)).toBeLessThan(apart!.level);
  });
});
