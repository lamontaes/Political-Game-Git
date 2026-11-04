/**
 * The mayor's desk from play (gov-m3-05-player-signs-one-vetoes-another,
 * M3-05): in a place whose form of government gives the mayor a veto, the
 * player sits as mayor, the council passes two ordinances by its own vote,
 * and the player signs one and vetoes the other through the desk
 * (`deskDecide`, the route the play screen calls). Each is kept as an office
 * act on the bill's record, the signed one becomes law in force and the
 * vetoed one ends or is overridden by the council's own vote. The council's
 * yes is a stand-in (ruling 4, test files only): each member's choice is set
 * so the bills pass, and the engine counts the vote. A place drawn from all
 * 56; one with no mayoral veto, or no mayor, is passed over by name.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { billCatalog, provisionFor } from "../core2/bill-catalog";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import {
  billOf,
  bodyOf,
  castMemberVote,
  draftBill,
  holdVote,
  mayorVeto,
  memberKey,
  members,
} from "../core2/modules/legislature";
import { lawInForce } from "../core2/modules/laws";
import { officeActsOf } from "../core2/modules/office-day";
import { townSeats } from "../core2/modules/offices";
import { coreAPI, fillInPerson } from "../core2/state";
import type { PersonId } from "../core2/types";
import { deskDecide } from "./office";
import { buildBenchWorld } from "./world";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const DRAWS = 10;

it(`as mayor the player signs one ordinance and vetoes another at the desk, each kept with its act (seed ${seed})`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  for (let draw = 0; draw < DRAWS; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "office-desk");
    const where = `${place.name} (${place.key}), run seed ${seed} draw ${draw}, world seed ${place.seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const seats = townSeats(api);
    const mayor = seats.find(
      (row) => row.office.kind === "mayor" && row.holder?.personId,
    )?.holder?.personId;
    const council = seats.find(
      (row) =>
        row.office.level === "city" &&
        row.office.kind !== "mayor" &&
        bodyOf(api, row.office.id) &&
        members(api, row.office.id).length >= 3,
    )?.office;
    if (!mayor || !council) {
      tried.push(`${where}: no mayor and council`);
      continue;
    }
    if (!mayorVeto(api).veto) {
      tried.push(`${where}: the mayor has no veto here`);
      continue;
    }
    fillInPerson(core, mayor);
    core.playerId = mayor as PersonId;
    const ids = members(api, council.id).map(memberKey);
    const sponsor = ids.find((id) => id !== mayor)!;
    fillInPerson(core, sponsor);
    const policies = billCatalog(api, "city")
      .flatMap((subject) => subject.topics.flatMap((topic) => topic.policies))
      .filter((row) => row.kind === "policy-question" && row.authority.allowed);
    if (policies.length < 2) {
      tried.push(`${where}: fewer than two policies the town may enact`);
      continue;
    }
    const bills = policies.slice(0, 2).map((policy) =>
      draftBill(api, {
        bodyOfficeId: council.id,
        sponsorId: sponsor,
        provisions: [provisionFor({ policyId: policy.id, operation: "enact" })],
      }),
    );
    // The stand-in: the council's members choose yes; the engine counts it.
    for (const bill of bills)
      for (const id of ids) castMemberVote(api, bill.id, id, "yes");
    const voted = bills.map((bill) => holdVote(api, bill.id));
    if (voted.some((bill) => bill.status !== "awaiting-signature")) {
      tried.push(
        `${where}: after the vote ${voted.map((b) => `${b.id} ${b.status}`).join(", ")}`,
      );
      continue;
    }
    // The player signs the first and vetoes the second at the desk.
    const signed = deskDecide(core, bills[0]!.id, "sign");
    const vetoed = deskDecide(core, bills[1]!.id, "veto");
    expect(["signed", "enacted"], `${where}: ${signed.id}`).toContain(
      billOf(api, signed.id).status,
    );
    expect(["vetoed", "overridden"], `${where}: ${vetoed.id}`).toContain(
      billOf(api, vetoed.id).status,
    );
    // The signed ordinance is the law in force on its question now.
    const question = String(billOf(api, signed.id).provisions[0]!.question);
    const number = billOf(api, signed.id).number;
    const townRow = lawInForce(api, question, "2026-06-01")
      .levels.map(
        (level) =>
          level.row as { id: string; level: string; source?: string } | null,
      )
      .find(
        (row) => row?.level === "city" && String(row.source).includes(number),
      );
    expect(
      townRow,
      `${where}: no town law in force from ${number}`,
    ).toBeTruthy();
    const acts = officeActsOf(api, mayor);
    const signAct = acts.find(
      (row) => row.kind === "sign" && row.recordId === signed.id,
    );
    const vetoAct = acts.find(
      (row) => row.kind === "veto" && row.recordId === vetoed.id,
    );
    expect(signAct, `${where}: no sign act for ${signed.id}`).toBeTruthy();
    expect(vetoAct, `${where}: no veto act for ${vetoed.id}`).toBeTruthy();
    expect(signAct!.how).toBe("did");
    expect(vetoAct!.how).toBe("did");
    process.stdout.write(
      `OFFICE DESK ${where}: mayor ${mayor} signed ${signed.id} (${billOf(api, signed.id).status}, law in force ${townRow!.id}) and vetoed ${vetoed.id} (${billOf(api, vetoed.id).status})${tried.length ? `; passed over: ${tried.join("; ")}` : ""}\n`,
    );
    return;
  }
  expect.fail(`seed ${seed}: ${tried.join("; ")}`);
}, 1_800_000);
