/**
 * Batch 4, the second half: from the scenes the played worlds met, choose
 * about twenty of mixed kinds (never three of one kind in a row), number every
 * line so the owner can say it aloud ("scene 3, line 2", "3.2.b"), and write
 * the JSON tree and the readable page, with the lines that read wrong once
 * filled. Development tooling.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { oddities, type BatchScene } from "./batch-four-lib";

export interface Candidate {
  world: {
    index: number;
    place: string;
    placeKey: string;
    seed: string;
    worldSeed: string;
  };
  by: string;
  player: string;
  depth: number;
  kindKey: string;
  scene: BatchScene;
}

/** The owner's kinds, by the director's situation type (grouping only; no text). */
const KIND_OF: Readonly<Record<string, string>> = {
  "floor-vote": "legislation",
  "vote-sought": "legislation",
  "vote-asked": "legislation",
  "vote-confirmed": "legislation",
  "bill-carry": "legislation",
  "bill-held-chair": "legislation",
  "bill-held-member": "legislation",
  "desk-bill": "legislation",
  "section-bargain": "legislation",
  "testimony-heard": "legislation",
  "floor-debate": "legislation",
  "public-hearing": "legislation",
  "speech-builder": "speech",
  address: "speech",
  "rally-word": "speech",
  "speech-afterward": "speech",
  "press-interview": "press",
  "news-arrives": "reaction",
  "concession-received": "reaction",
  "race-won": "reaction",
  "race-lost": "reaction",
  "law-takes-effect": "reaction",
  "bill-signed": "reaction",
  veto: "reaction",
  scandal: "reaction",
  "staff-news": "reaction",
  accusation: "reaction",
  "gathering-missing": "family",
  visit: "family",
  departure: "family",
  rescue: "family",
  "swearing-in": "ceremony",
  verdict: "legislation",
  hearing: "legislation",
  appointment: "legislation",
  "office-hours": "constituent",
  layoff: "constituent",
  "constituent-stop": "constituent",
  "town-hall-question": "constituent",
  "door-ask": "constituent",
  "donor-ask": "donor",
  "bribe-offer": "bribe",
  "bribe-pressed": "bribe",
  letter: "family",
  return: "family",
  "new-baby": "family",
  "first-meeting": "family",
  "becoming-friends": "family",
  argument: "family",
  apology: "family",
  "reach-out": "family",
  celebration: "family",
  advice: "family",
  funeral: "family",
  "family-filing": "family",
  "family-win": "family",
  "family-loss": "family",
  "family-absence": "family",
  "diploma-home": "family",
  "no-diploma-home": "family",
  "last-day": "work",
  "first-day": "work",
  "job-offer": "work",
  "volunteer-offer": "campaign",
  "manager-offer": "campaign",
  "campaign-stop": "campaign",
  filing: "campaign",
  "party-recruit": "campaign",
  "cause-invite": "campaign",
  recall: "campaign",
};
export const kindOf = (kindKey: string): string =>
  KIND_OF[kindKey.split("/")[0]!] ?? "other";

/** A scene worth a page: the owner can click, or hear a speech through. */
const playable = (c: Candidate) => {
  const choices = c.scene.nodes.reduce((sum, n) => sum + n.choices.length, 0);
  return (
    c.scene.nodes.length >= 3 &&
    (choices > 0 || c.scene.source.typeKey === "address") &&
    c.scene.nodes[0]?.text !== "(your turn)"
  );
};

/**
 * The kinds the owner asked for, in an order that never puts three of one kind
 * together: an ask for a vote, a reporter, a speech built by parts, a bribe, a
 * constituent, family, news arriving, a party's ask and so on. A key matches a
 * scene's situation type (and variant) by its start. Grouping only; no text.
 */
