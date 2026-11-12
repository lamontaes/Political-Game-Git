/**
 * The card, the journal and Travel tell one record of what a relative does
 * (pool item play-a-relatives-card-and-journal-disagree-on-her-job). A
 * household member who serves in an office, and holds a job beside it, is
 * told with both on their card and in the journal, each line on its own
 * record (the term, the job), and Travel lists the job's employer as a
 * family workplace: all three read `personWorkOf`. Places are drawn from all
 * 56 until one has a household member in office (up to eight per case);
 * each place passed over is named. Replay with RELATIVE_WORK_SEED.
 */
import { randomBytes } from "node:crypto";
import { appendFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { personWorkOf } from "../core2/person-work";
import type { PersonId } from "../core2/types";
import { composeJournal } from "../director/journal";
import { knownCard } from "./card";
import { townPlaces } from "./places";
import { buildBenchWorld } from "./world";

setBookkeeping(false);

const base = process.env.RELATIVE_WORK_SEED ?? randomBytes(8).toString("hex");

describe.each(["a", "b"])("a relative's work and office (case %s)", (draw) => {
  it("is told the same on the card, in the journal and on Travel", () => {
    const passed: string[] = [];
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const seed = `${base}:${draw}:${attempt}`;
      const place = drawPlace(seed, "relative-work-agrees");
      const where = `${place.name} (${place.key}), seed ${seed}`;
      const { core, director, playerId } = buildBenchWorld(
        place.seed,
        gameStartDate(),
        { twoLevel: true, placeKey: place.key },
      );
      const player = playerId! as PersonId;
      const members = (
        core.households.get(core.people.get(player)!.householdId)?.memberIds ??
        []
      ).filter((id) => id !== player && core.people.get(id)?.alive);
      const serving = members.filter(
        (id) => personWorkOf(core, id).offices.length > 0,
      );
      if (!serving.length) {
        passed.push(`${where}: nobody at home serves in an office`);
        continue;
      }
      // The player's journal, as play has it once the player is chosen.
      director.watch(core, player);
      const lines = composeJournal(core, director, player).flatMap(
        (chapter) => chapter.lines,
      );
      const said: string[] = [];
      for (const id of serving) {
        const work = personWorkOf(core, id);
        const card = knownCard(core, player, id);
        const office = work.offices[0]!;
        // The card names the office.
        expect(
          card.summary.join(" "),
          `${where}: ${id}'s card does not name ${office.title} (${office.termId})`,
        ).toMatch(/office|commission|council|board|since|serv/i);
        // The journal tells the office on its term's record.
        // The household-now paragraph tells each earner in one sentence
        // (lead, Nov 11), on the term's record (moment `livelihood:<order>:<person>:<termId>`).
        const officeLine = lines.find(
          (line) =>
            line.momentIds.some((m) => m.endsWith(`:${office.termId}`)) ||
            line.sourceRecordIds.includes(office.termId),
        );
        expect(
          officeLine,
          `${where}: the journal tells no line on ${office.termId}`,
        ).toBeDefined();
        if (work.job) {
          const employer = core.organizations.get(
            work.job.organizationId,
          )?.name;
          // Both on the card: the office line and the job line.
          expect(
            card.summary.length,
            `${where}: ${id} ${card.summary.join(" | ")}`,
          ).toBeGreaterThanOrEqual(2);
          expect(
            card.summary.some((text) =>
              employer
                ? text
                    .toLowerCase()
                    .includes(employer.toLowerCase().split(" ")[0]!)
                : false,
            ),
            `${where}: ${id}'s card does not name ${employer} beside the office: ${card.summary.join(" | ")}`,
          ).toBe(true);
          // And in the journal, in the same sentence as the office (one
          // sentence per person; #8772, #8808), naming the employer.
          const first = (employer ?? "").toLowerCase().split(" ")[0]!;
          const sentence = officeLine!.text
            .split(/(?<=\.)\s+/)
            .find((text) => text.includes(core.people.get(id)!.givenName));
          expect(
            !!first && !!sentence?.toLowerCase().includes(first),
            `${where}: the journal's sentence for ${id} names no ${employer}: "${sentence}"`,
          ).toBe(true);
          // Travel lists the job's employer as a family workplace, where it is pictured.
          const listed = townPlaces(core, player).find(
            (row) => row.organizationId === work.job!.organizationId,
          );
          if (listed)
            expect(
              listed.reasons.some((reason) => reason.kind === "family"),
              `${where}: Travel lists ${employer} without the family reason`,
            ).toBe(true);
        }
        said.push(
          `${id}: card "${card.summary.join(" | ")}"; journal "${officeLine!.text}"; office ${office.termId}${work.job ? `; job ${work.job.id}` : ""}`,
        );
      }
      appendFileSync(
        process.env.RELATIVE_WORK_LOG ?? "/dev/null",
        `\nrelative-work: ${where}; ${said.join("; ")}; passed over: ${passed.join("; ") || "none"}`,
      );
      return;
    }
    throw new Error(
      `no drawn place had someone at home in office: ${passed.join("; ")}`,
    );
  }, 1_800_000);
});
