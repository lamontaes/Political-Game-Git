import { createRoot } from "react-dom/client";
import { useState } from "react";
import { SceneBackdrop } from "../../../src/player/SceneBackdrop";
import "../../../src/player/player.css";

/** Deliberate rendering control: the red block is not a person or production art. */
function DepthFixture() {
  const [visible, setVisible] = useState(false);
  const hall = new URLSearchParams(location.search).get("scene") === "hall";
  const apartment02 =
    new URLSearchParams(location.search).get("scene") === "apartment02";
  const apartment =
    new URLSearchParams(location.search).get("scene") === "apartment" ||
    apartment02;
  const red =
    "data:image/svg+xml," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="400"><rect width="100" height="400" fill="red"/></svg>',
    );
  return (
    <SceneBackdrop
      sceneId={
        apartment
          ? apartment02
            ? "residence-apartment-living-ordinary-02"
            : "residence-apartment-living-canonical-03"
          : hall
            ? "civic-community-meeting-room"
            : "office-council-staff-fixture"
      }
      people={
        visible
          ? [
              {
                personId: "depth-control",
                name: "Depth fixture",
                relationship: null,
                anchorId: apartment
                  ? "entry-side-standing"
                  : hall
                    ? "podium-speaker"
                    : "primary-desk-chair",
                seated: true,
                leftPercent: apartment
                  ? apartment02
                    ? 43
                    : 45
                  : hall
                    ? 29
                    : 55,
                topPercent: apartment
                  ? apartment02
                    ? 43
                    : 45
                  : hall
                    ? 15
                    : 35,
                widthPercent: apartment ? 5 : 10,
                heightPercent: apartment ? 35 : hall ? 80 : 60,
                hasArt: true,
                layers: [
                  {
                    url: red,
                    leftPercent: apartment
                      ? apartment02
                        ? 43
                        : 45
                      : hall
                        ? 29
                        : 55,
                    topPercent: apartment
                      ? apartment02
                        ? 43
                        : 45
                      : hall
                        ? 15
                        : 35,
                    widthPercent: apartment ? 5 : 10,
                    heightPercent: apartment ? 35 : hall ? 80 : 60,
                  },
                ],
                presence: "Rendering control",
              },
            ]
          : []
      }
    >
      <button type="button" onClick={() => setVisible(!visible)}>
        Toggle depth control
      </button>
    </SceneBackdrop>
  );
}
createRoot(document.getElementById("root")!).render(<DepthFixture />);
