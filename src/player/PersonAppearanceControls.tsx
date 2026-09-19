import { SeededRng } from "../simulation/rng";
import { KIT41_REGISTRY as kit } from "../presentation/private-candidate-manifests";
import { AppearanceOutfitDialog } from "./AppearanceOutfitDialog";
import { PreparedAppearanceControls } from "./PreparedAppearanceControls";
import {
  PREPARED_FAMILIES,
  selectPreparedBody,
  preparedFamily,
  preparedPartsAt,
} from "../presentation/engine-people29-data";
import { GameSelect, optionAccessibleName } from "./controls/GameSelect";
import "./PersonAppearanceControls.css";
import { useMemo, useState, useRef, type ReactNode } from "react";
import type { World, PersonAppearance } from "../simulation/types";
import { resolveCharacterRecipe } from "../presentation/character-components";
import {
  commitCompleteOutfit,
  commitCorrectedGeneration,
  findCompleteOutfit,
  proposeCorrectedGeneration,
  resolveCompleteOutfit,
  type OutfitFamilies,
} from "../presentation/complete-outfit";
import { resolveAppearanceCatalogGeneration } from "../presentation/character-components";
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
  readonly renderHairThumbnail?: (appearance: PersonAppearance) => ReactNode;
  readonly onWorldChange: (world: World) => void;
  /** Legacy callers retain this prop; new outfits commit atomically on World. */
  readonly onPreferenceChange: (preference: PersonWardrobePreference) => void;
}
export function appearanceFamilyLabel(
  value: string,
  fallback = "Appearance choice",
): string {
  const authored = PREPARED_FAMILIES.flatMap((f) => f.parts)
    .slice()
    .reverse()
    .find((p) => p.logicalFamily === value && p.label);
  if (authored?.label) return authored.label;
  const imported = (
    kit.labels as Record<string, { name: string; colour: string }>
  )[value];
  if (imported && /^source colou?r$/i.test(imported.colour))
    return imported.name;
  if (imported)
    return `${imported.name} · ${imported.colour}`
      .replace(/\bcolour\b/gi, "color")
      .replace(/\bgrey\b/gi, "gray")
      .replace(/\bcentre\b/gi, "center")
      .replace(/\bcustomise\b/gi, "customize")
      .replace(/\btrousers\b/gi, "pants");
  if (/^ep(?:29|34|35|36|40|41)-/.test(value)) {
    const body = preparedFamily(value);
    if (body) {
      const frame = body.bodyType.endsWith("heavy")
        ? "fuller"
        : body.bodyType.endsWith("lean")
          ? "slim"
          : "balanced";
      return `${body.geometry.presentation === "feminine" ? "Feminine" : "Masculine"} · ${frame}`;
    }
    const name = value.replace(
      /^ep(?:29|34|35|36|40|41)-(?:masc|fem)-(?:average|heavy|lean)-/,
      "",
    );
    const names: Record<string, string> = {
      "short-sleeve-torso": value.startsWith("ep41-masc-average")
        ? "Blue short-sleeve polo"
        : "Short-sleeve shirt",
      "long-sleeve-torso": "Long-sleeve shirt",
      "head-average": value.includes("-masc-")
        ? "Long mature face"
        : "Rounded face",
      "head-lean": value.includes("-masc-")
        ? "Angular younger face"
        : "Angular mature face",
      "head-heavy": value.includes("-masc-")
        ? "Broad older face"
        : "Broad oval face",
      "hair-average": value.includes("-masc-")
        ? "Receding side part"
        : "Short coils",
      "hair-lean": value.includes("-masc-") ? "Short waves" : "Gray waves",
      "hair-heavy": value.includes("-masc-") ? "Brushed gray" : "Dark bob",
      head: "Illustrated face",
      hair: "Illustrated hairstyle",
      "navy-shirt-torso": "Navy long-sleeve shirt",
      "blue-polo-torso": "Blue short-sleeve polo",
      "burgundy-blouse-torso": "Burgundy short-sleeve blouse",
      trousers: "Straight pants",
      shoes: "Everyday shoes",
      "oval-head": "Rounded face",
      "square-head": "Angular face",
      "head-oval": "Rounded face",
      "head-square": "Angular face",
      "side-part-hair": "Side part",
      "swept-hair": "Swept hair",
      "oxford-torso": "Oxford shirt",
      "polo-torso": "Polo shirt",
      "straight-wool": "Straight wool pants",
      "tapered-chino": "Tapered chinos",
      "shoes-front": "Leather shoes",
      "head-01": "Soft oval face",
      "head-02": "Round face",
      "head-03": "Oval face",
      "head-04": "Square face",
      "head-05": "Broad oval face",
      "head-06": "Lined older face",
      "head-07": "Narrow oval face",
      "head-08": "Full oval face",
      "head-09": "Strong square face",
      "head-10": "Older square face",
      "head-11": "Round young face",
      "head-12": "Weathered older face",
      "hair-side-part": "Short side part",
      "hair-short-crop": "Short crop",
      "hair-coily-crop": "Coily crop",
      "hair-receding-short": "Short receding",
      "hair-short-layered": "Short layered",
      "hair-tapered-natural": "Tapered natural",
      "hair-rounded-afro": "Rounded afro",
      "hair-straight-bob": "Straight bob",
    };
    return names[name.replace(/-v2$/, "")] ?? fallback;
  }
  return fallback;
}
/** Every confirmed edit crosses one validated World write. Shell callbacks cannot race it. */
export function PersonAppearanceControls(props: PersonAppearanceControlsProps) {
  const { world, personId, library, poseFamily } = props;
  const person = world.people[personId];
  const [message, setMessage] = useState("");
  const [hairQuery, setHairQuery] = useState("");
  const randomSequence = useRef(0);
  const pick = <T,>(values: readonly T[]): T =>
    new SeededRng(person!.appearance!.seed)
      .fork(`appearance-choice:${++randomSequence.current}`)
      .pick(values);
  const [pending, setPending] = useState<{
    appearance: PersonAppearance;
    families: OutfitFamilies;
    source: PersonAppearance;
    /** An explicit move to newer corrected artwork, not an outfit edit. */
    artworkUpdate?: boolean;
  } | null>(null);
  const label = (v: string) =>
    appearanceFamilyLabel(v, props.familyLabels?.[v]);
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
  let pinnedGeneration: number | null = null;
  try {
    pinnedGeneration = resolveAppearanceCatalogGeneration(
      appearance,
      library.catalogGeneration,
    );
  } catch {
    pinnedGeneration = null;
  }
  const artworkUpdate =
    pinnedGeneration !== null &&
    pinnedGeneration < library.catalogGeneration &&
    Boolean(preparedFamily(appearance.selection?.bodyFamily))
      ? library.catalogGeneration
      : null;
  function commit(
    next: PersonAppearance,
    families: OutfitFamilies,
    update = false,
  ) {
    try {
      props.onWorldChange(
        update
          ? commitCorrectedGeneration(world, personId, next, {
              library,
              poseFamily,
              families,
            })
          : commitCompleteOutfit(world, personId, next, {
              library,
              poseFamily,
              families,
            }),
      );
      setPending(null);
      setMessage(
        update
          ? "This person now uses the updated artwork."
          : "Appearance and outfit changed together.",
      );
    } catch {
      setMessage(
        "That outfit is unavailable. Your saved appearance has not changed.",
      );
    }
  }
  function propose(next: PersonAppearance, confirmBody = false) {
    const exact = resolveCompleteOutfit({
      appearance: next,
      families: state!.families,
      library,
      poseFamily,
    });
    if (exact.ok && !confirmBody) {
      commit(next, exact.families);
      return;
    }
    const replacement = exact.ok
      ? exact
      : findCompleteOutfit({
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
      setMessage(replacement.message);
    }
  }
  const currentPreparedFamily = preparedFamily(
    appearance.selection?.bodyFamily,
  );
  const calibratedIdentity = currentPreparedFamily
    ? preparedPartsAt(currentPreparedFamily, appearance.catalogGeneration).some(
        (p) => p.logicalIdentity,
      )
    : false;
  function choose(patch: Partial<PersonVisualSelection>) {
    setPending(null);
    if (!state!.current) return;
    if (patch.bodyFamily) {
      const prepared = selectPreparedBody(appearance, patch.bodyFamily);
      if (prepared) {
        propose(prepared, true);
        return;
      }
    }
    if (patch.bodyFamily && calibratedIdentity) {
      setMessage(
        "That body has no calibrated fit for the current face and hairstyle. Your appearance is unchanged.",
      );
      return;
    }
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
    if (!next && patch.headFamily && !calibratedIdentity) {
      const pair =
        options.find(
          (o) =>
            o.selection.headFamily === wanted.headFamily &&
            o.selection.hairFamily !== null,
        ) ?? options.find((o) => o.selection.headFamily === wanted.headFamily);
      if (pair) {
        propose({ ...appearance, selection: pair.selection }, true);
        return;
      }
    }
    if (!next) {
      setMessage(
        "That choice needs a matching face or hairstyle. Your saved appearance has not changed.",
      );
      return;
    }
    propose(
      { ...appearance, selection: next.selection },
      Boolean(patch.bodyFamily),
    );
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
          let values = [...new Set(options.map((o) => o.selection[kind]))];
          if (
            kind === "bodyFamily" &&
            preparedFamily(state.current?.bodyFamily)
          ) {
            values = values.filter((v) => v && preparedFamily(v));
            // Prepared bodies on offer: the ep34 paint finish and the ep35
            // painted-raster candidates (STYLE35), plus whatever is current.
            const pack = state.current?.bodyFamily.match(/^ep\d+-/)?.[0];
            if (pack) values = values.filter((v) => v?.startsWith(pack));
          }
          const choices = values.map((v) => {
            const candidate = (kind === "bodyFamily" && v
              ? selectPreparedBody(appearance, v)
              : undefined) ?? {
              ...appearance,
              selection: { ...state.current!, [kind]: v },
            };
            // Head choices may require their matching painted hair. Preview the pair explicitly.
            const compatibleCandidate =
              kind === "headFamily" && !calibratedIdentity
                ? {
                    ...candidate,
                    selection: { ...candidate.selection!, hairFamily: null },
                  }
                : candidate;
            const result = findCompleteOutfit({
              appearance: compatibleCandidate,
              families: state.families,
              library,
              poseFamily,
            });
            return {
              value: v,
              reason:
                kind === "bodyFamily" &&
                calibratedIdentity &&
                v &&
                !selectPreparedBody(appearance, v)
                  ? "No calibrated fit for this face and hairstyle."
                  : result.ok
                    ? undefined
                    : "No complete matching outfit is available.",
            };
          });
          const title = {
            bodyFamily: "Body",
            headFamily: "Face",
            hairFamily: "Hairstyle",
          }[kind];
          const current =
            (pending?.source === appearance
              ? pending.appearance.selection?.[kind]
              : state.current?.[kind]) ?? null;
          const randomize = (
            <button
              type="button"
              className="appearance-randomize"
              aria-label={`Randomize ${title.toLowerCase()}`}
              disabled={choices.filter((c) => !c.reason).length < 2}
              onClick={() => {
                const available = choices.filter(
                  (c) => !c.reason && c.value !== state.current?.[kind],
                );
                if (available.length)
                  choose({ [kind]: pick(available).value ?? null });
              }}
            >
              Randomize {title.toLowerCase()}
            </button>
          );
          if (
            kind !== "bodyFamily" &&
            state.current?.bodyFamily.startsWith("ep41-")
          ) {
            const query = kind === "hairFamily" ? hairQuery : "";
            const shown = choices.filter(({ value }) =>
              value === null
                ? "no hair".includes(query.trim().toLowerCase())
                : label(value)
                    .toLowerCase()
                    .includes(query.trim().toLowerCase()),
            );
            const hairCompatible = (headFamily: string) =>
              state.current!.hairFamily === null ||
              listPersonVisualSelections({
                appearance,
                library,
                poseFamily,
                selectionFilter: {
                  bodyFamily: state.current!.bodyFamily,
                  headFamily,
                  hairFamily: state.current!.hairFamily,
                },
              }).length > 0;
            return (
              <fieldset
                key={kind}
                className="appearance-hair-choices"
                data-testid={
                  kind === "hairFamily"
                    ? "person-appearance-hair-grid"
                    : "person-appearance-face-grid"
                }
              >
                <legend>{title}</legend>
                {kind === "hairFamily" && choices.length > 10 ? (
                  <label>
                    Find a hairstyle
                    <input
                      type="search"
                      value={hairQuery}
                      onChange={(event) => setHairQuery(event.target.value)}
                    />
                  </label>
                ) : null}
                <div className="appearance-hair-grid">
                  {shown.map(({ value, reason }, index) => {
                    const chosen = value ?? null;
                    const selection =
                      kind === "hairFamily"
                        ? { ...state.current!, hairFamily: chosen }
                        : {
                            ...state.current!,
                            headFamily: chosen!,
                            hairFamily: hairCompatible(chosen!)
                              ? state.current!.hairFamily
                              : null,
                          };
                    return (
                      <label
                        key={chosen ?? "none"}
                        className="appearance-hair-choice"
                        title={reason}
                      >
                        <input
                          type="radio"
                          className="appearance-visually-hidden"
                          name={`person-${kind}-${personId}`}
                          value={chosen ?? ""}
                          aria-label={optionAccessibleName(
                            {
                              label:
                                chosen === null ? "No hair" : label(chosen),
                            },
                            index,
                            title,
                          )}
                          checked={current === chosen}
                          disabled={Boolean(reason)}
                          onChange={() => choose({ [kind]: chosen })}
                        />
                        <span
                          className="appearance-hair-preview"
                          aria-hidden="true"
                        >
                          {props.renderHairThumbnail?.({
                            ...appearance,
                            selection,
                          })}
                        </span>
                        <span className="appearance-hair-label">
                          {chosen === null ? "No hair" : label(chosen)}
                        </span>
                        {current === chosen ? (
                          <span className="appearance-hair-selected">
                            ✓ Selected
                          </span>
                        ) : null}
                        {reason ? <small>Unavailable: {reason}</small> : null}
                      </label>
                    );
                  })}
                </div>
                {shown.length === 0 ? (
                  <p>No matching {title.toLowerCase()}.</p>
                ) : null}
                {randomize}
              </fieldset>
            );
          }
          return (
            <label key={kind} className="appearance-select-field">
              <span className="appearance-choice-title">{title}</span>
              <GameSelect
                aria-label={title}
                data-testid={`person-appearance-${kind}`}
                value={current ?? ""}
                onChange={(e) => choose({ [kind]: e.target.value || null })}
                options={choices.map(({ value: v, reason }) => ({
                  value: v ?? "",
                  label:
                    (v === null ? "No hair" : label(v)) +
                    (reason ? " — unavailable" : ""),
                  disabled: Boolean(reason),
                }))}
              />
              {randomize}
              {choices.some((c) => c.reason) ? (
                <small>
                  Unavailable choices have no complete matching outfit in this
                  saved catalog.
                </small>
              ) : null}
            </label>
          );
        })}
      </fieldset>
      {pending?.source === appearance ? (
        <p role="status">
          Previewing {label(pending.appearance.selection!.bodyFamily)}. Apply or
          cancel the preview.
        </p>
      ) : null}
      {artworkUpdate !== null ? (
        <div
          className="appearance-artwork-update"
          data-testid="appearance-artwork-update"
        >
          <p>
            Newer artwork is available to preview. Your saved appearance stays
            as it is unless you apply the update.
          </p>
          <button
            type="button"
            onClick={() => {
              const proposal = proposeCorrectedGeneration(
                appearance,
                artworkUpdate,
                library,
                poseFamily,
              );
              if (proposal.ok && proposal.appearance) {
                setPending({
                  appearance: proposal.appearance,
                  families: proposal.families,
                  source: appearance,
                  artworkUpdate: true,
                });
                setMessage("Review the updated artwork before applying it.");
              } else
                setMessage(
                  proposal.ok
                    ? "No newer artwork is available for this person."
                    : proposal.message,
                );
            }}
          >
            Preview updated artwork
          </button>
        </div>
      ) : null}
      <PreparedAppearanceControls
        appearance={appearance}
        onChange={(next) => commit(next, state.families ?? {})}
      />
      <fieldset>
        <legend>Clothing</legend>
        {(["top", "bottom", "footwear"] as const).map((kind) => {
          const value = state.families?.[kind] ?? "";
          return (
            <label key={kind} className="appearance-select-field">
              {
                {
                  top: "Shirt style",
                  bottom: "Pants style",
                  footwear: "Shoes",
                }[kind]
              }
              <GameSelect
                aria-label={
                  {
                    top: "Shirt style",
                    bottom: "Pants style",
                    footwear: "Shoes",
                  }[kind]
                }
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
                options={[
                  { value: "", label: "Current default", disabled: false },
                  ...(value && !state.supported[kind].includes(value)
                    ? [
                        {
                          value,
                          label: "Saved choice needs recovery",
                          disabled: true,
                        },
                      ]
                    : []),
                  ...state.supported[kind].map((v) => ({
                    value: v,
                    label: label(v),
                    disabled: false,
                  })),
                ]}
              />
              <button
                type="button"
                aria-label={`Randomize ${kind === "top" ? "shirt" : kind === "bottom" ? "pants" : "shoes"}`}
                disabled={state.supported[kind].length < 2}
                onClick={() => {
                  const options = state.supported[kind].filter(
                    (v) => v !== value,
                  );
                  if (options.length)
                    commit(appearance, {
                      ...state.families,
                      [kind]: pick(options),
                    });
                }}
              >
                Randomize
              </button>
            </label>
          );
        })}
      </fieldset>
      <button
        type="button"
        onClick={() => {
          const pack = state.current?.bodyFamily.split("-")[0];
          const bodies = [
            ...new Set(state.bald.map((o) => o.selection.bodyFamily)),
          ].filter((v) => v.startsWith(`${pack}-`));
          const selected = bodies.length
            ? selectPreparedBody(appearance, pick(bodies))
            : undefined;
          if (!selected) return;
          const choices = listPersonVisualSelections({
            appearance: selected,
            library,
            poseFamily,
            selectionFilter: { bodyFamily: selected.selection!.bodyFamily },
          });
          const next = choices.length
            ? { ...selected, selection: pick(choices).selection }
            : selected;
          const available = listPersonWardrobeFamilies(
            { ...person, appearance: next },
            { library, poseFamily },
          );
          const families: { top?: string; bottom?: string; footwear?: string } =
            {};
          for (const kind of ["top", "bottom", "footwear"] as const) {
            if (available[kind].length) families[kind] = pick(available[kind]);
          }
          const result = findCompleteOutfit({
            appearance: next,
            families,
            library,
            poseFamily,
          });
          if (result.ok) {
            setPending({
              appearance: next,
              families: result.families,
              source: appearance,
            });
            setMessage(
              "Review the randomized appearance and clothing before applying.",
            );
          } else setMessage(result.message);
        }}
      >
        Randomize appearance · preview
      </button>
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
        <AppearanceOutfitDialog
          title={label(
            pending.appearance.selection?.bodyFamily ??
              state.current!.bodyFamily,
          )}
          onApply={() =>
            commit(
              pending.appearance,
              pending.families,
              Boolean(pending.artworkUpdate),
            )
          }
          onCancel={() => {
            setPending(null);
            setMessage("Your appearance is unchanged.");
          }}
        >
          {props.renderPreview?.({
            ...pending.appearance,
            outfit: {
              version: "complete-outfit-v1",
              families: pending.families,
            },
          })}
          <div>
            <p>Proposed appearance:</p>
            <ul>
              <li>Body: {label(pending.appearance.selection!.bodyFamily)}</li>
              <li>Face: {label(pending.appearance.selection!.headFamily)}</li>
              <li>
                Hairstyle:{" "}
                {pending.appearance.selection!.hairFamily
                  ? label(pending.appearance.selection!.hairFamily)
                  : "No hair"}
              </li>
            </ul>
            <p>Matching clothing:</p>
            <ul>
              {Object.entries(pending.families).map(([k, v]) => (
                <li key={k}>{label(v)}</li>
              ))}
            </ul>
          </div>
        </AppearanceOutfitDialog>
      ) : null}
      <p role="status">{message}</p>
    </div>
  );
}
