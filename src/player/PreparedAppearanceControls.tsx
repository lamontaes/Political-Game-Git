import { useId } from "react";
import type { PersonAppearance } from "../simulation/types";
import type { AppearanceMaterial } from "../simulation/appearance-material";
import {
  PREPARED_SKIN_RAMPS,
  preparedFamily,
  preparedPartsAt,
  preparedRampsAt,
  type MaterialChannel,
} from "../presentation/engine-people29-data";
import { GameSelect } from "./controls/GameSelect";

/** Light-to-dark display names for the authored swatches. Colour words only. */
const SKIN_SWATCH_NAMES: readonly string[] = [
  "Very light",
  "Light",
  "Light medium",
  "Medium",
  "Medium brown",
  "Brown",
  "Deep brown",
];

const COLOR_NAMES: Readonly<Record<string, string>> = {
  "source-colour": "Original painted color",
  "hair-black": "Black",
  "hair-brown": "Brown",
  "hair-blond": "Blond",
  "hair-gray": "Gray",
  "hair-auburn": "Auburn",
  porcelain: "Light",
  "warm-medium": "Warm medium",
  olive: "Olive",
  brown: "Brown",
  "deep-brown": "Deep brown",
  espresso: "Dark brown",
  chestnut: "Chestnut brown",
  silver: "Gray",
  "blue-oxford": "Light blue",
  "burgundy-pique": "Burgundy",
  sage: "Sage green",
  "charcoal-wool": "Charcoal",
  "sand-twill": "Sand",
  navy: "Navy",
};

const CHANNEL_TITLES: Readonly<Record<MaterialChannel, string>> = {
  skin: "Skin tone",
  hair: "Hair color",
  top: "Shirt color",
  bottom: "Pants color",
};

export function skinSwatchName(id: string): string {
  const index = PREPARED_SKIN_RAMPS.indexOf(id);
  if (index >= 0) return SKIN_SWATCH_NAMES[index] ?? `Skin tone ${index + 1}`;
  return id === "source-colour" ? "Original painting" : "Skin tone";
}

/**
 * Game-styled controls for the explicitly versioned prepared template ranges.
 * Only ramps every drawn region of the person's pinned generation supports are
 * offered, so a choice always changes the rendered pixels.
 */
