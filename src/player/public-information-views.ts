import type { EntityId } from "../simulation";
import type { PublicInformationPanelItem } from "../presentation/public-information-adapters";

export type PublicInformationView =
  | { readonly kind: "for-you" }
  | { readonly kind: "all" }
  | { readonly kind: "outlet"; readonly outletKey: string };

export function relevanceReasons(
  item: PublicInformationPanelItem,
  viewerPersonId: EntityId | null,
  followedOutletKeys: readonly string[],
): readonly string[] {
  const reasons: string[] = [];
  if (followedOutletKeys.includes(item.outletKey)) {
    reasons.push(`You follow ${item.outletName}.`);
  }
  if (
    viewerPersonId !== null &&
    item.people.some((person) => person.personId === viewerPersonId)
  ) {
    reasons.push("This story names you.");
  }
  return reasons;
}

/**
 * A pure interface projection. It sees only explicit publication links and
 * player-chosen follows; it never reads private knowledge or changes World.
 */
export function itemsForPublicInformationView(
  items: readonly PublicInformationPanelItem[],
  view: PublicInformationView,
  viewerPersonId: EntityId | null,
  followedOutletKeys: readonly string[],
): readonly PublicInformationPanelItem[] {
  if (view.kind === "all") return items;
  if (view.kind === "outlet") {
    return items.filter((item) => item.outletKey === view.outletKey);
  }
  return items.filter(
    (item) =>
      relevanceReasons(item, viewerPersonId, followedOutletKeys).length > 0,
  );
}
