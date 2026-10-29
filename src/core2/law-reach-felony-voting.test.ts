/**
 * A named person with a felony conviction on the justice record is barred
 * from voting by the state's law in force: for good where the law does not
 * restore the vote after the sentence, and only until the sentence is served
 * where it does. A drawn place and seed. The conviction and its sentence are
 * written into the justice tables as the justice engine writes them (the
 * engine convicts only after a bribery investigation, which a year may not
 * produce), so this proves the rule on the real records and the real law.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { addDays, makeIsoDate } from "./kernel/dates";
import { gameStartDate } from "./game-start";
import { barredFromVoting, RESTORE_VOTE } from "./law-reach/group-a-voting";
import { enactLaw, lawChain } from "./modules/laws";
import {
  JUSTICE_MODULE_ID,
  convictionsOf,
  type CaseRow,
  type SentenceRow,
} from "./modules/justice";
import { ageOnDate } from "./kernel/dates";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(seed, "felony-voting");
const world = buildBenchWorld(place.seed, gameStartDate(), {
  placeKey: place.key,
  twoLevel: true,
});
const api = coreAPI(world.core);
const where = `${place.name} (${place.key}), seed ${seed}`;
const townAdults = () =>
  [...world.core.people.values()].filter(
    (p) =>
      p.alive &&
      p.tier !== "husk" &&
      p.placeId === lawChain(api).townPlaceId &&
      ageOnDate(makeIsoDate(p.birthDate), makeIsoDate(api.state.date)) >= 18,
  );
const table = (name: string) => api.moduleState(JUSTICE_MODULE_ID).table(name);

function convict(personId: string, custodyMonths: number) {
  const date = api.state.date;
  const sentence: SentenceRow = {
    id: `sentence:test:${personId}`,
    kind: "person",
    caseId: `case:test:${personId}`,
    personId,
    date,
    severity: 0.5,
    fineMinor: 0,
    finePaidMinor: 0,
    treasuryId: null,
    probationMonths: custodyMonths ? 0 : 12,
    custodyMonths,
    releaseDate: custodyMonths
      ? addDays(makeIsoDate(date), custodyMonths * 30)
      : null,
    seatsVacated: [],
    jobsEnded: [],
    reasons: {},
    source: { tag: "SOURCED", citation: "test", asOf: date },
  };
  const row: CaseRow = {
    id: sentence.caseId,
    kind: "person",
    investigationId: "investigation:test",
    prosecutorOfficeId: "office:test",
    defendantId: personId,
    crimeIds: ["crime:test"],
    evidence: 1,
    date,
    status: "convicted",
    plea: false,
    trialDate: null,
    reasons: {},
    sentenceId: sentence.id,
  };
  table("sentences").put(sentence as never);
  table("cases").put(row as never);
}

describe(`felony convictions and the vote in ${where}`, () => {
  const state = lawChain(api).stateKey;
  const setRestore = (value: number, id: string) =>
    enactLaw(api, {
      jurisdiction: state,
      level: "state",
      series: RESTORE_VOTE,
      value,
      effectiveDate: api.state.date,
      measureId: id,
      citation: "Felony-voting regression fixture",
    });

  it("bars no one without a conviction", () => {
    const adults = townAdults().slice(0, 50);
    expect(adults.length, where).toBeGreaterThan(0);
    for (const p of adults)
      expect(barredFromVoting(api, p.id), where).toBe(false);
  });

  it("bars a convicted person for good where the law does not restore the vote, and until release where it does", () => {
    const [a, b, c] = townAdults().filter(
      (p) => !convictionsOf(api, p.id).length,
    );
    expect(c, where).toBeTruthy();
    convict(a!.id, 24);
    convict(b!.id, 0);
    setRestore(0, "no-restore");
    expect(barredFromVoting(api, a!.id), `${where}: no restore, serving`).toBe(
      true,
    );
    expect(
      barredFromVoting(api, b!.id),
      `${where}: no restore, probation`,
    ).toBe(true);
    expect(barredFromVoting(api, c!.id), where).toBe(false);
    setRestore(1, "restore");
    // Serving a prison term or probation: still barred.
    expect(barredFromVoting(api, a!.id), `${where}: restore, serving`).toBe(
      true,
    );
    expect(
      barredFromVoting(api, b!.id),
      `${where}: restore, on probation`,
    ).toBe(true);
    // Sentences served: restored.
    (api.state as { date: string }).date = addDays(
      makeIsoDate(api.state.date),
      800,
    );
    setRestore(1, "restore-later");
    expect(barredFromVoting(api, a!.id), `${where}: restore, released`).toBe(
      false,
    );
    expect(
      barredFromVoting(api, b!.id),
      `${where}: restore, probation over`,
    ).toBe(false);
    expect(convictionsOf(api, a!.id).length).toBe(1);
  });
}, 900_000);
