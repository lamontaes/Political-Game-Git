import { describe, expect, it } from "vitest";

import { createNewGameWorld } from "./new-game";
import {
  projectPersonDossier,
  labelForRef,
  shellRefIsResolvable,
} from "./person-dossier";
import { projectPersonalRecord } from "./personal-record";
import { projectPlayerCalendar } from "./player-calendar";
import { filterDirectory, projectPeopleDirectory } from "./people-directory";
import { openConversationWith } from "./person-conversation-entry";
import { CANONICAL_VERSION, PATCH_NOTE_SECTIONS } from "./release-identity";
import type { EntityId } from "../simulation";

/**
 * The production projections, against a world the game actually generates.
 *
 * Every one of these takes a real `createNewGameWorld` result rather than a
 * fixture, because the whole point of this phase is that the shell reads the
 * canonical world and not a prototype universe. A thin life produces thin
 * output, and that is the assertion in several of these: absent is a correct
 * answer, and inventing something to fill a section is the failure.
 */
function newLife(seed: string, startAge = 34) {
  const game = createNewGameWorld({
    placeKey: "kentucky",
    startAge,
    depth: "summarize-earlier-life",
    startingLife: "ordinary-life",
    household: "shares-a-home",
    seed,
    givenName: null,
    familyName: null,
  });
  return { world: game.world, personId: game.playerPersonId };
}

/**
 * Somebody other than the player, whoever this generated life actually has.
 *
 * A normal start may come out living alone, which is a real outcome rather than
 * a broken world, so these tests take the first person the directory holds
 * instead of assuming a housemate.
 */
function anybodyElse(
  world: ReturnType<typeof newLife>["world"],
  personId: EntityId,
) {
  return projectPeopleDirectory(world, personId).people[0] ?? null;
}

describe("the person dossier", () => {
  it("describes the player's own household from the records", () => {
    const { world, personId } = newLife("dossier");
    const record = projectPersonalRecord(world, personId);
    const housemate = record?.household[0];
    expect(housemate).toBeDefined();

    const dossier = projectPersonDossier(world, personId, housemate!.personId);
    expect(dossier).not.toBeNull();
    expect(dossier!.name).toBe(housemate!.name);
    expect(dossier!.age).toBeGreaterThan(0);
    /* Living beside somebody is knowledge, and knowledge carries no badge. */
    expect(dossier!.details.some((fact) => fact.attribution === "known")).toBe(
      true,
    );
  });

  it("is null for somebody this world never had", () => {
    const { world, personId } = newLife("dossier-missing");
    expect(
      projectPersonDossier(world, personId, "person-nobody" as EntityId),
    ).toBeNull();
  });

  it("says what is not known instead of quietly leaving it out", () => {
    const { world, personId } = newLife("dossier-unknown");
    const other = anybodyElse(world, personId);
    expect(other).not.toBeNull();
    const dossier = projectPersonDossier(world, personId, other!.personId);
    /* Either the record establishes an occupation or the dossier says it does
       not. What it may never do is neither. */
    const claimsWork = dossier!.details.some((fact) => /at /.test(fact.text));
    expect(claimsWork || dossier!.notKnown.length > 0).toBe(true);
  });

  it("only offers links this world can resolve", () => {
    const { world, personId } = newLife("dossier-links");
    const other = anybodyElse(world, personId);
    const dossier = projectPersonDossier(world, personId, other!.personId);
    for (const link of dossier!.links) {
      expect(shellRefIsResolvable(world, link)).toBe(true);
      expect(labelForRef(world, link)).not.toBeNull();
    }
  });
});

