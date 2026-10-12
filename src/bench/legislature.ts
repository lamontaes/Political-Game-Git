import { coreAPI } from "../core2/state";
import { lawHere } from "../core2/modules/laws";
import {
  billOf,
  currentAmount,
  draftBill,
  learnStake,
  memberKey,
  offerDeal,
  scheduleVote,
  votesOn,
  type BillRow,
  type Provision,
} from "../core2/modules/legislature";
import type { TermRow } from "../core2/modules/offices";
import effects from "../core2/data/laws/policy-effects.json" with { type: "json" };
import type { CoreState } from "../core2/types";

const OFFICES = "core2-offices-v1";
const LEGISLATURE = "core2-legislature-v1";

function terms(core: CoreState) {
  return coreAPI(core).moduleState(OFFICES).table("terms");
}
function name(core: CoreState, key: string): string {
  const person = core.people.get(key);
  if (person) return `${person.givenName} ${person.familyName}`;
  const term = terms(core).get(key.replace(/^official:/, "")) as
    TermRow | undefined;
  return term ? `${term.identity.givenName} ${term.identity.familyName}` : key;
}

/** The bodies the person sits on (more than one seat), with their colleagues. */
function bodiesOf(core: CoreState, personId: string) {
  const api = coreAPI(core);
  const offices = api.moduleState(OFFICES);
  const mine = (
    terms(core).query("byPerson", [personId]) as unknown as TermRow[]
  ).filter((row) => row.status === "serving");
  return mine.flatMap((term) => {
    const office = offices.table("offices").get(term.officeId) as
      { id: string; title: string; seats: number; level: string } | undefined;
    if (!office || office.seats < 2) return [];
    const members = (
      offices.table("seats").query("byOffice", [office.id]) as unknown as {
        id: string;
      }[]
    ).flatMap(
      (seat) =>
        terms(core).query("bySeatStatus", [
          seat.id,
          "serving",
        ]) as unknown as TermRow[],
    );
    return [
      {
        officeId: office.id,
        title: office.title,
        level: office.level,
        members: members.map((row) => ({
          key: memberKey(row),
          name: name(core, memberKey(row)),
          party: row.party,
          you: row.personId === personId,
        })),
      },
    ];
  });
}

/** Your seat: the bodies you sit on, what you could change, and your bills. */
export function seatView(core: CoreState, personId: string) {
  if (!core.modules.has(LEGISLATURE))
    return { bodies: [], bills: [], amounts: [], questions: [] };
  const api = coreAPI(core);
  const bills = (
    api.moduleState(LEGISLATURE).table("bills").rows() as unknown as BillRow[]
  )
    .filter((row) => row.sponsorId === personId)
    .map((bill) => ({
      bill,
      votes: votesOn(api, bill.id).map((row) => ({
        ...row,
        name: name(core, row.memberId),
      })),
    }));
  return {
    bodies: bodiesOf(core, personId),
    amounts: lawHere(api).map((row) => ({
      series: row.series,
      unit: row.unit,
      current: currentAmount(api, row.series),
    })),
    questions: Object.keys(
      (effects as unknown as { effects: Record<string, unknown> }).effects,
    ),
    bills,
  };
}

/** One act from your seat: draft, ask a colleague, offer a deal, schedule the vote. */
export function seatAct(
  core: CoreState,
  personId: string,
  input: {
    kind: string;
    officeId?: string;
    billId?: string;
    memberId?: string;
    series?: string;
    question?: string;
    value?: number;
    deal?: string;
  },
) {
  const api = coreAPI(core);
  if (input.billId && billOf(api, input.billId)?.sponsorId !== personId)
    throw new Error("That is not your bill.");
  switch (input.kind) {
    case "draft": {
      if (!bodiesOf(core, personId).some((b) => b.officeId === input.officeId))
        throw new Error("You don't sit on that body.");
      const provision: Provision = input.series
        ? {
            kind: "law-amount",
            series: input.series,
            value: input.value ?? 0,
            unit:
              lawHere(api).find((row) => row.series === input.series)?.unit ??
              undefined,
          }
        : {
            kind: "policy-question",
            question: input.question ?? "",
            value: input.value ?? 1,
          };
      return draftBill(api, {
        bodyOfficeId: input.officeId!,
        sponsorId: personId,
        provisions: [provision],
      });
    }
    case "stake":
      return learnStake(api, input.billId!, input.memberId!, "conversation");
    case "deal":
      return offerDeal(api, {
        billId: input.billId!,
        memberId: input.memberId!,
        kind: (input.deal ?? "favor") as "favor" | "back-their-item",
      });
    case "schedule":
      return { date: scheduleVote(api, input.billId!) };
    default:
      throw new Error("Unknown act from your seat.");
  }
}
