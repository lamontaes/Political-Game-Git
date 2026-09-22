import { useRef, useState } from "react";
import { importContentPack } from "../presentation/content-pack-import";
import { CONTENT_PACK_MAX_CHARACTERS } from "../simulation/runtime-content-packs";
import { traitRegistryFor } from "../simulation/trait-registry";
import type { World } from "../simulation/types";

/** A mounts this leaf inside the existing on-demand settings/menu surface. */
export function ContentPackWorkspace({
  world,
  onWorldChange,
}: {
  readonly world: World;
  readonly onWorldChange: (world: World) => void;
}) {
  const latestWorld = useRef(world);
  latestWorld.current = world;
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  // What an installed pack's traits did, including the rows that were skipped:
  // a bad row is left out and said, never silently dropped.
  const traitRegistry = traitRegistryFor(world);
  const installedIds = new Set(
    world.contentPacks?.installed.map(({ pack }) => pack.id) ?? [],
  );
  const traitCount = (packId: string) => {
    const count =
      traitRegistry.report.packs.find((report) => report.pack === packId)
        ?.traitsRegistered.length ?? 0;
    return count === 1 ? "1 trait" : `${count} traits`;
  };
  const skipped = traitRegistry.report.rejections.filter((rejection) =>
    installedIds.has(rejection.pack),
  );
  return (
    <section aria-label="Content packs" data-testid="content-pack-workspace">
      <h2>Content packs</h2>
      <p>
        Add an authored encounter, its settings or a personality trait to this
        life. Imported definitions stay with this saved life. Importing spends
        no game time.
      </p>
      <label>
        Import content pack
        <input
          type="file"
          accept=".json,application/json"
          disabled={pending}
          onChange={async (event) => {
            const input = event.currentTarget;
            const file = input.files?.[0];
            if (!file) return;
            setPending(true);
            const original = latestWorld.current;
            let next: World;
            try {
              if (file.size > CONTENT_PACK_MAX_CHARACTERS * 4)
                throw new Error("Content pack is too large.");
              const text = await file.text();
              if (latestWorld.current !== original)
                throw new Error(
                  "This life changed while the file was opening. Import it again.",
                );
              next = importContentPack(original, text);
            } catch (error) {
              setMessage(
                `${error instanceof Error ? error.message : "The content pack could not be read."} This life is unchanged.`,
              );
              return;
            } finally {
              setPending(false);
              input.value = "";
            }
            onWorldChange(next);
            setMessage(
              "Content pack added. Save this life to keep it; its encounters use the ordinary scene choices.",
            );
          }}
        />
      </label>
      <p role="status">{message}</p>
      <ul>
        {world.contentPacks?.installed.map(({ pack }) => (
          <li key={pack.id}>
            {pack.title} ({pack.version}) — {pack.scenes.length} encounters,{" "}
            {pack.durations.length} settings
            {pack.traits ? `, ${traitCount(pack.id)}` : ""}
          </li>
        ))}
      </ul>
      {skipped.length > 0 ? (
        <>
          <p>Left out of this life, and why:</p>
          <ul data-testid="content-pack-skipped">
            {skipped.map((rejection) => (
              <li key={`${rejection.pack} ${rejection.where}`}>
                {rejection.pack}, {rejection.where}: {rejection.reason}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}
