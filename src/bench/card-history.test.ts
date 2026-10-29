import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { buildBenchWorld } from "./world";
import { preStartHistory } from "../core2/past";
import { coreAPI } from "../core2/state";
import { countedHouseholdsByPlace } from "../core2/modules/residents";
import { personOrFillIn } from "../core2/state";
import { knownCard } from "./card";
import { schoolsOf } from "./words";

describe("a person's history on their card", () => {
  it("tells a parent's life from their records, with your own birth as yours", () => {
    const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
    const place = drawPlace(seed, "card-history");
    const where = `${place.name}, seed ${seed}`;
    setBookkeeping(false);
    const core = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    }).core;
    // A child whose parent's record names them as a child.
    const pair = [...core.people.values()]
      .flatMap((child) =>
        (child.pastFacts ?? [])
          .filter((fact) => fact.kind === "family:parent")
          .map((fact) => ({ child, parentId: fact.facts?.otherPersonId })),
      )
      .find(
        ({ child, parentId }) =>
          parentId &&
          (core.people.get(parentId)?.pastFacts ?? []).some(
            (fact) =>
              fact.kind === "family:child" &&
              fact.facts?.otherPersonId === child.id,
          ),
      );
    expect(pair, `${where}: a parent and child`).toBeDefined();
    const { child, parentId } = pair!;
    const card = knownCard(core, child.id, parentId!);
    const records = new Set([
      ...(core.people.get(parentId!)?.pastFacts ?? []).map((fact) => fact.id),
      ...preStartHistory(core, { personId: parentId! as PersonId }).map(
        (row) => row.id,
      ),
      ...schoolsOf(core, parentId!).map((row) => row.recordId),
      ...core.relationships.keys(),
      parentId!,
    ]);
    expect(card.history.length, where).toBeGreaterThan(0);
    // Oldest first, each line on a record of theirs or of the tie.
    const dates = card.history.map((line) => line.date);
    expect(dates, where).toEqual([...dates].sort());
    for (const line of card.history)
      expect(records.has(line.recordId), `${where}: ${line.recordId}`).toBe(
        true,
      );
    // Your own birth is said to you, not by your name.
    const yours = card.history.filter((line) =>
      line.text.startsWith("You were born"),
    );
    expect(yours, where).toHaveLength(1);
    expect(
      card.history.some((line) =>
        line.text.startsWith(`${child.givenName} ${child.familyName} was born`),
      ),
      where,
    ).toBe(false);
  }, 600_000);

  it("tells a life for anyone opened, tied to the player or not", () => {
    const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
    const place = drawPlace(seed, "card-history-all");
    const where = `${place.name}, seed ${seed}`;
    setBookkeeping(false);
    const core = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    }).core;
    const viewer = [...core.people.values()].find(
      (person) => person.familyIds.size > 0,
    )!;
    const tied = new Set<string>(viewer.familyIds);
    for (const id of core.relationshipsByPerson.get(viewer.id) ?? []) {
      const row = core.relationships.get(id);
      if (row) tied.add(row.actorId === viewer.id ? row.otherId : row.actorId);
    }
    const strangers = [...core.people.values()].filter(
      (person) => person.id !== viewer.id && !tied.has(person.id),
    );
    // An official (a seat reached before the start), a neighbor and a coworker, each
    // chosen among those whose records support the lines the card is held to: the
    // records give a person only what the engines wrote for them.
    const linesOf = (person: (typeof strangers)[number]) =>
      knownCard(core, viewer.id, person.id).history.length;
    const seatHolder = strangers.find(
      (person) =>
        preStartHistory(core, {
          kind: "office.seat-reached",
          personId: person.id,
        }).length && linesOf(person) >= 3,
    );
    const worker = strangers.find(
      (person) =>
        person !== seatHolder &&
        preStartHistory(core, {
          kind: "person.work-spell",
          personId: person.id,
        }).length &&
        linesOf(person) >= 4,
    );
    const neighbor = strangers.find(
      (person) =>
        person !== seatHolder &&
        person !== worker &&
        person.placeId === viewer.placeId &&
        person.alive &&
        linesOf(person) >= 4,
    );
    const chosen = { seatHolder, worker, neighbor };
    for (const [role, person] of Object.entries(chosen)) {
      expect(person, `${where}: a ${role}`).toBeDefined();
      const card = knownCard(core, viewer.id, person!.id);
      process.stdout.write(
        `${where} ${role} ${person!.id}: ${card.history.length} lines: ${card.history.map((l) => l.text).join(" | ")}\n`,
      );
      const records = new Set<string>([
        ...(person!.pastFacts ?? []).map((fact) => fact.id),
        ...preStartHistory(core, { personId: person!.id }).map((row) => row.id),
        ...core.relationships.keys(),
        // The person's own record, which an official's birth and service stand on.
        person!.id,
        ...schoolsOf(core, person!.id).map((row) => row.recordId),
        // An official's lines also stand on their term records.
        ...(
          coreAPI(core)
            .moduleState("core2-offices-v1")
            .table("terms")
            .rows() as unknown as { id: string }[]
        ).map((row) => row.id),
      ]);
      for (const line of card.history)
        expect(records.has(line.recordId), `${where}: ${line.recordId}`).toBe(
          true,
        );
      // An official's records hold their birth and each term they won (three or
      // more); a resident's hold school, work and family (four or more).
      expect(card.history.length, `${where}: ${role}`).toBeGreaterThanOrEqual(
        role === "seatHolder" ? 3 : 4,
      );
    }
  }, 600_000);

  it("tells an official's earlier terms of the same seat, each on its term record", () => {
    const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
    const place = drawPlace(seed, "card-history-terms");
    const where = `${place.name}, seed ${seed}`;
    setBookkeeping(false);
    const core = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    }).core;
    const viewer = [...core.people.values()][0]!;
    const terms = coreAPI(core)
      .moduleState("core2-offices-v1")
      .table("terms")
      .rows() as unknown as {
      id: string;
      seatId: string;
      status: string;
      identity?: { givenName: string; familyName: string; birthDate?: string };
    }[];
    const official = terms.find(
      (term) =>
        term.status !== "ended" &&
        term.identity &&
        terms.some(
          (earlier) =>
            earlier.status === "ended" &&
            earlier.seatId === term.seatId &&
            earlier.identity?.familyName === term.identity!.familyName &&
            earlier.identity?.givenName === term.identity!.givenName,
        ),
    );
    expect(
      official,
      `${where}: an official with an earlier term`,
    ).toBeDefined();
    const card = knownCard(core, viewer.id, `official:${official!.id}`);
    process.stdout.write(
      `${where} official ${official!.id}: ${card.history.map((l) => l.text).join(" | ")}\n`,
    );
    const earlier = terms.filter(
      (term) =>
        term.status === "ended" &&
        term.seatId === official!.seatId &&
        term.identity?.familyName === official!.identity!.familyName,
    );
    for (const term of earlier)
      expect(
        card.history.some((line) => line.recordId === term.id),
        `${where}: ${term.id} is on the card`,
      ).toBe(true);
    // Their birth and each earlier term, at least.
    expect(card.history.length, where).toBeGreaterThanOrEqual(
      earlier.length + 1,
    );
  }, 600_000);

  it("tells a couple among people filled in from the counts, on a record both share", () => {
    const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
    setBookkeeping(false);
    const tried: string[] = [];
    let found = 0;
    // A small place may have no counted household with a child at home: draw up to
    // three places, each named with its seed.
    for (let draw = 0; draw < 3 && !found; draw += 1) {
      const place = drawPlace(seed, `card-history-couples-${draw}`);
      const where = `${place.name}, seed ${place.seed}`;
      tried.push(where);
      const core = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      }).core;
      for (const home of [...countedHouseholdsByPlace(core).values()].flat()) {
        for (const member of (home as unknown as { people: { id: PersonId }[] })
          .people)
          personOrFillIn(core, member.id);
        if (preStartHistory(core, { kind: "family.partnered" }).length >= 3)
          break;
      }
      const couples = preStartHistory(core, { kind: "family.partnered" });
      for (const couple of couples) {
        const [a, b] = couple.personIds!.map((id) => core.people.get(id)!);
        // Two grown people who share a home.
        expect(a!.householdId, where).toBe(b!.householdId);
        const card = knownCard(core, a!.id, b!.id);
        expect(
          card.history.some(
            (line) =>
              line.recordId === couple.id && /Set up home/.test(line.text),
          ),
          `${where}: ${couple.id} on ${b!.id}'s card`,
        ).toBe(true);
      }
      found += couples.length;
      process.stdout.write(`${where}: ${couples.length} couples told\n`);
    }
    expect(found, `a couple told in ${tried.join("; ")}`).toBeGreaterThan(0);
  }, 900_000);
});
