import { useMemo, useState } from "react";

import { createLegislativeBargainingFixture } from "../presentation/legislative-bargaining-fixture";
import { MeasureFloorSurface } from "./MeasureFloorSurface";

/**
 * The developer floor route (`?view=floor`).
 *
 * Builds the synthetic bargaining fixture and hands it to the same surface the
 * production route uses. The fixture world lives only in this component's
 * state: it never touches a save, and the production route never touches this
 * module.
 */
export function MeasureFloorView() {
  const seed =
    new URLSearchParams(window.location.search).get("seed") ?? undefined;
  const fixture = useMemo(
    () => createLegislativeBargainingFixture(seed),
    [seed],
  );
  const [world, setWorld] = useState(fixture.world);

  return (
    <MeasureFloorSurface world={world} seat={fixture} onWorldChange={setWorld} />
  );
}
