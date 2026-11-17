import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import {
  CAMPAIGNS_MODULE_ID,
  type CampaignRow,
} from "../core2/modules/campaigns";
import {
  ELECTIONS_MODULE_ID,
  type FilingRow,
} from "../core2/modules/elections";
import { resultOf } from "../core2/modules/voting";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { DEFAULT_DIRECTOR_DATA } from "./ledger";
import { purposeScene } from "./purpose-scene";
import {
  found,
  playNight,
  type NoNight,
  type PlayedNight,
} from "../../scripts/words/victory-night-play";

// The night a candidate wins is worded from the count and the campaign's own
// record (victory-night-facts.ts). Drawn place and seed, named in every
// message and on stdout, with every race passed over on the way
// (drawn-place-tests): the margin facts agree with the result's totals, the
// manager is set only where the campaign's staff holds someone, and nobody who
// lost the race is staged a victory night.

const SEED = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const DRAWS = 4;

function drawNight(): { night: PlayedNight; passed: string[] } {
  const passed: string[] = [];
  for (let draw = 0; draw < DRAWS; draw += 1) {
    const place = drawPlace(
      draw === 0 ? SEED : `${SEED}:${draw}`,
      "victory-night-facts",
    );
    const night: PlayedNight | NoNight = playNight(place, passed);
    if (found(night)) return { night, passed };
    passed.push(`${night.where}: ${night.why}`);
  }
  throw new Error(
    `no night in ${DRAWS} draws, seed ${SEED}: ${passed.join(" | ")}`,
  );
}

it("the night's margin, manager and losers all follow the records", () => {
  const { night, passed } = drawNight();
  const { core, director, winner, entry, contest, causeId, where } = night;
  const here = `${where}, ${contest.id}, seed ${SEED}`;
  process.stdout.write(
    `VICTORY-NIGHT ${here}: won by ${winner}; passed over: ${passed.join(" | ") || "nothing"}\n`,
  );
  const api = coreAPI(core);
  const result = resultOf(api, contest.id)!;
  const composed = purposeScene(core, director, winner, entry, {
    typeKey: "race-won",
  });
  expect(composed?.kind, here).toBe("composed");
  if (composed?.kind !== "composed") return;
  const facts = new Map(
    composed.scene.facts.map((row) => [row.key, row] as const),
  );

  // The margin facts agree with the count's own totals and the director's two bands.
  const votes = Object.values(result.totals)
    .map(Number)
    .sort((a, b) => b - a);
  const cast = votes.reduce((sum, count) => sum + count, 0);
  const lead = votes.length > 1 ? (votes[0]! - votes[1]!) / cast : 0;
  const { journalRaceCloseMargin, journalRaceWideMargin } =
    DEFAULT_DIRECTOR_DATA.parameters;
  expect(facts.has("unopposed"), `${here}: unopposed`).toBe(votes.length === 1);
  expect(facts.has("margin-close"), `${here}: close at lead ${lead}`).toBe(
    votes.length > 1 && lead <= journalRaceCloseMargin!.value,
  );
  expect(facts.has("margin-wide"), `${here}: wide at lead ${lead}`).toBe(
    votes.length > 1 && lead >= journalRaceWideMargin!.value,
  );
  for (const key of ["margin-close", "margin-wide", "unopposed"])
    if (facts.has(key))
      expect(
        facts.get(key)!.recordIds,
        `${here}: ${key} cites the count`,
      ).toContain(causeId);

  // The manager is set only where the campaign's staff holds someone besides
  // the one speaking, and names that person.
  const filing = (
    api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("filings")
      .query("byPerson", [winner]) as unknown as FilingRow[]
  ).find((row) => row.contestId === contest.id)!;
  const campaign = api
    .moduleState(CAMPAIGNS_MODULE_ID)
    .table("campaigns")
    .get(filing.id) as unknown as CampaignRow | undefined;
  const asker = composed.scene.talk.askerId;
  const others = (campaign?.staffIds ?? []).filter(
    (id) => id !== asker && id !== winner,
  );
  expect(facts.has("manager"), `${here}: manager`).toBe(
    others.some((id) => core.people.get(id as PersonId)?.alive),
  );
  if (facts.has("manager"))
    expect(
      others.some((id) => facts.get("manager")!.recordIds.includes(id)),
      `${here}: manager is on the staff`,
    ).toBe(true);
  expect(facts.has("ran-it"), `${here}: ran-it`).toBe(
    !!campaign?.staffIds.includes(asker),
  );

  // Nobody who lost the race is staged a victory night.
  for (const row of night.filings.filter((f) => f.personId !== winner)) {
    const book = director.ledger.people.get(row.personId as PersonId);
    expect(
      book?.schedule.some(
        (scheduled) =>
          scheduled.momentId.includes(causeId) &&
          scheduled.bindings.some((binding) => binding.typeKey === "race-won"),
      ) ?? false,
      `${here}: ${row.personId} lost and has a victory night`,
    ).toBe(false);
  }
}, 600_000);
