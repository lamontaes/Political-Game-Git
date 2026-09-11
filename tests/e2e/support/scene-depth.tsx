import { createRoot } from "react-dom/client";
import { useState } from "react";
import { SceneBackdrop } from "../../../src/player/SceneBackdrop";
import "../../../src/player/player.css";

/** Deliberate rendering control: the red block is not a person or production art. */
function DepthFixture() {
  const [visible, setVisible] = useState(false);
  const hall = new URLSearchParams(location.search).get("scene") === "hall";
  const red =
    "data:image/svg+xml," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="400"><rect width="100" height="400" fill="red"/></svg>',
    );
  return (
    <SceneBackdrop
      sceneId={
        hall ? "civic-community-meeting-room" : "office-council-staff-fixture"
      }
      people={
        visible
          ? [
              {
                personId: "depth-control",
                name: "Depth fixture",
                relationship: null,
                anchorId: hall ? "podium-speaker" : "primary-desk-chair",
                seated: true,
                leftPercent: hall ? 29 : 55,
                topPercent: hall ? 15 : 35,
                widthPercent: 10,
                heightPercent: hall ? 80 : 60,
                hasArt: true,
                layers: [
                  {
                    url: red,
                    leftPercent: hall ? 29 : 55,
                    topPercent: hall ? 15 : 35,
                    widthPercent: 10,
                    heightPercent: hall ? 80 : 60,
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
