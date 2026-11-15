/**
 * Travel lists where the player has political business
 * (play-travel-in-a-village-lists-no-town-office), in played worlds: the
 * town's (or county's) office is listed with the seat reason for a player who
 * holds a seat on its body, and for anyone else only on the day its body
 * meets, with the meeting reason; on other days it stays out, as an office
 * listed only for being an office does (owner, Oct 26).
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "./world";
import { gameStartDate } from "../core2/game-start";
import { coreAPI } from "../core2/state";
import { setBookkeeping } from "../core2/bookkeeping";
import { townSeats } from "../core2/modules/offices";
import { upcomingMeeting } from "../core2/modules/office-day";
import { advanceCore } from "../core2/life";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { townPlaces } from "./places";
import { drawPlace } from "../../scripts/core2-year/place";

const seed = process.env.TRAVEL_CIVIC_SEED || randomBytes(8).toString("hex");
const PLACES = 2;
const DRAWS = 8;
const LOCAL = new Set(["city", "town", "village", "township", "borough"]);

describe(`Travel and political business (seed ${seed})`, () => {
  it("lists the town office for a seat holder and on the day its body meets, with the reason", () => {
    setBookkeeping(false);
    const proved: string[] = [];
    for (let at = 0; at < DRAWS && proved.length < PLACES; at += 1) {
      const place = drawPlace(at ? `${seed}:${at}` : seed, "travel-civic");
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const { core } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const api = coreAPI(core);
      const council = townSeats(api).find(
        (r) =>
          LOCAL.has(r.office.level) &&
          r.office.seats > 1 &&
          r.holder?.personId &&
          core.people.has(r.holder.personId),
      );
      // The body's own government's office, by the name the office record gives it.
      const office = council
        ? [...core.organizations.values()].find(
            (o) =>
              o.name.toLowerCase() ===
              council.office.governmentName?.toLowerCase(),
          )
        : undefined;
      if (!council || !office) continue;
      const officeCard = (playerId: string) =>
        townPlaces(core, playerId).find((p) => p.organizationId === office.id);
      // A seat holder: listed, for their seat.
      const member = council.holder!.personId!;
      const theirs = officeCard(member);
      expect(theirs, `${where}: listed for ${member}`).toBeTruthy();
      expect(
        theirs!.reasons.some(
          (r) => r.kind === "seat" && r.recordId === council.seat.id,
        ),
        `${where}: with the seat reason`,
      ).toBe(true);
      // Anyone else: only in a week the body meets.
      const resident = core.playerId!;
      const meetingIn = () => {
        const next = upcomingMeeting(api, council.office.id);
        return next
          ? (Date.parse(next.date) - Date.parse(core.date)) / 86400000
          : Infinity;
      };
      const listed = () =>
        officeCard(resident)?.reasons.some((r) => r.kind === "meeting") ??
        false;
      // On a day the body does not meet, a resident does not see its office.
      if (meetingIn() > 0)
        expect(listed(), `${where}: not listed on a day with no meeting`).toBe(
          false,
        );
      let steps = 0;
      while (meetingIn() > 0 && steps < 60) {
        advanceCore(core, addDays(makeIsoDate(core.date), 1));
        steps += 1;
      }
      if (meetingIn() > 0) continue;
      const card = officeCard(resident);
      expect(card, `${where}: listed on the meeting day`).toBeTruthy();
      expect(
        card!.reasons.some((r) => r.kind === "meeting"),
        `${where}: with the meeting reason`,
      ).toBe(true);
      // The body's own member sees it as their own board meeting, beside their office.
      const own = officeCard(member);
      expect(
        own?.reasons.map((r) => r.kind).sort(),
        `${where}: the member's reasons on the meeting day`,
      ).toEqual(expect.arrayContaining(["ownMeeting", "seat"]));
      expect(
        own?.reasons.some((r) => r.kind === "meeting"),
        `${where}: a member's board is never "its board"`,
      ).toBe(false);
      // Every card says one work tie at most (the closest), never the same thing twice.
      for (const id of [member, resident])
        for (const card of townPlaces(core, id))
          expect(
            card.reasons.filter((r) =>
              ["work", "family", "known"].includes(r.kind),
            ).length > 0
              ? new Set(
                  card.reasons
                    .map((r) => r.kind)
                    .filter((k) => ["work", "family", "known"].includes(k)),
                ).size
              : 1,
            `${where}: ${card.name} for ${id} gives one work tie`,
          ).toBe(1);
      console.log(
        `travel-civic: ${where}: ${office.name} for seat ${council.seat.id}; meeting day ${core.date}`,
      );
      proved.push(where);
    }
    expect(proved.length, "places proved").toBe(PLACES);
  }, 1_800_000);
});
