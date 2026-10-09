import { figureHeadTopPercent, type BackdropPerson } from "./backdrop-people";

/** Where a plaque sits on a person, in percent of the picture. */
export interface PlaqueAnchor {
  /** "below": on the front edge of what they are seen behind; else the head. */
  readonly anchor: "below" | "head";
  readonly leftPercent: number;
  readonly topPercent: number;
}

/**
 * Where a person's plaque goes. Someone seen only above a desk, rostrum or
 * bench carries it on that furniture's front edge, under what is seen of
 * them, unless someone nearer is in front of that edge (the Vice President's
 * desk behind the President at the podium); then, as for everyone else,
 * just above the head. `plaque` is the plaque's size in percent of the
 * picture, so it is not laid over a nearer person's body.
 */
export function plaqueAnchor(
  person: BackdropPerson,
  everyone: readonly BackdropPerson[],
  plaque: { readonly widthPercent: number; readonly heightPercent: number },
): PlaqueAnchor {
  const leftPercent = person.leftPercent + person.widthPercent / 2;
  const head = {
    anchor: "head",
    leftPercent,
    topPercent: figureHeadTopPercent(person),
  } as const;
  const edge = person.clipBelowPercent;
  if (edge === null) return head;
  const covers = everyone.some((other) => {
    if (other.personId === person.personId || other.depth <= person.depth)
      return false;
    // The body is the middle half of the figure's box.
    const bodyLeft = other.leftPercent + other.widthPercent / 4;
    const bodyRight = other.leftPercent + (other.widthPercent * 3) / 4;
    const bottom =
      other.clipBelowPercent ?? other.topPercent + other.heightPercent;
    return (
      leftPercent + plaque.widthPercent / 2 > bodyLeft &&
      leftPercent - plaque.widthPercent / 2 < bodyRight &&
      edge + plaque.heightPercent > figureHeadTopPercent(other) &&
      edge < bottom
    );
  });
  return covers ? head : { anchor: "below", leftPercent, topPercent: edge };
}
