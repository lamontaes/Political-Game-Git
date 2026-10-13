import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { advanceCore, createLifeCore } from "../core2/life";
import { openCampaigns } from "../core2/modules/campaigns";
import { openElections } from "../core2/modules/elections";
import { openLaws } from "../core2/modules/laws";
import { openLawEffects } from "../core2/modules/law-effects";
import {
  draftBill,
  holdVote,
  openLegislature,
} from "../core2/modules/legislature";
import { newsKey, newsModule } from "../core2/modules/news";
import { openOffices, townSeats } from "../core2/modules/offices";
import { openRecord } from "../core2/modules/record";
import { viewsModule } from "../core2/modules/views";
import { buildPopulation } from "../core2/population";
import { coreAPI, registerModule } from "../core2/state";
import { POLICY_VALUES, valueSupport } from "../core2/views-values";
import { governmentUnitsForPlace } from "../simulation/government-units";
import {
  lifePlaceCoverage,
  lifePlaceSearch,
  lifePlaceStateIdentities,
} from "../simulation/life-places";
import { bringItUp } from "./bring-it-up";
import effects from "../core2/data/laws/policy-effects.json" with { type: "json" };

// M4-05 (step 10): after the council passes an ordinance, residents who heard
// of it bring it up in their own words: the law, whether their own values are
// for it or against it, and who the record says did it (the bill's sponsor).
// The ordinance goes through GOV's own path: draft, vote, enactment, the laws
// calendar, the news.
const START = "2026-01-05";
const seed = process.env.GOLDEN_PATH_SEED ?? "bring-it-up-laws";
const pick = <T>(list: readonly T[], salt: string): T =>
  list[
    Number.parseInt(
      createHash("sha256").update(`${seed}:${salt}`).digest("hex").slice(0, 8),
      16,
    ) % list.length
  ]!;
const after = (date: string, days: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000)
    .toISOString()
    .slice(0, 10);
const PREFIX = "us-policy-positions:";
// The authored policies GOV's laws give effects to, as council questions.
const QUESTIONS = Object.keys(effects.effects).filter(
  (question) =>
    question.startsWith(PREFIX) &&
    POLICY_VALUES.policies[question.slice(PREFIX.length)],
);

const states = [...lifePlaceStateIdentities()]
  .map((row) => row.jurisdictionKey)
  .sort();
let found: {
  name: string;
  core: ReturnType<typeof createLifeCore>;
  sponsorId: string;
  lawEventId: string;
  policy: string;
} | null = null;
for (let attempt = 0; attempt < 20 && !found; attempt += 1) {
  const state = pick(states, `state:${attempt}`);
  const places = [
    ...lifePlaceSearch("", lifePlaceCoverage().placeCount, {
      stateJurisdictionKey: state,
      scope: "locality",
    }),
  ].filter((row) =>
    governmentUnitsForPlace(row.sourceGeoid ?? row.key).some(
      (unit) => unit.unitType === "municipality",
    ),
  );
  if (!places.length) continue;
  const place = pick(places, `place:${attempt}`);
  const core = createLifeCore(
    buildPopulation({
      seed: `${seed}:${attempt}`,
      placeKey: place.key,
      startedAt: START,
      minimumPeople: 300,
    }),
    { modules: [viewsModule] },
  );
  registerModule(core, newsModule);
  openLaws(core);
  openOffices(core, seed);
  openElections(core);
  openCampaigns(core);
  openRecord(core);
  openLegislature(core);
  openLawEffects(core);
  const api = coreAPI(core);
  const council = townSeats(api).find(
    (row) => row.office.kind === "council" && row.holder?.personId,
  );
  if (!council) continue;
  const sponsorId = council.holder!.personId!;
  if (!core.people.has(sponsorId)) continue;
  for (const question of QUESTIONS) {
    const bill = draftBill(api, {
      bodyOfficeId: council.office.id,
      sponsorId,
      provisions: [{ kind: "policy-question", question, value: 1 }],
    });
    if (bill.status === "blocked") continue;
    const result = holdVote(api, bill.id);
    if (!["enacted", "signed", "overridden"].includes(result.status)) continue;
    advanceCore(core, after(api.state.date, 45));
    const lawEvent = [...core.durableLog.values()].find(
      (row) => row.kind === "law-took-effect" && row.facts?.series === question,
    );
    if (!lawEvent) continue;
    found = {
      name: place.formalName ?? place.key,
      core,
      sponsorId,
      lawEventId: lawEvent.id,
      policy: question.slice(PREFIX.length),
    };
    break;
  }
}

describe(`people bring up an ordinance${found ? ` in ${found.name}` : ""} (seed ${seed})`, () => {
  it("names the law, the speaker's own side from their values, and the sponsor on the record", () => {
    expect(found).not.toBeNull();
    const { core, sponsorId, lawEventId, policy } = found!;
    const api = coreAPI(core);
    const sponsor = core.people.get(sponsorId)!;
    const heard = [...core.people.values()].filter(
      (person) =>
        person.alive &&
        person.tier !== "husk" &&
        person.id !== sponsorId &&
        api.knows(person.id, newsKey(lawEventId)),
    );
    expect(heard.length).toBeGreaterThan(0);
    let sides = 0;
    for (const speaker of heard.slice(0, 20)) {
      const listener = [...core.people.values()].find(
        (row) => row.id !== speaker.id && row.alive && row.tier !== "husk",
      )!;
      const said = bringItUp(core, speaker.id, listener.id);
      expect(said, speaker.id).not.toBeNull();
      if (said!.change.eventId !== lawEventId) continue;
      const texts = said!.lines.map((line) => line.text);
      expect(texts[0]).toBe(
        `A new law took effect: ${POLICY_VALUES.policies[policy]!.name}.`,
      );
      const support = valueSupport(api, speaker.id, policy)!;
      if (support !== 0) {
        expect(texts[1]).toBe(
          support > 0 ? "I'm all for it." : "I'm against it.",
        );
        sides += 1;
      }
      // From the record, or from someone earlier in this test who told them.
      expect(["record", "told"]).toContain(said!.attribution.how);
      expect(said!.attribution.blamedId).toBe(sponsorId);
      expect(texts.at(-1)).toContain(
        `${sponsor.givenName} ${sponsor.familyName}`,
      );
    }
    expect(sides).toBeGreaterThan(0);
  });
});
