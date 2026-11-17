import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { seatView } from "../bench/legislature";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { billCatalog, provisionFor } from "../core2/bill-catalog";
import { personLean } from "../core2/campaign-views";
import { gameStartDate } from "../core2/game-start";
import { addDays, ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  askForDonation,
  giftsToCampaign,
  townLean,
} from "../core2/modules/campaigns";
import { fileCandidacy, openContests } from "../core2/modules/elections";
import { filingClerkFor } from "../core2/modules/filing-clerk";
import { lawChain } from "../core2/modules/laws";
import {
  billOf,
  committeeRecords,
  draftBill,
  memberKey,
  members,
  provisionStance,
} from "../core2/modules/legislature";
import { townSeats } from "../core2/modules/offices";
import { P } from "../core2/parameters";
import { viewOf, viewOn } from "../core2/modules/views";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { purposeScene } from "./purpose-scene";
import { playedNode, type TreeNode } from "./scene-talk";

// A donor's ask reads the records the gift names (donor-ask-facts.ts,
// `donorReads`): the donor's side and the player's own side of the bill's
// question from the views engine, where the bill is from the committee's
// records, whether the player sits where it is voted, and how the gift ranks
// among the campaign's gifts. Places are drawn (no pin) until a race counted
// in the year takes a filing and a donor's gift names a pending bill; the
// ones passed over are named. Each fact is checked against the engine's own
// answer by record id, and the player's agree plays only where the views
// engine holds a stand that matches the donor's.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const ATTEMPTS = 14;
const YEAR = 365;

const replies = (node: TreeNode): { move: string; text: string }[] =>
  node.replies.flatMap((reply) => [
    { move: reply.line.move, text: reply.line.text },
    ...(reply.next ? replies(playedNode(reply.next)) : []),
  ]);

