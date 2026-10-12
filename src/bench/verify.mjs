/* global process, document, fetch, URL, URLSearchParams */
/* Builder receipts from the actual screen; independent finisher acceptance remains pending. */
import { chromium } from "@playwright/test";
import { randomUUID, randomInt } from "node:crypto";
import { writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  executablePath: process.env.BENCH_BROWSER ?? "/usr/bin/chromium",
  headless: true,
});
const page = await browser.newPage();
page.setDefaultTimeout(180000);
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const base = process.env.BENCH_URL ?? "http://localhost:3000";
const receipt = {
  recordedAt: new Date().toISOString(),
  sourceHeads: {},
  openings: [],
  answered: [],
  stops: [],
  traces: [],
  screenErrors: errors,
};
async function clickResponse(selector, path) {
  const response = page.waitForResponse(
    (r) => r.url().includes(path) && r.request().method() === "POST",
  );
  await page.locator(selector).click();
  const r = await response;
  const value = await r.json();
  assert.equal(r.status(), 200, JSON.stringify(value));
  return value;
}
async function build() {
  const seed = randomUUID();
  await page.locator("#seed").fill(seed);
  await page.locator("#date").fill("2026-10-11");
  const value = await clickResponse("#build", "/api/build");
  receipt.sourceHeads = value.sourceHeads;
  receipt.openings.push({
    seed,
    placeKey: value.placeKey,
    placeName: value.placeName,
    jurisdictionKey: value.jurisdictionKey,
    residents: value.residents.length,
    residentReferencesChecked: value.residentReferencesChecked,
    peopleInCore: value.peopleInCore,
    modules: value.modules,
    progress: value.progress,
  });
  assert.equal(value.residents.length, value.residentReferencesChecked);
  assert.equal(value.progress.steps.length, 11);
  assert.deepEqual(
    value.progress.steps.slice(0, 2).map((x) => x.status),
    ["reachable now", "reachable now"],
  );
  assert(value.progress.steps.slice(2).every((x) => x.missingModule));
  assert(
    value.progress.world.every((x) => x.status === "not in the new core yet"),
  );
  assert.equal(value.progress.furthestReachedStep, null);
  return value;
}
async function inspect(person) {
  const response = page.waitForResponse((r) =>
    r.url().includes("/api/resident"),
  );
  await page.locator("#search").fill(person.id);
  await page.locator("#residents button").click();
  const value = await (await response).json();
  assert.equal(value.person.id, person.id);
  return value;
}
async function drain(result) {
  let packet = result.packet;
  for (let i = 0; packet.kind !== "complete"; i++) {
    assert(i < 200, "Bounded screen pause loop");
    await page.waitForFunction(
      (id) =>
        JSON.parse(document.getElementById("clock-detail").textContent || "{}")
          .pauseId === id,
      packet.pauseId,
    );
    if (packet.kind === "choice") {
      const offer =
        packet.offers.find(
          (x) => x.actionId === "attend-scheduled-work-date-segment",
        ) ?? packet.offers[0];
      assert(offer, "An issued choice has an offer");
      receipt.answered.push({
        pauseId: packet.pauseId,
        offerId: offer.offerId,
        actionId: offer.actionId,
        targetId: offer.targetId,
        at: packet.at,
        durationMinutes: offer.durationMinutes,
      });
      await page.locator(`input[value="${offer.offerId}"]`).check();
      packet = (await clickResponse("#submit-choice", "/api/resume")).packet;
    } else {
      receipt.stops.push(packet);
      assert.equal(
        packet.stop.modules.some((x) => x.hold),
        false,
        "Natural generated path has no held stop to bypass",
      );
      packet = (await clickResponse("#resume-stop", "/api/resume")).packet;
    }
  }
  await page.waitForFunction(
    () =>
      JSON.parse(document.getElementById("clock-detail").textContent || "{}")
        .kind === "complete",
  );
  await page.waitForFunction(() => !document.getElementById("day").disabled);
  return packet;
}
try {
  await page.goto(base);
  await page.waitForFunction(
    () => document.getElementById("seed").value.length > 0,
  );
  const opening = await build();
  const candidates = opening.residents.filter((x) => x.age >= 18 && x.jobId);
  const person = candidates[randomInt(candidates.length)];
  receipt.controlledPersonId = person.id;
  const before = await inspect(person);
  receipt.beforeRecords = before.records;
  const week = await drain(await clickResponse("#week", "/api/advance"));
  assert.equal(week.simulatedDays, 7);
  receipt.week = week;
  const afterResponse = await fetch(
    `${base}/api/resident?id=${encodeURIComponent(person.id)}`,
  );
  const after = await afterResponse.json();
  receipt.afterRecords = after.records;
  const newRecords = after.records.filter(
    (x) => !before.records.some((b) => b.id === x.id),
  );
  receipt.newRecords = newRecords;
  const controlledActs = newRecords.filter(
    (row) => row.kind === "person.acted",
  );
  assert(controlledActs.length > 0);
  for (const row of controlledActs) {
    const choice = row.decision?.controlledChoice;
    assert(choice, `Controlled act lacks its issued answer: ${row.id}`);
    const answer = receipt.answered.find(
      (x) => x.pauseId === choice.pauseId && x.offerId === choice.offerId,
    );
    assert(answer, `Controlled act was not answered on screen: ${row.id}`);
    assert.equal(row.actionId, answer.actionId);
    assert.equal(row.targetId, answer.targetId);
  }
  receipt.controlledActCountOverSevenDays = controlledActs.length;
  receipt.otherActsOverSevenDays = week.acts - controlledActs.length;
  assert(week.acts > receipt.answered.length, "NPCs continued acting");
  const invalid = await fetch(
    `${base}/api/resume?kind=choice&pauseId=unissued&offerId=unissued`,
    { method: "POST" },
  );
  assert.equal(invalid.status, 400);
  receipt.unissuedRejected = await invalid.json();
  const unchanged = await (
    await fetch(`${base}/api/resident?id=${encodeURIComponent(person.id)}`)
  ).json();
  assert.deepEqual(unchanged.records, after.records);
  receipt.day = await drain(await clickResponse("#day", "/api/advance"));
  const offset = randomInt(1, 5);
  const destination = new Date(`${receipt.day.at.date}T00:00:00Z`);
  destination.setUTCDate(destination.getUTCDate() + offset);
  const date = destination.toISOString().slice(0, 10);
  await page.locator("#calendar").fill(date);
  receipt.calendar = await drain(
    await clickResponse("#calendar-go", "/api/advance"),
  );
  assert.equal(receipt.calendar.at.date, date);
  const skipped = await clickResponse("#skip", "/api/advance");
  receipt.skip = skipped;
  assert.notEqual(skipped.packet.kind, "complete");
  if (skipped.packet.kind === "choice") {
    const invalidOffer = await fetch(
      `${base}/api/resume?${new URLSearchParams({ kind: "choice", pauseId: skipped.packet.pauseId, offerId: "unissued" })}`,
      { method: "POST" },
    );
    assert.equal(invalidOffer.status, 400);
    receipt.unavailableOfferRejected = await invalidOffer.json();
    const stillPending = await (
      await fetch(`${base}/api/resident?id=${encodeURIComponent(person.id)}`)
    ).json();
    assert.deepEqual(stillPending.packet, skipped.packet);
  }
  if (skipped.packet.kind === "stop")
    assert.deepEqual(skipped.packet.at, skipped.earliest.at);
  let stopPacket = skipped.packet;
  for (let i = 0; stopPacket.kind === "choice"; i++) {
    assert(i < 20);
    await page.waitForFunction(
      (id) =>
        JSON.parse(document.getElementById("clock-detail").textContent || "{}")
          .pauseId === id,
      stopPacket.pauseId,
    );
    const offer = stopPacket.offers[0];
    await page.locator(`input[value="${offer.offerId}"]`).check();
    stopPacket = (await clickResponse("#submit-choice", "/api/resume")).packet;
  }
  assert.equal(stopPacket.kind, "stop");
  receipt.firstSkipStop = stopPacket;
  assert.deepEqual(stopPacket.at, skipped.earliest.at);
  await page.waitForFunction(() =>
    document.getElementById("stop-status").textContent.includes("Stopped:"),
  );
  // Finish the bounded skip probe before further screen play or selection.
  await drain({ packet: stopPacket });
  const visibleIds = async () =>
    page
      .locator("#detail details")
      .evaluateAll((rows) =>
        rows
          .filter((r) => r.querySelector("button"))
          .map((r) =>
            r
              .querySelector("summary")
              .textContent.split(": ")
              .slice(1)
              .join(": "),
          ),
      );
  let ids = await visibleIds();
  // Some randomly chosen residents have fewer saved records. Earn more through
  // actual answered screen days rather than injecting a trace fixture.
  for (let i = 0; ids.length < 20 && i < 14; i++) {
    await drain(await clickResponse("#day", "/api/advance"));
    ids = await visibleIds();
  }
  assert(ids.length >= 20, `Need 20 visible saved records, got ${ids.length}`);
  for (let i = 0; i < 20; i++) {
    const at = randomInt(ids.length);
    const [id] = ids.splice(at, 1);
    const response = page.waitForResponse((r) =>
      r.url().includes("/api/trace"),
    );
    const details = page
      .locator("#detail details")
      .filter({ has: page.locator("summary", { hasText: id }) })
      .first();
    await details.locator("summary").click();
    await details.locator("button").click();
    const trace = await (await response).json();
    assert.equal(trace.recordId, id);
    assert.notEqual(trace.status, "record-not-found");
    assert.notEqual(trace.status, "ambiguous-record");
    await page.waitForFunction(
      (id) => document.getElementById("trace-status").textContent.includes(id),
      id,
    );
    if (trace.scoresStatus === "none-saved")
      assert(
        (await page.locator("#trace-status").textContent()).includes(
          "No scores saved yet.",
        ),
      );
    receipt.traces.push(trace);
  }
  receipt.missingScoreRecordIds = receipt.traces
    .filter((x) => x.scoresStatus === "none-saved")
    .map((x) => x.recordId);
  assert.equal(errors.length, 0);
  const drawn = new Set([opening.jurisdictionKey]);
  while (drawn.size < 3) {
    const value = await build();
    drawn.add(value.jurisdictionKey);
    assert(receipt.openings.length < 30, "Bounded geography coverage draw");
  }
  receipt.status = "all-five-ready-for-independent-finisher";
} finally {
  receipt.finishedAt = new Date().toISOString();
  await writeFile(
    new URL("screen-receipt.json", import.meta.url),
    JSON.stringify(receipt, null, 2) + "\n",
  );
  await browser.close();
}
