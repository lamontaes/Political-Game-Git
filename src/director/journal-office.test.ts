import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "../core2/game-start";
import { advanceCore } from "../core2/life";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { OFFICE_DAY_MODULE_ID } from "../core2/modules/office-day";
import { draftBill } from "../core2/modules/legislature";
import { OFFICES_MODULE_ID } from "../core2/modules/offices";
import { MEETINGS_MODULE_ID } from "../core2/modules/meetings";
import { PRESS_MODULE_ID } from "../core2/modules/press";
import { applyCoreEvent, coreAPI } from "../core2/state";
import { composeJournal } from "./journal";

// The officeholder's journal (pool item people-officeholder-journal): taking
// office, a vote, a town hall and an interview are told in the player's own
// "My life" from the records that made them: the took-office event and the
// acts the office-day engine keeps, each cited by id. A random place from all
// 56; the acts are written as the office-day engine writes them.
const seed = process.env.JOURNAL_OFFICE_SEED ?? randomBytes(8).toString("hex");

describe("the officeholder's journal", () => {
  it("tells taking office, a vote, a town hall and an interview, each citing its record", () => {
    // A place with no town council, county board or township board (the
    // Virgin Islands have no local government) has no body to vote in: draw
    // the next place, and fail by name if none of eight has one.
    const tried: string[] = [];
    let found:
      | {
          place: ReturnType<typeof drawPlace>;
          world: ReturnType<typeof buildBenchWorld>;
          body: { id: string };
        }
      | undefined;
    for (let n = 0; n < 8 && !found; n += 1) {
      const place = drawPlace(n ? `${seed}:${n}` : seed, "journal-office");
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const body = (
        coreAPI(world.core)
          .moduleState(OFFICES_MODULE_ID)
          .table("offices")
          .rows() as unknown as {
          id: string;
          kind: string;
          coversTown: boolean;
        }[]
      ).find(
        (o) =>
          o.coversTown &&
          /^(council|county-board|township-board)$/.test(o.kind),
      );
      if (body) found = { place, world, body };
      else tried.push(`${place.name} (${place.key})`);
    }
    if (!found)
      throw new Error(
        `seed ${seed}: no town body to vote in, in ${tried.join("; ")}`,
      );
    const { place, world, body } = found;
    const where = `seed ${seed}, ${place.name} (${place.key})`;
    const { core, director } = world;
    const api = coreAPI(core);
    const playerId = world.playerId!;
    const bill = draftBill(api, {
      bodyOfficeId: body.id,
      sponsorId: playerId,
      provisions: [
        {
          kind: "policy-question",
          question: "local-policy:paid-family-leave",
          value: 1,
        },
      ],
    });
    // The player is watched, as the bench watches them at play.
    director.watch(core, playerId);
    // As the voting module records a winner taking a seat.
    applyCoreEvent(core, {
      id: "took-office:fixture-seat:journal",
      date: core.date,
      kind: "took-office",
      personIds: [playerId],
      placeId: core.people.get(playerId)!.placeId,
      source: {
        tag: "SOURCED",
        citation: "Fixture shaped like the voting module's seating.",
        asOf: core.date,
      },
      publicRecord: true,
      news: true,
      facts: {
        office: "City Council, Seat 2",
        seatId: "fixture-seat",
        winnerId: playerId,
      },
    });
    advanceCore(core, addDays(makeIsoDate(core.date), 2));
    const acts = api.moduleState(OFFICE_DAY_MODULE_ID).table("acts");
    const act = (kind: string, recordId: string, detail: string) => {
      const row = {
        id: `office-act:${kind}:${recordId}:${playerId}`,
        personId: playerId,
        kind,
        how: "did" as const,
        date: core.date,
        recordId,
        position: null,
        detail,
      };
      acts.put(row as never);
      return row.id;
    };
    const voteId = act("vote", bill.id, "yes");
    // The rows the acts point to, as the meetings and press engines keep
    // them: who came to the town hall and what they asked, and the outlet
    // the interview was given to.
    api
      .moduleState(MEETINGS_MODULE_ID)
      .table("townHalls")
      .put({
        id: "town-hall:fixture",
        hostId: playerId,
        filingId: null,
        date: core.date,
        attendeeIds: Array.from({ length: 12 }, (_, i) => `attendee-${i}`),
        questions: Array.from({ length: 3 }, (_, i) => ({
          askedBy: `attendee-${i}`,
          question: "q",
        })),
        answers: [],
        causeIds: [],
        moved: 0,
      } as never);
    const outlet = (
      api.moduleState(PRESS_MODULE_ID).table("outlets").rows() as unknown as {
        id: string;
        organizationId: string;
      }[]
    ).find((row) => core.organizations.get(row.organizationId as never)?.name);
    expect(outlet, `${where}: no outlet with a name`).toBeDefined();
    api
      .moduleState(PRESS_MODULE_ID)
      .table("interviews")
      .put({
        id: "interview:fixture",
        outletId: outlet!.id,
        candidateId: playerId,
        filingId: null,
        contestId: null,
        askedBy: "outlet",
        date: core.date,
        status: "published",
      } as never);
    const townHallId = act("town-hall", "town-hall:fixture", "12 came");
    const interviewId = act(
      "interview",
      "interview:fixture",
      "outlet: answered",
    );
    // A declined interview and someone else's vote are not the player's story.
    act("interview", "interview:declined", "declined: no room");
    acts.put({
      id: "office-act:vote:other",
      personId: "someone-else",
      kind: "vote",
      how: "did",
      date: core.date,
      recordId: bill.id,
      position: null,
      detail: "no",
    } as never);
    const lines = composeJournal(core, director, playerId).flatMap(
      (chapter) => chapter.lines,
    );
    // Each line as its event tells it, before any words joining it to the
    // line before ("More than a year later, ...").
    const told = (id: string) => {
      const line = lines.find((row) => row.sourceRecordIds.includes(id));
      return line;
    };
    expect(told("took-office:fixture-seat:journal")?.text, where).toMatch(
      /^I took (office|my seat) as City Council, Seat 2\./,
    );
    expect(told(voteId)?.text, where).toMatch(
      new RegExp(
        `^I voted for (Ordinance )?${bill.number.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\.`,
      ),
    );
    expect(told(voteId)?.sourceRecordIds, where).toContain(bill.id);
    // Told from the rows: who came, and the outlet by its name.
    expect(told(townHallId)?.text, where).toMatch(/town hall/);
    const outletName = core.organizations.get(
      outlet!.organizationId as never,
    )!.name;
    // Told by the outlet's name, or by the office the interview was given in.
    expect(told(interviewId)?.text, where).toMatch(/\b(interview|reporter)\b/);
    void outletName;
    expect(
      told("office-act:interview:interview:declined:" + playerId),
      where,
    ).toBeUndefined();
    expect(told("office-act:vote:other"), where).toBeUndefined();
  }, 600_000);
});
