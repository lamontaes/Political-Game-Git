import "./PersonAppearanceControls.css";
import { useMemo, useState } from "react";
import type { World } from "../simulation/types";
import { resolveCharacterRecipe } from "../presentation/character-components";
import {
  listPersonVisualSelections,
  listPersonWardrobeFamilies,
  resolvePersonWardrobeContext,
  setPersonVisualSelection,
  type PersonVisualSelection,
  type PersonVisualSelectionContext,
  type PersonWardrobePreference,
} from "../presentation/person-visual-selection";

export interface PersonAppearanceControlsProps extends PersonVisualSelectionContext {
  readonly world: World;
  readonly personId: string;
  readonly preference?: PersonWardrobePreference;
  readonly familyLabels?: Readonly<Record<string, string>>;
  readonly onWorldChange: (world: World) => void;
  readonly onPreferenceChange: (preference: PersonWardrobePreference) => void;
}

/** Caller owns saves and catalog eligibility. No asset bank or preview person is created here. */
export function PersonAppearanceControls(props: PersonAppearanceControlsProps) {
  const { world, personId, library, poseFamily, preference } = props;
  const [message, setMessage] = useState("");
  const person = world.people[personId];
  const state = useMemo(() => {
    if (!person?.appearance)
      return { error: "This person has no saved appearance." } as const;
    const context = { library, poseFamily };
    try {
      const bald = listPersonVisualSelections({
        ...context,
        appearance: person.appearance,
        selectionFilter: { hairFamily: null },
      });
      const recipe = resolveCharacterRecipe(
        {
          appearance: person.appearance,
          poseFamily,
          unresolvableRequiredSlots: "diagnose",
        },
        library,
      );
      const part = (kind: string) =>
        recipe.context.components.find((p) => p.kind === kind)?.family;
      const current =
        person.appearance.selection ??
        (part("body") && part("head")
          ? {
              bodyFamily: part("body")!,
              headFamily: part("head")!,
              hairFamily: part("hair-front") ?? null,
            }
          : undefined);
      const hair = current
        ? listPersonVisualSelections({
            ...context,
            appearance: person.appearance,
            selectionFilter: {
              bodyFamily: current.bodyFamily,
              headFamily: current.headFamily,
            },
          })
        : [];
      const families = listPersonWardrobeFamilies(person, context);
      let preferenceError = "";
      if (preference)
        try {
          resolvePersonWardrobeContext(person, preference, context);
        } catch (e) {
          preferenceError = e instanceof Error ? e.message : String(e);
        }
      return { bald, hair, current, families, preferenceError };
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) };
    }
  }, [person, library, poseFamily, preference]);
  if (state.error !== undefined) return <p role="status">{state.error}</p>;
  const { bald, hair, current, families } = state;
  function choose(patch: Partial<PersonVisualSelection>) {
    if (!person?.appearance) return;
    try {
      const choices = listPersonVisualSelections({
        library,
        poseFamily,
        appearance: person.appearance,
        selectionFilter: {
          bodyFamily: patch.bodyFamily ?? current?.bodyFamily,
          ...(patch.headFamily ? { headFamily: patch.headFamily } : {}),
          ...(Object.hasOwn(patch, "hairFamily")
            ? { hairFamily: patch.hairFamily }
            : {}),
        },
      });
      const wanted = { ...current, ...patch };
      const next =
        choices.find(
          (o) =>
            o.selection.headFamily === wanted.headFamily &&
            o.selection.hairFamily === wanted.hairFamily,
        ) ??
        choices.find((o) => o.selection.hairFamily === null) ??
        choices[0];
      if (!next)
        throw new Error("No compatible appearance choice for this pose.");
      props.onWorldChange(
        setPersonVisualSelection(world, personId, next.selection, {
          library,
          poseFamily,
        }),
      );
      setMessage(
        "Appearance changed. Saved wardrobe choices are retained and checked against this body.",
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    }
  }
  return (
    <div
      className="person-appearance-controls"
      data-testid="person-appearance-controls"
    >
      <fieldset>
        <legend>Saved appearance</legend>
        {(["bodyFamily", "headFamily", "hairFamily"] as const).map((kind) => {
          const options =
            kind === "hairFamily"
              ? hair
              : bald.filter(
                  (o) =>
                    kind === "bodyFamily" ||
                    o.selection.bodyFamily === current?.bodyFamily,
                );
          const values = [...new Set(options.map((o) => o.selection[kind]))];
          const label = {
            bodyFamily: "Body",
            headFamily: "Face",
            hairFamily: "Hairstyle",
          }[kind];
          return (
            <label key={kind}>
              {label}
              <select
                aria-label={label}
                data-testid={`person-appearance-${kind}`}
                value={current?.[kind] ?? ""}
                onChange={(e) => choose({ [kind]: e.target.value || null })}
              >
                {!current && kind !== "hairFamily" ? (
                  <option value="">Choose appearance</option>
                ) : null}
                {values.map((v, index) => (
                  <option key={v ?? "none"} value={v ?? ""}>
                    {v === null
                      ? "No hair"
                      : (props.familyLabels?.[v] ?? `${label} ${index + 1}`)}
                  </option>
                ))}
              </select>
            </label>
          );
        })}
        {!bald.length ? (
          <p>
            No compatible selectable body and head in this catalog and pose.
          </p>
        ) : null}
      </fieldset>
      <fieldset>
        <legend>Wardrobe for this person</legend>
        {(["top", "bottom", "footwear"] as const).map((kind) => {
          const value = preference?.families[kind] ?? "";
          return (
            <label key={kind}>
              {kind}
              <select
                aria-label={kind}
                value={value}
                onChange={(e) => {
                  const nextFamilies = { ...preference?.families };
                  if (e.target.value) nextFamilies[kind] = e.target.value;
                  else delete nextFamilies[kind];
                  const next = { personId, families: nextFamilies };
                  // Store each explicit edit even while another retained choice needs repair;
                  // the consumer must diagnose the combined preference until it is valid.
                  props.onPreferenceChange(next);
                  setMessage("Wardrobe preference changed.");
                }}
              >
                <option value="">Seeded default</option>
                {value && !families[kind].includes(value) ? (
                  <option value={value} disabled>
                    Unavailable saved choice: {value}
                  </option>
                ) : null}
                {families[kind].map((family, index) => (
                  <option key={family} value={family}>
                    {props.familyLabels?.[family] ?? `${kind} ${index + 1}`}
                  </option>
                ))}
              </select>
            </label>
          );
        })}
      </fieldset>
      {state.preferenceError ? (
        <p role="alert">Saved wardrobe unavailable: {state.preferenceError}</p>
      ) : null}
      <p role="status">{message}</p>
    </div>
  );
}
