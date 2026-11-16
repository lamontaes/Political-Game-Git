/**
 * An executive chooses whom to ask to carry a bill: the body's members, the one the engine would
 * ask marked as the likely yes, and a member who is not the likely yes can say no, kept with its
 * reason and date and asked again later. The player is the executive, in three pinned places (a
 * mayor, a county executive and a governor, draws of the fixed run "8341-pin"): no random draw.
 */
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "../core2/game-start";
import { setBookkeeping } from "../core2/bookkeeping";
import { coreAPI } from "../core2/state";
import { declinedAsks } from "../core2/modules/legislature";
import { questionReasons } from "../english/question-names";
import { buildBenchWorld } from "./world";
import { seatAsk, seatAskOptions, seatView } from "./legislature";

const TRANSIT =
  "us-policy-positions:transportation-infrastructure.shift-highway-funds-to-transit";

const CASES = [
  // Ridgeville, Alabama (0164656): the town's mayor.
  {
    purpose: "p6",
    key: "0164656",
    office: "office:gus2025:160615:mayor",
    question: TRANSIT,
    reason: "views",
  },
  // Monserrate, Puerto Rico (7253979): the municipio mayor, a county executive.
  {
    purpose: "p8",
    key: "7253979",
    office: "office:municipio:72145:executive",
    question: TRANSIT,
    reason: "views",
  },
  // Ridgeville, Alabama (0164656): the governor of Alabama.
  {
    purpose: "p6",
    key: "0164656",
    office: "office:US-AL:governor",
    question: TRANSIT,
    reason: "party",
  },
];

for (const pinned of CASES) {
  it(`${pinned.office}: the player picks whom to ask and a member who is not the likely yes can say no (${pinned.key})`, () => {
    setBookkeeping(false);
    const place = drawPlace("8341-pin", pinned.purpose);
    const where = `${place.name} (${place.key}), world seed ${place.seed}, ${pinned.office}`;
    expect(place.key, `${where}: the pinned place moved`).toBe(pinned.key);
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const offices = api.moduleState("core2-offices-v1");
    const term = (
      offices.table("terms").rows() as unknown as {
        personId?: string;
        officeId: string;
        status: string;
      }[]
    ).find(
      (row) =>
        row.officeId === pinned.office &&
        row.status === "serving" &&
        row.personId,
    );
    expect(term?.personId, `${where}: a serving executive`).toBeTruthy();
    const player = term!.personId!;
    const body = seatView(core, player).bodies.find(
      (b) => "byRequest" in b && b.byRequest,
    );
    expect(body, `${where}: the executive's body`).toBeDefined();
    const ask = {
      officeId: body!.officeId,
      question: pinned.question,
      value: 1,
    };

    // The members, the engine's pick marked and first.
    const options = seatAskOptions(core, player, ask).members;
    expect(options.length, `${where}: members to ask`).toBeGreaterThan(1);
    expect(
      options.filter((m) => m.likely).map((m) => m.key),
      `${where}: exactly one likely yes, and it is first`,
    ).toEqual([options[0]!.key]);
    expect(
      options.some((m) => m.key === player),
      `${where}: the executive is not offered`,
    ).toBe(false);

    // The least likely member says no: kept with its reason and date.
    const unlikely = options[options.length - 1]!;
    const first = seatAsk(core, player, {
      ...ask,
      memberId: unlikely.key,
    }).asked;
    expect(first.memberId, `${where}: the member chosen`).toBe(unlikely.key);
    expect(first.carried, `${where}: the least likely yes says no`).toBe(false);
    expect(first.reason, `${where}: the plate's reason`).toBe(pinned.reason);
    const spoken = questionReasons(pinned.question, "against").reason;
    if (pinned.reason === "views" && spoken)
      expect(
        "reasonWords" in first && first.reasonWords,
        `${where}: the member's own words`,
      ).toBe(spoken);
    const kept = declinedAsks(api, player, unlikely.key, body!.officeId);
    expect(kept, `${where}: the no is kept`).toHaveLength(1);
    expect(kept[0]!.date, where).toBe(String(core.date));

    // A month later the same member is asked again: the earlier no is read back.
    const date = new Date(`${String(core.date)}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + 30);
    api.state.date = date.toISOString().slice(0, 10) as never;
    const again = seatAsk(core, player, {
      ...ask,
      memberId: unlikely.key,
    }).asked;
    expect(again.earlier, `${where}: the earlier no with its date`).toEqual([
      String(kept[0]!.date),
    ]);

    // With no member named, the likely yes is asked, as before.
    const likelyAsk = seatAsk(core, player, { ...ask, value: 0 }).asked;
    const likely = seatAskOptions(core, player, { ...ask, value: 0 })
      .members[0]!;
    expect(likelyAsk.memberId, `${where}: the engine's pick`).toBe(likely.key);
  }, 180_000);
}
