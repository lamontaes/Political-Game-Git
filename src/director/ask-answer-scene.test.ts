import { expect, it } from "vitest";
import { BenchPlayer } from "../bench/player";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { closenessBetween } from "../core2/closeness";
import { meetInTalk } from "../core2/encounters";
import { partnerAgeLikelihood } from "../core2/opening-partnership";
import { gameStartDate } from "../core2/game-start";
import { advanceCore } from "../core2/life";
import { addDays, ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import {
  askOut,
  FAMILY_ASKED_OUT,
  FAMILY_PROPOSAL_ANSWERED,
  propose,
} from "../core2/modules/partnerships";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import { askFromCard } from "../bench/person-acts";
import { purposeScene, replyInScene } from "./purpose-scene";
import { SITUATION_LIBRARY } from "./scheduling";
import type { TreeNode } from "./scene-talk";

// The player's own ask (family life question 1, ruled Nov 14 2026 under the
// owner's overnight say): the other person's answer, decided by the
// partnerships engine from their own record, plays at once as a scene that
// says it. A no names its reason in plain words; "Forget I asked." cools the
// tie a little (Words lead, Nov 14 11:30Z). Place and seed pinned: Pulaski,
// Ohio, family-a.
setBookkeeping(false);

const adult = (core: CoreState, born: string) =>
  ageOnDate(makeIsoDate(born), makeIsoDate(core.date)) >= 18;

function world() {
  const place = drawPlace("family-a", "family-life");
  const where = `${place.name} (${place.key}), seed family-a`;
  const { core, director, playerId } = buildBenchWorld(
    place.seed,
    gameStartDate(),
    { twoLevel: true, placeKey: place.key },
  );
  const me = playerId! as PersonId;
  director.watch(core, me);
  while (!adult(core, core.people.get(me)!.birthDate))
    advanceCore(core, addDays(makeIsoDate(core.date), 7));
  // The player holds the controls, as on the bench: an ask made from their
  // card is answered on the spot, on their own clock.
  const bench = new BenchPlayer(core, director);
  bench.select(me);
  bench.advance("day");
  const api = coreAPI(core);
  const player = core.people.get(me)!;
  const partnered = new Set<string>();
  for (const link of core.familyLinks.values())
    if (link.kind === "partner")
      for (const id of link.personIds) partnered.add(id);
  const singles = [...core.people.values()]
    .filter(
      (row) =>
        row.alive &&
        row.tier !== "husk" &&
        row.id !== me &&
        row.placeId === player.placeId &&
        row.householdId !== player.householdId &&
        !partnered.has(row.id) &&
        !player.familyIds.has(row.id) &&
        adult(core, row.birthDate),
    )
    .sort((a, b) => a.id.localeCompare(b.id));
  return { core, director, api, bench, me, singles, where };
}

/** The player's scene staged by the answer record, composed. */
function sceneOf(
  core: CoreState,
  director: ReturnType<typeof world>["director"],
  me: PersonId,
  kind: string,
  typeKey: string,
) {
  const book = director.ledger.people.get(me)!;
  const entry = book.schedule.find(
    (row) =>
      book.momentsById.get(row.momentId)?.causeId.startsWith(`${kind}:`) &&
      row.bindings.some((bound) => bound.typeKey === typeKey),
  );
  const scene = entry
    ? purposeScene(core, director, me, entry, { typeKey })
    : undefined;
  return { entry, scene };
}

const words = (node: TreeNode | null, depth = 0): string[] =>
  !node || depth > 4
    ? []
    : node.replies.flatMap((reply) => [
        reply.line.text,
        ...(reply.next?.lines ?? []).map((line) => line.text),
        ...words(reply.next, depth + 1),
      ]);

it("asked out by the player, someone seeing someone says so in a scene; waving it off cools the tie a little (Pulaski, Ohio)", () => {
  const { core, director, api, me, singles, where } = world();
  // The single the player is closest to is seeing someone else.
  const [taken, theirs] = [...singles].sort(
    (a, b) =>
      closenessBetween(core, me, b.id) - closenessBetween(core, me, a.id) ||
      a.id.localeCompare(b.id),
  );
  expect(closenessBetween(core, me, taken!.id), where).toBeGreaterThan(0);
  api.setPartnersV1({
    personIds: [taken!.id, theirs!.id],
    together: true,
    source: {
      tag: "SOURCED",
      asOf: core.date,
      citation: "The partnerships writer, as its monthly review calls it.",
    },
    facts: { union: "dating" },
  });
  // Asked from the card while the two are apart: the ask is a call.
  expect(askOut(api, me, taken!.id, { byPhone: true }), where).toMatchObject({
    answer: "no",
    reason: "with-someone",
  });
  const { entry, scene } = sceneOf(
    core,
    director,
    me,
    FAMILY_ASKED_OUT,
    "asked-out",
  );
  expect(entry?.outcome, `${where}: the answer plays now`).toBe("scene-now");
  expect(scene?.kind, `${where}: ${JSON.stringify(scene)}`).toBe("composed");
  if (scene?.kind !== "composed") return;
  expect(scene.scene.askerId, where).toBe(taken!.id);
  expect(scene.scene.askedId, where).toBe(me);
  expect(entry!.bindings[0]?.setting.kind, where).toBe("phone");
  const keys = scene.scene.facts.map((row) => row.key);
  expect(keys, where).toEqual(
    expect.arrayContaining(["said-no", "reason-with-someone", "by-phone"]),
  );
  expect(keys, where).not.toContain("said-yes");
  const tree = scene.scene.talk.tree;
  expect(scene.scene.talk.state.text, where).toMatch(
    /seeing someone|with someone/,
  );
  const said = words(tree);
  expect(said.join(" | "), where).toContain("Forget I asked.");
  expect(said.join(" | "), where).not.toMatch(/I'd like that|hoping you'd ask/);

  // "Forget I asked." ends the talk cooled: the tie loses a little, citing the reply.
  const index = tree.replies.findIndex((reply) =>
    reply.line.text.includes("Forget I asked."),
  );
  const before = closenessBetween(core, me, taken!.id);
  const id = replyInScene(core, director, me, entry!, [index], {
    typeKey: "asked-out",
  });
  expect(id, where).toBeTruthy();
  const reply = core.durableLog.get(id!);
  expect(reply?.facts?.keeps, where).toBe("relationship-cooled");
  expect(closenessBetween(core, me, taken!.id), where).toBeLessThan(before);
}, 45_000);

it("the player proposes on the first day of dating: the partner says not yet, and why, in a scene (Pulaski, Ohio)", () => {
  const { core, director, api, me, singles, where } = world();
  const player = core.people.get(me)!;
  const today = makeIsoDate(core.date);
  const ageOf = (born: string) => ageOnDate(makeIsoDate(born), today);
  const gender = (row: { looks?: { gender?: string } }) =>
    row.looks?.gender === "female" || row.looks?.gender === "male"
      ? row.looks.gender
      : undefined;
  // A couple made the way play makes one (Account lead, Nov 15: a hand-set
  // couple is not staging): the single whose age fits best, met as a talk
  // meets them, evenings together, and an Ask out answered yes. The old
  // premise set a stranger as the player's partner by hand, which only a
  // tie of zero answers "not sure yet"; a real first day is "too soon".
  const fitFor = (row: (typeof singles)[number]) =>
    partnerAgeLikelihood(
      ageOf(row.birthDate),
      gender(row),
      ageOf(player.birthDate),
      gender(player),
    );
  const partner = [...singles].sort(
    (a, b) => fitFor(b) - fitFor(a) || a.id.localeCompare(b.id),
  )[0]!;
  meetInTalk(
    api,
    me,
    partner.id,
    player.placeId,
    1,
    `talk:${core.date}:${me}:${partner.id}`,
  );
  for (let evening = 0; evening < 20; evening += 1)
    api.relationship(me, partner.id, "friend" as never, 3, undefined, {
      cause: "visit",
    });
  expect(askOut(api, me, partner.id), where).toMatchObject({ answer: "yes" });
  // Asked at home, the two in the room together: the answer is given there.
  const home = core.people.get(me)!.householdId;
  const answer = propose(api, me, partner.id, { room: home });
  expect(answer, where).toMatchObject({
    asked: true,
    answer: "no",
    reason: "too-soon",
  });
  const { entry, scene } = sceneOf(
    core,
    director,
    me,
    FAMILY_PROPOSAL_ANSWERED,
    "proposal-answered",
  );
  expect(entry?.outcome, where).toBe("scene-now");
  expect(scene?.kind, `${where}: ${JSON.stringify(scene)}`).toBe("composed");
  if (scene?.kind !== "composed") return;
  expect(entry!.bindings[0]?.setting, where).toMatchObject({
    kind: "home",
    recordId: home,
  });
  const keys = scene.scene.facts.map((row) => row.key);
  expect(keys, where).toEqual(
    expect.arrayContaining(["said-no", `reason-${answer.reason}`]),
  );
  expect(keys, where).not.toContain("by-phone");
  expect(scene.scene.talk.state.text, where).not.toMatch(/^Yes/);
}, 45_000);

it('asked out a second time, a yes is not one that was waited for: no "I was hoping you\'d ask" (Pulaski, Ohio)', () => {
  const { core, director, api, bench, me, singles, where } = world();
  const player = core.people.get(me)!;
  const today = makeIsoDate(core.date);
  const ageOf = (born: string) => ageOnDate(makeIsoDate(born), today);
  const gender = (row: { looks?: { gender?: string } }) =>
    row.looks?.gender === "female" || row.looks?.gender === "male"
      ? row.looks.gender
      : undefined;
  // The single whose age fits the player best (as the courtship test finds
  // them), met as a talk meets them: a cold no, then a yes after twenty
  // evenings together.
  const fitFor = (row: (typeof singles)[number]) =>
    partnerAgeLikelihood(
      ageOf(row.birthDate),
      gender(row),
      ageOf(player.birthDate),
      gender(player),
    );
  const other = [...singles].sort(
    (a, b) => fitFor(b) - fitFor(a) || a.id.localeCompare(b.id),
  )[0]!;
  meetInTalk(
    api,
    me,
    other.id,
    player.placeId,
    1,
    `talk:${core.date}:${me}:${other.id}`,
  );
  expect(askOut(api, me, other.id), where).toMatchObject({ answer: "no" });
  // Another day: an answer given today stands for the day. The player's
  // clock lands on the next morning; the world's date follows it.
  const asked = core.date;
  for (let press = 0; press < 20 && core.date === asked; press += 1) {
    const packet = bench.packet;
    if (packet?.kind === "stop")
      bench.resume({ kind: "stop", pauseId: packet.pauseId });
    else if (packet?.kind === "choice")
      bench.resume({ kind: "own-choice", pauseId: packet.pauseId });
    else bench.advance("day");
  }
  expect(core.date, where).not.toBe(asked);
  const kind = core.relationships.get(
    me < other.id ? `${me}:${other.id}` : `${other.id}:${me}`,
  )?.kind;
  for (let evening = 0; evening < 20; evening += 1)
    api.relationship(me, other.id, kind ?? ("friend" as never), 3, undefined, {
      cause: "visit",
    });
  const again = askOut(api, me, other.id);
  expect(again, `${where}: ${other.givenName} on ${core.date}`).toMatchObject({
    answer: "yes",
  });
  const book = director.ledger.people.get(me)!;
  const entry = book.schedule.find(
    (row) => book.momentsById.get(row.momentId)?.causeId === again.recordId,
  );
  const scene = entry
    ? purposeScene(core, director, me, entry, { typeKey: "asked-out" })
    : undefined;
  expect(scene?.kind, `${where}: ${JSON.stringify(scene)}`).toBe("composed");
  if (scene?.kind !== "composed") return;
  const keys = scene.scene.facts.map((row) => row.key);
  expect(keys, where).toEqual(
    expect.arrayContaining(["said-yes", "asked-same-before"]),
  );
  expect(scene.scene.talk.state.text, where).not.toBe(
    "I was hoping you'd ask.",
  );
}, 45_000);

it("every ask the player makes is answered in a scene, past the season's cap of one kind (Pulaski, Ohio)", () => {
  const { core, director, bench, me, singles, where } = world();
  const player = core.people.get(me)!;
  const today = makeIsoDate(core.date);
  const ageOf = (born: string) => ageOnDate(makeIsoDate(born), today);
  // The least fitting singles first, so the asks are noes and keep coming:
  // one more than the season's cap of one kind of scene (six a season).
  const cap = SITUATION_LIBRARY.scheduling.seasonCap.value;
  const gender = (row: { looks?: { gender?: string } }) =>
    row.looks?.gender === "female" || row.looks?.gender === "male"
      ? row.looks.gender
      : undefined;
  const fit = (row: (typeof singles)[number]) =>
    partnerAgeLikelihood(
      ageOf(row.birthDate),
      gender(row),
      ageOf(player.birthDate),
      gender(player),
    );
  const asked = [...singles].sort(
    (a, b) => fit(a) - fit(b) || a.id.localeCompare(b.id),
  );
  expect(asked.length, where).toBeGreaterThan(cap);
  const book = director.ledger.people.get(me)!;
  // The day's opening stop let go, as Continue does: the asks are made on a
  // running clock.
  for (let open = bench.packet; open?.kind === "stop"; open = bench.packet)
    bench.resume({ kind: "stop", pauseId: open.pauseId });
  const shown = new Set<string>();
  for (const other of asked.slice(0, cap + 1)) {
    const { momentId } = askFromCard(core, director, me, other.id, "ask-out", {
      byPhone: true,
    });
    const entry = book.schedule.find((row) => row.momentId === momentId);
    expect(entry?.outcome, `${where}: ${other.givenName}`).toBe("scene-now");
    expect(entry?.heldBack, `${where}: ${other.givenName}`).toBeUndefined();
    shown.add(momentId!);
  }
  // The press showed each answer: the clock does not stop again on one of
  // them, a scene already played with its talk answered (Account lead, Nov
  // 15: after Propose the clock stuck on "First thing on January 21st.").
  for (let hour = 0; hour < 3; hour += 1) {
    const packet = bench.spend(1);
    expect(packet, `${where}: the hour goes by`).toBeDefined();
    const stopped =
      packet?.kind === "stop"
        ? packet.stop.modules.map((row) => row.recordId)
        : [];
    expect(
      stopped.filter((id) => shown.has(id)),
      where,
    ).toEqual([]);
    if (packet?.kind === "stop")
      bench.resume({ kind: "stop", pauseId: packet.pauseId });
  }
}, 45_000);
