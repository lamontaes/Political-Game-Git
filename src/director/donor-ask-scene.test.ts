import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import { billCatalog, provisionFor } from "../core2/bill-catalog";
import { advanceCore } from "../core2/life";
import {
  ELECTIONS_MODULE_ID,
  fileCandidacy,
  openContests,
  type ContestRow,
  type FilingRow,
} from "../core2/modules/elections";
import {
  LEGISLATURE_MODULE_ID,
  draftBill,
  memberKey,
  members,
  type BillRow,
} from "../core2/modules/legislature";
import { townSeats } from "../core2/modules/offices";
import { filingClerkFor } from "../core2/modules/filing-clerk";
import { lawChain } from "../core2/modules/laws";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { purposeScene } from "./purpose-scene";

// A campaign's gift from someone else is a public record (campaign-gift,
// naming the candidate and the donor, the amount, its share of what others
// have given, and a pending bill the donor holds a view on). A first or large
// outside gift is a moment for the candidate, and the donor comes to ask for
// something back: about the bill, when there is one. In the played world a
// resident files for a race counted within the year, watched from the day
// they file as a player is, and campaigns to the count. Places are drawn in
// turn until a race there takes the filing and a donor holds a view on a
// bill pending before its body; most elect only in even years (eight in a
// row in one CI run), so up to 32 are drawn.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const ATTEMPTS = 32;
const YEAR = 365;
const TRIED = 12;
/** How many bills are pending before the body as the campaign starts. */
const PENDING = 6;

