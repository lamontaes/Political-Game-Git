/**
 * Crafted lines are earned, in a random place drawn from all 56: a candidate
 * who has composed twelve speeches words their stands with crafted devices (a
 * list of three, a contrast) across the platform's questions, and one who has
 * composed none uses none.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildPopulation } from "../core2/population";
import { createLifeCore } from "../core2/life";
import { coreAPI } from "../core2/state";
import type { CoreAPI, CoreState } from "../core2/types";
import { openLaws } from "../core2/modules/laws";
import { openOffices } from "../core2/modules/offices";
import { openRecord } from "../core2/modules/record";
import {
  fileCandidacy,
  openContests,
  openElections,
} from "../core2/modules/elections";
import { openCampaigns } from "../core2/modules/campaigns";
import { openParties } from "../core2/modules/parties";
import { speechModule } from "../core2/modules/speech";
import { viewsModule } from "../core2/modules/views";
import {
  choosePart,
  deliverComposedSpeech,
  speechStepOf,
  startSpeech,
  type SpeechDraft,
  type SpeechPartOffer,
  speechPartOffers,
} from "../core2/speech-composition";
import { PLATFORM_QUESTIONS } from "../core2/campaign-views";
import { speechesGivenBy } from "../core2/speech-composition";
import { wordSpeechPart } from "./speech-part-words";

const START = "2026-01-05";
const runSeed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`speech-craft:${Date.now()}`).digest("hex");

function world() {
  const place = drawPlace(runSeed, "speech-craft");
  const core = createLifeCore(
    buildPopulation({
      seed: place.seed,
      placeKey: place.key,
      startedAt: START,
      minimumPeople: 300,
    }),
    { modules: [viewsModule, speechModule] },
  );
  openLaws(core);
  openOffices(core, place.seed);
  openElections(core);
  openCampaigns(core);
  openParties(core);
  openRecord(core);
  return {
    core,
    api: coreAPI(core),
    where: `${place.name}, ${place.state} (${place.key}), run seed ${runSeed}, place seed ${place.seed}`,
  };
}

function pair(api: CoreAPI, core: CoreState) {
  const adults = [...core.people.values()]
    .filter(
      (p) =>
        p.alive &&
        Number(START.slice(0, 4)) - Number(p.birthDate.slice(0, 4)) >= 35,
    )
    .sort((a, b) => b.liquidMinor - a.liquidMinor || a.id.localeCompare(b.id));
  for (const contest of openContests(api)) {
    const a = fileCandidacy(api, {
      personId: adults[0]!.id,
      contestId: contest.id,
      platform: [],
    });
    if (a.status === "refused" || a.filing.status !== "on-ballot") continue;
    const b = fileCandidacy(api, {
      personId: adults[1]!.id,
      contestId: contest.id,
      platform: [],
    });
    if (b.status === "refused" || b.filing.status !== "on-ballot") continue;
    return { you: a.filing, rival: b.filing, adults };
  }
  return null;
}

describe("crafted lines are earned", () => {
  it("a speaker with twelve finished speeches uses crafted devices across the platform and one with none uses none", () => {
    const { core, api, where } = world();
    const got = pair(api, core);
    expect(got, `no contest two could file for: ${where}`).not.toBeNull();
    const { you, rival, adults } = got!;
    // The speaker with experience composes and gives twelve speeches.
    let draft: SpeechDraft = startSpeech(you.id);
    while (speechStepOf(draft)) draft = choosePart(api, draft, 0);
    for (let i = 0; i < 12; i += 1)
      deliverComposedSpeech(api, {
        filingId: you.id,
        venue: `craft-hall-${i}`,
        draft,
        audienceIds: adults.slice(2, 12).map((p) => p.id),
      });
    expect(speechesGivenBy(api, you.personId), where).toBe(12);
    expect(speechesGivenBy(api, rival.personId), where).toBe(0);

    // The same stand on every question of the platform, said by each.
    const crafted = (filingId: string): number => {
      let count = 0;
      for (const question of PLATFORM_QUESTIONS) {
        const offer: SpeechPartOffer = {
          id: [filingId, "stance", "enact", question, ""].join("|"),
          step: "body",
          move: "stance",
          variant: "enact",
          moveKey: "stance.enact",
          question,
          position: 0.8,
          rivalFilingId: null,
          factIds: [filingId],
          salience: 0.8,
        };
        const result = wordSpeechPart(api, offer);
        expect(result.kind, `${where}: ${question}`).toBe("worded");
        if (
          result.kind === "worded" &&
          result.part.partKeys.some((key) => key.includes("-device."))
        )
          count += 1;
      }
      return count;
    };
    const seasoned = crafted(you.id);
    const newcomer = crafted(rival.id);
    expect(newcomer, `${where}: a first-time speaker uses no device`).toBe(0);
    expect(
      seasoned,
      `${where}: ${seasoned} of ${PLATFORM_QUESTIONS.length} stands used a device`,
    ).toBeGreaterThan(0);
    // The parts the draft offers are untouched by craft: still four, still ranked.
    expect(speechPartOffers(api, startSpeech(you.id)).length, where).toBe(4);
  });
});
