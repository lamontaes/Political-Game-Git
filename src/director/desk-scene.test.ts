import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { PLATFORM_QUESTIONS } from "../core2/campaign-views";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { localClerkFor } from "../core2/modules/filing-clerk";
import { lawInForce } from "../core2/modules/laws";
import {
  authorityFor,
  castMemberVote,
  draftBill,
  holdVote,
  mayorVeto,
  type Provision,
} from "../core2/modules/legislature";
import { townSeats } from "../core2/modules/offices";
import { servingStaffOf } from "../core2/modules/staff";
import { coreAPI } from "../core2/state";
import { spokenDesignation } from "../english/bill-names";
import type { PersonId } from "../core2/types";
import { purposeScene } from "./purpose-scene";

// A bill on the player's desk is a scene (owner, Oct 24: "fix the goddamn
// scenes"). When the council passes a bill and the mayor, the player, has a
// veto under the state's law, the legislature records the presentment
// (bill-presented); the mayor's aide, or the town's clerk where they have
// none, brings it to sign or veto, and the talk names the bill from that
// record. Places are drawn in turn until one's mayor has a veto.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const ATTEMPTS = 8;

it(`a bill presented to the mayor's desk is the desk scene, brought by their aide or the clerk (seed ${seed})`, () => {
  const tried: string[] = [];
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const place = drawPlace(`${seed}:${attempt}`, "desk-scene");
    const where = `${place.name} (${place.key}), seed ${seed}:${attempt}`;
    setBookkeeping(false);
    const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const seats = townSeats(api);
    const mayor = seats.find(
      (row) =>
        row.office.kind === "mayor" &&
        core.people.get(row.holder?.personId ?? "")?.alive,
    )?.holder?.personId;
    const council = seats.filter(
      (row) =>
        row.office.kind === "council" &&
        core.people.get(row.holder?.personId ?? "")?.alive,
    );
    // A raise where the state lets towns set a wage; elsewhere a policy
    // question the town may answer.
    const wage: Provision = {
      kind: "law-amount",
      series: "minimum-wage",
      value: (lawInForce(api, "minimum-wage").value ?? 0) + 100,
      unit: "minor/hour",
    };
    const provision = [
      wage,
      ...PLATFORM_QUESTIONS.map((question): Provision => ({
        kind: "policy-question",
        question,
        value: 1,
      })),
    ].find((row) => authorityFor(api, row).allowed);
    const missing = !mayor
      ? "no mayor who is a full person"
      : !council.length
        ? "no council"
        : !mayorVeto(api).veto
          ? "the state's law gives the mayor no veto"
          : !provision
            ? "no question the town may answer"
            : null;
    if (missing) {
      tried.push(`${place.name}: ${missing}`);
      continue;
    }
    core.playerId = mayor!;
    director.watch(core, mayor!);
    const bill = draftBill(api, {
      bodyOfficeId: council[0]!.office.id,
      sponsorId: council[0]!.holder!.personId!,
      provisions: [provision!],
    });
    for (const seat of council)
      castMemberVote(api, bill.id, seat.holder!.personId!, "yes");
    const waiting = holdVote(api, bill.id);
    expect(waiting.status, where).toBe("awaiting-signature");
    advanceCore(core, addDays(makeIsoDate(core.date), 1));

    // The presentment is on the record, naming the mayor and their office.
    const presented = core.durableLog.get(`bill-presented:${bill.id}`);
    expect(presented?.facts?.executiveId, where).toBe(mayor);
    const book = director.ledger.people.get(mayor! as PersonId)!;
    const entry = book.schedule.find((row) =>
      row.momentId.includes(presented!.id),
    );
    const binding = entry?.bindings.find((row) => row.typeKey === "desk-bill");
    expect(binding, `${where}: no desk scene`).toBeTruthy();
    // The aide is one the mayor hired, else the town's clerk.
    const staff = servingStaffOf(api, mayor!).map((row) => row.personId);
    const clerk = localClerkFor(api, "municipalOffice")?.personId;
    const aide = binding!.roles.find((row) => row.role === "aide")!.personIds;
    expect(aide.length, where).toBe(1);
    expect(staff.length ? staff : [clerk], where).toContain(aide[0]);
    expect(binding!.setting, where).toEqual({
      kind: "office",
      recordId: presented!.facts!.officeId,
    });
    // The talk names the bill from the record and stands on it.
    const result = purposeScene(core, director, mayor! as PersonId, entry!, {
      includeHeld: true,
    });
    expect(result?.kind, where).toBe("composed");
    if (result?.kind !== "composed") return;
    // Said as a clerk reads it: "Ordinance 2025-1".
    const said = spokenDesignation(bill.number, bill.form.kind);
    const bill_ = result.scene.facts.find((row) => row.key === "bill");
    expect(bill_?.text, where).toBe(said);
    expect(bill_?.recordIds, where).toContain(presented!.id);
    expect(result.scene.cause.id, where).toBe(presented!.id);
    expect(
      result.scene.talk.lines.some((line) => line.text.includes(said)),
      where,
    ).toBe(true);
    console.log(
      `DESK ${where}: ${said}, aide ${aide[0]} (${staff.length ? "staff" : "clerk"})\n${result.scene.talk.lines.map((line) => `  ${line.text}`).join("\n")}`,
    );
    return;
  }
  throw new Error(
    `no drawn place put a bill on the mayor's desk: ${tried.join("; ")} (seed ${seed})`,
  );
}, 3_600_000);
