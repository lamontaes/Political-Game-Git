import type { GameSelectProps } from "./GameSelect";

/** Direct, reversible catalog navigation; unavailable fits stay unavailable. */
export function AppearanceChoice({
  value,
  options = [],
  onChange,
  disabled,
  ...props
}: GameSelectProps) {
  const choices = options.filter((option) => !option.disabled);
  const index = choices.findIndex(
    (option) => option.value === String(value ?? ""),
  );
  const label = props["aria-label"] ?? "Appearance";
  const choose = (direction: number) => {
    const next = choices[(index + direction + choices.length) % choices.length];
    if (next)
      onChange?.({
        target: { value: next.value },
        currentTarget: { value: next.value },
      });
  };
  return (
    <span
      className="appearance-arrow-choice"
      data-testid={
        props["data-testid" as keyof typeof props] as string | undefined
      }
    >
      <button
        type="button"
        aria-label={`Previous ${label}`}
        disabled={disabled || choices.length < 2}
        onClick={() => choose(-1)}
      >
        ‹
      </button>
      <span aria-live="polite">
        {options.find((option) => option.value === String(value ?? ""))
          ?.label ?? "Choose"}
      </span>
      <button
        type="button"
        aria-label={`Next ${label}`}
        disabled={disabled || choices.length < 2}
        onClick={() => choose(1)}
      >
        ›
      </button>
    </span>
  );
}
