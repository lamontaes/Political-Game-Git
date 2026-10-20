/**
 * Speeches composed one part at a time, in a random place drawn from all 56:
 * four distinct offers per step resting on records that exist; a finished
 * speech records promises and moves its audience on the leading question.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildPopulation } from "./population";
import { createLifeCore } from "./life";
import { coreAPI } from "./state";
import type { CoreAPI, CoreState } from "./types";
import { openLaws } from "./modules/laws";
import { openOffices } from "./modules/offices";
import { openRecord, recordVote } from "./modules/record";
import {
  ELECTIONS_MODULE_ID,
  fileCandidacy,
  openContests,
  openElections,
} from "./modules/elections";
import {
  CAMPAIGNS_MODULE_ID,
  makeStatements,
  openCampaigns,
} from "./modules/campaigns";
import { openParties } from "./modules/parties";
import { speechModule } from "./modules/speech";
import { stancesOf, viewsModule } from "./modules/views";
import {
  choosePart,
  deliverComposedSpeech,
  speechPartOffers,
  speechStepOf,
  startSpeech,
  type SpeechDraft,
} from "./speech-composition";

const START = "2026-01-05";
const runSeed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`speech-composition:${Date.now()}`).digest("hex");

function world() {
  const place = drawPlace(runSeed, "speech-composition");
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

describe("speeches composed one part at a time", () => {
  it("offers four distinct record-backed parts per step and delivers one finished speech", () => {
    const { core, api, where } = world();
    const got = pair(api, core);
    expect(got, `no contest two could file for: ${where}`).not.toBeNull();
    const { you, rival, adults } = got!;
    // The rival promised and then voted the other way: a broken promise.
    makeStatements(api, {
      filingId: rival.id,
      venue: "rival-hall",
      statements: [{ question: "taxes", position: 0.8 }],
      audienceIds: [],
      act: "speech",
      weight: 0.3,
      faceToFace: true,
    });
    recordVote(api, {
      personId: rival.personId,
      body: "council",
      measureId: "m-composition-1",
      stance: { question: "taxes", position: -0.9 },
      passed: true,
    });
    const filings = api.moduleState(ELECTIONS_MODULE_ID).table("filings");
    const promises = api.moduleState(CAMPAIGNS_MODULE_ID).table("promises");
    const votes = api.moduleState("core2-record-v1").table("votes");

    let draft: SpeechDraft = startSpeech(you.id);
    const steps: string[] = [];
    while (speechStepOf(draft)) {
      steps.push(speechStepOf(draft)!);
      const offers = speechPartOffers(api, draft);
      expect(offers.length, `${steps.at(-1)} offers: ${where}`).toBe(4);
      expect(new Set(offers.map((o) => o.id)).size, where).toBe(4);
      for (const o of offers) {
        expect(o.moveKey, where).toBe(`${o.move}.${o.variant}`);
        for (const id of o.factIds) {
          const exists =
            filings.get(id) ||
            promises.get(id) ||
            votes.get(id) ||
            core.people.has(id) ||
            id === you.contestId ||
            id === core.people.get(you.personId)?.placeId;
          expect(
            exists,
            `${o.id} rests on missing ${id}: ${where}`,
          ).toBeTruthy();
        }
      }
      // Re-asking gives the same four (ranked, never rolled).
      expect(
        speechPartOffers(api, draft).map((o) => o.id),
        where,
      ).toEqual(offers.map((o) => o.id));
      // Prefer a part about a question so the speech says something.
      const index = Math.max(
        0,
        offers.findIndex((o) => o.question !== null),
      );
      draft = choosePart(api, draft, index);
    }
    expect(steps[0]).toBe("opening");
    expect(steps.at(-1)).toBe("closing");
    expect(new Set(draft.parts.map((p) => p.id)).size, where).toBe(
      draft.parts.length,
    );
    const questions = draft.parts.flatMap((p) =>
      p.question ? [p.question] : [],
    );
    expect(questions.length, where).toBeGreaterThan(0);

    const audienceIds = adults.slice(2, 62).map((p) => p.id);
    const result = deliverComposedSpeech(api, {
      filingId: you.id,
      venue: "composed-hall",
      draft,
      audienceIds,
    });
    expect(result.leadingQuestion, where).toBe(questions[0]);
    for (const id of result.promiseIds)
      expect(promises.get(id), `${id}: ${where}`).toBeDefined();
    const leadingId = result.speechIds[0]!;
    const moved = audienceIds.filter((id) =>
      stancesOf(api, id).some(
        (s) =>
          s.topic === result.leadingQuestion &&
          s.causes.some((c) => c.eventId === leadingId),
      ),
    );
    expect(
      moved.length,
      `nobody moved on ${leadingId}: ${where}`,
    ).toBeGreaterThan(0);
  });
});
