/**
 * RULES TO PLAY: a Charlottesville councilor carries a general ordinance from
 * introduction to a recorded effective outcome, by keyboard, in the composed
 * game.
 *
 * The council seats are an explicit, labeled review scenario written into the
 * real creator save before loading (the same pattern as
 * municipal-member.spec.ts). They are not evidence that ordinary election to
 * council works; that producer belongs to NATIONWIDE WORLD/ELECTION. Everything
 * after loading uses the normal controls.
 */
import { test, expect, type Page } from "./fixtures";
import {
  enterLife,
  isPoliticsHubDestination,
  openPoliticsHub,
  saveLife,
  startLife,
} from "./support/creator";
import {
  createBrowserWorldRecord,
  type StoredBrowserWorldRecord,
} from "../../src/presentation/browser-world-repository";
import { deserializeWorld } from "../../src/simulation/serialization";
import {
  installMunicipalGovernment,
  municipalSeats,
  seatMunicipalMember,
} from "../../src/simulation/municipal-public-work";
import { recordOrganizationParticipationState } from "../../src/simulation/life";
import { organizationParticipationStateAt } from "../../src/simulation/life-queries";
import { municipalGovernmentForLifePlace } from "../../src/simulation/municipal-government";
import { lifePlaceByJurisdictionId } from "../../src/simulation/life-places";
import { measureEnactment } from "../../src/simulation/legislation";

const SEAT_LABEL =
  "Review scenario seat, placed for this governing check, not won in an election";

async function goTo(page: Page, id: string) {
  if (isPoliticsHubDestination(id)) return openPoliticsHub(page, id);
  const flyout = page.getByTestId("shell-nav-flyout");
  if (!(await flyout.isVisible()))
    await page.getByTestId("shell-nav-cluster").click();
  await expect(flyout).toBeVisible();
  await page.getByTestId(id).click();
}

async function savedRecord(page: Page): Promise<StoredBrowserWorldRecord> {
  return page.evaluate(async () => {
    const repositoryPath = "/src/presentation/browser-world-repository.ts";
    const { BrowserSaveStore } = await import(
      /* @vite-ignore */ repositoryPath
    );
    const store = new BrowserSaveStore();
    const listing = await store.list();
    const saveId = listing.saves[0]?.saveId;
    if (!saveId) throw new Error("Expected the actual saved review life.");
    const record = await store.inspectRecord(saveId);
    if (!record)
      throw new Error("The saved review life could not be inspected.");
    return record;
  });
}

async function openLocalGovernment(page: Page) {
  await goTo(page, "nav-municipal");
  const panel = page.getByRole("region", { name: "Municipal government" });
  await expect(panel.getByTestId("municipal-ordinances")).toBeVisible();
  return panel;
}

