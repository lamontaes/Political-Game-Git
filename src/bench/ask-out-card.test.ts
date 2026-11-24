import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import { DevMode } from "./dev-mode";
import { benchRequest, benchWorld } from "./handler";

/*
 * Ask out and Propose on a person's card (family life question 1, ruled Nov
 * 14 2026 under the owner's overnight say), through the bench's own routes:
 * the card offers Ask out to an adult in town, pressing it has the other
 * person answer from their own record, and the answer plays at once as a
 * scene the screen opens. Place and seed pinned: the named world below.
 */
const ask = async (method: string, path: string) => {
  const reply = await benchRequest(method, new URL(path, "http://bench"), {
    developer: true,
  });
  return { status: reply.status, json: JSON.parse(String(reply.body)) };
};

interface Act {
  kind: string;
  open: boolean;
  reason?: string;
}

it("the card's Ask out is answered at once as a scene (ask-out-card-1)", async () => {
  const place = drawPlace("ask-out-card-1", "ask-out-card");
  const where = `${place.name} (${place.key}), seed ${place.seed}`;
  expect(
    (await ask("POST", `/api/build?seed=${encodeURIComponent(place.seed)}`))
      .status,
    where,
  ).toBe(200);
  const world = benchWorld();
  const core = world.core!;
  const adult = (born: string) =>
    ageOnDate(makeIsoDate(born), makeIsoDate(core.date)) >= 18;
  // A town resident with a home, as a player is.
  const me = [...core.people.values()]
    .filter(
      (p) =>
        p.alive &&
        p.tier !== "husk" &&
        adult(p.birthDate) &&
        !p.id.startsWith("official:") &&
        core.households.has(p.householdId),
    )
    .sort((a, b) => a.id.localeCompare(b.id))[0]!.id;
  world.player!.select(me);
  expect((await ask("POST", "/api/advance?mode=day")).status, where).toBe(200);
  const acts = async (other: string) =>
    (await ask("GET", `/api/known?id=${me}&other=${other}`)).json.acts as Act[];
  const town = [...core.people.values()]
    .filter(
      (p) =>
        p.alive &&
        p.id !== me &&
        p.placeId === core.people.get(me)!.placeId &&
        !p.id.startsWith("official:"),
    )
    .sort((a, b) => a.id.localeCompare(b.id));
  let other: string | undefined;
  for (const candidate of town.slice(0, 80)) {
    const rows = await acts(candidate.id);
    // A child or a relative is never offered Ask out.
    if (
      !adult(candidate.birthDate) ||
      core.people.get(me)!.familyIds.has(candidate.id)
    )
      expect(
        rows.some((r) => r.kind === "ask-out"),
        `${where}: ${candidate.id}`,
      ).toBe(false);
    else if (rows.some((r) => r.kind === "ask-out" && r.open)) {
      other = candidate.id;
      break;
    }
  }
  expect(other, `${where}: someone to ask out`).toBeDefined();
  expect(
    (await acts(other!)).some((row) => row.reason === "here"),
    `${where}: asked from across town`,
  ).toBe(false);

  const done = await ask("POST", `/api/act?kind=ask-out&other=${other}`);
  expect(done.status, where).toBe(200);
  expect(done.json.momentId, `${where}: the answer is a scene`).toBeTruthy();
  const story = await ask(
    "GET",
    `/api/story?momentId=${encodeURIComponent(done.json.momentId)}`,
  );
  expect(story.status, `${where}: ${JSON.stringify(story.json)}`).toBe(200);
  const narration = (story.json.narration as { text: string }[])
    .map((line) => line.text)
    .join(" ");
  // The answer is given where the ask was made. The one asked is not in the
  // player's room, so the ask is a call: the record says so, the player
  // stays where they stand, and nobody arrives or is met out in town (the
  // in-room ask is in src/director/ask-answer-scene.test.ts).
  const record = [...(core.logByKind.get("family.asked-out") ?? [])]
    .map((id) => core.durableLog.get(id)!)
    .find((row) => row.personIds.includes(other! as never));
  expect(record?.facts?.by, where).toBe("phone");
  expect(narration, where).toMatch(
    /You picked up the phone and asked .+ out\./,
  );
  expect(
    (story.json.people as { personId?: string; id?: string }[]).some(
      (person) => (person.personId ?? person.id) === other,
    ),
    `${where}: no face over a call`,
  ).toBe(false);
  expect(narration, where).not.toMatch(
    /out and about|walks up to you|on the street|downtown|comes to the house|at your door/,
  );
  // The other person speaks first, and says their answer.
  const opening = story.json.talk?.opening as { text: string }[] | undefined;
  expect(opening?.length, `${where}: the answer is said`).toBeGreaterThan(0);

  // Asked again the same day: closed with its reason, or Propose on a yes.
  const after = await acts(other!);
  const said = after.some((r) => r.kind === "propose")
    ? "yes"
    : after.find((r) => r.kind === "ask-out")?.reason;
  expect(
    ["yes", "nothing-changed"],
    `${where}: ${JSON.stringify(after)}`,
  ).toContain(said);

  // Dev mode shows why: the person view's record of the answer carries its
  // weight and the terms it was made of, and the card's gate as it reads now.
  const view = new DevMode(
    world.core!,
    world.director,
    world.player,
    world.placeId,
  ).person(other!);
  const kept = view.records.find((row) => row.id === record!.id);
  expect(Number(kept?.facts?.weight), where).toBeGreaterThanOrEqual(0);
  expect(kept?.facts?.["weighed.fit"], where).toBeDefined();
  expect(kept?.facts?.["weighed.tie"], where).toBeDefined();
  const reading = view.asks!;
  expect(reading["ask-out"]?.lastAnswer, where).toBeTruthy();
  expect(
    said === "yes"
      ? reading.propose?.gate.open
      : reading["ask-out"]?.gate.reason,
    where,
  ).toBe(said === "yes" ? true : "nothing-changed");
}, 130_000);
