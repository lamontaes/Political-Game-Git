/**
 * Two stakes from the player's office (gov-m3-02-two-stakes-in-a-played-world,
 * M3-02): a member who drafted a bill learns one colleague's stake by talking
 * to them (the office's talk-to-colleague act) and a second from their aide's
 * brief on the bill (the staff engine's brief, by the record). Each is kept on
 * the legislature's record by bill and member, and the office panel's deals
 * list reads both back. A place drawn from all 56; GOLDEN_PATH_SEED pins one.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import {
  billOf,
  draftBill,
  learnedStakesOf,
} from "../core2/modules/legislature";
import {
  OFFICES_MODULE_ID,
  townSeats,
  type TermRow,
} from "../core2/modules/offices";
import { officeHost } from "../core2/modules/office-day";
import {
  briefOnBill,
  hireStaff,
  staffCandidates,
} from "../core2/modules/staff";
import { officeActHandlers } from "../core2/office-day-acts";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { seatView } from "./legislature";
import { officeView } from "./office";
import { buildBenchWorld } from "./world";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it(`the player learns one colleague's stake in talk and another from an aide's brief, and the office panel shows both (seed ${seed})`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const place = drawPlace(`${seed}:${attempt}`, "office-two-stakes");
    const where = `${place.name} (${place.key}), run seed ${seed}:${attempt}, place seed ${place.seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const terms = (seatId: string) =>
      api
        .moduleState(OFFICES_MODULE_ID)
        .table("terms")
        .query("bySeatStatus", [seatId, "serving"]) as unknown as TermRow[];
    // A resident officeholder on a body of three or more drafts a bill.
    let sponsor: string | undefined;
    let billId: string | undefined;
    for (const { seat, office } of townSeats(api)) {
      // The town's or the county's own body.
      if (office.level !== "city" && office.level !== "county") continue;
      const holder = terms(seat.id)[0]?.personId;
      const body = holder ? seatView(core, holder).bodies[0] : undefined;
      if (!holder || !body || body.members.length < 3) continue;
      for (const question of seatView(core, holder).questions) {
        const drafted = draftBill(api, {
          bodyOfficeId: body.officeId,
          sponsorId: holder,
          provisions: [{ kind: "policy-question", question, value: 1 }],
        });
        if (drafted.status === "drafted") {
          sponsor = holder;
          billId = drafted.id;
          break;
        }
      }
      if (billId) break;
    }
    if (!sponsor || !billId) {
      tried.push(
        `${where}: no officeholder on a body of three who could draft`,
      );
      continue;
    }
    core.playerId = sponsor as PersonId;
    const listed = () =>
      officeView(core, sponsor!).deals.find((row) => row.billId === billId)!;
    const colleagues = listed().colleagues.map((row) => row.key);
    expect(colleagues.length, where).toBeGreaterThanOrEqual(2);
    // An aide on the player's staff, from the office's own candidates.
    const candidate = staffCandidates(api, sponsor)[0];
    if (!candidate) {
      tried.push(`${where}: no one to hire as an aide`);
      continue;
    }
    const aide = hireStaff(api, {
      officialId: sponsor,
      personId: candidate.personId,
      role: "aide",
    });

    // First route: the aide briefs the player on the bill from the record.
    const brief = briefOnBill(api, aide.id, billId);
    // Second route: the player talks to a colleague (the latest of a
    // member's stakes is kept, so the talk follows the brief).
    const talked = colleagues[0]!;
    officeActHandlers(officeHost)["talk-to-colleague"](api, sponsor, {
      targetId: talked,
    } as never);
    const learned = learnedStakesOf(api, sponsor, billId);
    const byTalk = learned.find((row) => row.memberId === talked);
    expect(byTalk?.route, `${where}: ${talked}`).toBe("conversation");
    const byRecord = learned.find(
      (row) => row.memberId !== talked && row.route === "record",
    );
    if (!byRecord) {
      tried.push(
        `${where}: the aide's brief covered ${brief.stakes.length} members, none besides the colleague talked to`,
      );
      continue;
    }
    // Each is the member's own position on the bill, as the record has it.
    expect(byTalk!.billId).toBe(billId);
    expect(byRecord.billId).toBe(billId);
    // The office panel shows both, by the record that holds each.
    const panel = listed();
    const shown = panel.colleagues.filter((row) => row.stake);
    expect(shown.map((row) => row.stake!.recordId).sort(), where).toEqual(
      expect.arrayContaining([byTalk!.id, byRecord.id].sort()),
    );
    expect(
      panel.colleagues.find((row) => row.key === talked)!.stake!.route,
    ).toBe("conversation");
    expect(
      panel.colleagues.find((row) => row.key === byRecord.memberId)!.stake!
        .route,
    ).toBe("record");
    process.stdout.write(
      `TWO STAKES ${where}: ${billOf(api, billId).number} (${billId}); talk ${byTalk!.id} (${panel.colleagues.find((row) => row.key === talked)!.stake!.leaning}); aide ${aide.id} brief ${byRecord.id} (${panel.colleagues.find((row) => row.key === byRecord.memberId)!.stake!.leaning})${tried.length ? `; passed over: ${tried.join("; ")}` : ""}\n`,
    );
    return;
  }
  expect.fail(`seed ${seed}: ${tried.join("; ")}`);
}, 1_800_000);
