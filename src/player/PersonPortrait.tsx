import { CHARACTER_VISUAL_RECIPES } from "../presentation/visual-integration";
import { personName } from "../simulation";
import type { EntityId, World } from "../simulation";

/**
 * A person, when there is no picture of them.
 *
 * Only two appearances have ever been drawn, and they belong to two particular
 * people. Handing one of them to a generated stranger would be a lie about who
 * that stranger is, so this draws nobody instead: initials, a name, and
 * whatever the world actually knows. The game stays readable and stays honest.
 */

const AUTHORED_SEEDS: ReadonlySet<string> = new Set(
  Object.values(CHARACTER_VISUAL_RECIPES).map(
    (recipe) => recipe.appearanceSeed,
  ),
);

export interface PersonPortraitProps {
  readonly world: World;
  readonly personId: EntityId;
  readonly size?: "small" | "large";
  /** Shown under the name when the world knows one. */
  readonly note?: string | null;
}

export function PersonPortrait({
  world,
  personId,
  size = "small",
  note = null,
}: PersonPortraitProps) {
  const person = world.people[personId];
  if (!person) return null;
  const name = personName(person);
  const seed = person.appearance?.seed ?? null;
  const hasAuthoredLikeness = seed !== null && AUTHORED_SEEDS.has(seed);

  return (
    <figure
      className={`person-portrait person-portrait--${size}`}
      data-testid="person-portrait"
      data-likeness={hasAuthoredLikeness ? "authored" : "none"}
    >
      <span aria-hidden="true" className="person-portrait-mark">
        {initials(person.givenName, person.familyName)}
      </span>
      <figcaption>
        <strong>{name}</strong>
        {note ? <span>{note}</span> : null}
      </figcaption>
    </figure>
  );
}

function initials(givenName: string, familyName: string): string {
  return `${givenName.charAt(0)}${familyName.charAt(0)}`.toUpperCase();
}
