import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { EntityId, World } from "../../src/simulation";
import { openOrdinaryLife } from "../../src/presentation/ordinary-life";
import { actionDeclarations, auditConversationSnapshot } from "./audit";

const args = process.argv.slice(2);
const worlds: string[] = [];
let head = "";
let out = "";
let begin = false;
for (let index = 0; index < args.length; index += 2) {
  const value = args[index + 1];
  if (!value) throw new Error("Every argument needs a value.");
  switch (args[index]) {
    case "--world":
      worlds.push(value);
      break;
    case "--head":
      head = value;
      break;
    case "--out":
      out = value;
      break;
    case "--begin":
      if (value !== "yes") throw new Error("--begin accepts only yes.");
      begin = true;
      break;
    default:
      throw new Error(`Unknown argument ${args[index]}`);
  }
}
if (!worlds.length || !/^[a-f0-9]{40}$/.test(head) || !out)
  throw new Error(
    "Use --world <saved-game.json> (repeatable) --head <runtime SHA> --out <ignored JSON path>.",
  );
const result = {
  schema: "conversation-action-audit/v1",
  runtimeHead: head,
  declarations: actionDeclarations(process.cwd()),
  saves: worlds.map((path) => {
    const saved: {
      game: { world: World; playerPersonId: EntityId };
      seed?: string;
      placeKey?: string;
    } = JSON.parse(readFileSync(path, "utf8"));
    if (!saved.game?.world || !saved.game.playerPersonId)
      throw new Error(`${path}: expected game.world and game.playerPersonId.`);
    return {
      sourcePath: path,
      preparation: begin
        ? "canonical-openOrdinaryLife-on-a-fork"
        : "saved-snapshot",
      seed: saved.seed ?? saved.game.world.seed,
      placeKey: saved.placeKey ?? null,
      ...auditConversationSnapshot(
        begin
          ? openOrdinaryLife(saved.game.world, saved.game.playerPersonId)
          : saved.game.world,
        saved.game.playerPersonId,
      ),
    };
  }),
};
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(result, null, 2) + "\n");
console.log(
  JSON.stringify({
    out,
    runtimeHead: head,
    declarations: result.declarations.length,
    saves: result.saves.map(({ seed, placeKey, counts }) => ({
      seed,
      placeKey,
      counts,
    })),
  }),
);