it(`a donor's gift is the candidate's donor-ask scene, with the donor (seed ${seed})`, () => {
  const tried: string[] = [];
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const place = drawPlace(`${seed}:${attempt}`, "donor-ask-scene");
    const where = `${place.name} (${place.key}), seed ${seed}:${attempt}`;
    setBookkeeping(false);
    const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const end = addDays(makeIsoDate(core.date), YEAR);
    const counted = (race: ContestRow) =>
      addDays(makeIsoDate(race.electionDate), 1) <= end;
    // Many places elect only in even years: the elections engine holds each
    // seat's next contest from the start.
    if (
      !(
        api
          .moduleState(ELECTIONS_MODULE_ID)
          .table("contests")
          .rows() as unknown as ContestRow[]
      ).some((race) => race.filingDeadline >= core.date && counted(race))
    ) {
      tried.push(`${place.name} (no race counted in the year)`);
      continue;
    }
    const open = () =>
      [...openContests(api)]
        .filter(counted)
        .sort(
          (a, b) =>
            a.electionDate.localeCompare(b.electionDate) ||
            a.id.localeCompare(b.id),
        );
    for (let day = 0; !open().length && day < YEAR; day += 7)
      advanceCore(core, addDays(makeIsoDate(core.date), 7));
    // A council or board race, whose body has bills before it.
    const race = open().find((row) =>
      townSeats(api).some(
        (seat) =>
          seat.office.id === row.officeId &&
          members(api, row.officeId).length > 1,
      ),
    );
    const clerkId = race ? filingClerkFor(api, race.id)?.personId : undefined;
    // Edge case by hand: bills pending before that body as the campaign
    // starts, on several questions, so a donor has one to raise (a town's
    // own bills come and go).
    const sponsor = race ? members(api, race.officeId)[0] : undefined;
    const policies = race
      ? billCatalog(api, race.level as "city" | "county" | "state")
          .flatMap((subject) => subject.topics.flatMap((t) => t.policies))
          .filter(
            (row) => row.kind === "policy-question" && row.authority.allowed,
          )
          .slice(0, PENDING)
      : [];
    const pending =
      race && sponsor
        ? policies.map((policy) =>
            draftBill(api, {
              bodyOfficeId: race.officeId,
              sponsorId: memberKey(sponsor),
              provisions: [
                provisionFor({ policyId: policy.id, operation: "enact" }),
              ],
            }),
          )
        : [];
    const filed = new Set(
      (
        api
          .moduleState(ELECTIONS_MODULE_ID)
          .table("filings")
          .rows() as unknown as FilingRow[]
      ).map((row) => row.personId),
    );
    // An adult of the town who files, watched from the day they file.
    const town = lawChain(api).townPlaceId;
    const candidate = race
      ? [...core.people.values()]
          .filter(
            (p) =>
              p.alive &&
              p.id !== clerkId &&
              !filed.has(p.id) &&
              p.placeId === town &&
              ageOnDate(p.birthDate, core.date) >= 18,
          )
          .sort((a, b) => a.id.localeCompare(b.id))
          .slice(0, TRIED)
          .find((p) => {
            director.watch(core, p.id);
            return ["petitioning", "on-ballot"].includes(
              fileCandidacy(api, {
                personId: p.id,
                contestId: race.id,
                platform: [],
              }).status ?? "",
            );
          })
      : undefined;
    if (!race || !candidate || !pending.length) {
      tried.push(`${place.name} (no council race took a filing)`);
      continue;
    }
    // The campaign runs to the night before the count.
    advanceCore(core, addDays(makeIsoDate(race.electionDate), -1));
    const book = director.ledger.people.get(candidate.id as PersonId)!;
    // The gifts to the candidate from others that were moments for them.
    const gifts = [...core.durableLog.values()].filter(
      (row) =>
        row.kind === "campaign-gift" &&
        row.facts?.candidateId === candidate.id &&
        book.moments.some((moment) => moment.causeId === row.id),
    );
    if (!gifts.length) {
      tried.push(`${place.name} (no gift was a moment)`);
      continue;
    }
    // A gift while bills were pending names the one before the race's body
    // that its donor holds the strongest view on: one the test drafted, or
    // one a member had already brought (a state chamber has many). A donor
    // who holds no view on any of them names none.
    const bills = api.moduleState(LEGISLATURE_MODULE_ID).table("bills");
    const named = gifts.filter((gift) => gift.facts?.billId);
    for (const gift of named)
      expect(
        (
          bills.get(String(gift.facts!.billId)) as unknown as
            BillRow | undefined
        )?.bodyOfficeId,
        `${where}: ${gift.id} named a bill before another body`,
      ).toBe(race.officeId);
    for (const gift of gifts) {
      const donorId = String(gift.facts!.donorId);
      const here = `${where}: ${gift.id}`;
      expect(gift.personIds, here).toEqual([candidate.id, donorId]);
      const entry = book.schedule.find(
        (row) => book.momentsById.get(row.momentId)?.causeId === gift.id,
      );
      const binding = entry?.bindings.find(
        (row) => row.typeKey === "donor-ask",
      );
      expect(binding, `${here}: no donor-ask scene`).toBeTruthy();
      expect(
        binding!.roles.find((row) => row.role === "donor")!.personIds,
        here,
      ).toEqual([donorId]);
      // The donor asks, in the lines that play, as ordinary play says them,
      // and the talk stands on the gift's record.
      const result = purposeScene(
        core,
        director,
        candidate.id as PersonId,
        entry!,
      );
      expect(result?.kind, `${here}: ${JSON.stringify(result)}`).toBe(
        "composed",
      );
      if (result?.kind !== "composed") continue;
      expect(result.scene.cause.id, here).toBe(gift.id);
      expect(result.scene.askerId, here).toBe(donorId);
      const money = result.scene.facts.find((row) => row.key === "money");
      expect(money?.recordIds, here).toContain(gift.id);
      // A donor with a bill pending asks about it, by its own record.
      if (gift.facts!.billId) {
        const bill = result.scene.facts.find((row) => row.key === "bill");
        expect(bill?.recordIds, here).toContain(gift.id);
        expect(result.scene.talk.state.text, here).toContain(bill!.text);
      }
      console.log(
        `DONOR ASK ${here}: ${money!.text}${gift.facts!.number ? ` (${gift.facts!.number})` : ""}; "${result.scene.talk.state.text}"`,
      );
    }
    // Places are drawn on until a donor holds a view on a pending bill, so
    // the ask about it is seen too.
    if (named.length) return;
    tried.push(
      `${place.name} (no donor of ${gifts.length} held a view on a pending bill)`,
    );
  }
  throw new Error(
    `no campaign took a gift naming a pending bill in ${tried.join("; ")} (seed ${seed})`,
  );
}, 3_600_000);
