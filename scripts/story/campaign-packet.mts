// W3 packet: the volunteers' ask (join-cause) and the family's money question when the player files (family-filing), composed through the scene engine with
// stand-in facts, since neither scene reached a resident's life in 300 days of a drawn world (Seven Hills, Ohio, seed w3s, scripts/words/scene-samples.ts).
// Usage: node --import tsx scripts/story/campaign-packet.mts
import { composeSceneTalk, type TreeNode } from "../../src/director/scene-talk";
import * as fixture from "../../tests/support/scene-talk-fixture";

const out = (text: string) => process.stdout.write(`${text}\n`);
const say = (text: string) => ({ text, sourceRecordIds: [fixture.askerId] });

function walk(node: TreeNode, indent: string) {
  for (const line of node.lines) out(`${indent}${line.role}: ${line.text}`);
  for (const reply of node.replies) {
    out(`${indent}> [${reply.line.move}] ${reply.line.text}`);
    if (reply.next) walk(reply.next, `${indent}    `);
  }
  if (node.end?.close)
    out(`${indent}  (close, ${node.end.outcome}) ${node.end.close.text}`);
  else if (node.end) out(`${indent}  (ends: ${node.end.outcome})`);
}

const show = (
  typeKey: string,
  label: string,
  extra: Record<string, ReturnType<typeof say>>,
  drop: readonly string[] = [],
) => {
  const type = fixture.types.find((row) => row.key === typeKey)!;
  const result = composeSceneTalk(
    fixture.core,
    fixture.director,
    { askerId: fixture.askerId, askedId: fixture.askedId },
    type,
    Object.fromEntries(
      Object.entries({ ...fixture.facts, ...extra }).filter(
        ([key]) => !drop.includes(key),
      ),
    ),
    {},
    fixture.HELD,
  );
  if (result.kind !== "composed") {
    out(
      `NO ${typeKey} scene composed: ${JSON.stringify(result).slice(0, 200)}`,
    );
    return;
  }
  const talk = result.talk;
  out(`\n## ${label}`);
  for (const line of talk.narration) out(`  narrator: ${line.text}`);
  if (talk.open) out(`  ${talk.open.role}: ${talk.open.text}`);
  out(`  ${talk.state.role}: ${talk.state.text}`);
  walk(talk.tree, "  ");
  if (talk.gaps.length) out(`  GAPS: ${talk.gaps.join(" | ")}`);
};

show("cause-invite", "the volunteers' ask (stand-in cause: the housing bill)", {
  cause: say("the housing bill"),
});
show("cause-invite", "the volunteers' ask (stand-in cause: the school levy)", {
  cause: say("the school levy"),
});
show(
  "family-filing",
  "the family's money question (stand-in: council seat)",
  {
    "stake-money": say("yes"),
    office: say("the city council"),
    cushion: say("three months"),
    remaining: say("six months"),
  },
  ["stake-time"],
);
