import type { CSSProperties, InputHTMLAttributes } from "react";

type GameRangeProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "defaultValue" | "min" | "max"
> & {
  readonly value: number;
  readonly min: number;
  readonly max: number;
};

/** Native range behavior with an occupied rail derived from its actual value. */
export function GameRange({
  value,
  min,
  max,
  style,
  ...props
}: GameRangeProps) {
  const position =
    max > min ? Math.max(0, Math.min(1, (value - min) / (max - min))) : 0;
  const railStyle = {
    ...style,
    "--pg-range-position": `${position * 100}%`,
  } as CSSProperties;
  return (
    <input
      {...props}
      type="range"
      min={min}
      max={max}
      value={value}
      style={railStyle}
    />
  );
}