export function PreparedAppearanceControls({
  appearance,
  onChange,
}: {
  appearance: PersonAppearance;
  onChange: (appearance: PersonAppearance) => void;
}) {
  const skinGroup = useId();
  const family = preparedFamily(appearance.selection?.bodyFamily);
  const material = appearance.material;
  if (!family || !material) return null;
  const generation = appearance.catalogGeneration;
  function change(next: AppearanceMaterial) {
    onChange({ ...appearance, material: next });
  }
  function setPalette(channel: MaterialChannel, value: string) {
    change({
      ...material!,
      palettes: { ...material!.palettes, [channel]: value },
    });
  }
  const skin = preparedRampsAt(family, "skin", generation);
  const swatches = skin.filter(
    (r) =>
      PREPARED_SKIN_RAMPS.includes(r.id) ||
      (r.id === "source-colour" && material.palettes.skin === r.id),
  );
  const parts = preparedPartsAt(family, generation);
  return (
    <fieldset
      className="prepared-appearance-controls"
      data-testid="prepared-appearance-controls"
    >
      <legend>Skin, hair and clothing colors</legend>
      {swatches.length > 1 ? (
        <div
          className="appearance-skin-swatches"
          role="radiogroup"
          aria-labelledby={`${skinGroup}-label`}
          data-testid="appearance-skin-swatches"
        >
          <span id={`${skinGroup}-label`} className="appearance-choice-title">
            Skin tone
          </span>
          <div className="appearance-skin-row">
            {swatches.map((ramp) => {
              const selected = material.palettes.skin === ramp.id;
              return (
                <label
                  key={ramp.id}
                  className="appearance-skin-swatch"
                  data-selected={selected ? "true" : "false"}
                  data-ramp-id={ramp.id}
                >
                  <input
                    type="radio"
                    className="appearance-visually-hidden"
                    name={`${skinGroup}-skin`}
                    value={ramp.id}
                    checked={selected}
                    onChange={() => setPalette("skin", ramp.id)}
                  />
                  <span
                    className="appearance-skin-chip"
                    aria-hidden="true"
                    data-original={ramp.stops ? undefined : "true"}
                    style={ramp.stops ? { backgroundColor: ramp.neutral } : {}}
                  >
                    {selected ? "✓" : ""}
                  </span>
                  <span className="appearance-skin-name">
                    {skinSwatchName(ramp.id)}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      ) : (
        <p data-testid="fixed-skin-colour">Skin tone: original painted color</p>
      )}
      {(["hair", "top", "bottom"] as const).map((channel) => {
        const ramps = preparedRampsAt(family, channel, generation);
        if (ramps.length < 2)
          return (
            <p key={channel} data-testid={`fixed-${channel}-colour`}>
              {CHANNEL_TITLES[channel]}: original painted color
            </p>
          );
        return (
          <label key={channel} className="appearance-select-field">
            <span className="appearance-choice-title">
              <span
                className="appearance-color-swatch"
                aria-hidden="true"
                style={{
                  backgroundColor: ramps.find(
                    (r) => r.id === material.palettes[channel],
                  )?.neutral,
                }}
              />
              {CHANNEL_TITLES[channel]}
            </span>
            <GameSelect
              aria-label={CHANNEL_TITLES[channel]}
              value={material.palettes[channel]}
              onChange={(e) => setPalette(channel, e.target.value)}
              options={ramps.map((r) => ({
                value: r.id,
                label: COLOR_NAMES[r.id] ?? "Color",
                disabled: false,
              }))}
            />
          </label>
        );
      })}
      <p className="appearance-note">
        Eye color follows the selected face. Independent iris color is not
        available in this artwork.
      </p>
      {parts.some((p) =>
        p.features?.some((f) =>
          Object.values(f.parameters).some(([a, b]) => a !== b),
        ),
      ) ? (
        <details className="appearance-facial-features">
          <summary>Facial features</summary>
          {(["eyes", "brows", "nose", "mouth"] as const).map((kind) => {
            const choices = parts.filter((p) =>
              p.features?.[0]?.id.startsWith(kind + "-"),
            );
            if (
              choices.every((p) =>
                p.features!.every((f) =>
                  Object.values(f.parameters).every(([a, b]) => a === b),
                ),
              )
            )
              return null;
            const value = material.features[kind];
            const selected = choices.find((p) => p.id === value.variant)!;
            const set = (patch: Partial<typeof value>) =>
              change({
                ...material,
                features: {
                  ...material.features,
                  [kind]: { ...value, ...patch },
                },
              });
            const titles = {
              eyes: "Eyes",
              brows: "Eyebrows",
              nose: "Nose",
              mouth: "Mouth",
            };
            return (
              <div key={kind}>
                <label className="appearance-select-field">
                  <span className="appearance-choice-title">
                    {titles[kind]}
                  </span>
                  <GameSelect
                    aria-label={`${kind} shape`}
                    value={value.variant}
                    onChange={(e) => set({ variant: e.target.value })}
                    options={choices.map((p) => ({
                      value: p.id,
                      label: p.features![0]!.id.split("-").slice(1).join(" "),
                      disabled: false,
                    }))}
                  />
                </label>
                {(["x", "y", "scaleX", "scaleY"] as const).map((parameter) => {
                  const range = selected.features![0]!.parameters[parameter];
                  const labels = {
                    x: "horizontal position",
                    y: "height",
                    scaleX: "width",
                    scaleY: "depth",
                  };
                  return (
                    <label key={parameter}>
                      {kind} {labels[parameter]}
                      <input
                        type="range"
                        aria-label={`${kind} ${labels[parameter]}`}
                        min={range[0]}
                        max={range[1]}
                        step={parameter.startsWith("scale") ? 0.01 : 1}
                        value={value[parameter]}
                        onChange={(e) =>
                          set({ [parameter]: Number(e.target.value) })
                        }
                      />
                    </label>
                  );
                })}
              </div>
            );
          })}
        </details>
      ) : null}
    </fieldset>
  );
}
