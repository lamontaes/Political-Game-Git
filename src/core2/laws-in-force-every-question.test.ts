/**
 * One reader returns every law in force (pool item
 * laws-in-force-every-question), in a world from buildBenchWorld in a place
 * drawn from all 56 on a seed nobody chose (GOLDEN_PATH_SEED pins one). At
 * the opening, `lawHere` returns each policy question the state or the nation
 * answers, at its level, by the starting row's record id and citation, and
 * the Issues screen's records (`governmentView`) carry the same rows. Then the
 * world plays until a law passed in play replaces a starting row at its level
 * of the town's chain: from that day the reader and Issues return the new row
 * at its level, and the day before they returned the starting row. Every law
 * passed on a question that takes effect on the way is checked the same way.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { governmentView } from "../bench/government";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import type { LawRowInput } from "./laws-starting";
import { advanceCore } from "./life";
import { LAWS_MODULE_ID, lawChain, lawHere } from "./modules/laws";
import { POLICY_QUESTIONS } from "./policy-answers";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const FEDERAL_QUESTIONS = "us-federal-positions:";
/** How long the world plays for a law passed in play to replace a starting row. */
const MOST_DAYS = 400;

it("every policy question's law in force is read at each level by record id, by the reader and Issues, and a law passed in play replaces its level's row the day it takes effect", () => {
  setBookkeeping(false);
  const place = drawPlace(seed, "laws-in-force-every-question");
  const where = `${place.name} (${place.key}), run seed ${seed}, world seed ${place.seed}`;
  const { core, residents } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const chain = lawChain(api);
  const laws = api.moduleState(LAWS_MODULE_ID).table("laws");
  const personId = residents[0]!.id;
  const today = () => makeIsoDate(core.date);

  // The opening: one row per question the state or the nation answers.
  const here = new Map(lawHere(api).map((answer) => [answer.series, answer]));
  const issues = new Map(
    governmentView(core, personId).law.map((law) => [law.series, law]),
  );
  let answered = 0;
  for (const [question, entry] of Object.entries(POLICY_QUESTIONS)) {
    const federal = question.startsWith(FEDERAL_QUESTIONS);
    const level = federal ? "federal" : "state";
    const jurisdiction = chain.levels.find(
      (l) => l.level === level,
    )?.jurisdiction;
    const answer = jurisdiction
      ? entry.answers[jurisdiction]?.answer
      : undefined;
    if (answer !== "yes" && answer !== "no") continue;
    answered += 1;
    const row = here.get(question)?.levels.find((l) => l.level === level)?.row;
    expect(row?.id, `${where}: ${question}`).toBe(
      `law:${jurisdiction}:${level}:${question}:general:starting`,
    );
    expect(laws.get(row!.id), `${where}: ${row!.id}`).toBeDefined();
    expect(row!.value, `${where}: ${question}`).toBe(answer === "yes" ? 1 : 0);
    expect(String(row!.source).length, `${where}: ${row!.id}`).toBeGreaterThan(
      0,
    );
    const shown = issues
      .get(question)
      ?.levels.find((l) => l.level === level)?.row;
    expect(shown?.id, `${where}: Issues, ${question}`).toBe(row!.id);
    expect(issues.get(question)?.yesNo, `${where}: ${question}`).toBe(true);
  }
  expect(answered, `${where}: questions answered`).toBeGreaterThan(0);
  console.log(
    `${where}: ${answered} of ${Object.keys(POLICY_QUESTIONS).length} questions answered at the opening; e.g. ${
      [...here.values()]
        .find((a) => issues.get(a.series)?.yesNo)
        ?.levels.find((l) => l.row)?.row?.id
    }`,
  );

  // Play until a law passed in play replaces a starting row at its own level,
  // checking every law passed on a question that takes effect on the way.
  const chained = new Set(chain.levels.map((l) => l.jurisdiction));
  const start = today();
  const checked = new Set<string>();
  const passed = (): LawRowInput[] =>
    ([...laws.rows()] as unknown as LawRowInput[])
      .filter(
        (row) =>
          row.terms?.enactedBy !== undefined &&
          row.series in POLICY_QUESTIONS &&
          chained.has(row.jurisdiction) &&
          row.effectiveDate > start &&
          row.effectiveDate <= today() &&
          !checked.has(row.id),
      )
      .sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate));
  const atLevel = (row: LawRowInput, date: string) =>
    lawHere(api, date, [row.series])[0]?.levels.find(
      (l) => l.level === row.level && l.jurisdiction === row.jurisdiction,
    )?.row;
  let replaced: { row: LawRowInput; before: LawRowInput } | undefined;
  for (;;) {
    for (const row of passed()) {
      checked.add(row.id);
      // The level's law on its effective day is a law passed in play that
      // day (this one, or a later provision of the same day), and it was not
      // the day before.
      const on = atLevel(row, row.effectiveDate);
      const before = atLevel(row, addDays(row.effectiveDate, -1));
      expect(on?.terms?.enactedBy, `${where}: ${row.id}`).toBeDefined();
      expect(on?.effectiveDate, `${where}: ${row.id}`).toBe(row.effectiveDate);
      expect(before?.id, `${where}: the day before ${row.id}`).not.toBe(on?.id);
      console.log(
        `${where}: ${row.id} (${row.terms?.enactedBy}, value ${row.value}) took effect ${row.effectiveDate} at the ${row.level} level, replacing ${before?.id ?? "no law at that level"}`,
      );
      if (!replaced && before?.id.endsWith(":starting") && on?.id === row.id)
        replaced = { row, before };
    }
    if (replaced || today() >= addDays(start, MOST_DAYS)) break;
    advanceCore(core, addDays(today(), 7));
  }
  expect(
    replaced,
    `${where}: no law passed in play replaced a starting row in ${MOST_DAYS} days (${checked.size} passed on a question)`,
  ).toBeDefined();
  const { row, before } = replaced!;
  // Issues reads the row in force today: the new one, unless a later law replaced it.
  const now = atLevel(row, today());
  const shown = governmentView(core, personId)
    .law.find((law) => law.series === row.series)
    ?.levels.find(
      (l) => l.level === row.level && l.jurisdiction === row.jurisdiction,
    )?.row;
  expect(shown?.id, `${where}: Issues, ${row.series}`).toBe(now?.id);
  console.log(
    `${where}: ${row.id} replaced ${before.id} on ${row.effectiveDate}; Issues on ${today()} reads ${shown?.id}`,
  );
}, 1_200_000);
