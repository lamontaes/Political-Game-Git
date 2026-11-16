/**
 * Every charge the justice engine makes carries a plea or a trial day, so a
 * charge talk always has one to tell and the answers back are written for
 * those cases only (court-case-talk-words.test.ts; Words lead, Nov 16: the
 * answers for a charge with neither were deleted, since none could play). If
 * the engine ever makes a bare charge, this goes red and the talk needs words
 * for it. Pinned to Dallas, South Dakota (4615300), the world of the story
 * builder's justice walk (seed jw1, drawPlace("jw1", "justice-walk")), where
 * both charges of a played half year carried a trial day: here the engine's own
 * charging step charges eight adults across the range of evidence above its bar.
 */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { coreAPI } from "../core2/state";
import {
  chargeDecision,
  JUSTICE_MODULE_ID,
  type CaseRow,
  type InvestigationRow,
} from "../core2/modules/justice";
import justiceParameters from "../core2/data/justice/parameters.json" with { type: "json" };

const PLACE_KEY = "4615300";
const WORLD_SEED =
  "1be3176d2e58e37526983df387219057d7df2199481ac9184bd6efe8e135fbf5";
const where = `Dallas, South Dakota (${PLACE_KEY}), world seed ${WORLD_SEED}`;

it(`every charge carries a plea or a trial day (${where})`, () => {
  setBookkeeping(false);
  const { core } = buildBenchWorld(WORLD_SEED, gameStartDate(), {
    twoLevel: true,
    placeKey: PLACE_KEY,
  });
  const api = coreAPI(core);
  const table = (name: string) =>
    api.moduleState(JUSTICE_MODULE_ID).table(name);
  const adults = [...core.people.values()]
    .filter((p) => p.alive && p.tier !== "husk" && p.id.startsWith("person_"))
    .sort((a, b) => a.id.localeCompare(b.id))
    .slice(0, 8);
  const bar = justiceParameters.chargeBar.value;
  const charged: CaseRow[] = [];
  adults.forEach((person, index) => {
    const investigation: InvestigationRow = {
      id: `investigation:charge-carries:${index}`,
      complaintIds: [],
      crimeId: `crime:charge-carries:${index}`,
      prosecutorOfficeId: `office:charge-carries:${index}`,
      prosecutorPersonId: null,
      opened: true,
      date: core.date,
      reasons: {},
      targets: [
        {
          personId: person.id,
          crimeIds: [],
          evidence: [],
          strength: bar + ((1 - bar) * (index + 1)) / (adults.length + 1),
        },
      ],
      status: "open",
    };
    table("investigations").put(investigation as never);
    chargeDecision(api, investigation.id);
    const row = table("cases").get(
      `case:${investigation.id}:${person.id}`,
    ) as unknown as CaseRow | undefined;
    if (row && row.status === "charged") charged.push(row);
  });
  expect(charged.length, where).toBeGreaterThan(0);
  for (const row of charged)
    expect(row.plea || !!row.trialDate, `${where}: ${row.id}`).toBe(true);
}, 30_000);
