/** Lane 2's fixed Meadow Lakes path. No enacted-law or payment fixture. */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { BenchPlayer } from "../bench/player";
import { composeJournal } from "../director/journal";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { coreAPI, registerModule } from "./state";
import { billOf, votesOn } from "./modules/legislature";
import { LAWS_MODULE_ID } from "./modules/laws";
import { newsKey, onStoryHeard, type Story } from "./modules/news";
import { stancesOf } from "./modules/views";
import type { LawRowInput } from "./laws-starting";
import type { CoreEventInput } from "./types";

const question = "us-policy-positions:fiscal.adopt-income-tax";
const replay = "f835dd278d7312a1";
let hearing: Parameters<typeof onStoryHeard>[0] | undefined;
onStoryHeard((...args) => hearing?.(...args));

it("Meadow Lakes follows a naturally voted tax through cash, heard news and a normal journal", () => {
  setBookkeeping(false);
  try {
    const world = buildBenchWorld(replay, gameStartDate(), {
      twoLevel: true,
      placeKey: "0247735",
    });
    const { core, director } = world;
    const api = coreAPI(core);
    const opened = core.date;
    expect(world.place.displayName).toBe("Meadow Lakes, Alaska");
    expect(world.playerId).toBeDefined();
    new BenchPlayer(core, director).select(world.playerId!);
    // Evidence retention, not a performance run. Watching an existing worker
    // observes the director's normal output; it supplies no decision or event.
    core.observer = true;
    const watched = new Set(
      [...core.people.values()]
        .filter((p) => p.alive && p.placeId === world.placeId && p.jobId)
        .map((p) => p.id),
    );
    for (const id of watched) director.watch(core, id);
    const laws = api.moduleState(LAWS_MODULE_ID).table("laws");
    const openingLaws = new Set(laws.rows().map((row) => row.id));
    const heard = new Map<string, { story: Story; date: string }[]>();
    hearing = (heardApi, personId, story) => {
      if (heardApi.state !== core || !watched.has(personId)) return;
      const lawId = story.facts.lawId;
      if (!lawId) return;
      let law = laws.get(lawId) as unknown as LawRowInput | undefined;
      // A report may name the numeric tax rule that the policy act wrote.
      const measure = law?.terms?.enactedBy;
      if (
        law?.series === "income-tax" &&
        typeof measure === "string" &&
        measure.startsWith("adopt:")
      )
        law = laws.get(measure.slice("adopt:".length)) as unknown as
          LawRowInput | undefined;
      if (law?.series !== question || openingLaws.has(law.id)) return;
      const key = `${personId}|${law.id}`;
      const reads = heard.get(key) ?? [];
      if (!reads.some((read) => read.story.id === story.id))
        reads.push({ story, date: core.date });
      heard.set(key, reads);
    };
    const events: CoreEventInput[] = [];
    registerModule(core, {
      id: "test:lane-2-law-chain-reader",
      eventKinds: ["law.effect-learned"],
      onEvent: (_api, event) => {
        events.push(event);
      },
    });
    const links = new Map<
      string,
      {
        event: CoreEventInput;
        stanceId: string;
        change: number;
        learnedFrom: string;
        journal: { text: string; sourceRecordIds: readonly string[] }[];
      }
    >();
    for (let day = 1; day <= 365; day++) {
      advanceCore(core, addDays(makeIsoDate(opened), day));
      for (const event of events) {
        if (links.has(event.id)) continue;
        const personId = event.personIds[0];
        if (!personId || !watched.has(personId)) continue;
        const stance = stancesOf(api, personId).find((s) =>
          s.causes.some(
            (cause) => cause.eventId === event.id && cause.change !== 0,
          ),
        );
        const cause = stance?.causes.find((c) => c.eventId === event.id);
        if (!stance || !cause?.learnedFrom) continue;
        const journal = composeJournal(core, director, personId)
          .flatMap((chapter) => chapter.lines)
          .filter((line) => line.sourceRecordIds.includes(event.id));
        if (journal.length)
          links.set(event.id, {
            event,
            stanceId: stance.id,
            change: cause.change,
            learnedFrom: cause.learnedFrom,
            journal,
          });
      }
    }
    const enacted = (laws.rows() as unknown as LawRowInput[]).find(
      (law) =>
        law.series === question &&
        !openingLaws.has(law.id) &&
        law.terms?.enactedByBill,
    );
    expect(
      enacted,
      "a new tax must come from the natural session",
    ).toBeDefined();
    const law = enacted!;
    const bill = billOf(api, String(law.terms!.enactedByBill));
    const votes = votesOn(api, bill.id);
    expect(["enacted", "signed", "overridden"]).toContain(bill.status);
    expect(votes.some((v) => v.vote === "yes" && v.position)).toBe(true);
    expect(votes.some((v) => v.vote === "no" && v.position)).toBe(true);
    const receipts = [...core.cashJournal.detailedReceipts.values()];
    // One receipt may also withhold unrelated federal taxes. Attribute only
    // the positive posting whose ID names this law, not the whole deduction.
    const collections = receipts.flatMap((receipt) => {
      const posting = receipt.postings.find(
        (p) => p.deltaMinor > 0 && p.id.includes(law.id),
      );
      if (!posting) return [];
      const treasuryId = receipt.accounts.get(posting.accountId)!.ownerId;
      const payer = [...receipt.owners.values()].find(
        (owner) =>
          watched.has(owner.ownerId) && owner.afterMinor < owner.beforeMinor,
      );
      return payer
        ? [{ receipt, posting, treasuryId, personId: payer.ownerId }]
        : [];
    });
    const informed = collections.filter((c) =>
      heard.has(`${c.personId}|${law.id}`),
    );
    console.info(
      JSON.stringify({
        place: world.place.displayName,
        replay,
        through: core.date,
        billId: bill.id,
        lawId: law.id,
        votes: votes.length,
        watched: watched.size,
        collections: collections.length,
        heard: heard.size,
        informedPayments: informed.length,
        learnedEvents: events.filter((e) => e.facts?.lawId === law.id).length,
        normalJournalLinks: [...links.values()].filter(
          (link) => link.event.facts?.lawId === law.id,
        ).length,
      }),
    );
    expect(
      collections.length,
      "the voted law actually collects from a named worker",
    ).toBeGreaterThan(0);
    expect(
      informed.length,
      "at least one actual taxpayer heard this law's story",
    ).toBeGreaterThan(0);
    const complete = informed
      .map((collection) => ({
        collection,
        link: [...links.values()].find(
          (candidate) =>
            candidate.event.personIds.includes(collection.personId) &&
            candidate.event.facts?.lawId === law.id &&
            candidate.event.facts?.withholdingId ===
              collection.receipt.sourceRef.id &&
            candidate.event.facts?.movedMinor ===
              String(-collection.posting.deltaMinor) &&
            heard
              .get(`${collection.personId}|${law.id}`)!
              .some(
                (read) =>
                  candidate.learnedFrom === newsKey(read.story.id) &&
                  read.date <= candidate.event.date,
              ),
        ),
      }))
      .find((candidate) => candidate.link);
    expect(
      complete,
      "a real payment and heard story must reach a changed stance and shipping Journal",
    ).toBeDefined();
    const { collection, link } = complete!;
    expect(
      link!.journal.some(
        (line) =>
          line.sourceRecordIds.includes(law.id) &&
          line.sourceRecordIds.includes(bill.id),
      ),
      "the Journal cites the law and its voted bill",
    ).toBe(true);
    const paid = receipts.find((receipt) => {
      if (receipt.date < collection.receipt.date) return false;
      const treasury = receipt.owners.get(collection.treasuryId);
      return (
        treasury &&
        treasury.afterMinor < treasury.beforeMinor &&
        [...receipt.owners.values()].some(
          (owner) =>
            core.people.has(owner.ownerId) &&
            owner.afterMinor > owner.beforeMinor,
        )
      );
    });
    expect(
      paid,
      "the receiving treasury pays a named person, not only an organization",
    ).toBeDefined();
    console.info(
      JSON.stringify({
        billId: bill.id,
        lawId: law.id,
        personId: collection.personId,
        personName: [
          core.people.get(collection.personId)!.givenName,
          core.people.get(collection.personId)!.familyName,
        ].join(" "),
        taxMinor: collection.posting.deltaMinor,
        taxReceiptId: collection.receipt.id,
        treasuryId: collection.treasuryId,
        treasuryPaymentId: paid!.id,
        paidPeople: [...paid!.owners.values()]
          .filter(
            (owner) =>
              core.people.has(owner.ownerId) &&
              owner.afterMinor > owner.beforeMinor,
          )
          .map((owner) => ({
            ...owner,
            givenName: core.people.get(owner.ownerId)!.givenName,
            familyName: core.people.get(owner.ownerId)!.familyName,
          })),
        heard: heard.get(`${collection.personId}|${law.id}`),
        eventId: link!.event.id,
        stanceId: link!.stanceId,
        stanceChange: link!.change,
        journal: link!.journal,
        limit:
          "The treasury payment is real; this test does not claim the new tax created extra spending.",
      }),
    );
  } finally {
    hearing = undefined;
    setBookkeeping(true);
  }
}, 1_500_000);
