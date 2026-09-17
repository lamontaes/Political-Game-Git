import { describe, expect, it } from "vitest";
import {
  characterHistoryContextPersonId,
  createCharacterHistoryContextPerson,
} from "../character-history";
import { createCampaignElectionTransitionRegistry } from "../campaigns";
import { addDays, makeIsoDate } from "../dates";
import { createDemoWorld } from "../demo";
import { deserializeWorld, serializeWorld } from "../serialization";
import type { EntityId, IsoDate, Person, World } from "../types";
import { isPersonAliveAt, personFunctionalCapacityAt } from "../vitality";
import {
  advanceWorld,
  assertWorldIntegrity,
  createWorld,
  recordWorldEvent,
} from "../world";
import {
  beginHealthEpisode,
  changeHealthState,
  createCrisisTransitionRegistry,
  crisisEnvelopesBetween,
  crisisOfficeContinuityNotices,
  crisisPersonDeathNotices,
  crisisProtectedDecisions,
  crisisRecords,
  discloseHealthEpisode,
  ensureCrisisMortality,
  latestHealthState,
  MORTALITY_CAUSE_KEY,
  mortalityCrossingDay,
  publicOfficesHeldBy,
} from "./index";

const REGISTRY = createCrisisTransitionRegistry();
const SLOW = 600_000;

function bareWorld(seed: string): World {
  const demo = createDemoWorld(seed);
  return createWorld({
    seed,
    currentDate: demo.currentDate,
    jurisdictions: demo.jurisdictionOrder.map((id) => demo.jurisdictions[id]!),
    people: demo.personOrder.map((id) => demo.people[id] as Person),
  });
}

function addPerson(
  world: World,
  key: string,
  birthDate: string,
): { world: World; personId: EntityId } {
  const next = createCharacterHistoryContextPerson(world, {
    stableKey: key,
    givenName: "Crisis",
    familyName: key.replaceAll(":", "-"),
    birthDate: makeIsoDate(birthDate),
    homeJurisdictionId: world.jurisdictionOrder[0]!,
  });
  return { world: next, personId: characterHistoryContextPersonId(next, key) };
}

/** An elderly cohort so the hazard model produces deaths within a few years. */
function cohortWorld(seed: string, size = 40) {
  let world = bareWorld(seed);
  const ids: EntityId[] = [];
  for (let i = 0; i < size; i += 1) {
    const added = addPerson(
      world,
      `crisis:cohort:${i}`,
      `19${24 + (i % 12)}-0${1 + (i % 9)}-1${i % 9}`,
    );
    world = added.world;
    ids.push(added.personId);
  }
  return { world: ensureCrisisMortality(world), ids };
}

function deathsOf(world: World) {
  return world.history.personDeaths
    .map((death) => `${death.personId}@${death.diedAt}:${death.causeKey}`)
    .sort();
}

function advanceInSteps(world: World, totalDays: number, step: number): World {
  let current = world;
  for (let done = 0; done < totalDays; done += step)
    current = advanceWorld(current, Math.min(step, totalDays - done), REGISTRY);
  return current;
}

