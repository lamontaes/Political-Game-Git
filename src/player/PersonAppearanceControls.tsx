import "./PersonAppearanceControls.css";
import { useMemo, useState, type ReactNode } from "react";
import type { World, PersonAppearance } from "../simulation/types";
import { resolveCharacterRecipe } from "../presentation/character-components";
import {
  commitCompleteOutfit,
  findCompleteOutfit,
  resolveCompleteOutfit,
  type OutfitFamilies,
} from "../presentation/complete-outfit";
import {
  listPersonVisualSelections,
  listPersonWardrobeFamilies,
  type PersonVisualSelection,
  type PersonVisualSelectionContext,
  type PersonWardrobePreference,
} from "../presentation/person-visual-selection";

export interface PersonAppearanceControlsProps extends PersonVisualSelectionContext {
  readonly world: World;
  readonly personId: string;
  readonly preference?: PersonWardrobePreference;
  readonly familyLabels?: Readonly<Record<string, string>>;
  readonly renderPreview?: (appearance: PersonAppearance) => ReactNode;
  readonly onWorldChange: (world: World) => void;
  /** Legacy callers retain this prop; new outfits commit atomically on World. */
  readonly onPreferenceChange: (preference: PersonWardrobePreference) => void;
}
export function appearanceFamilyLabel(value: string): string {
  return value
    .replace(/^pv4[-_](?:ocd[-_])?/, "")
    .replace(/^wave[-_]a[-_]/, "")
    .replace(/[-_]v\d+(?:[-_]pv4)?$/, "")
    .replace(/[-_]standing[-_]neutral[-_]front[-_]a/, "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
/** Every confirmed edit crosses one validated World write. Shell callbacks cannot race it. */
export function PersonAppearanceControls(props: PersonAppearanceControlsProps) {
  const { world, personId, library, poseFamily } = props;
  const person = world.people[personId];
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState<{
    appearance: PersonAppearance;
    families: OutfitFamilies;
    source: PersonAppearance;
  } | null>(null);
  const label = (v: string) =>
    props.familyLabels?.[v] ?? appearanceFamilyLabel(v);
  const state = useMemo(() => {
    if (!person?.appearance) return null;
    const appearance = person.appearance;
    const families = appearance.outfit?.families ?? props.preference?.families;
    const result = resolveCompleteOutfit({
      appearance,
      families,
      library,
      poseFamily,
    });
    let recipe;
    try {
      recipe = resolveCharacterRecipe(
        { appearance, poseFamily, unresolvableRequiredSlots: "diagnose" },
        library,
      );
    } catch {
      return null;
    }
    const part = (k: string) =>
      recipe.context.components.find((c) => c.kind === k)?.family;
    const current =
      appearance.selection ??
      (part("body") && part("head")
        ? {
            bodyFamily: part("body")!,
            headFamily: part("head")!,
            hairFamily: part("hair-front") ?? null,
          }
        : undefined);
    const bald = listPersonVisualSelections({
      appearance,
      library,
      poseFamily,
      selectionFilter: { hairFamily: null },
    });
    const hair = current
      ? listPersonVisualSelections({
          appearance,
          library,
          poseFamily,
          selectionFilter: {
            bodyFamily: current.bodyFamily,
            headFamily: current.headFamily,
          },
        })
      : [];
    let wardrobe: ReturnType<typeof listPersonWardrobeFamilies> = {
      top: [],
      bottom: [],
      footwear: [],
    };
    try {
      wardrobe = listPersonWardrobeFamilies(person, { library, poseFamily });
    } catch {
      /* recovery remains explicit */
    }
    const supported = Object.fromEntries(
      Object.entries(wardrobe).map(([kind, values]) => [
        kind,
        values.filter(
          (family) =>
            resolveCompleteOutfit({
              appearance,
              library,
              poseFamily,
              families: { ...families, [kind]: family },
            }).ok,
        ),
      ]),
    ) as unknown as typeof wardrobe;
    return { current, bald, hair, families, result, supported };
  }, [person, props.preference, library, poseFamily]);
  if (world.control.kind !== "person" || world.control.personId !== personId)
    return <p>Only your own appearance can be changed.</p>;
  if (!state || !person?.appearance)
    return (
      <p role="status">
        This saved appearance cannot be shown in this catalog. The record is
        unchanged.
      </p>
    );
  const appearance = person.appearance;
  function commit(next: PersonAppearance, families: OutfitFamilies) {
    try {
      props.onWorldChange(
        commitCompleteOutfit(world, personId, next, {
          library,
          poseFamily,
          families,
        }),
      );
      setPending(null);
      setMessage("Appearance and outfit changed together.");
    } catch {
      setMessage(
        "That outfit is unavailable. Your saved appearance has not changed.",
      );
    }
  }
  function propose(next: PersonAppearance) {
    const exact = resolveCompleteOutfit({
      appearance: next,
      families: state!.families,
      library,
      poseFamily,
    });
    if (exact.ok) {
      commit(next, exact.families);
      return;
    }
    const replacement = findCompleteOutfit({
      appearance: next,
      families: state!.families,
      library,
      poseFamily,
    });
    if (replacement.ok) {
      setPending({
        appearance: next,
        families: replacement.families,
        source: appearance,
      });
      setMessage("Review the compatible outfit before applying this change.");
    } else {
      setPending(null);
      setMessage(exact.message);
    }
  }
  function choose(patch: Partial<PersonVisualSelection>) {
    setPending(null);
    if (!state!.current) return;
    const wanted = { ...state!.current, ...patch };
    const options = listPersonVisualSelections({
      appearance,
      library,
      poseFamily,
      selectionFilter: {
        bodyFamily: wanted.bodyFamily,
        ...(patch.headFamily ? { headFamily: patch.headFamily } : {}),
        ...(Object.hasOwn(patch, "hairFamily")
          ? { hairFamily: patch.hairFamily }
          : {}),
      },
    });
    const next = options.find(
      (o) =>
        o.selection.headFamily === wanted.headFamily &&
        o.selection.hairFamily === wanted.hairFamily,
    );
    // A body or face change cannot silently substitute another person's face/hair.
    if (!next) {
      setMessage(
        "That choice needs a matching face or hairstyle. Your saved appearance has not changed.",
      );
      return;
    }
    propose({ ...appearance, selection: next.selection });
  }
  return (
    <div
      className="person-appearance-controls"
      data-testid="person-appearance-controls"
    >
      <fieldset>
        <legend>Appearance</legend>
        {(["bodyFamily", "headFamily", "hairFamily"] as const).map((kind) => {
          const options =
            kind === "hairFamily"
              ? state.hair
              : state.bald.filter(
                  (o) =>
                    kind === "bodyFamily" ||
                    o.selection.bodyFamily === state.current?.bodyFamily,
                );
          const values = [...new Set(options.map((o) => o.selection[kind]))];
          const title = {
            bodyFamily: "Body",
            headFamily: "Face",
            hairFamily: "Hairstyle",
          }[kind];
          return (
            <label key={kind}>
              {title}
              <select
                aria-label={title}
                data-testid={`person-appearance-${kind}`}
                value={state.current?.[kind] ?? ""}
                onChange={(e) => choose({ [kind]: e.target.value || null })}
              >
                {values.map((v) => (
                  <option
                    key={v ?? "none"}
                    value={v ?? ""}
                    disabled={Boolean(
                      state.current &&
                      !findCompleteOutfit({
                        appearance: {
                          ...appearance,
                          selection: { ...state.current, [kind]: v },
                        },
                        families: state.families,
                        library,
                        poseFamily,
                      }).ok,
                    )}
                  >
                    {v === null ? "No hair" : label(v)}
                  </option>
                ))}
              </select>
            </label>
          );
        })}
      </fieldset>
      <fieldset>
        <legend>Clothing</legend>
        {(["top", "bottom", "footwear"] as const).map((kind) => {
          const value = state.families?.[kind] ?? "";
          return (
            <label key={kind}>
              {kind}
              <select
                aria-label={kind}
                value={value}
                onChange={(e) => {
                  const families = { ...state.families };
                  if (e.target.value) families[kind] = e.target.value;
                  else delete families[kind];
                  const result = resolveCompleteOutfit({
                    appearance,
                    families,
                    library,
                    poseFamily,
                  });
                  if (result.ok) commit(appearance, result.families);
                  else setMessage(result.message);
                }}
              >
                <option value="">Current default</option>
                {value && !state.supported[kind].includes(value) ? (
                  <option value={value} disabled>
                    Saved choice needs recovery
                  </option>
                ) : null}
                {state.supported[kind].map((v) => (
                  <option key={v} value={v}>
                    {label(v)}
                  </option>
                ))}
              </select>
            </label>
          );
        })}
      </fieldset>
      {!state.result.ok ? (
        <div
          role="alert"
          data-diagnostic={state.result.diagnostics.join(" | ")}
        >
          <p>
            This saved outfit cannot be shown completely. The saved record is
            unchanged.
          </p>
          <button type="button" onClick={() => propose(appearance)}>
            Preview compatible clothing
          </button>
        </div>
      ) : null}
      {pending && pending.source === appearance ? (
        <section
          aria-label="Confirm compatible outfit"
          data-testid="outfit-replacement-preview"
        >
          {props.renderPreview?.({
            ...pending.appearance,
            outfit: {
              version: "complete-outfit-v1",
              families: pending.families,
            },
          })}
          <p>Keep this face and body with:</p>
          <ul>
            {Object.entries(pending.families).map(([k, v]) => (
              <li key={k}>
                {k}: {label(v)}
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => commit(pending.appearance, pending.families)}
          >
            Apply this outfit
          </button>
          <button
            type="button"
            onClick={() => {
              setPending(null);
              setMessage("Your appearance is unchanged.");
            }}
          >
            Cancel
          </button>
        </section>
      ) : null}
      <p role="status">{message}</p>
    </div>
  );
}
