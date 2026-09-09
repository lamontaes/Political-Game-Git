import { useEffect } from "react";
import { useReviewEnvironment } from "../ui/review-context";
import { deserializeWorld, serializeWorld } from "../simulation/serialization";
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
  const review = useReviewEnvironment();
  const seed =
    new URLSearchParams(window.location.search).get("seed") ?? undefined;
  const fixture = useMemo(
    () => createLegislativeBargainingFixture(seed),
    [seed],
  );
  const [world, setWorld] = useState(() =>
    review
      ? deserializeWorld(
          serializeWorld(
            review?.initialWorld.id === fixture.world.id
              ? review.initialWorld
              : fixture.world,
          ),
        )
      : fixture.world,
  );

  useEffect(() => {
    review?.reportWorld(world);
  }, [world, review]);

  return (
    <MeasureFloorSurface
      world={world}
      seat={fixture}
      onWorldChange={setWorld}
    />
  );
}