const WANTED = [
  "vote-asked",
  "press-interview",
  "speech-builder",
  "bribe-offer",
  "office-hours",
  "family-win",
  "news-arrives",
  "party-recruit",
  "floor-vote",
  "address",
  "bribe-pressed",
  "letter",
  "vote-sought",
  "concession-received",
  "apology",
  "staff-news",
  "last-day",
  "volunteer-offer",
  "swearing-in",
  "new-baby",
  "family-filing",
  "campaign-stop",
  "race-won",
  "testimony-heard",
];

/**
 * Chooses up to `count` scenes: one of each wanted key, taken from the worlds in
 * turn and of different sizes (some short, some long); then any other playable
 * kind to fill. Never three of one kind in a row.
 */
export function choose(all: Candidate[], count: number): Candidate[] {
  const pool = all.filter(playable);
  const picked: Candidate[] = [];
  const worlds = [...new Set(pool.map((c) => c.world.index))].sort();
  WANTED.forEach((want, at) => {
    if (picked.length >= count) return;
    const matches = pool.filter(
      (c) => c.kindKey.startsWith(want) && !picked.includes(c),
    );
    if (!matches.length) return;
    // The world whose turn it is, then the middle-sized tree there.
    const turn = worlds[at % worlds.length]!;
    const here = matches.filter((c) => c.world.index === turn);
    const from = here.length ? here : matches;
    const sorted = [...from].sort(
      (a, b) => a.scene.nodes.length - b.scene.nodes.length,
    );
    picked.push(sorted[Math.floor(sorted.length / 2)]!);
  });
  // Fall short: other kinds, one each.
  for (const c of pool) {
    if (picked.length >= count) break;
    if (!picked.some((p) => p.kindKey === c.kindKey)) picked.push(c);
  }
  // Arrange: another kind than the last, and never the third of one kind.
  const left = [...picked];
  const arranged: Candidate[] = [];
  while (left.length) {
    const last = arranged.length
      ? kindOf(arranged[arranged.length - 1]!.kindKey)
      : "";
    const at = left.findIndex((c) => kindOf(c.kindKey) !== last);
    arranged.push(...left.splice(at >= 0 ? at : 0, 1));
  }
  return arranged;
}

const letter = (at: number) => String.fromCharCode(97 + at);

/** The scene renumbered: nodes `S.n`, choices `S.n.a`, every `next` rewritten. */
function number(sceneId: string, scene: BatchScene): BatchScene {
  const map = new Map(
    scene.nodes.map((n, at) => [n.id, `${sceneId}.${at + 1}`]),
  );
  const to = (id: string | null | undefined) =>
    id ? (map.get(id) ?? null) : null;
  return {
    ...scene,
    id: sceneId,
    nodes: scene.nodes.map((node, at) => ({
      ...node,
      id: `${sceneId}.${at + 1}`,
      ...(node.next ? { next: to(node.next)! } : {}),
      choices: node.choices.map((choice, c) => ({
        ...choice,
        id: `${sceneId}.${at + 1}.${letter(c)}`,
        next: to(choice.next),
      })),
    })),
  };
}

/** A line that came out wrong once filled. */
export interface Wrong {
  scene: string;
  node: string;
  key: string;
  text: string;
  why: string;
}

/**
 * Notes from reading the filled lines, kept with the script so a rerun keeps
 * them. Each is a pattern on the line as shown and what is wrong with it; a
 * note is listed only for a scene the batch holds.
 */
