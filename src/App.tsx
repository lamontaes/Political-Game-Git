import { lazy, Suspense } from "react";
import { PlayerGame } from "./player/PlayerGame";

/**
 * Normal play is the game. The development routes (`?view=developer`,
 * `?view=content`, the proofs and fixtures) live in `DevelopmentRoutes`, and
 * this file reaches them only when the build allows development routes: the
 * Vite development server, or an internal review build. In a player build the
 * condition is a constant false, the dynamic import is dead code, and none of
 * those screens ships.
 */
const DEVELOPMENT_ROUTES_ALLOWED =
  import.meta.env.DEV ||
  import.meta.env.VITE_OCD_BUILD_PROFILE === "internal-art-review";

const DevelopmentRoutes = DEVELOPMENT_ROUTES_ALLOWED
  ? lazy(() => import("./DevelopmentRoutes"))
  : null;

export function App() {
  const view = new URLSearchParams(window.location.search).get("view");
  if (DevelopmentRoutes && view) {
    return (
      <Suspense fallback={null}>
        <DevelopmentRoutes view={view} />
      </Suspense>
    );
  }
  return <PlayerGame />;
}
