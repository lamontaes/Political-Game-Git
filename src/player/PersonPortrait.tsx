import type { CharacterWardrobeContext } from "../presentation/character-components";
import type { PersonVisualLibraries } from "../presentation/person-visual";
import { resolvePersonPortrait } from "../presentation/person-visual";
import { ModularCharacter } from "./ModularCharacter";
import { personName } from "../simulation";
import type { EntityId, World } from "../simulation";

export interface PersonPortraitProps {
  readonly world: World;
  readonly visualLibraries?: PersonVisualLibraries;
  readonly wardrobe?: CharacterWardrobeContext;
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
  visualLibraries,
  wardrobe,
}: PersonPortraitProps) {
  const person = world.people[personId];
  if (!person) return null;
  const name = personName(person);
  const visual = resolvePersonPortrait(person, {
    libraries: visualLibraries,
    wardrobe,
  });

  return (
    <figure
      className={`person-portrait person-portrait--${size}`}
      data-testid="person-portrait"
      data-likeness={visual.kind === "placeholder" ? "none" : visual.kind}
    >
      <span
        aria-hidden="true"
        className="person-portrait-mark"
        style={{ position: "relative", overflow: "hidden", flexShrink: 0 }}
      >
        {visual.kind === "authored" ? (
          <img
            src={visual.asset.url}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        ) : visual.kind === "modular" ? (
          <ModularCharacter
            plan={visual.plan}
            testId="person-portrait-character"
          />
        ) : (
          initials(person.givenName, person.familyName)
        )}
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
