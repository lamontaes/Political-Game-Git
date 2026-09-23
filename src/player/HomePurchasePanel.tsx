import { useState } from "react";
import type { EntityId, World } from "../simulation";
import { buyHome } from "../simulation/home-purchase";
import { refreshLifeOpportunities } from "../simulation/life-opportunities";
import { projectHomePurchase } from "../presentation/home-purchase-view";

/**
 * Owning a home, or buying one. Reads the projection; the only write is the
 * purchase itself, and only when the player presses the button.
 */
export function HomePurchasePanel({
  world,
  personId,
  onWorldChange,
}: {
  readonly world: World;
  readonly personId: EntityId;
  readonly onWorldChange: (world: World) => void;
}) {
  const [notice, setNotice] = useState("");
  const view = projectHomePurchase(world, personId);
  if (!view) return null;
  return (
    <section aria-label="Your home" data-testid="home-purchase">
      <h3>{view.kind === "owns" ? "Your home" : view.headline}</h3>
      {view.kind === "owns" ? (
        <>
          <p>{view.headline}</p>
          {view.mortgageLine && <p>{view.mortgageLine}</p>}
        </>
      ) : (
        <>
          <p>{view.terms}</p>
          {view.reason && <p className="game-note">{view.reason}</p>}
          <button
            type="button"
            data-testid="buy-home"
            disabled={view.kind !== "can-buy"}
            onClick={() => {
              // Settle anything already due first, so the down payment
              // cannot take money this month's bills were owed.
              const result = buyHome(
                refreshLifeOpportunities(world, personId),
                personId,
              );
              if (result.status === "bought") {
                setNotice("You bought a home.");
                onWorldChange(result.world);
              } else setNotice(result.reason);
            }}
          >
            Buy a home
          </button>
        </>
      )}
      {notice && (
        <p role="status" className="game-note">
          {notice}
        </p>
      )}
    </section>
  );
}
