/**
 * A state whose statute gives its places a power by name (a researched starting
 * grant, `localGrant` with `localGrantCite` in the starting-law answers) lets a
 * county or city commission legislate on that question although the state
 * grants no general home rule. Drawn from the 56 places, a place in such a
 * state shows the authority reader allowing the grant, citing it; a state bill
 * that bars the power (a `local-power:` row of 0) takes it away; and the
 * grants name their statute.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import {
  enactLaw,
  lawChain,
  LOCAL_POWER_PREFIX,
  POLICY_QUESTIONS,
} from "./modules/laws";
import { policyAuthority } from "./policy-authority";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

/** Every (question, state) the research gives a starting grant. */
const grants = Object.entries(POLICY_QUESTIONS).flatMap(([question, entry]) =>
  Object.entries(entry.answers)
    .filter(([, answer]) => answer.localGrant === true)
    .map(([state, answer]) => ({ question, state, answer })),
);

it("every starting grant names its statute", () => {
  expect(grants.length).toBeGreaterThan(0);
  for (const { question, state, answer } of grants) {
    expect(answer.localGrantCite, `${question} in ${state}`).toMatch(/\d+-\d+/);
    expect(
      answer.preempts,
      `${question} in ${state} is not also barred`,
    ).not.toBe(true);
  }
});

it(`a place in a state with a starting grant may legislate on it, and a bar takes it away, from seed ${seed}`, () => {
  setBookkeeping(false);
  const states = new Set(grants.map((grant) => grant.state));
  let place: ReturnType<typeof drawPlace> | undefined;
  for (let n = 0; n < 4000 && !place; n += 1) {
    const drawn = drawPlace(`${seed}:${n}`, "starting-local-grants");
    if (states.has(drawn.state)) place = drawn;
  }
  expect(place, "a drawn place in a state with a starting grant").toBeDefined();
  const where = `${place!.name} (${place!.key}), seed ${place!.seed}`;
  const { core } = buildBenchWorld(place!.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place!.key,
  });
  const api = coreAPI(core);
  const stateKey = lawChain(api).stateKey;
  const mine = grants.filter((grant) => grant.state === stateKey);
  expect(mine.length, where).toBeGreaterThan(0);
  const checked: string[] = [];
  for (const { question, answer } of mine) {
    const levels = (answer.localGrantLevels ?? ["county", "city"]) as (
      "county" | "city"
    )[];
    for (const level of levels) {
      const before = policyAuthority(api, question, level);
      // A body that does not exist at this level here is not asked.
      if (before.reason === "level-lacks-power" && !before.allowed) continue;
      expect(before.allowed, `${where}: ${level} on ${question}`).toBe(true);
      expect(before.source, where).toContain("localGrant");
      checked.push(`${level} ${question}`);
    }
  }
  expect(checked.length, `${where}: a level was checked`).toBeGreaterThan(0);
  // The state then bars the power by law: the grant no longer holds.
  const [barred] = checked[0]!.split(" ");
  const question = checked[0]!.slice(barred!.length + 1);
  enactLaw(api, {
    jurisdiction: lawChain(api).levels.find((l) => l.level === "state")!
      .jurisdiction,
    level: "state",
    series: `${LOCAL_POWER_PREFIX}${question}`,
    value: 0,
    effectiveDate: core.date,
    measureId: "starting-local-grants-test-bar",
    citation: "Test: the state bars its places from this power.",
  });
  expect(
    policyAuthority(api, question, barred as "county" | "city").allowed,
    `${where}: after the bar`,
  ).toBe(false);
  process.stdout.write(
    `STARTING LOCAL GRANTS ${where}: ${checked.join("; ")} allowed by the researched grant, barred by a law\n`,
  );
}, 1_800_000);
