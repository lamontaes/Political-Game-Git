import { useRef, useState } from "react";
import { importContentPack } from "../presentation/content-pack-import";
import { CONTENT_PACK_MAX_CHARACTERS } from "../simulation/runtime-content-packs";
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
  return (
    <section aria-label="Content packs" data-testid="content-pack-workspace">
      <h2>Content packs</h2>
      <p>
        Add an authored encounter or its settings to this life. Imported
        definitions stay with this saved life. Importing spends no game time.
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
          </li>
        ))}
      </ul>
    </section>
  );
}