export const READ_NOTES: { match: RegExp; why: string }[] = [
  {
    match: /^Did you hear about [^?]+\?$/,
    why: "the topic slot holds the name of an outlet or a station, not what happened; the scene is a letter or a birth, and the line asks about neither",
  },
  {
    match: /^It's about time\.$/,
    why: "a reply drawn for news in general, offered to a birth",
  },
  {
    match: /outside the town\./,
    why: 'a slot is filled with a job\'s category where a title or an employer belongs, and "the town" is said where the place has a name',
  },
  {
    match:
      /Answer the question|microphone squeals|moderator glances|Next question|Thank you for telling us/,
    why: 'a town-hall beat (a heckler, a microphone, a moderator, "next question") in a one-on-one at office hours',
  },
  {
    match: /^The vote's in two weeks\./,
    why: "the narration says the clerk has just read the tally; this reporter says the vote is two weeks away",
  },
  {
    match:
      /^(I'm voting no, and I'll tell you why\.|Put this in: I'll vote yes, and I'll own it\.)$/,
    why: "future tense about a vote that has just been held: the narration says the roll is recorded (the owner's Oct 16 note on the same tense)",
  },
  {
    match: /^That's not mine to give\.$/,
    why: 'the reply to "I\'ll need your vote on mine" does not answer a trade',
  },
  {
    match:
      /^(What do you think\?|I'd want more than a headline before I decide\.|Uh-huh\.)$/,
    why: 'the scene is news of a death or a mentor; the talk is the generic "headline" opinion exchange and never names the news',
  },
  {
    match: /^I saw it in the .+: .+ passes, \d+ to \d+\.$/,
    why: "the cause is a bribery complaint against the player; the talk is a council vote headline",
  },
  {
    match: /^Good to see you, .+\.$/,
    why: "a greeting for meeting face to face, said in a letter",
  },
  {
    match:
      /work of (commissioner|mayor|council member|alderman|selectman|supervisor|trustee) honestly/,
    why: 'no article before the office ("the work of commissioner")',
  },
  {
    match:
      /running for (Council member|Commissioner|Assemblymember|Mayor|Alderman)\./,
    why: 'no article before the office ("running for Council member")',
  },
  {
    match:
      /^You're going over .+ at your desk when .+ knocks on the open door\.$/,
    why: "the arrival line puts both people in the chamber; this line has the player at a desk behind an open door",
  },
  {
    match:
      /^After the meeting, .+ waits until the room is nearly empty\.$|^You and I need to talk, and I'd rather do it out here\.$/,
    why: "the arrival line says the other person comes to the house; this line is in a meeting room, out in the hall",
  },
  {
    match: /^Figured you could use one more of these\.$/,
    why: '"these" is never named before this line (coffee comes up three lines later)',
  },
  {
    match: /^I trust Vice President .+\. You'll see why\.$/,
    why: "a promise of a reason that the address never gives",
  },
  {
    match: /Today there's a knock at your door\./,
    why: "the arrival line says the player runs into the person on the street; this line says there is a knock at the door",
  },
];

export function readsWrong(
  scenes: BatchScene[],
  placeOf: (scene: BatchScene) => string,
): Wrong[] {
  const rows: Wrong[] = [];
  const openers = new Map<string, string[]>();
  for (const scene of scenes) {
    const place = placeOf(scene);
    const first = scene.nodes.find((n) => n.speaker !== "Narrator");
    if (first)
      openers.set(first.text, [...(openers.get(first.text) ?? []), scene.id]);
    for (const node of scene.nodes) {
      const texts: [string, string, string][] = [
        [node.id, node.key, node.text],
      ];
      for (const choice of node.choices)
        if (choice.text) texts.push([choice.id, choice.key, choice.text]);
      for (const [id, key, text] of texts) {
        for (const why of oddities(text, place))
          rows.push({ scene: scene.id, node: id, key, text, why });
        for (const note of READ_NOTES)
          if (note.match.test(text))
            rows.push({ scene: scene.id, node: id, key, text, why: note.why });
      }
    }
    scene.setup.narration.forEach((line, at) => {
      const key = scene.setup.narrationKeys[at] ?? "";
      for (const why of oddities(line, place))
        rows.push({ scene: scene.id, node: "narration", key, text: line, why });
      for (const note of READ_NOTES)
        if (note.match.test(line))
          rows.push({
            scene: scene.id,
            node: "narration",
            key,
            text: line,
            why: note.why,
          });
    });
    for (const node of scene.nodes) {
      const said = node.text.split(place).length - 1;
      if (place && said >= 3 && (node.end || node.key !== "speech-builder"))
        rows.push({
          scene: scene.id,
          node: node.id,
          key: node.key,
          text:
            node.text.length > 160
              ? `${node.text.slice(0, 157)}...`
              : node.text,
          why: `the place's name is said ${said} times in one speech`,
        });
    }
  }
  for (const [text, ids] of openers)
    if (ids.length > 1)
      rows.push({
        scene: ids.join(", "),
        node: "opener",
        key: "",
        text,
        why: `the same opener in scenes ${ids.join(" and ")}`,
      });
  // One row for a line said in several places of a scene, naming each place.
  const merged = new Map<string, Wrong>();
  for (const row of rows) {
    const id = `${row.scene}|${row.text}|${row.why}`;
    const seen = merged.get(id);
    if (seen) seen.node = `${seen.node}, ${row.node}`;
    else merged.set(id, { ...row });
  }
  return [...merged.values()];
}

const clean = (text: string) => text.replace(/\|/g, "/");

function pageOf(scene: BatchScene, c: Candidate): string {
  const out: string[] = [];
  out.push(
    `## Scene ${scene.id}: ${scene.kind} (${c.kindKey})`,
    "",
    `_${c.world.place}, seed \`${c.world.seed}\`; the scene is ${c.player}'s; staged on ${scene.source.date} from \`${scene.source.causeId}\`._`,
    "",
    `- **When:** ${scene.setup.when}`,
    `- **Where:** ${scene.setup.where}`,
    `- **Who:** ${scene.setup.who.join(", ")}`,
    "",
  );
  scene.setup.narration.forEach((line, at) =>
    out.push(
      `> ${line}  \`${scene.setup.narrationKeys[at] || "no bank piece"}\``,
      "",
    ),
  );
  if (!scene.setup.narration.length)
    out.push("> (the game shows no narrator line before this scene)", "");
  for (const node of scene.nodes) {
    out.push(
      `**${node.id}  ${node.speaker}** \`${node.key || "no bank piece"}\`: ${node.text}`,
    );
    if (node.template) out.push(`   (bank text: ${node.template})`);
    if (node.next) out.push(`   then ${node.next}`);
    if (node.end) out.push(`   _end: ${node.end}_`);
    for (const choice of node.choices)
      out.push(
        `   - **${choice.id}** ${clean(choice.label)} _(tests: ${choice.tests})_ ${choice.next ? `-> ${choice.next}` : choice.cut ? "(tree cut here)" : "(ends)"}`,
      );
    out.push("");
  }
  return out.join("\n");
}

/**
 * What the worlds did not produce, with the producer or record that was
 * missing (read from src/director/data/situation-types.json and the engines;
 * a kind is listed only when no scene of it was met in the three worlds).
 */
export const NOT_TRIGGERED: { kind: string; why: string }[] = [
  {
    kind: "A donor's ask",
    why: "the type `donor-ask` fires from a `campaign-gift` record that names the watched candidate as the one asked (`money:event:campaign-gift`), or from `cause.donated` on the street. Only one of the three worlds (Oceanport) had a race to file for (an Assembly seat); its candidate had bills pending before the body and ran to the count, and no gift became a moment for them. The other two had no open race for a seat on a town body in the played months. Only the bribe offers (which share the donor's arcs) are in the batch.",
  },
  {
    kind: "A layoff the player lives through",
    why: "the type `layoff` waits for a `work.job-lost` record decided by someone other than the worker. Dev mode's own layoff control (`forceLayoff`) was used on a worker in the circle in each world; the job-ended record reached the circle as news arriving (scene `news-arrives`), but no `layoff` scene was staged for the worker.",
  },
  {
    kind: "Eviction, sickness or short pay at office hours",
    why: "the case module (`constituent-cases.ts`) has two problems only, `looking-for-work` and `paid-under-minimum-wage`; there is no eviction or illness case record for the office-hours scene to read. The batch holds the job case.",
  },
  {
    kind: "A homecoming",
    why: "the type `return` waits for a `justice.released` record; none was written in a played year in these worlds.",
  },
  {
    kind: "A first meeting at work",
    why: "the type `first-day` has one live cause (`money:job-started` with no counterpart) and one awaiting producer (`school-started`); no job started for a watched person in these worlds.",
  },
  {
    kind: "A State of the Town or State of the State the player gives",
    why: "the address engine (`composeLocalAddress`) writes the mayor's and the governor's address from the town's term; the player is not a mayor or governor in a played year, so the batch holds an address heard (scene `address`, one Continue per part, no choices) and the speech the player builds by parts (`speech-builder`).",
  },
];

export function buildOutputs(
  caches: { world: Candidate["world"]; found: Candidate[] }[],
  seed: string,
  count = 20,
): { scenes: BatchScene[]; picked: Candidate[]; wrong: Wrong[] } {
  const all = caches.flatMap((cache) => cache.found);
  const picked = choose(all, count);
  const scenes = picked.map((c, at) => ({
    ...number(String(at + 1), c.scene),
    kind: kindOf(c.kindKey),
  }));
  const wrong = readsWrong(
    scenes,
    (scene) => picked[Number(scene.id) - 1]!.world.place.split(",")[0]!,
  );
  const first = caches[0]!.world;
  const json = {
    id: "batch-4",
    made: "2026-11-09",
    place: `${first.place} (${first.placeKey})`,
    seed: first.seed,
    worlds: caches.map((cache) => ({
      place: cache.world.place,
      placeKey: cache.world.placeKey,
      seed: cache.world.seed,
      worldSeed: cache.world.worldSeed,
    })),
    scenes: scenes.map((scene, at) => ({
      id: scene.id,
      kind: scene.kind,
      world: picked[at]!.world.seed,
      source: {
        ...scene.source,
        kindKey: picked[at]!.kindKey,
        player: picked[at]!.player,
      },
      setup: scene.setup,
      nodes: scene.nodes,
    })),
    readsWrong: wrong,
  };
  const dir = "docs/coordination/batches";
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    `${dir}/2026-11-09-batch-4.json`,
    `${JSON.stringify(json, null, 2)}\n`,
  );
  const seen = new Set(all.map((c) => c.kindKey.split("/")[0]!));
  const md: string[] = [
    "# Batch 4: scenes",
    "",
    `Made Nov 9, 2026 from the played game (\`scripts/dialogue-batch/batch-four.ts\`, seed \`${seed}\`). Nothing here is written by hand. Each scene is what the director stages in a played world drawn from all 56 places, composed by the game's own functions and walked at every choice. Every line has a number: scene, line, and for an option, a letter (3.2 is scene 3, line 2; 3.2.b is the second option at that line). The code beside a line is the bank piece that said it; where the shown text differs from the bank text, the bank text is given under it so you can see how a placeholder came out.`,
    "",
    "Worlds played:",
    "",
    ...caches.map(
      (cache) =>
        `- ${cache.world.place} (place ${cache.world.placeKey}), seed \`${cache.world.seed}\`, world seed \`${cache.world.worldSeed}\``,
    ),
    "",
    `Scenes: ${scenes.length}. Kinds in order: ${scenes.map((s) => s.kind).join(", ")}.`,
    "",
    ...scenes.flatMap((scene, at) => [pageOf(scene, picked[at]!), ""]),
    "## Reads wrong in play",
    "",
    wrong.length
      ? "Each line below came out wrong once filled: the scene, the line, the bank key and the text as shown."
      : "None found.",
    "",
    ...wrong.map(
      (row) =>
        `- Scene ${row.scene}, ${row.node}, \`${row.key || "no bank piece"}\`: "${row.text}" (${row.why})`,
    ),
    "",
    "## Kinds that could not be triggered",
    "",
    ...(NOT_TRIGGERED.length
      ? NOT_TRIGGERED.map((row) => `- ${row.kind}: ${row.why}`)
      : ["- (none listed)"]),
    "",
    `Types the played worlds staged: ${[...seen].sort().join(", ")}.`,
    "",
  ];
  writeFileSync(`${dir}/2026-11-09-batch-4.md`, md.join("\n"));
  return { scenes, picked, wrong };
}
