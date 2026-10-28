import { describe, expect, it } from "vitest";
import { enrichCivicInputs } from "../core2/civic-inputs";
import { createLifeCore } from "../core2/life";
import { buildPopulation } from "../core2/population";
import { applyCoreEvent, coreAPI } from "../core2/state";
import {
  BRING_IT_UP_ROWS,
  leansToBlame,
  believedCause,
  bringItUp,
  changesKnownTo,
} from "./bring-it-up";

// M4-05: people bring up a change and who they believe caused it; each belief
// follows what that person heard, and some are wrong.
const seed = process.env.GOLDEN_PATH_SEED ?? "bring-it-up";
const input = enrichCivicInputs(
  buildPopulation({
    seed,
    ...(process.env.GOLDEN_PATH_SEED
      ? { placeKey: process.env.GOLDEN_PATH_PLACE_KEY }
      : {}),
    startedAt: "2021-01-01",
    minimumPeople: 400,
  }),
);
const core = createLifeCore(input);
const api = coreAPI(core);
const residents = [...core.people.values()].filter(
  (row) => row.tier !== "husk" && row.alive,
);
const worker = residents.find((row) => row.jobId && row.knownIds.size > 2)!;
const org = core.jobs.get(worker.jobId!)!.organizationId;
const closureId = `organization.closed:${org}:${core.date}`;
applyCoreEvent(core, {
  id: closureId,
  date: core.date,
  kind: "organization.closed",
  personIds: [worker.id],
  placeId: worker.placeId,
  publicRecord: true,
  source: {
    tag: "SOURCED",
    citation: "Fixture closure as the finance writer records it.",
    asOf: core.date,
  },
  facts: { [`organization:${org}:status`]: "closed" },
});

describe(`people bring it up in ${input.placeMetadata?.placeName} (seed ${seed})`, () => {
  it("the worker who saw the record blames the business, and a friend told by them repeats it", () => {
    const [change] = changesKnownTo(core, worker.id);
    expect(change).toMatchObject({
      eventId: closureId,
      institutionId: org,
      route: "seen",
    });
    expect(believedCause(core, worker.id, change!)).toMatchObject({
      how: "record",
      blamedId: org,
    });
    const friendId = [...worker.knownIds].find(
      (id) =>
        core.people.get(id)?.jobId === undefined ||
        core.jobs.get(core.people.get(id)!.jobId!)!.organizationId !== org,
    )!;
    const said = bringItUp(core, worker.id, friendId)!;
    expect(said.lines.map((row) => row.text)[0]).toMatch(
      / (?:closed|is closed|shut down|is gone)\.$/,
    );
    // The blame is a mined sentence, and it cites the record it follows.
    expect(said.lines).toHaveLength(2);
    expect(said.lines[1]!.sourceRecordIds).toContain(said.change.eventId);
    const [heard] = changesKnownTo(core, friendId);
    expect(believedCause(core, friendId, heard!)).toMatchObject({
      how: "told",
      blamedId: org,
      sourceId: said.toldEventId,
    });
  });

  it("someone who heard only that it happened blames an official they know of, and passes on the wrong blame", () => {
    const office = [...core.publicOrganizations.values()].find(
      (row) => row.staff?.length,
    )!;
    expect(office).toBeDefined();
    const official = office.staff![0]!.personId;
    const blamer = residents.find(
      (row) =>
        leansToBlame(core, row) &&
        row.id !== worker.id &&
        row.id !== official &&
        row.knownIds.size > 0 &&
        !changesKnownTo(core, row.id).length,
    )!;
    api.lookupPublicOrganization(blamer.id, office.id);
    // Told only that the business closed, with no one to blame.
    applyCoreEvent(core, {
      id: "fixture-heard-only",
      date: core.date,
      kind: BRING_IT_UP_ROWS.toldEvent,
      personIds: [blamer.id],
      placeId: blamer.placeId,
      facts: { [`${BRING_IT_UP_ROWS.heardKey}:${closureId}`]: org },
      source: {
        tag: "SOURCED",
        citation: "Fixture: heard it closed.",
        asOf: core.date,
      },
    });
    const [change] = changesKnownTo(core, blamer.id);
    const belief = believedCause(core, blamer.id, change!);
    expect(belief).toMatchObject({ how: "assumed", blamedId: official });
    expect(belief.blamedId).not.toBe(org);
    const listenerId = [...blamer.knownIds].find(
      (id) => id !== official && !changesKnownTo(core, id).length,
    )!;
    bringItUp(core, blamer.id, listenerId);
    const [passed] = changesKnownTo(core, listenerId);
    expect(believedCause(core, listenerId, passed!)).toMatchObject({
      how: "told",
      blamedId: official,
    });
  });

  it("a person who heard nothing brings nothing up", () => {
    const quiet = residents.find(
      (row) => !changesKnownTo(core, row.id).length,
    )!;
    expect(bringItUp(core, quiet.id, worker.id)).toBeNull();
  });
});