it(`a donor's ask reads the donor's side, the player's side, the bill's stage, the seat and the gift's rank from the records (seed ${seed})`, () => {
  setBookkeeping(false);
  const passed: string[] = [];
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const place = drawPlace(`${seed}:${attempt}`, "donor-ask-reads");
    const where = `${place.name} (${place.key}), seed ${seed}:${attempt}`;
    const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const end = addDays(makeIsoDate(core.date), YEAR);
    const open = () =>
      [...openContests(api)].filter(
        (row) =>
          row.level !== "federal" &&
          addDays(makeIsoDate(row.electionDate), 1) <= end,
      );
    for (let day = 0; !open().length && day < YEAR; day += 7)
      advanceCore(core, addDays(makeIsoDate(core.date), 7));
    const race = open().find((row) =>
      townSeats(api).some(
        (seat) =>
          seat.office.id === row.officeId &&
          members(api, row.officeId).length > 1,
      ),
    );
    if (!race) {
      passed.push(`${place.name} (no body's race open in the year)`);
      continue;
    }
    // Bills before the body, so a donor has one to raise (a town's own come and go).
    const sponsor = members(api, race.officeId)[0]!;
    for (const policy of billCatalog(
      api,
      race.level as "city" | "county" | "state",
    )
      .flatMap((subject) => subject.topics.flatMap((t) => t.policies))
      .filter((row) => row.kind === "policy-question" && row.authority.allowed)
      .slice(0, 6))
      draftBill(api, {
        bodyOfficeId: race.officeId,
        sponsorId: memberKey(sponsor),
        provisions: [provisionFor({ policyId: policy.id, operation: "enact" })],
      });
    // A sitting member of the body files again, else a resident of the town.
    const clerkId = filingClerkFor(api, race.id)?.personId;
    const town = lawChain(api).townPlaceId;
    const tried = [
      ...members(api, race.officeId)
        .map((term) => core.people.get(memberKey(term) as PersonId))
        .filter((p) => p?.alive && seatView(core, p.id).bodies.length),
      ...[...core.people.values()]
        .filter(
          (p) =>
            p.alive &&
            p.id !== clerkId &&
            p.placeId === town &&
            ageOnDate(p.birthDate, core.date) >= 18 &&
            !members(api, race.officeId).some((t) => memberKey(t) === p.id),
        )
        .sort((a, b) => a.id.localeCompare(b.id))
        .slice(0, 6),
    ];
    let candidateId: PersonId | undefined;
    let filingId = "";
    for (const p of tried) {
      if (!p) continue;
      director.watch(core, p.id);
      const filed = fileCandidacy(api, {
        personId: p.id,
        contestId: race.id,
        platform: [],
      });
      if (["petitioning", "on-ballot"].includes(filed.status ?? "")) {
        candidateId = p.id as PersonId;
        filingId = filed.filing.id;
        break;
      }
    }
    if (!candidateId) {
      passed.push(`${place.name} (nobody could file)`);
      continue;
    }
    core.playerId = candidateId;
    // The campaign asks the town for money, the way the campaign engine does.
    for (const p of [...core.people.values()]
      .filter(
        (p) =>
          p.alive &&
          p.id !== candidateId &&
          p.placeId === town &&
          ageOnDate(p.birthDate, core.date) >= 18,
      )
      .sort((a, b) => a.id.localeCompare(b.id)))
      askForDonation(api, filingId, p.id);
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const book = director.ledger.people.get(candidateId)!;
    const gifts = [...core.durableLog.values()].filter(
      (row) =>
        row.kind === "campaign-gift" &&
        row.facts?.candidateId === candidateId &&
        row.facts?.billId &&
        book.moments.some((moment) => moment.causeId === row.id),
    );
    if (!gifts.length) {
      passed.push(`${place.name} (no gift that names a bill was a moment)`);
      continue;
    }
    const seated = members(api, race.officeId).some(
      (term) => memberKey(term) === candidateId,
    );
    let checked = 0;
    for (const gift of gifts) {
      const here = `${where}: ${gift.id}`;
      const entry = book.schedule.find(
        (row) => book.momentsById.get(row.momentId)?.causeId === gift.id,
      )!;
      const result = purposeScene(core, director, candidateId, entry, {
        typeKey: "donor-ask",
      });
      expect(result?.kind, here).toBe("composed");
      if (result?.kind !== "composed") continue;
      const { scene } = result;
      const fact = new Map(scene.facts.map((row) => [row.key, row]));
      const donorId = String(gift.facts!.donorId) as PersonId;
      const bill = billOf(api, String(gift.facts!.billId));
      const stance = provisionStance(api, bill.provisions[P.zero]!)!;
      // The donor's side is the views engine's answer, cited by the bill and the gift.
      const donorView =
        viewOn(
          api,
          donorId,
          stance.question,
          personLean(core.people, core.people.get(donorId)!, townLean(api)),
        ) * stance.position;
      const donorSide = fact.get("side-for") ?? fact.get("side-against");
      if (donorView === P.zero) expect(donorSide, here).toBeUndefined();
      else {
        expect(donorSide?.text, here).toBe(
          donorView > P.zero ? "for" : "against",
        );
        expect(donorSide!.recordIds, here).toEqual(
          expect.arrayContaining([bill.id, gift.id]),
        );
      }
      // The player's side the same way, and "with" only where the two match.
      const mine = viewOf(api, candidateId);
      const own = mine
        ? viewOn(api, candidateId, stance.question, mine.lean) * stance.position
        : P.zero;
      const yours = fact.get("your-side");
      const withDonor = fact.has("stand-with");
      const apart = fact.has("stand-apart");
      if (own === P.zero || donorView === P.zero) {
        expect(yours, here).toBeUndefined();
        expect(withDonor || apart, here).toBe(false);
      } else {
        expect(yours?.text, here).toBe(own > P.zero ? "for" : "against");
        expect(yours!.recordIds, here).toEqual(
          expect.arrayContaining([
            gift.id,
            bill.id,
            candidateId,
            stance.question,
          ]),
        );
        expect(withDonor, here).toBe(own > P.zero === donorView > P.zero);
        expect(apart, here).toBe(!withDonor);
      }
      // The player's agree is offered only where their own stand matches the donor's.
      const moves = replies(scene.talk.tree).map((row) => row.move);
      if (!withDonor) expect(moves, here).not.toContain("agree");
      // Where the bill is, from the committee's own records.
      const sat = committeeRecords(api, bill.id);
      const stages = [
        "bill-filed",
        "bill-held",
        "bill-heard",
        "bill-one-house",
        "bill-on-desk",
      ].filter((key) => fact.has(key));
      expect(
        stages.length,
        `${here}: ${stages.join(", ")}`,
      ).toBeLessThanOrEqual(1);
      if (fact.has("bill-filed")) expect(sat, here).toHaveLength(0);
      if (fact.has("bill-held"))
        expect(
          sat.some((row) => !row.heard),
          here,
        ).toBe(true);
      if (fact.has("bill-heard"))
        expect(
          sat.some((row) => row.heard),
          here,
        ).toBe(true);
      // The seat: they vote on it only where they sit in a chamber it goes through.
      expect(fact.has("votes-on-it"), here).toBe(seated);
      // The gift's rank is the gifts table's own order, never a figure.
      const rows = giftsToCampaign(api, filingId).filter(
        (row) =>
          !row.donorId.startsWith("outside:") && row.donorId !== candidateId,
      );
      const mineRow = rows.find((row) => row.donorId === donorId)!;
      const others = rows.filter((row) => row !== mineRow);
      if (fact.has("gift-biggest"))
        expect(
          others.every((row) => row.totalMinor < mineRow.totalMinor),
          here,
        ).toBe(true);
      if (fact.has("gift-smallest"))
        expect(
          others.every((row) => row.totalMinor > mineRow.totalMinor),
          here,
        ).toBe(true);
      if (fact.has("gift-first")) expect(others, here).toHaveLength(0);
      expect(fact.get("gift-weight")?.text ?? "", here).not.toMatch(/\d/);
      // A caught lie names someone who would know and a bill that has not moved.
      if (fact.has("knows-truth")) {
        expect(fact.has("bill-filed") || fact.has("bill-held"), here).toBe(
          true,
        );
        expect(
          [bill.sponsorId, ...sat.map((row) => row.chairId)],
          here,
        ).toContain(
          fact
            .get("source")!
            .recordIds.find(
              (id) =>
                id === bill.sponsorId || sat.some((row) => row.chairId === id),
            ),
        );
      }
      checked += 1;
    }
    expect(checked, where).toBeGreaterThan(0);
    return;
  }
  expect.fail(`seed ${seed}: ${passed.join("; ")}`);
}, 3_600_000);
