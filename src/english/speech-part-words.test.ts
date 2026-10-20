/**
 * The parts of a composed speech in words, in a random place drawn from all
 * 56: the four offered parts at each of the three steps all come back as
 * words, each citing the records it rests on, and a finished speech reads as
 * one speech.
 */
import { PLATFORM_QUESTIONS } from "../core2/campaign-views";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildPopulation } from "../core2/population";
import { createLifeCore } from "../core2/life";
import { coreAPI } from "../core2/state";
import type { CoreAPI, CoreState } from "../core2/types";
import { openLaws } from "../core2/modules/laws";
import { openOffices } from "../core2/modules/offices";
import { openRecord, recordVote } from "../core2/modules/record";
import {
  ELECTIONS_MODULE_ID,
  fileCandidacy,
  openContests,
  openElections,
  type ContestRow,
} from "../core2/modules/elections";
import { OFFICES_MODULE_ID, type TermRow } from "../core2/modules/offices";
import { makeStatements, openCampaigns } from "../core2/modules/campaigns";
import { openParties } from "../core2/modules/parties";
import { speechModule } from "../core2/modules/speech";
import { viewsModule } from "../core2/modules/views";
import {
  choosePart,
  speechPartOffers,
  speechStepOf,
  startSpeech,
  type SpeechDraft,
} from "../core2/speech-composition";
import {
  speakerKind,
  wordSpeech,
  wordSpeechOffers,
  wordSpeechPart,
} from "./speech-part-words";

const START = "2026-01-05";
const runSeed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`speech-part-words:${Date.now()}`).digest("hex");

function world() {
  const place = drawPlace(runSeed, "speech-part-words");
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

describe("the parts of a composed speech in words", () => {
  it("words every offered part at every step and reads a finished speech as one", () => {
    const { core, api, where } = world();
    const got = pair(api, core);
    expect(got, `no contest two could file for: ${where}`).not.toBeNull();
    const { you, rival, adults } = got!;
    // What kind of speaker each candidate is follows the records: a
    // challenger where someone else holds the seat, a parent where a child
    // lives at home, each citing the records that make it so.
    for (const filing of [you, rival]) {
      const kind = speakerKind(api, filing, filing.personId);
      const contest = api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("contests")
        .get(filing.contestId) as unknown as ContestRow;
      const holder = contest.incumbentTermId
        ? (
            api
              .moduleState(OFFICES_MODULE_ID)
              .table("terms")
              .get(contest.incumbentTermId) as unknown as TermRow
          ).personId
        : null;
      expect(Boolean(kind.challenger), `${where}: challenger`).toBe(
        Boolean(holder && holder !== filing.personId),
      );
      const person = core.people.get(filing.personId)!;
      const children = (
        core.households.get(person.householdId)?.memberIds ?? []
      )
        .map((id) => core.people.get(id))
        .filter(
          (member) =>
            member?.alive &&
            member.id !== person.id &&
            // Younger than 18 on the day: born after the same day 18 years back.
            member.birthDate >
              `${Number(START.slice(0, 4)) - 18}${START.slice(4)}`,
        );
      expect(Boolean(kind["has-children"]), `${where}: parent`).toBe(
        children.length > 0,
      );
      for (const fact of Object.values(kind))
        expect(fact.sourceRecordIds.length, where).toBeGreaterThan(0);
    }
    makeStatements(api, {
      filingId: rival.id,
      venue: "rival-hall",
      statements: [{ question: PLATFORM_QUESTIONS[0]!, position: 0.8 }],
      audienceIds: [],
      act: "speech",
      weight: 0.3,
      faceToFace: true,
    });
    recordVote(api, {
      personId: rival.personId,
      body: "council",
      measureId: "m-words-1",
      stance: { question: PLATFORM_QUESTIONS[0]!, position: -0.9 },
      passed: true,
    });
    void adults;
    const seen = new Set<string>();
    // Walk every offer at every step, down each of the four paths.
    for (let path = 0; path < 4; path += 1) {
      let draft: SpeechDraft = startSpeech(you.id);
      while (speechStepOf(draft)) {
        const offers = speechPartOffers(api, draft);
        const worded = wordSpeechOffers(api, offers);
        worded.forEach((result, i) => {
          const offer = offers[i]!;
          expect(
            result.kind,
            `${offer.moveKey} not worded (${JSON.stringify(
              result.kind === "missing" ? result.reasons : [],
            )}): ${where}`,
          ).toBe("worded");
          if (result.kind !== "worded") return;
          seen.add(offer.moveKey);
          expect(result.part.text.length, where).toBeGreaterThan(3);
          expect(result.part.text, where).not.toMatch(/\{|\}/);
          // It cites the records it rests on.
          expect(result.part.sourceRecordIds, where).toEqual([
            ...offer.factIds,
          ]);
          // The same part comes out in the same words.
          const again = wordSpeechPart(api, offer);
          expect(again, where).toEqual(result);
        });
        draft = choosePart(api, draft, Math.min(path, offers.length - 1));
      }
      const speech = wordSpeech(api, draft);
      expect(speech, `unworded speech: ${where}`).not.toBeNull();
      expect(speech!.parts.length, where).toBe(draft.parts.length);
      expect(speech!.text, where).toBe(
        speech!.parts.map((p) => p.text).join(" "),
      );
      expect(speech!.sourceRecordIds.length, where).toBeGreaterThan(0);
    }
    // A stand, a record and a contrast were all offered somewhere on the way.
    expect(
      [...seen].some((k) => k.startsWith("stance.")),
      `${[...seen].join(",")}: ${where}`,
    ).toBe(true);
    expect(
      [...seen].some((k) => k.startsWith("contrast.")),
      `${[...seen].join(",")}: ${where}`,
    ).toBe(true);
  });
});
