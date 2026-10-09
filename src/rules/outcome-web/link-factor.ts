export type OutcomeLinkShapeFacts =
  | { readonly kind: "linear" }
  | { readonly kind: "elasticity" }
  | {
      readonly kind: "threshold";
      readonly at: number;
      readonly steeperAt?: number | null;
      readonly steeperExtraSize?: number | null;
    }
  | { readonly kind: "diminishing"; readonly scale: number }
  | { readonly kind: "exposure-years" }
  | { readonly kind: "acute-decay"; readonly halfLifeDays: number };

export interface OutcomeLinkFactorFacts {
  readonly shape: OutcomeLinkShapeFacts;
  readonly size: number | null;
}

/** Calculate a link's factor before its moderator and outcome multiplication. */
export function shapedLinkFactorFromFacts(
  link: OutcomeLinkFactorFacts,
  value: number,
  baseline: number,
): number {
  const size = link.size ?? 0;
  const delta = value - baseline;
  switch (link.shape.kind) {
    case "elasticity":
      if (
        !Number.isFinite(baseline) ||
        baseline <= 0 ||
        !Number.isFinite(value)
      )
        return 1;
      return 1 + size * (delta / baseline);
    case "linear":
      return 1 + size * delta;
    case "threshold": {
      const over = Math.max(0, value - link.shape.at);
      const steeperAt = link.shape.steeperAt ?? null;
      const extra = link.shape.steeperExtraSize ?? 0;
      const overSteeper =
        steeperAt === null ? 0 : Math.max(0, value - steeperAt);
      return 1 + size * over + extra * overSteeper;
    }
    case "diminishing": {
      const scale = link.shape.scale;
      return 1 + (size * delta) / (1 + Math.abs(delta) / scale);
    }
    case "exposure-years":
    case "acute-decay":
      return 1;
  }
}
