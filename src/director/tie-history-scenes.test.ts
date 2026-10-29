/**
 * A known person never gets a stranger's scene (owner, Oct 27, 4 PM Eastern:
 * "these scenes aren't making sense... These scenes have zero depth to
 * them"). In the owner's sitting a campaign volunteer, two months on, opened
 * "You've been running into Brian Shah around town... Nice to see you. What
 * do you do?" with four replies that were one answer reworded. In a drawn
 * place the player files, takes the season's volunteers and plays to
 * election day: no one on the campaign is cast in a becoming-friends scene,
 * the talk with them never asks what the other does, and every set of
 * replies is distinct moves.
 */
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { applyChosenPerson } from "../bench/creator";
import { fileForOffice } from "../bench/government";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { campaignFor, enlistVolunteer } from "../core2/modules/campaigns";
import { openContests } from "../core2/modules/elections";
import { sharedHistory } from "../core2/shared-history";
import { coreAPI, registerModule } from "../core2/state";
import { advanceCore } from "../core2/life";
import type { PersonId } from "../core2/types";
import { openConversation } from "./conversation";

const proof: string[] = [];
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(10).toString("hex");

it("a campaign volunteer is met as someone known, with distinct replies", () => {
  const tried: string[] = [];
  for (let draw = 0; draw < 8; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "tie-history-scenes");
    const where = `${place.name} (${place.key}), seed ${seed}:${draw}`;
    setBookkeeping(false);
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const { core, director } = world;
    const me = world.playerId! as PersonId;
    applyChosenPerson(core, me, {
      givenName: "Pat",
      familyName: core.people.get(me)!.familyName,
      gender: "female",
      birthYear: 1985,
      birthMonth: 6,
      birthDay: 1,
    });
    director.watch(core, me);
    const api = coreAPI(core);
    const filed = [...openContests(api)]
      .filter((c) => c.electionDate >= addDays(makeIsoDate(core.date), 60))
      .sort(
        (a, b) =>
          a.electionDate.localeCompare(b.electionDate) ||
          a.id.localeCompare(b.id),
      )
      .find((c) =>
        ["petitioning", "on-ballot"].includes(
          (fileForOffice(core, me, c.id) as { filing?: { status?: string } })
            .filing?.status ?? "",
        ),
      );
    if (!filed) {
      tried.push(`${where}: no race two months out the player could enter`);
      continue;
    }
    const filingId = `filing:${filed.id}:${me}`;
    // The people the player knows outside the household say yes to the
    // campaign, as the owner's volunteer did, and the season plays.
    // A player who just turned 18 may know only family at the start (no
    // schooling before the start is simulated yet, SG-WIRE-PEOPLE-SCHOOLMATES),
    // so townspeople they meet on the campaign make up the rest, met as the
    // encounters engine meets a group's members.
    const household = core.people.get(me)!.householdId;
    const known = [...core.people.get(me)!.knownIds]
      .sort()
      .filter((id) => core.people.get(id)?.householdId !== household);
    const town = [...core.people.values()]
      .filter(
        (row) =>
          row.alive &&
          row.tier !== "husk" &&
          row.householdId !== household &&
          !core.people.get(me)!.familyIds.has(row.id) &&
          !known.includes(row.id),
      )
      .map((row) => row.id)
      .sort();
    for (const id of [...known, ...town].slice(0, 12)) {
      if (!enlistVolunteer(api, filingId, id)) continue;
      api.meet(me, id as PersonId, {
        placeId: core.people.get(me)!.placeId,
        sourceId: filingId,
        cause: "met-in-group",
        hours: 1,
      });
    }
    const volunteers = campaignFor(api, filingId).volunteerIds;
    if (!volunteers.length) {
      tried.push(`${where}: nobody the player knows could volunteer`);
      continue;
    }
    for (const id of volunteers)
      expect(
        sharedHistory(core, me, id as PersonId).map((row) => row.kind),
        `${where}: ${id}`,
      ).toContain("campaign");
    // Hours on the campaign together: each day the first few volunteers
    // spend an evening with the candidate (a stand-in for the canvass and
    // the phone bank, which do not yet put the candidate and a volunteer in
    // one place), so their ties grow and turn inside the core's own day.
    const together = volunteers.slice(0, 4) as PersonId[];
    registerModule(core, {
      id: "test-campaign-evenings",
      onDay: (dayApi) => {
        for (const id of together) dayApi.relationship(me, id, "contact", 3);
      },
    });
    const stop = [
      addDays(makeIsoDate(core.date), 120),
      filed.electionDate,
    ].sort()[0]!;
    while (core.date < stop)
      advanceCore(core, [addDays(makeIsoDate(core.date), 7), stop].sort()[0]!);
    const book = director.ledger.people.get(me)!;
    const friendsWith = book.schedule.flatMap((entry) =>
      entry.bindings
        .filter((row) => row.typeKey === "becoming-friends")
        .flatMap((row) => row.roles.flatMap((role) => role.personIds)),
    );
    for (const id of volunteers)
      expect(friendsWith, `${where}: ${id} cast as a stranger`).not.toContain(
        id,
      );
    // The ties grown on the campaign are told as that history.
    const campaignTies = book.moments.filter((m) =>
      m.label.startsWith("tie:contact:campaign"),
    );
    // A place whose volunteers are all kin tells their ties as family, which
    // is right; it has no campaign tie to check, so it is passed over.
    if (!campaignTies.length) {
      tried.push(
        `${where}: no campaign tie moment; ties ${book.moments
          .filter((m) => m.label.startsWith("tie:"))
          .map((m) => m.label)
          .slice(0, 6)
          .join("; ")}`,
      );
      continue;
    }
    for (const m of campaignTies)
      expect(volunteers, `${where}: ${m.id}`).toContain(m.counterpartIds[0]);

    for (const id of volunteers.slice(0, 4)) {
      const talk = openConversation(core, me, id as PersonId, { director });
      const said = talk.lines.map((line) => line.text).join(" / ");
      expect(
        talk.lines.some(
          (line) =>
            line.act === "ask" &&
            ["own-work", "own-work-new", "other-work"].includes(line.kind),
        ),
        `${where}: ${id} asked what they do: ${said}`,
      ).toBe(false);
      const moves = talk.choices.map((row) =>
        row.move.startsWith("ack:") ? "ack" : row.move,
      );
      expect(new Set(moves).size, `${where}: ${id} ${moves.join(", ")}`).toBe(
        moves.length,
      );
      proof.push(
        `${where}: talk with ${id}: ${said} | replies ${talk.choices.map((c) => `"${c.text}" (${c.move})`).join(", ")}`,
      );
    }
    proof.push(
      `${where}: ${volunteers.length} volunteers on ${filingId}; ${campaignTies.length} campaign tie moments (${campaignTies
        .slice(0, 3)
        .map((m) => m.id)
        .join(", ")}); becoming-friends casts ${friendsWith.length}`,
    );
    // The proof, by place, seed and record id (the runner keeps no console).
    writeFileSync(
      path.join(tmpdir(), "tie-history-proof.txt"),
      `${proof.join("\n")}\n`,
    );
    return;
  }
  throw new Error(`No drawn place gave a campaign:\n${tried.join("\n")}`);
}, 900_000);
