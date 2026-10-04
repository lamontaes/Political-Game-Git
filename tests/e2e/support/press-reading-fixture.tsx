import { useState } from "react";
import { createRoot } from "react-dom/client";
import { NewsDesk, type NewsContext } from "../../../src/player/news/NewsDesk";
import { BrowserSaveStore } from "../../../src/presentation/browser-world-repository";
import { projectRoomMedia } from "../../../src/presentation/room-media";
import { readPressPublication } from "../../../src/simulation/press/read-publication";
import type { EntityId } from "../../../src/simulation/types";
import { createPressReadingWorld } from "./press-reading-world";

const seed = "press-story-learning:generated-opening";
const slot = "save_press-reading-generated" as EntityId;
const store = new BrowserSaveStore({
  databaseName: `team6-press-reading:${new URLSearchParams(location.search).get("case") ?? "default"}`,
});
const informational =
  new URLSearchParams(location.search).get("informational") === "true";
const loaded = await store.load(slot);
const generated = loaded ? null : createPressReadingWorld(seed);
const initial = loaded ?? generated!.world;
if (initial.control.kind !== "person")
  throw new Error("Actual played-life reader required.");
const personId = initial.control.personId;

function Fixture() {
  const [world, setWorld] = useState(initial);
  const [context, setContext] = useState<NewsContext>("read");
  const [saved, setSaved] = useState("");
  const room = projectRoomMedia(world, personId);
  const publicationId = room.broadcast?.story?.publicationId;
  const publication = world.history.publications?.find(
    (row) => row.id === publicationId,
  );
  const proof = {
    seed,
    worldId: world.id,
    personId,
    date: world.currentDate,
    place:
      world.jurisdictions[world.people[personId]!.homeJurisdictionId]?.name,
    moment: world.currentMoment,
    publication,
    mediaKnowledge: world.history.knowledge.filter(
      (row) => row.personId === personId && row.source.kind === "media",
    ),
    transferCount: world.history.resourceTransferOutcomes.length,
    informational,
  };
  return (
    <>
      <NewsDesk
        world={world}
        context={context}
        onContextChange={setContext}
        mode="front"
        outletKey={null}
        onModeChange={() => {}}
        onOutletChange={() => {}}
        onOpenPerson={() => {}}
        {...(informational
          ? {}
          : {
              onReadPublication: (id: EntityId) =>
                setWorld((current) =>
                  readPressPublication(current, personId, id),
                ),
            })}
        around={<p>Around reader.</p>}
        directory={<p>Directory reader.</p>}
        press={<p>Press reader.</p>}
      />
      <pre data-testid="press-reading-proof">{JSON.stringify(proof)}</pre>
      <button
        onClick={async () => setSaved((await store.save(world, slot)).status)}
      >
        Keep generated test world
      </button>
      <output data-testid="press-reading-saved">{saved}</output>
    </>
  );
}
createRoot(document.getElementById("root")!).render(<Fixture />);
