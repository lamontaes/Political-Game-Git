import {
  formatStatutoryDate,
  numberWord,
  yearsPhrase,
  type AmendmentInvitation,
  type ClauseRendering,
  type ClauseTemplate,
  type ProgramVariant,
  type ResolvedParameters,
} from "./legislation-content-contracts";

interface StoredClause extends Omit<ClauseTemplate, "render"> {
  readonly rendering: Omit<
    ClauseRendering,
    "fiscalExposureMinorUnits" | "operativeEffect"
  >;
  readonly requiredAuthority?: {
    readonly key?: string;
    readonly message: string;
  };
  readonly moneyParameter?: { readonly key: string; readonly message: string };
  readonly fiscalMoneyParameter?: string;
  readonly textWhenNoEndDate?: string;
  readonly durationFallback?: {
    readonly key: string;
    readonly rendering: StoredClause["rendering"];
  };
  readonly authorityFallback?: {
    readonly rendering: StoredClause["rendering"];
    readonly textWhenNoEndDate?: string;
  };
  readonly integerCases?: readonly {
    readonly key: string;
    readonly equals: number;
    readonly rendering: StoredClause["rendering"];
  }[];
  readonly durationParameter?: {
    readonly key: string;
    readonly message: string;
  };
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
    /\{\{(authority|money|choice|duration|integer|integer-locale|integer-word|years-phrase|date):([^{}]+)\}\}/g,
    (_match, kind: string, key: string) => {
      if (kind === "money") return resolved.money(key);
      if (kind === "choice") return resolved.choice(key).clausePhrase;
      if (kind === "integer") return String(resolved.integer(key));
      if (kind === "integer-locale")
        return resolved.integer(key).toLocaleString("en-US");
      if (kind === "integer-word") return numberWord(resolved.integer(key));
      if (kind === "date") {
        if (key !== "endsOn" || resolved.endsOn === null)
          throw new Error(`Missing statutory date wording field '${key}'.`);
        return formatStatutoryDate(resolved.endsOn);
      }
      if (kind === "duration" || kind === "years-phrase") {
        const duration = resolved.values[key];
        if (duration?.kind !== "duration-years" || duration.years === null)
          throw new Error(`Missing duration wording parameter '${key}'.`);
        return kind === "duration"
          ? String(duration.years)
          : yearsPhrase(duration.years);
      }
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
          fiscalMoneyParameter,
          textWhenNoEndDate,
          durationFallback,
          authorityFallback,
          integerCases,
          durationParameter,
          positiveAmountEffect,
          ...clause
        }) => ({
          ...clause,
          render: (resolved): ClauseRendering => {
            if (
              requiredAuthority &&
              (!resolved.authority ||
                (requiredAuthority.key !== undefined &&
                  resolved.authority.authorityKey !== requiredAuthority.key))
            )
              throw new Error(requiredAuthority.message);
            const moneyKey = moneyParameter?.key ?? fiscalMoneyParameter;
            const amount = moneyKey ? resolved.values[moneyKey] : undefined;
            if (moneyParameter && amount?.kind !== "money")
              throw new Error(moneyParameter.message);
            if (durationParameter) {
              const duration = resolved.values[durationParameter.key];
              if (
                duration?.kind !== "duration-years" ||
                duration.years === null
              )
                throw new Error(durationParameter.message);
            }
            const duration = durationFallback
              ? resolved.values[durationFallback.key]
              : undefined;
            const authorityCase = !resolved.authority
              ? authorityFallback
              : undefined;
            const integerCase = integerCases?.find(
              (row) => resolved.integer(row.key) === row.equals,
            );
            const selectedRendering =
              integerCase?.rendering ??
              authorityCase?.rendering ??
              (durationFallback &&
              (duration?.kind !== "duration-years" || duration.years === null)
                ? durationFallback.rendering
                : rendering);
            const noEndText =
              authorityCase?.textWhenNoEndDate ?? textWhenNoEndDate;
            return {
              ...selectedRendering,
              text: renderText(
                resolved.endsOn === null && noEndText !== undefined
                  ? noEndText
                  : selectedRendering.text,
                resolved,
              ),
              beneficiary:
                selectedRendering.beneficiary.kind === "general-application"
                  ? {
                      ...selectedRendering.beneficiary,
                      appliesToLabel: renderText(
                        selectedRendering.beneficiary.appliesToLabel,
                        resolved,
                      ),
                    }
                  : selectedRendering.beneficiary,
              fiscalExposureLabel:
                selectedRendering.fiscalExposureLabel === null
                  ? null
                  : renderText(selectedRendering.fiscalExposureLabel, resolved),
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
      render: (amountLabel) =>
        invitationText.replaceAll("{{amount-label}}", () => amountLabel),
    },
  };
}