describe("personal and finances", () => {
  it("states the name and the age plainly", () => {
    const { world, personId } = newLife("personal", 41);
    const record = projectPersonalRecord(world, personId);
    expect(record).not.toBeNull();
    expect(record!.identity.name.length).toBeGreaterThan(0);
    expect(record!.identity.age).toBe(41);
  });

  it("keeps the kinds of money apart, and says so when there is none", () => {
    const { world, personId } = newLife("money");
    const record = projectPersonalRecord(world, personId);
    const kinds = record!.purses.map((purse) => purse.kind);
    /* Personal money is always its own line. A household appears when the
       record puts this life in one; a campaign only when there is a campaign. */
    expect(kinds).toContain("personal");
    expect(new Set(kinds).size).toBe(kinds.length);
    for (const purse of record!.purses) {
      /* Exactly one of a balance and a stated absence. Never a confident zero
         standing in for "no record". */
      expect(purse.balance === null).toBe(purse.absence !== null);
    }
  });
});

describe("the calendar", () => {
  it("reads the canonical clock and never moves it", () => {
    const { world, personId } = newLife("calendar");
    const before = world.currentMoment;
    const calendar = projectPlayerCalendar(world, personId);
    expect(calendar.today).toEqual(before);
    expect(world.currentMoment).toEqual(before);
  });

  it("says plainly when a life has nothing scheduled", () => {
    const { world, personId } = newLife("calendar-empty");
    const calendar = projectPlayerCalendar(world, personId);
    if (calendar.empty) {
      expect(calendar.note).toBeTruthy();
      expect(calendar.days).toHaveLength(0);
    }
  });

  it("marks whose an entry is rather than calling everything an appointment", () => {
    const { world, personId } = newLife("calendar-groups");
    for (const day of projectPlayerCalendar(world, personId).days) {
      for (const entry of day.entries) {
        expect(["yours", "chamber"]).toContain(entry.group);
        expect(entry.ownershipNote.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("the people directory", () => {
  it("puts the household in Family, derived and not asserted", () => {
    const { world, personId } = newLife("people");
    const directory = projectPeopleDirectory(world, personId);
    const record = projectPersonalRecord(world, personId);
    const housemate = record?.household[0];
    if (!housemate) return;
    const row = directory.people.find(
      (person) => person.personId === housemate.personId,
    );
    expect(row?.categories).toContain("family");
  });

  it("never puts the player in their own directory", () => {
    const { world, personId } = newLife("people-self");
    const directory = projectPeopleDirectory(world, personId);
    expect(
      directory.people.some((person) => person.personId === personId),
    ).toBe(false);
  });

  it("filters by category and by what the player typed", () => {
    const { world, personId } = newLife("people-filter");
    const directory = projectPeopleDirectory(world, personId);
    expect(filterDirectory(directory, "all", "").length).toBe(
      directory.people.length,
    );
    expect(filterDirectory(directory, "all", "zzzzzzzz-nobody").length).toBe(0);
    for (const person of filterDirectory(directory, "family", "")) {
      expect(person.categories).toContain("family");
    }
  });
});

describe("talking to somebody", () => {
  it("opens against the chosen person, or says why it cannot", () => {
    const { world, personId } = newLife("talk");
    const other = anybodyElse(world, personId);
    if (!other) return;
    const entry = openConversationWith(world, personId, other.personId);
    if (entry.kind === "available") {
      expect(entry.addressee).toBe(other.personId);
    } else {
      expect(entry.reason.length).toBeGreaterThan(0);
    }
  });

  it("refuses to open a conversation with yourself", () => {
    const { world, personId } = newLife("talk-self");
    const entry = openConversationWith(world, personId, personId);
    expect(entry.kind).toBe("unavailable");
  });

  it("says why rather than substituting a different person", () => {
    const { world, personId } = newLife("talk-missing");
    const entry = openConversationWith(
      world,
      personId,
      "person-nobody" as EntityId,
    );
    expect(entry.kind).toBe("unavailable");
  });
});

describe("release identity", () => {
  it("is read from the checkout rather than restated", async () => {
    const packageJson = await import("../../package.json");
    expect(CANONICAL_VERSION).toBe(packageJson.default.version);
  });

  it("repeats the notes file's own released/unreleased distinction", () => {
    expect(PATCH_NOTE_SECTIONS.length).toBeGreaterThan(0);
    for (const section of PATCH_NOTE_SECTIONS) {
      expect(section.released).toBe(!/UNRELEASED/i.test(section.heading));
    }
  });
});
