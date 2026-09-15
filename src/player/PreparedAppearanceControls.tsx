import type { PersonAppearance } from "../simulation/types";
import type { AppearanceMaterial } from "../simulation/appearance-material";
import {
  preparedFamily,
  type MaterialChannel,
} from "../presentation/engine-people29-data";
/** DOM controls author only the explicitly versioned prepared template ranges. */
export function PreparedAppearanceControls({
  appearance,
  onChange,
}: {
  appearance: PersonAppearance;
  onChange: (appearance: PersonAppearance) => void;
}) {
  const family = preparedFamily(appearance.selection?.bodyFamily);
  const material = appearance.material;
  if (!family || !material) return null;
  function change(next: AppearanceMaterial) {
    onChange({ ...appearance, material: next });
  }
  const colorNames: Record<string, string> = {
    "source-colour": "Original painted color",
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
  return (
    <fieldset data-testid="prepared-appearance-controls">
      <legend>Skin, hair and clothing colors</legend>
      {(["skin", "hair", "top", "bottom"] as const).map((channel) => {
        const ramps =
          family.parts
            .flatMap((p) => p.materials)
            .find((m) => m.channel === channel)?.ramps ?? [];
        const title: Record<MaterialChannel, string> = {
          skin: "Skin tone",
          hair: "Hair color",
          top: "Shirt color",
          bottom: "Pants color",
        };
        if (ramps.length < 2)
          return (
            <p key={channel} data-testid={`fixed-${channel}-colour`}>
              {title[channel]}: original painted color
            </p>
          );
        return (
          <label key={channel}>
            <span>
              <span
                className="appearance-color-swatch"
                aria-hidden="true"
                style={{
                  backgroundColor: ramps.find(
                    (r) => r.id === material.palettes[channel],
                  )?.neutral,
                }}
              />
              {title[channel]}
            </span>
            <select
              aria-label={title[channel]}
              value={material.palettes[channel]}
              onChange={(e) =>
                change({
                  ...material,
                  palettes: { ...material.palettes, [channel]: e.target.value },
                })
              }
            >
              {ramps.map((r) => (
                <option key={r.id} value={r.id}>
                  {colorNames[r.id] ?? "Color"}
                </option>
              ))}
            </select>
          </label>
        );
      })}
      <p>
        Eye color follows the selected face. Independent iris color is not
        available in this artwork.
      </p>
      {family.parts.some((p) =>
        p.features?.some((f) =>
          Object.values(f.parameters).some(([a, b]) => a !== b),
        ),
      ) ? (
        <details className="appearance-facial-features">
          <summary>Facial features</summary>
          {(["eyes", "brows", "nose", "mouth"] as const).map((kind) => {
            const choices = family.parts.filter((p) =>
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
                <label>
                  {titles[kind]}
                  <select
                    aria-label={`${kind} shape`}
                    value={value.variant}
                    onChange={(e) => set({ variant: e.target.value })}
                  >
                    {choices.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.features![0]!.id.split("-").slice(1).join(" ")}
                      </option>
                    ))}
                  </select>
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
