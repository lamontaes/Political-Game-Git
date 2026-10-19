/**
 * Asking an outlet for an interview at any time (OPUS-PEOPLE press, CTO
 * Oct 14), in a random place: an officeholder between races asks, and the
 * outlet decides by its reads (how newsworthy they are, its editor's and
 * owner's regard, its followers who know them); a yes prints a story on what
 * they said; a refusal is a record with the reads that made it; one who holds
 * no seat and runs in no race has nothing to be asked on.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildPopulation } from "./population";
import { createLifeCore } from "./life";
import { coreAPI } from "./state";
import { openLaws } from "./modules/laws";
import { openOffices, townSeats } from "./modules/offices";
import { openElections } from "./modules/elections";
import { openCampaigns } from "./modules/campaigns";
import { openRecord } from "./modules/record";
import {
  answerInterview,
  attackOutlet,
  candidateAnswers,
  officeholderSpeaker,
  openPress,
  outletInterest,
  requestInterview,
  storiesPrinted,
} from "./modules/press";
import { grudge } from "./press-desk";
import { viewsModule } from "./modules/views";
import { newsModule } from "./modules/news";
import { speechModule } from "./modules/speech";
import { createDrivesModule, DEFAULT_DRIVES_DATA } from "./modules/drives";
import { peopleData } from "../director/play-modules";
import { DEFAULT_DATA } from "./data";
import { searchCorePlaces, corePlaceStateIdentities } from "./place-lookup";

const START = "2026-01-05";
const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`press-asks:${Date.now()}`).digest("hex");
const pick = <T>(list: readonly T[], salt: string): T =>
  list[
    parseInt(
      createHash("sha256").update(`${seed}:${salt}`).digest("hex").slice(0, 8),
      16,
    ) % list.length
  ]!;

function world() {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const state = pick(
      [...corePlaceStateIdentities()].map((s) => s.jurisdictionKey).sort(),
      `state:${attempt}`,
    );
    const places = [
      ...searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
        stateJurisdictionKey: state,
        scope: "locality",
      }),
    ].sort((a, b) => a.key.localeCompare(b.key));
    const key = pick(places, `place:${attempt}`).key;
    const core = createLifeCore(
      buildPopulation({
        seed,
        placeKey: key,
        startedAt: START,
        minimumPeople: 300,
      }),
      {
        data: peopleData(DEFAULT_DATA),
        modules: [
          viewsModule,
          newsModule,
          speechModule,
          createDrivesModule(DEFAULT_DRIVES_DATA),
        ],
      },
    );
    openLaws(core);
    openOffices(core, seed);
    openElections(core);
    openCampaigns(core);
    openRecord(core);
    const api = coreAPI(core);
    const outlet = openPress(core).find(
      (o) => o.tier !== "national" && o.reporterIds.length && o.ownerId,
    );
    const holder = townSeats(api)
      .map((s) => s.holder?.personId)
      .find((id): id is string => !!id && !!core.people.get(id)?.alive);
    if (outlet && holder)
      return { core, api, outlet, holder, where: `seed ${seed}, place ${key}` };
  }
  throw new Error(`No town with a local outlet and a seated resident: ${seed}`);
}

describe("asking an outlet for an interview", () => {
  it("an officeholder asks between races; the outlet decides by its reads and a refusal is a record", () => {
    const { core, api, outlet, holder, where } = world();
    const speaker = officeholderSpeaker(api, holder);
    expect(speaker, where).toBeTruthy();
    const interest = outletInterest(api, outlet, speaker!);
    const row = requestInterview(api, {
      outletId: outlet.id,
      personId: holder,
    });
    expect(row.filingId, where).toBeNull();
    expect(row.interest?.total, where).toBeCloseTo(interest.total);
    // The decision is the reads': room this week, and interest over the bar
    // (a newspaper or radio station's bar is any interest at all).
    const bar = outlet.kind === "television" ? 0.3 : 0;
    if (interest.total < bar)
      expect(
        ["not-newsworthy", "not-interested"].includes(row.reason ?? ""),
        where,
      ).toBe(true);
    else {
      expect(row.status, where).toBe("invited");
      const done = answerInterview(
        api,
        row.id,
        candidateAnswers(api, row.questions, speaker!),
      );
      expect(done.status, where).toBe("published");
      if (done.storyId)
        expect(
          storiesPrinted(api, outlet.id).find((s) => s.id === done.storyId)
            ?.topic,
          where,
        ).toBeTruthy();
      // Asking again within the month: the outlet talked with them lately.
      expect(
        requestInterview(api, { outletId: outlet.id, personId: holder }).reason,
        where,
      ).toBe("already-interviewed");
    }
    // The officeholder attacks the outlet in a speech; its owner and editor
    // hold the grudge the attack can leave, and the outlet's interest cools.
    const speechId = attackOutlet(api, {
      speakerId: holder,
      outletId: outlet.id,
      audienceIds: [],
    });
    for (const id of [outlet.ownerId!, outlet.headId!])
      if (grudge(api, id, holder) < 1)
        // Their own drives carried on; give them the grudge that attack
        // could have left, from that same event (fixture for this edge case).
        api.updateDrive(id, {
          id: `grudge:grudge:${holder}`,
          kind: "grudge",
          topic: `grudge:${holder}`,
          desiredChange: "press.attacked",
          strength: 1,
          sourceEventId: `press.attacked:${speechId}`,
        });
    const cooled = outletInterest(api, outlet, speaker!);
    expect(cooled.owner + cooled.head, where).toBeLessThan(
      interest.owner + interest.head,
    );
    // Someone with no seat and no race has no record to be asked on.
    const nobody = [...core.people.values()]
      .filter(
        (p) =>
          p.alive &&
          !p.id.startsWith("person:press") &&
          !officeholderSpeaker(api, p.id),
      )
      .sort((a, b) => a.id.localeCompare(b.id))[0]!;
    const refused = requestInterview(api, {
      outletId: outlet.id,
      personId: nobody.id,
    });
    expect(refused.status, where).toBe("declined");
    expect(refused.reason, where).toBe("no-standing");
  });
});
