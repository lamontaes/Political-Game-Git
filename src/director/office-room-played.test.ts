/**
 * An official's meeting is never "at" their government's treasury. The
 * treasury is the payroll body on an official's job record (a government's
 * account, kind "government-treasury"), not a room; the setting an official's
 * scene resolves to is the cause record's office or chamber, the government's
 * seat, or the place the record puts the two of them (director/scheduling.ts
 * resolveSetting). At a pinned place and seed, a legislator, the governor, a
 * mayor and a county official: every setting every scene type lists resolves
 * to somewhere people meet, never a payroll body, and a legislator whose job
 * is their state's treasury meets at the government's seat. The played
 * arrival lines are scripts/words/office-arrival-replay.ts.
 */
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "../core2/game-start";
import { OFFICES_MODULE_ID } from "../core2/modules/offices";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { isPayrollOrganization } from "../english/journal-words";
import { resolveSetting, SITUATION_LIBRARY } from "./scheduling";
import type { Moment } from "./types";

const CLASSES: readonly [string, RegExp][] = [
  ["governor", /governor/],
  ["mayor", /mayor/],
  ["county official", /county/],
  ["legislator", /senate|house|upper|lower|legislat/],
];

describe("an official's scene is set where the record puts it", () => {
  it("never sets a legislator's, governor's, mayor's or county official's scene at a payroll body, Sheridan WY, seed 7", () => {
    const { core } = buildBenchWorld("7", gameStartDate(), {
      twoLevel: true,
      placeKey: "5669845",
    });
    const state = coreAPI(core).moduleState(OFFICES_MODULE_ID);
    const offices = state.table("offices").rows() as unknown as {
      id: string;
      kind: string;
    }[];
    const serving = (
      state.table("terms").rows() as unknown as {
        personId: string | null;
        officeId: string;
        status: string;
      }[]
    )
      .filter(
        (row) =>
          row.status === "serving" &&
          row.personId &&
          core.people.get(row.personId as PersonId)?.alive,
      )
      .map((row) => ({
        personId: row.personId as PersonId,
        kind: offices.find((o) => o.id === row.officeId)?.kind ?? "",
      }))
      .sort((a, b) => a.personId.localeCompare(b.personId));
    let checked = 0;
    let legislatorSeat = 0;
    for (const [label, pattern] of CLASSES) {
      const found = serving.find(
        (row) =>
          pattern.test(row.kind) &&
          !(label === "legislator" && /governor|mayor|county/.test(row.kind)),
      );
      expect(found, `${label}: an official serving at this place`).toBeTruthy();
      const job = core.people.get(found!.personId)!.jobId;
      const moment = {
        personId: found!.personId,
        causeId: job ?? "",
        counterpartIds: [],
      } as unknown as Moment;
      for (const type of SITUATION_LIBRARY.types)
        for (const settings of [
          type.setting,
          ...type.causes.map((cause) => cause.setting ?? type.setting),
        ])
          for (const kind of settings) {
            const room = resolveSetting(kind, core, moment, 2);
            const organization = room && core.organizations.get(room.recordId);
            expect(
              organization && isPayrollOrganization(organization),
              `${label} ${type.key} ${kind}`,
            ).toBeFalsy();
            checked += 1;
            if (label === "legislator" && kind === "office" && room?.seat)
              legislatorSeat += 1;
          }
    }
    expect(checked).toBeGreaterThan(0);
    expect(legislatorSeat, "a legislator's office is the seat").toBeGreaterThan(
      0,
    );
  }, 120_000);
});
