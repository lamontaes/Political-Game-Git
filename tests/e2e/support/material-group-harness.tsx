import { useState } from "react";
import { createRoot } from "react-dom/client";
import { MaterialGroup } from "../../../src/player/ModularCharacter";

// Hold the real component's decode boundary, without replacing its state logic.
const loads: ControlledImage[] = [];
class ControlledImage {
  src = "";
  resolve!: () => void;
  reject!: (error: Error) => void;
  decoded = new Promise<void>((resolve, reject) => {
    this.resolve = resolve;
    this.reject = reject;
  });
  constructor() {
    loads.push(this);
  }
  decode() {
    return this.decoded;
  }
}
Object.defineProperty(window, "Image", { value: ControlledImage });
const pixel = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="teal"/></svg>')}`;
function Harness() {
  const [identity, setIdentity] = useState("A");
  const [position, setPosition] = useState(20);
  Object.assign(window, {
    materialGroupHarness: {
      request: setIdentity,
      position: setPosition,
      count: () => loads.length,
      decode: (index: number) => loads[index]!.resolve(),
      fail: (index: number) =>
        loads[index]!.reject(new Error("controlled decode failure")),
    },
  });
  const layers = ["head", "body"].map((part) => ({
    assetId: `controlled-${part}`,
    url: `${pixel}#${identity}-${part}`,
  }));
  return (
    <MaterialGroup layers={layers}>
      <div
        data-testid="person"
        data-identity={identity}
        data-position={position}
        style={{ marginLeft: position }}
      >
        {layers.map((part) => (
          <img key={part.assetId} src={part.url} alt={part.assetId} />
        ))}
      </div>
    </MaterialGroup>
  );
}
createRoot(document.getElementById("root")!).render(<Harness />);
