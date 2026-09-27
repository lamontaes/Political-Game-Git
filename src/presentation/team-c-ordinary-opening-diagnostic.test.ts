import { describe, expect, it } from "vitest";
import { PRE_START_FICTIONAL_DATES_V1 } from "../simulation/character-history";
import { addDays, dateAtAge } from "../simulation/dates";
import { requireLifePlace } from "../simulation/life-places";
import { contactBases } from "../simulation/people-contact";
import { deserializeWorld, serializeWorld } from "../simulation/serialization";
import { advanceWorld } from "../simulation/world";
import { projectJournalView } from "./journal-views";
import { openOrdinaryLife } from "./ordinary-life";
import { projectContacts } from "./people-contacts";
import { projectPersonalRecord } from "./personal-record";
import {
  buildPreStartBackgroundWorld,
  finalizePreStartPlayer,
} from "./production-world";

describe("Team C ordinary opening projection diagnostic", () => {
  const cases = [
    ["kentucky", 10],
    ["3260600", 22],
    ["lexington-fayette", 35],
    ["0203000", 52],
    ["1319000", 70],
  ] as const;

  for (const [placeKey, age] of cases) {
    it(`${placeKey}, age ${age}`, () => {
      const place = requireLifePlace(placeKey);
      const targetStartDate = place.context.initialMoment.date;
      const input = {
        seed: `pre-start-five-places:${placeKey}:${age}`,
        place,
        age,
        givenName: "Morgan",
        familyName: "Reed",
        startingLife: "ordinary-life" as const,
        depth:
          age < 18
            ? ("play-formative-years" as const)
            : ("summarize-earlier-life" as const),
        household:
          age < 18 ? ("shares-a-home" as const) : ("lives-alone" as const),
        preStartYear: {
          version: "pre-start-world-year-v1" as const,
          targetStartDate,
          priorYearStartDate: addDays(targetStartDate, -365),
        },
        preStartHistoryDateVersion: PRE_START_FICTIONAL_DATES_V1,
      };
      const background = buildPreStartBackgroundWorld(input);
      const advanced = advanceWorld(background, 365);
      const { world, playerPersonId } = finalizePreStartPlayer(advanced, input);
      const beforeTraits = world.history.personalityTendencies.length;
      const opened = openOrdinaryLife(world, playerPersonId);
      const journal = projectJournalView(opened, playerPersonId, "years", null);
      const years = journal.years.map(Number).sort((a, b) => a - b);
      const maxGap = Math.max(
        ...years.slice(1).map((year, index) => year - years[index]!),
      );
      const familyContacts = projectContacts(
        opened,
        playerPersonId,
      ).contacts.filter((entry) => entry.basis.includes("family"));
      const reachable = new Set(
        contactBases(opened, playerPersonId).map((entry) => entry.personId),
      );
      const newTraits =
        opened.history.personalityTendencies.slice(beforeTraits);
      const distantTraits = newTraits.filter(
        (row) => !reachable.has(row.personId),
      );
      const familyInteractions = opened.history.relationshipInteractions.filter(
        (row) =>
          row.kind === "care:family-time" &&
          row.personIds.includes(playerPersonId),
      );
      const fictionalHistoryEvents = opened.history.events.filter(
        (event) =>
          event.stableKey.startsWith(
            age < 18
              ? `pre-start-child-history-v1:${playerPersonId}:age:`
              : `pre-start-adult-history-v1:${playerPersonId}:year:`,
          ) ||
          event.stableKey ===
            `pre-start-adult-history-v1:${playerPersonId}:early-family-time`,
      );
      const rebuilt = finalizePreStartPlayer(
        advanceWorld(buildPreStartBackgroundWorld(input), 365),
        input,
      ).world;
      const birthday = opened.people[playerPersonId]!.birthDate;
      const ageForEvent = (stableKey: string): number | null => {
        const match = /:(?:age|year):(\d+)$/.exec(stableKey);
        if (match) return Number(match[1]);
        return stableKey.endsWith(":early-family-time") ? 2 : null;
      };
      const repeatOpened = openOrdinaryLife(opened, playerPersonId);
      const reloaded = deserializeWorld(serializeWorld(repeatOpened));
      const reloadOpened = openOrdinaryLife(reloaded, playerPersonId);
      const familyIds = new Set(
        opened.history.kinshipRelationships
          .filter((row) => row.personIds.includes(playerPersonId))
          .flatMap((row) => row.personIds)
          .filter((id) => id !== playerPersonId),
      );
      const totalFamily = familyIds.size;
      const deceasedFamily = new Set(
        opened.history.personDeaths
          .map((death) => death.personId)
          .filter((id) => familyIds.has(id)),
      );
      const balance =
        projectPersonalRecord(opened, playerPersonId)?.purses.find(
          (purse) => purse.kind === "personal",
        )?.balance?.minorUnits ?? null;
      console.log(
        JSON.stringify({
          placeKey,
          age,
          date: opened.currentDate,
          journalYears: years.length,
          firstYear: years[0],
          lastYear: years.at(-1),
          maxGap,
          totalFamily,
          familyContacts: familyContacts.length,
          familyWithPriorContact: familyContacts.filter(
            (entry) =>
              entry.lastContactOn && entry.lastContactOn < opened.currentDate,
          ).length,
          familyInteractions: familyInteractions.length,
          balance,
          worldPeople: opened.personOrder.length,
          reachable: reachable.size,
          newTraits: newTraits.length,
          distantTraits: distantTraits.length,
        }),
      );
      expect(opened.currentDate).toBe(targetStartDate);
      expect(maxGap).toBeLessThanOrEqual(3);
      expect(familyContacts.length).toBeGreaterThanOrEqual(1);
      expect(
        familyContacts.some(
          (entry) =>
            entry.lastContactOn && entry.lastContactOn < opened.currentDate,
        ),
      ).toBe(true);
      if (age >= 18) expect(balance).toBeGreaterThan(0);
      expect(distantTraits).toHaveLength(0);
      expect(familyInteractions.length).toBeGreaterThan(0);
      expect(fictionalHistoryEvents.length).toBeGreaterThan(0);
      expect(
        rebuilt.history.events
          .filter((event) =>
            fictionalHistoryEvents.some(
              (earlier) => earlier.stableKey === event.stableKey,
            ),
          )
          .map((event) => [event.stableKey, event.occurredAt]),
      ).toEqual(
        fictionalHistoryEvents.map((event) => [
          event.stableKey,
          event.occurredAt,
        ]),
      );
      expect(
        fictionalHistoryEvents.filter(
          (event) => event.occurredAt.slice(5, 7) !== birthday.slice(5, 7),
        ).length,
      ).toBeGreaterThanOrEqual(Math.ceil(fictionalHistoryEvents.length / 2));
      expect(
        fictionalHistoryEvents.every((event) => {
          const eventAge = ageForEvent(event.stableKey);
          return (
            eventAge !== null &&
            event.occurredAt >= dateAtAge(birthday, eventAge) &&
            event.occurredAt < dateAtAge(birthday, eventAge + 1) &&
            event.occurredAt < opened.currentDate
          );
        }),
      ).toBe(true);
      expect(
        reloadOpened.history.events
          .filter((event) =>
            fictionalHistoryEvents.some((earlier) => earlier.id === event.id),
          )
          .map((event) => [event.id, event.occurredAt]),
      ).toEqual(
        fictionalHistoryEvents.map((event) => [event.id, event.occurredAt]),
      );
      expect(
        familyInteractions.every(
          (row) =>
            row.eventId &&
            opened.history.events.some(
              (event) =>
                event.id === row.eventId &&
                event.occurredAt === row.occurredAt &&
                row.personIds.every((id) =>
                  event.participants.some(
                    (participant) => participant.personId === id,
                  ),
                ),
            ),
        ),
      ).toBe(true);
      expect(repeatOpened.history.relationshipInteractions).toHaveLength(
        opened.history.relationshipInteractions.length,
      );
      expect(reloadOpened.history.relationshipInteractions).toHaveLength(
        opened.history.relationshipInteractions.length,
      );
      if (age === 70) {
        expect(totalFamily).toBeGreaterThanOrEqual(3);
        expect(
          familyInteractions.some((row) =>
            row.personIds.some((id) => deceasedFamily.has(id)),
          ),
        ).toBe(true);
      }
    });
  }

  it("keeps birthday dates for a pre-start replay without the new date version", () => {
    const place = requireLifePlace("3260600");
    const targetStartDate = place.context.initialMoment.date;
    const input = {
      seed: "pre-start-five-places:3260600:22",
      place,
      age: 22,
      givenName: "Morgan",
      familyName: "Reed",
      startingLife: "ordinary-life" as const,
      depth: "summarize-earlier-life" as const,
      household: "lives-alone" as const,
      preStartYear: {
        version: "pre-start-world-year-v1" as const,
        targetStartDate,
        priorYearStartDate: addDays(targetStartDate, -365),
      },
    };
    const { world, playerPersonId } = finalizePreStartPlayer(
      advanceWorld(buildPreStartBackgroundWorld(input), 365),
      input,
    );
    const birthday = world.people[playerPersonId]!.birthDate;
    const adultYears = world.history.events.filter((event) =>
      event.stableKey.startsWith(
        `pre-start-adult-history-v1:${playerPersonId}:year:`,
      ),
    );
    expect(adultYears.length).toBeGreaterThan(0);
    expect(
      adultYears.every(
        (event) =>
          event.occurredAt ===
          dateAtAge(birthday, Number(event.stableKey.split(":").at(-1))),
      ),
    ).toBe(true);
  });
});
