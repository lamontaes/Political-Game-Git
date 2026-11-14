import { expect, it } from "vitest";
import { BenchPlayer } from "../bench/player";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { closenessBetween } from "../core2/closeness";
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
import { purposeScene, replyInScene } from "./purpose-scene";
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
  return { core, director, api, me, singles, where };
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
  expect(askOut(api, me, taken!.id), where).toMatchObject({
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
  const keys = scene.scene.facts.map((row) => row.key);
  expect(keys, where).toEqual(
    expect.arrayContaining(["said-no", "reason-with-someone"]),
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
}, 120_000);

it("the player proposes on the first day of dating: the partner says not yet, and why, in a scene (Pulaski, Ohio)", () => {
  const { core, director, api, me, singles, where } = world();
  const partner = singles[0]!;
  api.setPartnersV1({
    personIds: [me, partner.id],
    together: true,
    source: {
      tag: "SOURCED",
      asOf: core.date,
      citation: "The partnerships writer, as its monthly review calls it.",
    },
    facts: { union: "dating" },
  });
  const answer = propose(api, me, partner.id);
  expect(answer, where).toMatchObject({ asked: true, answer: "no" });
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
  const keys = scene.scene.facts.map((row) => row.key);
  expect(keys, where).toEqual(
    expect.arrayContaining(["said-no", `reason-${answer.reason}`]),
  );
  expect(scene.scene.talk.state.text, where).not.toMatch(/^Yes/);
}, 120_000);
