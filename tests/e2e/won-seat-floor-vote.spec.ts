import { expect, test } from "./fixtures";
import {
  enterLife,
  goTo,
  openPoliticsHub,
  passShellTime,
  saveLife,
  shellIdentity,
  waitForClockIdle,
} from "./support/creator";

/**
 * A player who won an ordinary Oregon state House election decides a floor
 * vote on the Work screen, keeps the decision across a save and reload, and
 * later reads the bill as law with their own vote on its roll call.
 *
 * The life is generated, filed for its home House district and run to a
 * supplied win in the page, then passed as a member to the week of HB 406's
 * floor vote with the simulation's own day runner (a year and a half is not
 * clicked through). Everything after that is the player's own route: the
 * Work screen, Save, the corner clock, the Calendar's Attend for each
 * "Decide your vote" reminder, and the bill's page under Government.
 */
test("a won Oregon House seat decides a floor vote that later becomes law", async ({
  page,
}) => {
  test.setTimeout(1_200_000);
  await page.goto("/");
  await expect(page.getByTestId("new-game")).toBeVisible({ timeout: 90_000 });

  const measureId = await page.evaluate(async () => {
    const fixturePath = "/tests/fixtures/state-executive-entry.ts";
    const campaignPath = "/tests/fixtures/campaign-fixture.ts";
    const storePath = "/src/presentation/browser-world-repository.ts";
    const catalogPath = "/src/districts/catalog.ts";
    const queryPath = "/src/districts/query.ts";
    const simulationPath = "/src/simulation/index.ts";
    const timeWorkPath = "/src/simulation/time-work.ts";
    const calendarPath = "/src/presentation/calendar-time-control.ts";
    const { adultLifeAt, runToElection, passUntil, suppliedWin } = await import(
      /* @vite-ignore */ fixturePath
    );
    const { fileForOffice } = await import(/* @vite-ignore */ campaignPath);
    const { BrowserSaveStore } = await import(/* @vite-ignore */ storePath);
    const { districtIdentityCatalog } = await import(
      /* @vite-ignore */ catalogPath
    );
    const { districtMembershipFromCanonicalHome } = await import(
      /* @vite-ignore */ queryPath
    );
    const {
      searchLifePlaces,
      workRelationshipHistoryForPerson,
      compareSimulationMoments,
    } = await import(/* @vite-ignore */ simulationPath);
    const { scheduledActivityState } = await import(
      /* @vite-ignore */ timeWorkPath
    );
    const { playCalendarActivity } = await import(
      /* @vite-ignore */ calendarPath
    );

    const membershipOf = (place: {
      jurisdictionId: string;
      sourceGeoid: string;
    }) =>
      districtMembershipFromCanonicalHome({
        homeJurisdictionId: place.jurisdictionId,
        catalog: districtIdentityCatalog(),
        placeGeoid: place.sourceGeoid,
        chamber: "state-lower",
      });
    // The first Oregon town that lies inside one state House district.
    const place = searchLifePlaces("", 200, {
      stateJurisdictionKey: "US-OR",
      scope: "locality",
    }).find(
      (candidate: { sourceGeoid?: string; jurisdictionId: string }) =>
        candidate.sourceGeoid &&
        membershipOf(
          candidate as { jurisdictionId: string; sourceGeoid: string },
        ).kind === "known",
    );
    const membership = membershipOf(place);
    if (membership.kind !== "known") throw new Error("No home district.");

    const { world, personId } = adultLifeAt(place.key, "won-seat-roll-OR");
    const decided = runToElection(
      fileForOffice(world, personId, membership.binding),
      personId,
      suppliedWin(personId),
    );
    const seat = workRelationshipHistoryForPerson(decided, personId).find(
      (relation: { kind: string }) =>
        relation.kind === "employment:legislative-member",
    );
    if (!seat) throw new Error("The win seated no one.");

    // A seated member's clock stops for each "Decide your vote" reminder;
    // attend it (deciding nothing, so those votes record the player absent)
    // and go on, as the reminders' own unit test does.
    type Moment = { date: string };
    let next = passUntil(decided, seat.startedAt);
    const target = "2027-04-02";
    for (let step = 0; step < 400 && next.currentDate < target; step += 1) {
      const moved = passUntil(next, target);
      if (moved.currentDate !== next.currentDate) {
        next = moved;
        continue;
      }
      const due = moved.history.scheduledActivities.find(
        (activity: {
          id: string;
          stableKey: string;
          participantPersonIds: string[];
        }) =>
          activity.stableKey.includes(":member-vote:") &&
          activity.participantPersonIds.includes(personId) &&
          scheduledActivityState(moved, activity.id).status === "scheduled" &&
          compareSimulationMoments(
            scheduledActivityState(moved, activity.id).start as Moment,
            moved.currentMoment,
          ) === 0,
      );
      if (!due) throw new Error(`The clock stopped at ${moved.currentDate}.`);
      next = playCalendarActivity(moved, personId, due.id).world;
    }
    const bill = (
      next.history.legislativeMeasures as {
        id: string;
        designation: string;
        rulePackId: string;
      }[]
    ).find(
      (measure) =>
        measure.designation === "HB 406" && /OR/i.test(measure.rulePackId),
    );
    if (!bill) throw new Error("HB 406 is not on record.");

    const store = new BrowserSaveStore();
    const saved = await store.save(next, store.newSaveId(next));
    if (saved.status !== "saved")
      throw new Error(`The seated save was refused: ${saved.status}`);
    return bill.id;
  });

  const reopen = async () => {
    await page.reload();
    await page.getByTestId("continue").click();
    await enterLife(page);
  };
  await reopen();
  expect(await shellIdentity(page)).toContain("2027");

  // The Work screen lists HB 406's floor vote, and the member decides it.
  await goTo(page, "elsewhere-work");
  const row = page
    .getByTestId("member-vote")
    .filter({ hasText: "HB 406" })
    .filter({ hasText: "pass it?" });
  await expect(row).toHaveCount(1);
  await expect(row).toContainText("The vote is on April 4, 2027.");
  await row.getByTestId("member-vote-yea").click();
  await expect(row.getByRole("status")).toHaveText("You will vote: Yes.");
  await expect(row.getByTestId("member-vote-yea")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByTestId("member-votes").screenshot({
    path: test.info().outputPath("floor-vote-decided.png"),
  });

  // Kept across a save and a reload.
  await saveLife(page);
  await reopen();
  await goTo(page, "elsewhere-work");
  const kept = page
    .getByTestId("member-vote")
    .filter({ hasText: "HB 406" })
    .filter({ hasText: "pass it?" });
  await expect(kept.getByRole("status")).toHaveText("You will vote: Yes.");

  // The corner clock, as a player passes it. A seated member's clock stops
  // for each "Decide your vote" reminder; the player attends it from the
  // Calendar and goes on. HB 406's floor vote is on April 4 and the probe of
  // this life has it enacted on May 9.
  const MONTHS = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const today = async (): Promise<string> => {
    const said = /([A-Z][a-z]+) (\d{1,2}), (\d{4})/.exec(
      await shellIdentity(page),
    );
    const month = said ? MONTHS.indexOf(said[1]!) + 1 : 0;
    if (!said || month === 0)
      throw new Error("The corner does not say the date.");
    return `${said[3]}-${String(month).padStart(2, "0")}-${said[2]!.padStart(2, "0")}`;
  };
  let stops = 0;
  for (
    let press = 0;
    press < 40 && (await today()) < "2027-05-12";
    press += 1
  ) {
    const before = await today();
    await passShellTime(page, "week");
    if ((await today()) !== before) continue;
    // Time did not move: something that needs the player is due now.
    await goTo(page, "elsewhere-day");
    const reminder = page
      .getByTestId(/^calendar-entry-/)
      .filter({ hasText: "Decide your vote" })
      .first();
    await expect(reminder).toBeVisible();
    await reminder.click();
    await page.getByTestId("calendar-play-event").click();
    await waitForClockIdle(page);
    stops += 1;
  }
  expect((await today()) >= "2027-05-12").toBe(true);
  expect(stops).toBeGreaterThan(0);

  // HB 406's own page: Politics, Government, State, the bill on record.
  await openPoliticsHub(page, "nav-politics-government");
  await page.getByTestId("politics-sub-overview").click();
  await page.getByTestId("government-scope-state").click();
  await page.getByTestId(`government-record-${measureId}`).click();
  const detail = page.getByTestId("measure-detail");
  await expect(detail).toHaveAttribute("data-measure-id", measureId);
  await expect(page.getByTestId("measure-designation")).toHaveText("HB 406");
  await expect(page.getByTestId("measure-standing")).toHaveText(
    "The bill is law.",
  );
  await expect(page.getByTestId("measure-history")).toContainText("Became law");
  // The House roll call it shows records this member's Yes.
  const floorVote = page
    .getByTestId("measure-votes")
    .getByRole("listitem")
    .filter({ hasText: "Pass the bill" })
    .filter({ has: page.getByTestId("measure-your-vote") });
  await expect(floorVote).toHaveCount(1);
  await expect(floorVote).toContainText("House");
  await expect(floorVote.getByTestId("measure-your-vote")).toHaveText(
    "You voted Yes.",
  );
  await detail.screenshot({
    path: test.info().outputPath("hb406-law.png"),
  });
});