test("a seated Charlottesville councilor passes an ordinance by keyboard and it survives reload", async ({
  page,
}, info) => {
  test.setTimeout(480_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/?seed=rules-to-play-council-ordinance");
  await startLife(page, {
    age: 40,
    place: "Charlottesville, Virginia",
    placeScope: "locality",
    placeQuery: "Charlottesville",
    route: "normal",
  });
  // The generated press and schedules can still be finishing after Begin;
  // wait for the playable surface before the helper's short default timeout.
  await expect(page.getByTestId("play-screen")).toBeVisible({
    timeout: 120_000,
  });
  await enterLife(page);
  await saveLife(page);
  const original = await savedRecord(page);
  const citizen = deserializeWorld(original.payload);
  if (citizen.control.kind !== "person") throw new Error("person control");
  const personId = citizen.control.personId;
  const home = citizen.people[personId]!.homeJurisdictionId;
  const government = municipalGovernmentForLifePlace(
    lifePlaceByJurisdictionId(home)!,
  )!;
  expect(government.key).toBe("us-va-charlottesville");

  let seated = installMunicipalGovernment(citizen, {
    governmentKey: government.key,
    jurisdictionId: home,
    formedAt: citizen.currentDate,
  });
  // The opening seats the council at its charter's size, so the player
  // takes one sitting member's seat; an unseated council is filled here.
  const sitting = municipalSeats(seated, government.key).filter(
    (seat) => seat.role === "member",
  );
  if (sitting.length > 0) {
    const displaced = sitting[0]!;
    const state = organizationParticipationStateAt(
      seated,
      displaced.participationId,
    )!;
    seated = recordOrganizationParticipationState(seated, {
      stableKey: `e2e:${displaced.participationId}:ended`,
      participationId: displaced.participationId,
      effectiveAt: seated.currentDate,
      status: "ended",
      roleKind: state.roleKind,
      context: "Succeeded",
      provenance: { kind: "authored", note: "review scenario" },
      supersedesStateId: state.id,
    });
    seated = seatMunicipalMember(seated, {
      governmentKey: government.key,
      personId,
      startedAt: seated.currentDate,
      role: "member",
      seatLabel: SEAT_LABEL,
    });
  } else {
    const members = [
      personId,
      ...citizen.personOrder.filter((id) => id !== personId).slice(0, 4),
    ];
    expect(members.length).toBeGreaterThanOrEqual(3);
    members.forEach((id, index) => {
      seated = seatMunicipalMember(seated, {
        governmentKey: government.key,
        personId: id,
        startedAt: seated.currentDate,
        role: index === 1 ? "presiding-member" : "member",
        seatLabel: SEAT_LABEL,
      });
    });
  }
  const record = createBrowserWorldRecord(
    seated,
    original.metadata.savedAt,
    original.metadata.createdAt,
    original.saveId,
    original.generation + 1,
  );
  await page.reload();
  await expect(page.getByTestId("continue")).toBeVisible();
  await page.evaluate(async (value) => {
    const repositoryPath = "/src/presentation/browser-world-repository.ts";
    const simulationPath = "/src/simulation/serialization.ts";
    const { BrowserSaveStore } = await import(
      /* @vite-ignore */ repositoryPath
    );
    const { deserializeWorld } = await import(
      /* @vite-ignore */ simulationPath
    );
    const store = new BrowserSaveStore({
      now: () => new Date(value.metadata.savedAt),
    });
    // Observe the actual slot generation before replacing the review fixture.
    // The canonical writer updates its manifest, chunks and summary together.
    const existing = await store.load(value.saveId);
    if (!existing) throw new Error("The original saved life is missing.");
    const saved = await store.save(
      deserializeWorld(value.payload),
      value.saveId,
    );
    if (saved.status !== "saved")
      throw new Error(`Review fixture replacement refused: ${saved.status}`);
    const replaced = await store.inspectRecord(value.saveId);
    if (
      replaced?.saveId !== value.saveId ||
      replaced.metadata.createdAt !== value.metadata.createdAt ||
      replaced.generation < existing.generation ||
      replaced.payload !== value.payload
    )
      throw new Error("Review fixture lost its saved identity or generation.");
  }, record);
  await page.reload();
  await page.getByTestId("continue").click();
  await expect(page.getByTestId("play-screen")).toBeVisible({
    timeout: 120_000,
  });
  await enterLife(page);

  // Introduce by keyboard: type the title and press Enter in the field.
  let panel = await openLocalGovernment(page);
  const beforeProposal = deserializeWorld((await savedRecord(page)).payload);
  const measureCountBeforeProposal =
    beforeProposal.history.legislativeMeasures?.length ?? 0;
  await panel.getByTestId("municipal-proposal-title").fill("Library crossing");
  await panel
    .getByTestId("municipal-proposal-text")
    .fill("The city shall maintain a marked crosswalk at the public library.");
  await panel.getByTestId("propose-municipal-ordinance").press("Enter");
  const proposalPaper = panel.getByTestId("municipal-proposal-paper");
  await expect(proposalPaper).toContainText(
    "PROPOSAL · NOT INTRODUCED · NOT LAW",
  );
  await expect(proposalPaper).toContainText("Library crossing");
  await expect(proposalPaper).toContainText(
    "The city shall maintain a marked crosswalk at the public library.",
  );
  await saveLife(page);
  const savedProposal = deserializeWorld((await savedRecord(page)).payload);
  expect(savedProposal.history.legislativeProposals).toHaveLength(1);
  expect(savedProposal.history.legislativeMeasures?.length ?? 0).toBe(
    measureCountBeforeProposal,
  );
  await page.reload();
  await page.getByTestId("continue").click();
  await expect(page.getByTestId("play-screen")).toBeVisible({
    timeout: 120_000,
  });
  await enterLife(page);
  panel = await openLocalGovernment(page);
  await expect(panel.getByTestId("municipal-proposal-paper")).toContainText(
    "Library crossing",
  );

  await panel.getByRole("button", { name: "Introduce this proposal" }).click();
  // The council's own ordinances are listed too; follow the player's.
  const mine = (region: typeof panel) =>
    region
      .getByTestId("municipal-ordinance")
      .filter({ hasText: "Library crossing" });
  const ordinance = mine(panel);
  await expect(ordinance).toContainText(/ORD \d+: Library crossing/);
  await expect(ordinance).toContainText("not yet on the council agenda");

  // Put it on the agenda with Space.
  await ordinance
    .getByRole("button", { name: "Put on the council agenda" })
    .press("Space");
  await expect(ordinance).toContainText("On the council agenda.");
  await expect(ordinance).toContainText("City Code § 2-97");
  const record_ = ordinance.getByRole("button", {
    name: "Record the council vote",
  });
  await expect(record_).toBeDisabled();
  await expect(ordinance).toContainText("Not before");
  await ordinance.getByLabel("Yea", { exact: true }).check();
  await ordinance.getByText("How other councilors would answer now").click();
  await expect(ordinance).toContainText(
    "each seated councilor would decide from their recorded reasons",
  );
  // No colleague weighs anything on a sidewalk permit, so each goes along
  // with the ordinance before the council rather than sitting it out.
  await expect(
    ordinance.getByRole("listitem").filter({ hasText: "Answered present" }),
  ).toHaveCount(0);
  await page.screenshot({
    path: info.outputPath("ordinance-too-early.png"),
    fullPage: false,
  });

  // Days pass on the shared clock, by the ordinary day control, until the
  // charter's intervening days are over. A day can stop early for something
  // that happens in the life, so the clock is passed until the vote opens.
  await page.keyboard.press("Escape");
  panel = await openLocalGovernment(page);
  let onFloor = mine(panel);
  let vote = onFloor.getByRole("button", { name: "Record the council vote" });
  let outcome = onFloor.getByTestId("municipal-ordinance-outcome");
  for (let day = 0; day < 8; day += 1) {
    if (await outcome.count()) break;
    const yea = onFloor.getByLabel("Yea", { exact: true });
    if (await yea.count()) await yea.check();
    if (await vote.isEnabled()) break;
    const runDay = page.getByTestId("shell-pass-day");
    await expect(runDay).toBeEnabled();
    await runDay.press("Enter");
    await page.waitForTimeout(500);
    panel = await openLocalGovernment(page);
    onFloor = mine(panel);
    vote = onFloor.getByRole("button", { name: "Record the council vote" });
    outcome = onFloor.getByTestId("municipal-ordinance-outcome");
  }
  if (!(await outcome.count())) {
    await expect(vote).toBeEnabled();
    await vote.press("Enter");
    outcome = onFloor.getByTestId("municipal-ordinance-outcome");
  }
  await expect(outcome).toBeVisible();
  const outcomeText = (await outcome.textContent()) ?? "";
  await page.screenshot({
    path: info.outputPath("ordinance-outcome.png"),
    fullPage: false,
  });

  await saveLife(page);
  const after = deserializeWorld((await savedRecord(page)).payload);
  const measure = (after.history.legislativeMeasures ?? []).find(
    (entry) =>
      /^ORD \d+$/.test(entry.designation) &&
      entry.shortTitle === "Library crossing",
  )!;
  const enactment = measureEnactment(after, measure.id);
  if (outcomeText.includes("did not pass")) {
    expect(enactment).toBeNull();
  } else {
    expect(enactment?.effectiveAt).toBe(enactment?.resolvedAt);
    expect(outcomeText).toContain(`in effect from ${enactment?.effectiveAt}`);
  }

  await page.reload();
  await page.getByTestId("continue").click();
  await expect(page.getByTestId("play-screen")).toBeVisible({
    timeout: 120_000,
  });
  await enterLife(page);
  panel = await openLocalGovernment(page);
  await expect(
    mine(panel).getByTestId("municipal-ordinance-outcome"),
  ).toHaveText(outcomeText);
  await info.attach("council-ordinance-proof", {
    contentType: "application/json",
    body: JSON.stringify({
      seed: after.seed,
      governmentKey: government.key,
      measureId: measure.id,
      outcome: outcomeText,
      enactment,
      seatsAreReviewScenario: SEAT_LABEL,
    }),
  });
  expect(errors).toEqual([]);
});
