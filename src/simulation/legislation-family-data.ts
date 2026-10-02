import type {
  AmendmentInvitation,
  ClauseRendering,
  ClauseTemplate,
  ProgramVariant,
  ResolvedParameters,
} from "./legislation-content-contracts";

interface StoredClause extends Omit<ClauseTemplate, "render"> {
  readonly rendering: Omit<
    ClauseRendering,
    "fiscalExposureMinorUnits" | "operativeEffect"
  >;
  readonly requiredAuthority?: {
    readonly key: string;
    readonly message: string;
  };
  readonly moneyParameter?: { readonly key: string; readonly message: string };
  readonly positiveAmountEffect?: ClauseRendering["operativeEffect"];
}

export interface ProgramVariantData extends Omit<
  ProgramVariant,
  "clauses" | "amendmentInvitation"
> {
  readonly clauses: readonly StoredClause[];
  readonly amendmentInvitation: Omit<AmendmentInvitation, "render"> & {
    readonly text: string;
  };
}

/** Literal bill wording substitutes only the existing compiler's typed readers.
 * No expression evaluation, legal-rule inference, or per-law/level dispatch. */
function renderText(text: string, resolved: ResolvedParameters): string {
  return text.replace(
    /\{\{(authority|money|choice):([^{}]+)\}\}/g,
    (_match, kind: string, key: string) => {
      if (kind === "money") return resolved.money(key);
      if (kind === "choice") return resolved.choice(key).clausePhrase;
      if (key !== "programLabel" && key !== "citationLabel")
        throw new Error(`Unknown authority wording field '${key}'.`);
      if (!resolved.authority)
        throw new Error(
          "Bill wording requires a recorded predicate authority.",
        );
      return resolved.authority[key];
    },
  );
}

/** Materializes a data row through the same ClauseTemplate contract as before. */
export function programVariantFromData(
  data: ProgramVariantData,
): ProgramVariant {
  const { clauses, amendmentInvitation, ...variant } = data;
  const { text: invitationText, ...invitation } = amendmentInvitation;
  let materializedClauses: readonly ClauseTemplate[] | undefined;
  return {
    ...variant,
    get clauses() {
      return (materializedClauses ??= clauses.map(
        ({
          rendering,
          requiredAuthority,
          moneyParameter,
          positiveAmountEffect,
          ...clause
        }) => ({
          ...clause,
          render: (resolved): ClauseRendering => {
            if (
              requiredAuthority &&
              resolved.authority?.authorityKey !== requiredAuthority.key
            )
              throw new Error(requiredAuthority.message);
            const amount = moneyParameter
              ? resolved.values[moneyParameter.key]
              : undefined;
            if (moneyParameter && amount?.kind !== "money")
              throw new Error(moneyParameter.message);
            return {
              ...rendering,
              text: renderText(rendering.text, resolved),
              fiscalExposureMinorUnits:
                amount?.kind === "money" ? amount.minorUnits : null,
              ...(positiveAmountEffect &&
              amount?.kind === "money" &&
              amount.minorUnits > 0
                ? { operativeEffect: positiveAmountEffect }
                : {}),
            };
          },
        }),
      ));
    },
    amendmentInvitation: {
      ...invitation,
      render: () => invitationText,
    },
  };
}
