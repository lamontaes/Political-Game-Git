import { describe, expect, it } from "vitest";
import {
  adultLifeIn,
  passUntil,
} from "../../tests/fixtures/state-executive-entry";

import { addDays, candidacyPackForJurisdiction } from "../simulation";
import { fileForOffice } from "./campaign-projection";
import { projectJournalView } from "./journal-views";
import { submitTimeCommand, type TimeCommand } from "./time-command";
import { letStoryTimePass } from "./life-story";

/**
 * A Nevada Assembly win in the long playthrough came with no notice: the week
 * control ran straight through election day. A skip now stops the morning
 * after the player's own election, says how it came out, and the journal
 * keeps it.
 */
describe("the clock stops for the player's own election", () => {
  function filedNearElection() {
    const { world, personId } = adultLifeIn("NV", "own-election-stop");
    const office = candidacyPackForJurisdiction(
      world.people[personId]!.homeJurisdictionId,
    )!.offices[0]!;
    const filed = fileForOffice(world, personId, null, office.officeKey);
    const contest = filed.history.electionContests!.at(-1)!;
    // Get within a few days of it without skipping over it.
    const near = passUntil(filed, addDays(contest.electionDate, -3));
    return { world: near, personId, contest };
  }

  it("stops a week skip the morning after election day and reports the result", () => {
    const { world, personId, contest } = filedNearElection();
    const command: TimeCommand = { kind: "days", days: 7 };
    const { world: after, receipt } = submitTimeCommand(world, {
      requestId: "week",
      personId,
      sourceMoment: world.currentMoment,
      command,
    });
    expect(after.currentDate).toBe(addDays(contest.electionDate, 1));
    expect(receipt.outcome).toMatch(
      /^Election results are in\. You (won|lost) the race for .+, \d+\.\d% to \d+\.\d%\./,
    );
    const journal = projectJournalView(after, personId, "years", null);
    const texts = journal.sections.flatMap((section) =>
      section.entries.map((entry) => entry.text),
    );
    expect(
      texts.some((text) => /^You (won|lost) the race for /.test(text)),
    ).toBe(true);
  }, 600_000);

  it("ends a quiet stretch of the life story there too", () => {
    const { world, personId, contest } = filedNearElection();
    const after = letStoryTimePass(world, personId);
    expect(after.currentDate).toBe(addDays(contest.electionDate, 1));
  }, 600_000);
});
