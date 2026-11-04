/** A real printed story moves counted views; normal fill-in keeps the same view. */
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import {
  countedNewsGroupId,
  countedNewsGroups,
  countedNewsStances,
} from "./counted-news-views";
import { loadingShift, personStance } from "./campaign-views";
import { gameStartDate } from "./game-start";
import { addDays, ageOnDate, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { NEWS_MODULE_ID } from "./modules/news";
import { regroupHousehold, residentsRuntime } from "./modules/residents";
import {
  countedLean,
  countedStanceProfile,
  stanceAfterCase,
  stancesOf,
  viewOn,
  VIEWS_MODULE_ID,
  type Stance,
} from "./modules/views";
import { coreAPI, fillInPerson } from "./state";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(replay, "lane-2-counted-news");
const clamp = (n: number) => Math.max(-1, Math.min(1, n));

it(`a counted reader in ${place.name} keeps the story's moved view when met (${replay})`, () => {
  setBookkeeping(false);
  if (process.env.LANE2_COUNTED_NEWS_PROOF)
    writeFileSync(
      process.env.LANE2_COUNTED_NEWS_PROOF,
      JSON.stringify({ phase: "opening", replay, place }),
    );
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const opened = core.date;
  let proof: Record<string, unknown> | undefined;
  console.log(JSON.stringify({ replay, place, opened }));
  for (let day = 1; day <= 365; day++) {
    advanceCore(core, addDays(makeIsoDate(opened), day));
    if (proof) continue;
    const store = residentsRuntime(core)!.store;
    for (const group of countedNewsGroups(api)) {
      const rows = api
        .moduleState(VIEWS_MODULE_ID)
        .table("countedStances")
        .query("byGroup", [group.id]) as unknown as (Stance & {
        representedCount?: number;
        reachedCount?: number;
        totalChange?: number;
      })[];
      const stance = rows.find(
        (row) =>
          row.topic.startsWith("us-policy-positions:") &&
          row.strength > 0 &&
          (row.reachedCount ?? 0) > 0 &&
          row.causes.some((c) => c.learnedFrom?.startsWith("news:printed:")),
      );
      if (!stance) continue;
      const member = [...store.memberOf].find(
        ([id]) =>
          !core.people.has(id) &&
          store.countedMember(id) !== undefined &&
          ageOnDate(store.born[store.memberOf.get(id)!]!, core.date) >=
            api.parameter("votingAge") &&
          countedNewsGroupId(api, id) === group.id &&
          countedNewsStances(api, id).some((row) => row.id === stance.id),
      );
      if (!member) continue;
      const [id, m] = member;
      const facts = store.factsOf(m);
      const source = stance.causes.at(-1)!.learnedFrom!;
      const story = api
        .moduleState(NEWS_MODULE_ID)
        .table("stories")
        .get(source.slice("news:".length));
      expect(story, `${place.name}: source ${source}`).toBeDefined();
      expect(stance.reachedCount).toBeGreaterThan(0);
      expect(stance.reachedCount!).toBeLessThanOrEqual(
        stance.representedCount!,
      );
      expect(stance.totalChange).toBeCloseTo(
        stance.causes.at(-1)!.change * stance.representedCount!,
        10,
      );
      const lean = countedLean(api, facts);
      const profile = countedStanceProfile(api, facts);
      expect(Math.abs(profile.heardShift?.[stance.topic] ?? 0)).toBeGreaterThan(
        0,
      );
      const expected = clamp(
        personStance(lean, stance.topic) +
          loadingShift(profile, stance.topic) +
          profile.heardShift![stance.topic]!,
      );
      const person = fillInPerson(core, id)!;
      expect(person).toBeDefined();
      expect(
        api.knows(id, source),
        "fill-in knows the story its view cites",
      ).toMatchObject({
        key: source,
        sourceId: source.slice("news:".length),
        learnedAt: stance.causes.at(-1)!.date,
        access: "public",
      });
      expect(viewOn(api, id, stance.topic, lean)).toBeCloseTo(expected, 12);
      expect(
        stancesOf(api, id)
          .find((row) => row.topic === stance.topic)
          ?.causes.some((cause) => cause.learnedFrom === source),
      ).toBe(true);
      // The counted mean is the full rule applied to reached mass, including
      // saturation, with the other mass keeping its prior view. No member is chosen.
      const prior: Stance = {
        ...stance,
        strength: 0.99,
        desiredChange: "enact",
        heard: {},
        causes: [],
      };
      const heardCase = {
        view: group,
        hearer: group,
        prior,
        event: { id: source, date: core.date },
        topic: stance.topic,
        desiredChange: "enact",
        size: 1,
        nearness: 1,
        speakerId: "comparison-speaker",
        learnedFrom: source,
        keepCauses: false,
      };
      const full = stanceAfterCase(api, heardCase)!;
      const half = stanceAfterCase(api, { ...heardCase, exposure: 0.5 })!;
      expect(half.strength).toBeCloseTo(
        (prior.strength + full.strength) / 2,
        12,
      );
      expect(half.heard?.["comparison-speaker"]).toBe(0.5);
      proof = {
        date: core.date,
        groupId: group.id,
        representedCount: stance.representedCount,
        reachedCount: stance.reachedCount,
        story: source,
        question: stance.topic,
        personId: id,
        name: `${person.givenName} ${person.familyName}`,
        view: expected,
        knownStory: api.knows(id, source),
      };
      console.log(JSON.stringify({ phase: "filled-in", ...proof }));
      break;
    }
  }
  expect(
    proof,
    `${place.name} / ${replay}: no naturally delivered policy story moved a counted reader in the ordinary year`,
  ).toBeDefined();
  // Technical regroup control after the ordinary year: changing only the
  // household's group key must conserve the crowd's total signed stance.
  // This fixture is not a claim that an eviction or mortgage happened in play.
  const rt = residentsRuntime(core)!;
  const question = String(proof!.question);
  const totalStance = () =>
    countedNewsGroups(api).reduce((sum, group) => {
      const row = api
        .moduleState(VIEWS_MODULE_ID)
        .table("countedStances")
        .get(`${group.id}:${question}`) as unknown as Stance | undefined;
      return (
        sum +
        group.count *
          (row ? (row.desiredChange === "enact" ? 1 : -1) * row.strength : 0)
      );
    }, 0);
  const home = [...rt.store.liveHouseholds()].find((h) =>
    rt.store.countedMembers(h).some((m) => {
      const id = rt.store.ids[m]!;
      return (
        !core.people.has(id) &&
        ageOnDate(rt.store.born[m]!, core.date) >= api.parameter("votingAge") &&
        countedNewsStances(api, id).some(
          (row) => row.topic === question && row.strength > 0,
        )
      );
    }),
  );
  expect(
    home,
    "a counted household still holds the heard view at year end",
  ).toBeDefined();
  const beforeTotal = totalStance();
  const beforeGroup = home!.group;
  home!.tenure = home!.tenure === "rent" ? "mortgage" : "rent";
  regroupHousehold(rt, home!, core.date);
  expect(home!.group).not.toBe(beforeGroup);
  expect(totalStance()).toBeCloseTo(beforeTotal, 8);
  if (process.env.LANE2_COUNTED_NEWS_PROOF)
    writeFileSync(
      process.env.LANE2_COUNTED_NEWS_PROOF,
      JSON.stringify(
        { phase: "year-complete", replay, place, through: core.date, proof },
        null,
        2,
      ),
    );
  console.log(
    JSON.stringify({
      phase: "year-complete",
      replay,
      place,
      through: core.date,
      proof,
    }),
  );
}, 3_600_000);
