/**
 * A vote or a signature is public record at the government it happened in
 * (gov-president-not-newsworthy), in a random place from all 56: the town as
 * the player gets it (buildBenchWorld, two-level, every module), run for
 * five months. Every roll call and every signature or veto carries the level
 * of the body the bill was before, so the press files a governor's act as a
 * state story and a president's as a national one, which a national outlet's
 * beat reads. Seed and place from GOLDEN_PATH_SEED (random when unset).
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { drawPlace } from "../../scripts/core2-year/place";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import { setBookkeeping } from "./bookkeeping";
import { addDays, makeIsoDate } from "./kernel/dates";
import { lawChain } from "./modules/laws";
import { wireItem } from "./press-topics";
import { LEGISLATURE_MODULE_ID, type BillRow } from "./modules/legislature";
import { OFFICES_MODULE_ID, type TermRow } from "./modules/offices";
import { outletsHere, storiesPrinted } from "./modules/press";
import type { CoreEventInput } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");

describe("a vote or signature is filed at its own government's level", () => {
  it("roll calls and signatures carry the level of the bill's body, and the wire reads it", () => {
    setBookkeeping(false);
    const place = drawPlace(seed, "vote-level");
    const where = `place ${place.key}, seed ${seed}`;
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const core = world.core;
    const api = coreAPI(core);
    const seen: CoreEventInput[] = [];
    const emit = api.emit.bind(api);
    api.emit = (event: CoreEventInput) => {
      if (
        event.kind === "legislative-vote" ||
        event.kind === "executive-action"
      )
        seen.push(event);
      return emit(event);
    };
    advanceCore(core, addDays(makeIsoDate(core.date), 150));
    expect(seen.length, where).toBeGreaterThan(0);
    const bills = api.moduleState(LEGISLATURE_MODULE_ID).table("bills");
    const chain = lawChain(api);
    const town = { placeId: chain.townPlaceId, stateKey: chain.stateKey };
    for (const event of seen) {
      const level = event.facts?.level;
      expect(
        ["federal", "state", "county", "township", "city"],
        where,
      ).toContain(level);
      const bill = bills.get(event.facts!.billId!) as unknown as BillRow;
      if (bill.bodyOfficeId.startsWith("federal:"))
        expect(level, `${where}: ${event.id}`).toBe("federal");
      // The wire files it where it happened: a state's act is a state
      // story, Congress's and the president's a national one.
      const item = wireItem(api, event, town);
      const filed = {
        federal: "nation",
        state: "state",
        county: "county",
        // A township board governs the town's own township: a local story.
        township: "town",
        city: "town",
      }[level as string];
      expect(item?.level, `${where}: ${event.id}`).toBe(filed);
    }
    const township = seen.find((event) => event.facts?.level === "township");
    process.stdout.write(
      `VOTE LEVEL ${where}: ${seen.length} votes and signatures${township ? `; a township board's ${township.id} filed as ${wireItem(api, township, town)?.level}` : ""}\n`,
    );
    // Five played months took 62 to 74 seconds alone on a 4-core container.
  }, 600000);

  it("a chamber organizing and a committee hearing are filed at their own government's level", () => {
    setBookkeeping(false);
    // The named seed's own place first (the regression), then fresh draws,
    // until a place whose opening seats a legislature with members who are
    // people and a national outlet its people follow, so its committees can
    // hear a bill and the national desk can print; the run fails when the draws
    // run out.
    const ATTEMPTS = 4;
    const passedOver: string[] = [];
    for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
      const drawSeed = attempt ? `${seed}:${attempt}` : seed;
      const place = drawPlace(drawSeed, "hearing-level");
      const where = `place ${place.key}, seed ${drawSeed}`;
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const core = world.core;
      const api = coreAPI(core);
      const terms = api
        .moduleState(OFFICES_MODULE_ID)
        .table("terms")
        .rows() as unknown as TermRow[];
      const seated = terms.some(
        (t) =>
          t.status === "serving" &&
          /:legislature-/.test(t.officeId) &&
          !!t.personId &&
          core.people.has(t.personId),
      );
      const followsNational = outletsHere(api).some(
        (o) => o.tier === "national",
      );
      if (!seated || !followsNational) {
        passedOver.push(
          `${where}: ${seated ? "no national outlet" : "no seated legislature member"}`,
        );
        continue;
      }
      const kinds = new Set([
        "chamber-organized",
        "committee-hearing",
        "public-comment",
        "bill-amendment",
      ]);
      const seen: CoreEventInput[] = [];
      const records: CoreEventInput[] = [];
      const emit = api.emit.bind(api);
      api.emit = (event: CoreEventInput) => {
        if (kinds.has(event.kind)) seen.push(event);
        if (event.publicRecord) records.push(event);
        return emit(event);
      };
      advanceCore(core, addDays(makeIsoDate(core.date), 365));
      expect(seen.length, where).toBeGreaterThan(0);
      const bills = api.moduleState(LEGISLATURE_MODULE_ID).table("bills");
      const committees = api
        .moduleState(LEGISLATURE_MODULE_ID)
        .table("committees");
      const chain = lawChain(api);
      const town = { placeId: chain.townPlaceId, stateKey: chain.stateKey };
      const federal = new Set<string>();
      const heard: { id: string; topic: string; memberId: string }[] = [];
      let named = 0;
      for (const event of seen) {
        const level = event.facts?.level;
        expect(
          ["federal", "state", "county", "city"],
          `${where}: ${event.id}`,
        ).toContain(level);
        const billId = event.facts?.billId;
        if (billId) {
          const bill = bills.get(billId) as unknown as BillRow;
          if (bill.bodyOfficeId.startsWith("federal:"))
            expect(level, `${where}: ${event.id}`).toBe("federal");
        } else if (event.id.startsWith("chamber-organized:federal:"))
          expect(level, `${where}: ${event.id}`).toBe("federal");
        if (level === "federal") {
          federal.add(event.id);
          expect(
            wireItem(api, event, town)?.level,
            `${where}: ${event.id}`,
          ).toBe("nation");
        }
        if (event.kind !== "committee-hearing") continue;
        // A hearing is wired as what its bill changes, and its story names
        // the committee whose record it is: the members on its roll call.
        expect(billId, `${where}: ${event.id}`).toBeTruthy();
        const bill = bills.get(billId!) as unknown as BillRow;
        const first = bill.provisions[0];
        const topic = first
          ? (first.question ??
            (first.line ? `budget-line:${first.line}` : first.series))
          : event.kind;
        const item = wireItem(api, event, town);
        expect(item?.topic, `${where}: ${event.id}`).toBe(topic);
        const record = committees.get(event.id) as unknown as {
          memberIds: readonly string[];
        };
        const members = record.memberIds.filter((id) => core.people.has(id));
        for (const memberId of members)
          expect(item?.subjectIds, `${where}: ${event.id}`).toContain(memberId);
        named += members.length;
        if (members.length)
          heard.push({ id: event.id, topic, memberId: members[0]! });
      }
      // The changed route ran: hearings on a bill's question, naming people.
      expect(
        heard.filter((h) => h.topic !== "committee-hearing").length,
        `${where}: no hearing on a bill's question named a member`,
      ).toBeGreaterThan(0);
      expect(named, where).toBeGreaterThan(0);
      // A chamber organized before the test's hook was set is Congress's too.
      const isFederal = (id: string) =>
        federal.has(id) || id.startsWith("chamber-organized:federal:");
      // No town outlet printed Congress's business as the town's.
      for (const outlet of outletsHere(api))
        for (const story of storiesPrinted(api, outlet.id))
          if (outlet.tier !== "national")
            expect(isFederal(story.wireId), `${where}: ${story.wireId}`).toBe(
              false,
            );
      // A national outlet prints the nation's business by record id: a story
      // whose wire item is a federal public record its desk read. Which
      // federal records win the national desk's week is the open calibration
      // in gov-national-desk-people-term-outweighs-proximity: in place
      // 0815330 (seed dc4ca028...) a state law reaching the outlet's own
      // readers outscored every chamber, hearing, comment and amendment
      // record, and the national outlets printed federal laws instead.
      const everything = new Map(records.map((event) => [event.id, event]));
      const national = outletsHere(api).filter((o) => o.tier === "national");
      const printed = national.flatMap((o) =>
        storiesPrinted(api, o.id).map((story) => ({ outlet: o.id, story })),
      );
      const nationStory = printed.find(({ story }) => {
        const event = everything.get(story.wireId);
        return !!event && wireItem(api, event, town)?.level === "nation";
      });
      expect(
        nationStory,
        `${where}: no national outlet printed a federal record`,
      ).toBeDefined();
      const hearing = heard[0]!;
      process.stdout.write(
        `HEARING LEVEL ${where}: ${heard.length} hearings named ${named} committee members (${hearing.id} on ${hearing.topic}, naming ${hearing.memberId}); ${nationStory!.outlet} printed ${nationStory!.story.wireId}${passedOver.length ? `; passed over ${passedOver.join("; ")}` : ""}\n`,
      );
      return;
    }
    throw new Error(
      `No drawn place seats a legislature in ${ATTEMPTS} draws: ${passedOver.join("; ")}`,
    );
  }, 600000);
});
