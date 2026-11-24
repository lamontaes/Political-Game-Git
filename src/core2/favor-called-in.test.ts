/**
 * A favor owed is called in at the next race (campaign-favor-called-in, Lane
 * 1 path 11): a sponsor offers a colleague a favor for their vote, the
 * colleague takes it (an obligation on the legislature's record), and when
 * that colleague later runs, their campaign asks the sponsor to endorse them.
 * The favor weighs in the sponsor's answer, by the obligation's id, and a yes
 * settles it. A place drawn from all 56; GOLDEN_PATH_SEED pins one.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { billCatalog, provisionFor } from "./bill-catalog";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  CAMPAIGNS_MODULE_ID,
  campaignTurn,
  type EndorsementRow,
} from "./modules/campaigns";
import { fileCandidacy, openContests } from "./modules/elections";
import {
  bodyOf,
  draftBill,
  LEGISLATURE_MODULE_ID,
  memberKey,
  members,
  obligationsOwedTo,
  offerDeal,
  type ObligationRow,
} from "./modules/legislature";
import { townSeats } from "./modules/offices";
import { coreAPI, fillInPerson } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const DRAWS = 8;

it(`a colleague who took a favor calls it in when they run, and the sponsor's endorsement settles it (seed ${seed})`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  for (let draw = 0; draw < DRAWS; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "favor-called-in");
    const where = `${place.name} (${place.key}), run seed ${seed} draw ${draw}, world seed ${place.seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const council = townSeats(api).find(
      (row) =>
        row.office.level === "city" &&
        bodyOf(api, row.office.id) &&
        members(api, row.office.id).length >= 3 &&
        members(api, row.office.id).every((term) => term.personId),
    )?.office;
    if (!council) {
      tried.push(`${where}: no town body of three held seats`);
      continue;
    }
    const ids = members(api, council.id).map(memberKey);
    for (const id of ids) fillInPerson(core, id);
    const policy = billCatalog(api, "city")
      .flatMap((subject) => subject.topics.flatMap((topic) => topic.policies))
      .find((row) => row.kind === "policy-question" && row.authority.allowed);
    if (!policy) {
      tried.push(`${where}: no policy the town may enact`);
      continue;
    }
    // A sponsor's bill and a favor offered to each colleague in turn, each
    // taken or declined on the colleague's own position (offerDeal).
    let owed: ObligationRow | undefined;
    for (const sponsor of ids) {
      const bill = draftBill(api, {
        bodyOfficeId: council.id,
        sponsorId: sponsor,
        provisions: [provisionFor({ policyId: policy.id, operation: "enact" })],
      });
      if (bill.status !== "drafted") continue;
      for (const member of ids.filter((id) => id !== sponsor))
        if (
          offerDeal(api, { billId: bill.id, memberId: member, kind: "favor" })
            .accepted
        ) {
          owed = obligationsOwedTo(api, member).find(
            (o) => o.owedBy === sponsor,
          );
          if (owed) break;
        }
      if (owed) break;
    }
    if (!owed) {
      tried.push(`${where}: no colleague took a favor`);
      continue;
    }
    // The colleague runs: the weeks go by until a race they may enter opens.
    let filingId: string | undefined;
    let electionDate = "";
    for (let week = 0; week < 104 && !filingId; week += 1) {
      if (week) advanceCore(core, addDays(makeIsoDate(core.date), 7));
      for (const contest of openContests(api)) {
        if (contest.level !== "city" && contest.level !== "county") continue;
        const result = fileCandidacy(api, {
          personId: owed.owedTo,
          contestId: contest.id,
          platform: [],
        });
        if (result.status === "refused") continue;
        filingId = result.filing.id;
        electionDate = contest.electionDate;
        break;
      }
    }
    if (!filingId || !core.people.get(owed.owedBy)?.alive) {
      tried.push(
        `${where}: ${owed.owedTo} found no race to enter, or the sponsor died`,
      );
      continue;
    }
    campaignTurn(api, filingId, electionDate);
    const asked = api
      .moduleState(CAMPAIGNS_MODULE_ID)
      .table("endorsements")
      .get(`endorsement:${filingId}:${owed.owedBy}`) as unknown as
      EndorsementRow | undefined;
    // The sponsor was asked, and the favor weighed in, by its id.
    expect(asked, `${where}: ${owed.owedBy} was not asked`).toBeTruthy();
    expect(asked!.obligationId, where).toBe(owed.id);
    const row = api
      .moduleState(LEGISLATURE_MODULE_ID)
      .table("obligations")
      .get(owed.id) as unknown as ObligationRow;
    if (asked!.answer !== "yes") {
      // A no leaves the favor owed, to be asked again.
      expect(row.settled, where).toBe(false);
      tried.push(`${where}: ${owed.owedBy} declined (${asked!.reason})`);
      continue;
    }
    expect(row.settled, where).toBe(true);
    expect(row.settledBy, where).toBe(asked!.id);
    process.stdout.write(
      `FAVOR ${where}: ${owed.id} (${owed.owedBy} owed ${owed.owedTo}) called in on ${core.date}; endorsement ${asked!.id} yes (${asked!.reason}); settled by it${tried.length ? `; passed over: ${tried.join("; ")}` : ""}\n`,
    );
    return;
  }
  expect.fail(`seed ${seed}: ${tried.join("; ")}`);
}, 1_800_000);
