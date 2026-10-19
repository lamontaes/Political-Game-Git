/** Legal bookkeeping does not deliver information; actual news does. */
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import { newsKey } from "./modules/news";
import { stancesOf } from "./modules/views";

it("keeps received law news without inventing knowledge for every legal target", () => {
  const draw = process.env.LAW_LINK_DRAW
    ? JSON.parse(readFileSync(process.env.LAW_LINK_DRAW, "utf8"))
    : drawPlace(randomBytes(32).toString("hex"), "session-a-law-knowledge");
  setBookkeeping(false);
  try {
    const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: draw.key,
    });
    const api = coreAPI(core);
    const received = new Map<string, unknown>();
    let fabricated = 0;
    const started = performance.now();
    for (let day = 0; day < 365; day++) {
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
      // Read only on the month's last simulated day; news keeps focused receipts.
      if (core.date.slice(-2) !== "20") continue;
      for (const facts of core.knowledgeByPerson.values())
        for (const key of facts.keys())
          if (key.startsWith("law-reach:")) fabricated++;
      const news = api.moduleState("news");
      for (const row of news.table("heard").rows()) {
        const story = news.table("stories").get(String(row.storyId));
        if (
          !story ||
          typeof story.topic !== "string" ||
          !story.topic.startsWith("us-policy-positions:")
        )
          continue;
        const personId = String(row.personId);
        const known = api.knows(personId, newsKey(String(story.id)));
        if (!known) continue;
        const person = core.people.get(personId);
        received.set(row.id, {
          heard: row,
          story,
          printed: api
            .moduleState("core2-press-v1")
            .table("stories")
            .get(String(story.id)),
          known,
          stances: stancesOf(api, personId).filter(
            (stance) => stance.topic === story.topic,
          ),
          person: person
            ? {
                id: person.id,
                name: `${person.givenName} ${person.familyName}`,
              }
            : null,
        });
      }
    }
    const evidence = {
      draw,
      date: core.date,
      seconds: (performance.now() - started) / 1000,
      modules: core.modules.size,
      fabricated,
      received: [...received.values()],
      reachA: api.moduleState("core2-law-reach-a-v1").table("reach").size,
      reachB: api.moduleState("core2-law-reach-b-v1").table("people").size,
      journalTotals: core.cashJournal.totals,
    };
    if (process.env.LAW_LINK_PROOF)
      writeFileSync(process.env.LAW_LINK_PROOF, JSON.stringify(evidence));
    expect(fabricated).toBe(0);
    expect(core.cashJournal.totals.grossDebitMinor).toBe(
      core.cashJournal.totals.grossCreditMinor,
    );
    // A random world's silence is not a failed delivery: only assert provenance for actual receipt records.
    for (const sample of received.values())
      expect(
        (sample as { known: { sourceId: string } }).known.sourceId,
      ).toBeTruthy();
  } finally {
    setBookkeeping(true);
  }
}, 120_000);
