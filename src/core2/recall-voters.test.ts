/**
 * A recall's signers and voters are the town's voters: in a prison town of a
 * state that bars people held in prison from voting, the counted residents of
 * the prison's rooms neither sign the petition nor vote on it. Pinned place
 * and seed (no draw): Avenal, California (0603302), a prison town in a
 * barring state whose places have a recall, seed "recall-voters-1".
 *
 * The recall comes from play: a council member's bill on the most divisive
 * question is held to a vote, it is enacted, and a month later the most
 * aggrieved resident has organized a petition. No signature is written by
 * hand. Before the one reader (Nov 15) the petition's signatures counted the
 * prison's rooms (3,600 signatures on this seed); with it, 1,992.
 */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { personStance } from "./campaign-views";
import { PLATFORM_QUESTIONS } from "./campaign-data";
import { ageOn } from "./counted-groups";
import { countedResidents } from "./electorate";
import { gameStartDate } from "./game-start";
import { countedVoters } from "./law-reach/group-a-voting";
import { advanceCore } from "./life";
import { lawChain } from "./modules/laws";
import { draftBill, holdVote } from "./modules/legislature";
import { townSeats } from "./modules/offices";
import { recallsOf, townVoters } from "./modules/recalls";
import { coreAPI } from "./state";

const after = (date: string, days: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000)
    .toISOString()
    .slice(0, 10);

it("a prison town's barred rooms neither sign a recall nor vote on it", () => {
  const before = setBookkeeping(false);
  try {
    const { core } = buildBenchWorld("recall-voters-1", gameStartDate(), {
      twoLevel: true,
      placeKey: "0603302" /* Avenal, California */,
    });
    const api = coreAPI(core);
    const town = lawChain(api).townPlaceId;
    const council = townSeats(api).find(
      (s) => s.office.kind === "council" && s.holder?.personId,
    );
    expect(council, "a council member holds a seat").toBeDefined();
    const divisive = [...PLATFORM_QUESTIONS].sort(
      (a, b) =>
        Math.abs(personStance(1, b)) - Math.abs(personStance(1, a)) ||
        a.localeCompare(b),
    );
    for (const question of divisive) {
      const bill = draftBill(api, {
        bodyOfficeId: council!.office.id,
        sponsorId: council!.holder!.personId!,
        provisions: [{ kind: "policy-question", question, value: 1 }],
      });
      if (bill.status === "blocked") continue;
      const voted = holdVote(api, bill.id);
      if (["enacted", "signed", "overridden"].includes(voted.status)) break;
    }
    advanceCore(core, after(api.state.date, 31));
    const recall = recallsOf(api)[0];
    expect(recall, "a recall started by play").toBeDefined();

    // The prison's rooms are in the town and the state bars them.
    const cells = countedResidents(core).filter(
      (c) => c.placeId === town && c.quarters === "adultCorrectional",
    );
    expect(cells.length).toBeGreaterThan(0);
    // The petition's signers and the recall's voters are one list, and none
    // of the prison's rooms is on it.
    const voters = townVoters(api);
    const cellIds = new Set(cells.map((c) => c.id));
    expect(voters.filter((v) => cellIds.has(v.id))).toEqual([]);
    // Its counted part is the one reader of the counted electorate.
    const counted = voters.filter((v) => v.counted).map((v) => v.id);
    const adultAge = api.parameter("votingAge");
    const date = api.state.date;
    expect(counted.sort()).toEqual(
      countedVoters(api)
        .filter(
          (c) => c.placeId === town && ageOn(c.birthDate, date) >= adultAge,
        )
        .map((c) => c.id)
        .sort(),
    );
    // Signatures are whole voters, no more than the town's voters.
    const voterWeight = voters.reduce((n, v) => n + v.weight, 0);
    expect(recall!.signatures).toBeGreaterThan(0);
    expect(recall!.signatures).toBeLessThanOrEqual(Math.round(voterWeight));
  } finally {
    setBookkeeping(before);
  }
}, 240_000);
