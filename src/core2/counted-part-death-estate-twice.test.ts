/**
 * One counted record dying in part two months running settles its estate both
 * times. A part death keeps the record's person id, and the estate transfers
 * were named for that id and the heir alone, so the second death's tax came
 * back as "Transfer id is empty or reused" (the game keeps an id for the month
 * and the one before). Each death's transfers now carry its day. Pinned:
 * Pike Creek Valley, Delaware, whose heavy record has cash and a second member.
 */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { settleCountedEstate } from "./estates";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { setJournalTrace } from "./journal-state";
import { advanceCore } from "./life";
import { enactLaw, lawChain, lawInForce } from "./modules/laws";
import {
  countedEstateOf,
  countedPartDeath,
  residentsRuntime,
} from "./modules/residents";
import { coreAPI } from "./state";

const PLACE = {
  name: "Pike Creek Valley, Delaware",
  key: "1056500",
  seed: "c1d4df5990ef8dffa6c527767bae1e7f6541657ed7b1c2f48942b79a59f3de98",
};
const SECOND_DEATH_AFTER_DAYS = 31;

it("a record that dies in part two months running pays the estate tax both times", () => {
  const was = setBookkeeping(false);
  try {
    const where = `${PLACE.name} (${PLACE.key}), seed ${PLACE.seed}`;
    const core = buildBenchWorld(PLACE.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: PLACE.key,
    }).core;
    const api = coreAPI(core);
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const store = residentsRuntime(core)!.store;
    const state = lawChain(api).levels.find((l) => l.level === "state")!;
    const federal = lawInForce(api, "estate-tax").levels.find(
      (l) => l.level === "federal",
    );
    const effectiveDate = addDays(makeIsoDate(core.date), 1);
    if (federal?.row)
      enactLaw(api, {
        jurisdiction: federal.jurisdiction,
        level: "federal",
        series: "estate-tax",
        value: 40,
        unit: "percent-top-rate",
        effectiveDate,
        measureId: "test:estate-low",
        citation: "Test estate tax",
        terms: { exemption: 1, minRate: 10, maxRate: 40, slideOver: 1000 },
      });
    enactLaw(api, {
      jurisdiction: state.jurisdiction,
      level: "state",
      series: "inheritance-tax",
      value: 10,
      unit: "percent-top-rate",
      effectiveDate,
      measureId: "test:inheritance-low",
      citation: "Test inheritance tax",
      terms: {
        classes: {},
        others: { exemption: 1, minRate: 10, slideOver: 0 },
      },
    });
    advanceCore(core, addDays(makeIsoDate(core.date), 35));
    const heavy = [...store.liveHouseholds()]
      .filter(
        (h) => store.weightOf(h) >= 3 && store.countedMembers(h).length >= 2,
      )
      .map((h) => ({ dead: store.ids[store.countedMembers(h)[0]!]! }))
      .map((row) => ({
        ...row,
        estate: countedEstateOf(core, row.dead as never)!,
      }))
      .filter((row) => row.estate.estateMinor > 100_00)
      .sort(
        (a, b) =>
          b.estate.estateMinor - a.estate.estateMinor ||
          a.dead.localeCompare(b.dead),
      )[0];
    expect(heavy, `${where}: a heavy record with cash and kin`).toBeDefined();
    const placeId = lawChain(api).townPlaceId;
    const ids: string[] = [];
    const settleOnePart = (day: string) => {
      const part = countedPartDeath(core, heavy!.dead as never, 1);
      expect(part, `${where}: the part death ran on ${day}`).toBeDefined();
      let moved = 0;
      setJournalTrace((input) => {
        if (!/:(estate-tax|inheritance-tax):/.test(input.sourceRef.id)) return;
        ids.push(input.sourceRef.id);
        for (const posting of input.postings)
          if (posting.deltaMinor > 0) moved += posting.deltaMinor;
      });
      try {
        settleCountedEstate(api, {
          deceasedId: heavy!.dead as never,
          placeId,
          estate: { ...part!.estate, households: 1 },
        });
      } finally {
        setJournalTrace(null);
      }
      expect(
        moved,
        `${where}: tax moved for the death on ${day}`,
      ).toBeGreaterThan(0);
    };
    settleOnePart(core.date);
    advanceCore(core, addDays(makeIsoDate(core.date), SECOND_DEATH_AFTER_DAYS));
    settleOnePart(core.date);
    expect(
      new Set(ids).size,
      `${where}: transfers by death: ${ids.join(", ")}`,
    ).toBe(ids.length);
  } finally {
    setBookkeeping(was);
  }
  // About twice the 97 s measured. The time is the game's own played days: the
  // opening, 35 days of paydays to fund the groups, then 31 days to the second
  // death (the transfer id is kept for the month and the one before).
}, 200_000);
