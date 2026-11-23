import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { piecesInput } from "./core-pieces-fixture";
import { createLifeCore } from "./life";
import { coreAPI } from "./state";
import { currentCloseness, hoursFromLevel } from "./closeness";
import { pairKey } from "./kernel/ids";
import {
  confrontationStrain,
  DEFAULT_DRIVES_DATA,
  driveHalfLifeDays,
} from "./modules/drives";

// Pins, the grudge rule breaks (CTO, #9747 05:10Z): a grudge fades by its
// holder's own traits, not one 180 days for everyone; a confrontation takes a
// closeness level off the tie, not 0.1 hours; and no tie write carries literal
// hours. Each check fails on main's code.
const grudge = DEFAULT_DRIVES_DATA.driveKinds.find((k) => k.id === "grudge")!;

describe("a grudge comes from the people who hold it", () => {
  const api = coreAPI(createLifeCore(piecesInput()));

  it("a resentful and a forgiving holder keep the same grudge for different lengths of time", () => {
    // One trait at each end, the first whose ends lean the grudge apart.
    const scale = api.parameter("traitScale");
    const ids = Object.keys(
      (api.state.data as unknown as { traitPulls: Record<string, unknown> })
        .traitPulls,
    ).sort();
    const at = (id: string, sign: number) =>
      driveHalfLifeDays(api, grudge, { traits: { [id]: sign * scale } });
    const id = ids.find((t) => Math.abs(at(t, 1) - at(t, -1)) > 1e-6);
    expect(id, "a trait that moves the grudge's half-life").toBeDefined();
    expect(at(id!, 1)).not.toBeCloseTo(at(id!, -1), 3);
    const traits = (sign: number) => ({ [id!]: sign * scale });
    // A kind with no lean keeps its base.
    const cause = DEFAULT_DRIVES_DATA.driveKinds.find((k) => !k.halfLifeLean)!;
    expect(driveHalfLifeDays(api, cause, { traits: traits(1) })).toBe(
      api.parameter(cause.halfLifeParameter),
    );
  });

  it("a confrontation takes its closeness level off the tie, wherever the tie stands", () => {
    const loss = api.parameter("grudgeRelationshipChange");
    const core = createLifeCore({
      ...piecesInput(),
      people: [
        piecesInput().people[0]!,
        { ...piecesInput().people[0]!, id: "other", givenName: "Other" },
      ],
      households: [
        {
          ...piecesInput().households[0]!,
          memberIds: ["actor", "other"],
        },
      ],
    });
    const a = coreAPI(core);
    a.relationship("actor", "other", "contact", 200);
    const tie = () => core.relationships.get(pairKey("actor", "other"))!;
    const before = currentCloseness(core, tie());
    const strain = confrontationStrain(a, "actor", "other", loss);
    expect(strain.levelBefore).toBeCloseTo(before, 9);
    a.relationship("actor", "other", "contact", -strain.strainHours);
    // The two people's temperaments temper every change to a tie
    // (temperedHours), so the loss is about the level, never a sliver of it
    // (main wrote 0.1 hours: about 0.0003 of a level here).
    const drop = before - currentCloseness(core, tie());
    expect(drop).toBeGreaterThan(loss / 2);
    expect(drop).toBeLessThan(loss * 2);
  });

  it("a stranger who is confronted is fallen out with: the level stays as strain to make up", () => {
    // Two people with no tie (a worker and the counted owner who laid them
    // off): there is no closeness to lose, so the whole level is strain that
    // later time together must first make up, and the falling-out is written
    // (relationships.fall-out tempers it). The old rule wrote nothing.
    const loss = api.parameter("grudgeRelationshipChange");
    const core = createLifeCore({
      ...piecesInput(),
      people: [
        piecesInput().people[0]!,
        { ...piecesInput().people[0]!, id: "other", givenName: "Other" },
      ],
      households: [
        {
          ...piecesInput().households[0]!,
          memberIds: ["actor", "other"],
        },
      ],
    });
    const a = coreAPI(core);
    expect(core.relationships.has(pairKey("actor", "other"))).toBe(false);
    const strain = confrontationStrain(a, "actor", "other", loss);
    expect(strain.levelBefore).toBe(0);
    expect(strain.levelAfter).toBe(0);
    expect(strain.strainHours).toBeCloseTo(
      hoursFromLevel((key) => a.parameter(key), loss),
      9,
    );
    a.relationship("actor", "other", "contact", -strain.strainHours);
    expect(core.relationships.has(pairKey("actor", "other"))).toBe(true);
  });
});

/** Every `.relationship(` call's fourth argument in the game's source. */
function tieWriteHours(dir: string): { file: string; hours: string }[] {
  const out: { file: string; hours: string }[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      out.push(...tieWriteHours(path));
      continue;
    }
    if (!name.endsWith(".ts") || name.endsWith(".test.ts")) continue;
    const src = readFileSync(path, "utf8");
    for (const m of src.matchAll(/\.relationship\(/g)) {
      let depth = 1,
        j = m.index! + m[0].length;
      const start = j;
      while (depth && j < src.length) {
        if (src[j] === "(") depth += 1;
        else if (src[j] === ")") depth -= 1;
        j += 1;
      }
      const args: string[] = [];
      let level = 0,
        cur = "";
      for (const ch of src.slice(start, j - 1)) {
        if ("([{".includes(ch)) level += 1;
        if (")]}".includes(ch)) level -= 1;
        if (ch === "," && level === 0) {
          args.push(cur.trim());
          cur = "";
        } else cur += ch;
      }
      if (cur.trim()) args.push(cur.trim());
      if (args.length >= 4) out.push({ file: path, hours: args[3]! });
    }
  }
  return out;
}

it("no tie write in the game's source carries literal hours", () => {
  const literal = ["src/core2", "src/director", "src/bench"]
    .flatMap((dir) => tieWriteHours(dir))
    .filter((row) => /^-?\d+(\.\d+)?$/.test(row.hours));
  expect(literal).toEqual([]);
});
