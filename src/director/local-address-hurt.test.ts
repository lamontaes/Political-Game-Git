import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { coreAPI } from "../core2/state";
import { OUTCOME_WEB_MODULE_ID } from "../core2/outcome-web-model";
import { TERM_MEASURES } from "../core2/term-read";
import { areaName } from "../english/area-names";
import { HURT_KINDS } from "./address-kind";
import { composeLocalAddress, type LocalStory } from "./local-address";
import { answersCondition } from "./speech-outline";

// A hurt address answers its own bad news, and its opening announces what it
// is about (the words lead, Nov 12, reading Leonidas, Minnesota, seed
// 3e3eadd3c195b50d: "crime has risen ... I believe a woman should make her
// own decisions about her own body", and an opening of "one matter" that was
// another). Places are drawn from all 56 until a governor's or a town head's
// address of a hurt kind is found in a bad term (schools, crime and rents
// sliding, written the way the outcome web writes its rows); every place and
// level passed over is named, and the test fails by name if none is found.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const DRAWS = 8;
setBookkeeping(false);

function badTerm(built: ReturnType<typeof buildBenchWorld>) {
  const web = coreAPI(built.core)
    .moduleState(OUTCOME_WEB_MODULE_ID)
    .table("months");
  const change: Record<string, number> = {
    "school.": -0.15,
    "crime.": 0.2,
    "housing.rent": 0.3,
  };
  for (const [at, month] of [
    "2025-01",
    "2026-01",
    "2026-02",
    "2026-03",
  ].entries()) {
    const values: Record<string, number> = {};
    for (const key of TERM_MEASURES) {
      const factor = Object.entries(change).find(([prefix]) =>
        key.startsWith(prefix),
      )?.[1];
      values[key] = 100 * (1 + (factor ?? 0) * (Math.max(at - 1, 0) / 2));
    }
    web.put({
      id: `web:${built.placeId}:${month}`,
      placeId: built.placeId,
      month,
      date: `${month}-02`,
      values,
      bases: values,
      effects: {},
      engineSources: {},
    } as never);
  }
}

const isPiece = (role: string) => (key: string) =>
  key.startsWith(`opening-speech.${role}.`);
const ONE_MATTER = /one-matter|one-thing-on/;

/** Checks one hurt address by record id; returns what it found, for the log. */
function checkHurt(story: LocalStory, where: string): string {
  const crisis = story.crisis;
  expect(
    crisis,
    `${where}: a ${story.addressKind} address names no worst condition`,
  ).toBeTruthy();
  const sentences = story.sentences;
  // The body opens on the worst condition.
  const opensAt = sentences.findIndex((row) => row.level === "country");
  expect(opensAt, `${where}: no body`).toBeGreaterThanOrEqual(0);
  expect(
    sentences[opensAt]!.facts,
    `${where}: the body does not open on ${crisis}`,
  ).toContain(`${crisis}-worse`);
  // The opening announces it.
  const opening = sentences.find(
    (row) => row.level === "occasion" && row.values["theme-name"],
  );
  if (opening)
    expect(
      opening.values["theme-name"],
      `${where}: the opening announces another subject`,
    ).toBe(areaName(crisis!));
  const turnAt = sentences.findIndex((row) => row.pieces.some(isPiece("turn")));
  // The answer follows the condition, before any turn to the theme.
  const answer = sentences.slice(opensAt + 1, turnAt < 0 ? undefined : turnAt);
  let found: string;
  if (story.response) {
    expect(
      answersCondition(story.response.question, crisis!),
      `${where}: ${story.response.question} does not answer ${crisis}`,
    ).toBe(true);
    const cited = answer.find((row) =>
      row.sourceRecordIds.includes(`question:${story.response!.question}`),
    );
    expect(
      cited,
      `${where}: no sentence after the condition cites question:${story.response.question}`,
    ).toBeTruthy();
    if (story.response.billId)
      expect(
        answer.some((row) =>
          row.sourceRecordIds.includes(story.response!.billId!),
        ),
        `${where}: the answer does not cite bill ${story.response.billId}`,
      ).toBe(true);
    found = `answer question:${story.response.question}${story.response.billId ? ` bill ${story.response.billId}` : ""}: "${cited!.text}"`;
  } else {
    const owning = answer.find((row) => row.pieces.some(isPiece("owning")));
    expect(
      owning,
      `${where}: no answer and no owning sentence after the condition`,
    ).toBeTruthy();
    expect(
      owning!.sourceRecordIds.length,
      `${where}: the owning sentence cites nothing`,
    ).toBeGreaterThan(0);
    found = `owning: "${owning!.text}"`;
  }
  // A theme said after the answer is turned to by an engine-worded sentence;
  // "one matter" is promised only when there is one subject.
  const outside = story.points.filter(
    (point) => !answersCondition(point.question, crisis!),
  );
  if (outside.length)
    expect(turnAt, `${where}: the theme begins with no turn`).toBeGreaterThan(
      opensAt,
    );
  if (opening && opening.pieces.some((key) => ONE_MATTER.test(key)))
    expect(
      outside.length,
      `${where}: "one matter" promised with two subjects`,
    ).toBe(0);
  return found;
}

describe("a hurt address", () => {
  it("answers its own bad news by record, and its opening announces it", () => {
    const passed: string[] = [];
    let checked = 0;
    for (let n = 0; n < DRAWS && !checked; n += 1) {
      const drawn = drawPlace(`${seed}:${n}`, "local-address");
      const built = buildBenchWorld(drawn.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: drawn.key,
      });
      badTerm(built);
      for (const level of ["state", "town"] as const) {
        const where = `${level} in ${drawn.name} (${drawn.key}), seed ${seed}:${n}`;
        const story = composeLocalAddress(built.core, level);
        if (!story) {
          passed.push(`${where}: no address`);
          continue;
        }
        if (!HURT_KINDS.includes(story.addressKind)) {
          passed.push(`${where}: ${story.addressKind}`);
          continue;
        }
        const found = checkHurt(story, where);
        checked += 1;
        process.stdout.write(
          `HURT ADDRESS ${where}: ${story.addressKind}, ${story.crisis}; ${found}\n  ${story.text}\n`,
        );
      }
    }
    process.stdout.write(`PASSED OVER: ${passed.join("; ") || "none"}\n`);
    expect(
      checked,
      `no hurt address in ${DRAWS} draws: ${passed.join("; ")}`,
    ).toBeGreaterThan(0);
  }, 600_000);
});