function seatPresident(world: World, personId: EntityId, since: string): World {
  return recordWorldEvent(world, {
    stableKey: `test:office:president:${personId}`,
    type: "world.office-tenure",
    occurredAt: makeIsoDate(since),
    recordedAt: world.currentDate,
    jurisdictionId: world.jurisdictionOrder[0]!,
    involvedEntityIds: [personId],
    participants: [{ personId, role: "focus:subject", detail: null }],
    personFactConstraints: [],
    visibility: "public",
    tags: ["office:us-president"],
    summary: "Test fixture: an authored opening presidential tenure.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}

describe("CRISIS K1 ordinary mortality in the World", () => {
  it(
    "is composed into the production time registry",
    () => {
      const registry = createCampaignElectionTransitionRegistry();
      for (const key of [
        "crisis:mortality-window",
        "crisis:mortality-death",
        "crisis:health-review",
        "crisis:health-disclosure-review",
      ])
        expect(registry.get(key as `${string}:${string}`)).toBeTypeOf(
          "function",
        );
    },
    SLOW,
  );

  it(
    "gives the same deaths for any partition of a long skip, and after a save",
    () => {
      const { world } = cohortWorld("crisis-partition");
      const whole = advanceWorld(world, 1_100, REGISTRY);
      const deaths = deathsOf(whole);
      expect(deaths.length).toBeGreaterThan(0);
      expect(deaths.every((d) => d.endsWith(MORTALITY_CAUSE_KEY))).toBe(true);
      for (const step of [1, 7, 31, 90, 365]) {
        if (step === 1) {
          // Daily stepping is the slowest partition; sample its first year.
          const daily = advanceInSteps(world, 200, 1);
          const bulk = advanceWorld(world, 200, REGISTRY);
          expect(deathsOf(daily)).toEqual(deathsOf(bulk));
          continue;
        }
        expect(deathsOf(advanceInSteps(world, 1_100, step))).toEqual(deaths);
      }
      // Save and reopen half way.
      const half = advanceWorld(world, 400, REGISTRY);
      const reopened = deserializeWorld(serializeWorld(half));
      expect(deathsOf(advanceWorld(reopened, 700, REGISTRY))).toEqual(deaths);
      assertWorldIntegrity(whole);
    },
    SLOW,
  );

  it(
    "is deterministic by seed, records each death on its exact crossing day, and never prewrites a date",
    () => {
      const a = advanceWorld(cohortWorld("crisis-seed-a").world, 800, REGISTRY);
      const b = advanceWorld(cohortWorld("crisis-seed-a").world, 800, REGISTRY);
      expect(deathsOf(a)).toEqual(deathsOf(b));
      expect(serializeWorld(a)).toBe(serializeWorld(b));
      const c = advanceWorld(cohortWorld("crisis-seed-c").world, 800, REGISTRY);
      expect(deathsOf(c)).not.toEqual(deathsOf(a));
      for (const death of a.history.personDeaths) {
        const month = `${death.diedAt.slice(0, 8)}01` as IsoDate;
        expect(
          mortalityCrossingDay(a, death.personId, month, addDays(month, 40)),
        ).toBe(death.diedAt);
        expect(death.recordedAt).toBe(death.diedAt);
      }
      // No stored record carries a future death date.
      const fresh = cohortWorld("crisis-seed-a").world;
      expect(JSON.stringify(crisisRecords(fresh))).not.toMatch(/died/);
    },
    SLOW,
  );

  it(
    "starts an older save at its next month boundary without rewriting history",
    () => {
      const legacy = bareWorld("crisis-legacy");
      expect(legacy.history.crisisRecords).toBeUndefined();
      const reopened = deserializeWorld(serializeWorld(legacy));
      const started = ensureCrisisMortality(reopened);
      expect(ensureCrisisMortality(started)).toBe(started);
      const due = started.history.futureDueItems.at(-1)!;
      expect(due.transitionKey).toBe("crisis:mortality-window");
      expect(due.dueAt > legacy.currentDate).toBe(true);
      expect(due.dueAt.endsWith("-01")).toBe(true);
      expect(started.history.events).toEqual(legacy.history.events);
    },
    SLOW,
  );

  it(
    "reports a civilian death to PEOPLE and not as an office matter",
    () => {
      const run = advanceWorld(
        cohortWorld("crisis-civilian").world,
        1_100,
        REGISTRY,
      );
      const notices = crisisPersonDeathNotices(run);
      expect(notices.length).toBe(run.history.personDeaths.length);
      expect(notices.every((n) => !n.heldOffice && !n.causeResolved)).toBe(
        true,
      );
      expect(crisisOfficeContinuityNotices(run)).toEqual([]);
      // The private death event is not public news.
      for (const death of run.history.personDeaths)
        expect(
          run.history.events.find((e) => e.id === death.eventId)?.visibility,
        ).toBe("private");
    },
    SLOW,
  );
});

describe("CRISIS K2 health, disclosure, recovery and death", () => {
  function patientWorld(seed: string, birthDate = "1961-04-02") {
    const added = addPerson(bareWorld(seed), "crisis:patient", birthDate);
    const staff = addPerson(added.world, "crisis:staff", "1985-02-02");
    return {
      world: ensureCrisisMortality(staff.world),
      patient: added.personId,
      staff: staff.personId,
    };
  }

  it(
    "keeps a private illness out of public view until it is disclosed",
    () => {
      const { world, patient, staff } = patientWorld("crisis-private");
      const ill = beginHealthEpisode(world, {
        stableKey: "private-1",
        personId: patient,
        severity: "serious",
        initialLimitation: "limited",
        origin: { kind: "authored", note: "Test episode." },
        causalParentIds: [],
      });
      const episode = crisisRecords(ill).find(
        (r) => r.kind === "health-episode",
      )!;
      const events = ill.history.events.filter((e) =>
        e.tags.includes("crisis.health"),
      );
      expect(events.map((e) => e.visibility)).toEqual(["private"]);
      expect(
        crisisEnvelopesBetween(
          ill,
          "2000-01-01" as IsoDate,
          "2100-01-01" as IsoDate,
          { visibility: ["public"] },
        ),
      ).toEqual([]);
      expect(
        ill.history.knowledge.filter((k) => k.personId === staff),
      ).toHaveLength(0);

      const told = discloseHealthEpisode(ill, {
        stableKey: "tell-staff",
        episodeId: episode.id,
        access: "specific-people",
        recipientIds: [staff],
        decidedByPersonId: patient,
      });
      expect(
        told.history.knowledge.filter((k) => k.personId === staff),
      ).toHaveLength(1);
      const publicNow = discloseHealthEpisode(told, {
        stableKey: "announce",
        episodeId: episode.id,
        access: "public",
        recipientIds: [],
        decidedByPersonId: patient,
      });
      const envelopes = crisisEnvelopesBetween(
        publicNow,
        "2000-01-01" as IsoDate,
        "2100-01-01" as IsoDate,
        { visibility: ["public"] },
      );
      expect(envelopes.map((e) => e.kind)).toEqual(["health-disclosure"]);
      expect(() =>
        discloseHealthEpisode(publicNow, {
          stableKey: "retract",
          episodeId: episode.id,
          access: "official",
          recipientIds: [],
          decidedByPersonId: patient,
        }),
      ).toThrow(/less known/);
      // A diagnosis alone is not an office matter.
      expect(crisisOfficeContinuityNotices(publicNow)).toEqual([]);
    },
    SLOW,
  );

  it(
    "recovers along its course with capacity restored",
    () => {
      const { world, patient } = patientWorld("crisis-recovery");
      const ill = beginHealthEpisode(world, {
        stableKey: "recover-1",
        personId: patient,
        severity: "serious",
        initialLimitation: "incapacitated",
        origin: { kind: "authored", note: "Test episode." },
        causalParentIds: [],
      });
      const episode = crisisRecords(ill).find(
        (r) => r.kind === "health-episode",
      )!;
      const cutoff = (w: World) => ({
        asOfDate: w.currentDate,
        historySequenceExclusive: w.history.nextSequence,
      });
      expect(personFunctionalCapacityAt(ill, patient, cutoff(ill))).toBe(
        "incapacitated",
      );
      const later = advanceWorld(ill, 100, REGISTRY);
      if (isPersonAliveAt(later, patient, cutoff(later))) {
        expect(latestHealthState(later, episode.id)?.state).toBe("recovered");
        expect(personFunctionalCapacityAt(later, patient, cutoff(later))).toBe(
          "capable",
        );
      }
      // Partitioned the same way twice gives the same course.
      expect(serializeWorld(advanceInSteps(ill, 100, 13))).not.toBe("");
      expect(
        crisisRecords(advanceInSteps(ill, 100, 13)).map((r) => [
          r.kind,
          r.effectiveAt,
        ]),
      ).toEqual(crisisRecords(later).map((r) => [r.kind, r.effectiveAt]));
    },
    SLOW,
  );

  it(
    "supports a death path while ill and closes the episode on that date",
    () => {
      // A very old patient with an authored high-hazard test episode.
      let found: { run: World; patient: EntityId; episodeId: EntityId } | null =
        null;
      for (let i = 0; i < 20 && !found; i += 1) {
        const { world, patient } = patientWorld(
          `crisis-death-${i}`,
          "1921-05-05",
        );
        const ill = beginHealthEpisode(world, {
          stableKey: "grave",
          personId: patient,
          severity: "chronic",
          initialLimitation: "limited",
          origin: {
            kind: "authored",
            note: "Test episode with authored hazard.",
          },
          causalParentIds: [],
          hazard: {
            micros: 20_000_000,
            basis: "Test fixture only; not clinical data.",
          },
        });
        const run = advanceWorld(ill, 365, REGISTRY);
        if (run.history.personDeaths.some((d) => d.personId === patient))
          found = {
            run,
            patient,
            episodeId: crisisRecords(ill).find(
              (r) => r.kind === "health-episode",
            )!.id,
          };
      }
      expect(found).not.toBeNull();
      const { run, patient, episodeId } = found!;
      const death = run.history.personDeaths.find(
        (d) => d.personId === patient,
      )!;
      const closing = latestHealthState(run, episodeId)!;
      expect(closing.state).toBe("deceased");
      expect(closing.effectiveAt).toBe(death.diedAt);
      expect(closing.causalParentIds).toContain(death.id);
      expect(() =>
        changeHealthState(run, {
          stableKey: "after-death",
          episodeId,
          state: "recovered",
          functionalLimitation: "none",
        }),
      ).toThrow();
      assertWorldIntegrity(deserializeWorld(serializeWorld(run)));
    },
    SLOW,
  );

  it(
    "asks the controlled person, and only them, to decide about their own illness",
    () => {
      const { world, patient } = patientWorld("crisis-player");
      const controlled: World = {
        ...world,
        control: { kind: "person", personId: patient },
      };
      const before = controlled.history.nextSequence;
      const ill = beginHealthEpisode(controlled, {
        stableKey: "player-ill",
        personId: patient,
        severity: "acute",
        initialLimitation: "limited",
        origin: { kind: "authored", note: "Test episode." },
        causalParentIds: [],
      });
      expect(
        crisisProtectedDecisions(ill, before - 1).map((d) => d.kind),
      ).toEqual(["own-health-disclosure"]);
      expect(
        crisisProtectedDecisions(
          { ...ill, control: { kind: "observer" } },
          before - 1,
        ),
      ).toEqual([]);
    },
    SLOW,
  );
});

describe("CRISIS K3 continuity notices for GOVERNING", () => {
  function presidentWorld(seed: string) {
    const added = addPerson(bareWorld(seed), "crisis:president", "1950-06-06");
    const seated = seatPresident(added.world, added.personId, "2025-01-20");
    return { world: ensureCrisisMortality(seated), president: added.personId };
  }

  it(
    "detects the office and turns a known incapacity into a notice, then its end",
    () => {
      const { world, president } = presidentWorld("crisis-incapacity");
      expect(
        publicOfficesHeldBy(world, president).map((o) => o.officeKey),
      ).toEqual(["us-president"]);
      const ill = beginHealthEpisode(world, {
        stableKey: "pres-ill",
        personId: president,
        severity: "serious",
        initialLimitation: "incapacitated",
        origin: { kind: "authored", note: "Test episode." },
        causalParentIds: [],
      });
      // Private incapacity is not yet an institutional fact.
      expect(crisisOfficeContinuityNotices(ill)).toEqual([]);
      // Staff learn the next day (authored NPC policy).
      const nextDay = advanceWorld(ill, 1, REGISTRY);
      const notices = crisisOfficeContinuityNotices(nextDay);
      expect(notices.map((n) => [n.kind, n.visibility])).toEqual([
        ["incapacity-began", "limited"],
      ]);
      expect(notices[0]!.offices.map((o) => o.officeKey)).toEqual([
        "us-president",
      ]);
      expect(notices[0]!.effectiveDate).toBe(world.currentDate);
      // The serious course restores capacity after 30 days (limited) and the notice follows.
      const recovered = advanceWorld(nextDay, 40, REGISTRY);
      const alive = isPersonAliveAt(recovered, president, {
        asOfDate: recovered.currentDate,
        historySequenceExclusive: recovered.history.nextSequence,
      });
      if (alive)
        expect(
          crisisOfficeContinuityNotices(recovered).map((n) => n.kind),
        ).toEqual(["incapacity-began", "incapacity-ended"]);
      // Consumers page with afterSequence.
      expect(
        crisisOfficeContinuityNotices(recovered, {
          afterSequence: notices[0]!.sequence,
        }).map((n) => n.kind),
      ).toEqual(alive ? ["incapacity-ended"] : []);
    },
    SLOW,
  );

  it(
    "publishes an officeholder death as public news and a death notice",
    () => {
      let run: World | null = null;
      let president: EntityId | null = null;
      for (let i = 0; i < 40 && !run; i += 1) {
        const fixture = presidentWorld(`crisis-president-death-${i}`);
        const aged = beginHealthEpisode(fixture.world, {
          stableKey: "frail",
          personId: fixture.president,
          severity: "chronic",
          initialLimitation: "none",
          origin: {
            kind: "authored",
            note: "Test episode with authored hazard.",
          },
          causalParentIds: [],
          hazard: {
            micros: 60_000_000,
            basis: "Test fixture only; not clinical data.",
          },
        });
        const advanced = advanceWorld(aged, 365, REGISTRY);
        if (
          advanced.history.personDeaths.some(
            (d) => d.personId === fixture.president,
          )
        ) {
          run = advanced;
          president = fixture.president;
        }
      }
      expect(run).not.toBeNull();
      const notices = crisisOfficeContinuityNotices(run!);
      expect(notices).toHaveLength(1);
      const notice = notices[0]!;
      expect(notice.kind).toBe("death");
      expect(notice.visibility).toBe("public");
      const death = run!.history.personDeaths.find(
        (d) => d.personId === president,
      )!;
      expect(notice.effectiveDate).toBe(death.diedAt);
      const event = run!.history.events.find(
        (e) => e.id === notice.originEventId,
      )!;
      expect(event.type).toBe("crisis.officeholder-died");
      expect(event.visibility).toBe("public");
      expect(
        crisisPersonDeathNotices(run!).find((n) => n.personId === president)
          ?.heldOffice,
      ).toBe(true);
      // The office projection no longer lists the dead person.
      expect(publicOfficesHeldBy(run!, president!)).toEqual([]);
      // CRISIS neither names a successor nor ends a term.
      expect(
        run!.history.events.filter(
          (e) =>
            e.tags.includes("office:us-president") &&
            e.type === "world.office-tenure",
        ),
      ).toHaveLength(1);
    },
    SLOW,
  );
});
