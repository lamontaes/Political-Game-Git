/** Authored title policy, not a claim about legal designation or numbering. */
export interface MeasureTitleTemplate {
  readonly enact: string;
  readonly repeal: string;
  readonly name?: {
    readonly separator: "space" | "whitespace";
    readonly stripSuffixes: readonly ("law" | "act" | "ordinance")[];
    readonly smallWords: readonly string[];
    readonly caseInsensitiveSmallWords: boolean;
  };
}

export const CATALOG_MEASURE_TITLE: MeasureTitleTemplate = {
  enact: "{name}",
  repeal: "Repeal: {name}",
};
export const FEDERAL_MEASURE_TITLE: MeasureTitleTemplate = {
  enact: "{name} Act of {year}",
  repeal: "{name} Repeal Act of {year}",
  name: {
    separator: "space",
    stripSuffixes: [],
    smallWords: ["a", "an", "and", "of", "the", "for", "in", "on", "or", "to"],
    caseInsensitiveSmallWords: false,
  },
};
export const ORDINANCE_MEASURE_TITLE: MeasureTitleTemplate = {
  enact: "{name} Ordinance",
  repeal: "Repeal: {name} Ordinance",
  name: {
    separator: "whitespace",
    stripSuffixes: ["law", "act", "ordinance"],
    smallWords: [
      "a",
      "an",
      "and",
      "as",
      "at",
      "by",
      "for",
      "in",
      "of",
      "on",
      "or",
      "the",
      "to",
      "with",
    ],
    caseInsensitiveSmallWords: true,
  },
};
export const COUNCIL_ACT_MEASURE_TITLE: MeasureTitleTemplate = {
  enact: "{name} Act of {year}",
  repeal: "Repeal: {name} Act of {year}",
  name: {
    ...ORDINANCE_MEASURE_TITLE.name!,
    stripSuffixes: ["law", "act"],
  },
};

export function assertMeasureTitleTemplate(
  template: MeasureTitleTemplate,
): void {
  for (const format of [template.enact, template.repeal]) {
    if (!format.includes("{name}") || /\{(?!name\}|year\})/.test(format))
      throw new Error(
        "A measure title must name its question and use only name/year tokens.",
      );
  }
  const policy = template.name;
  if (
    policy &&
    (!["space", "whitespace"].includes(policy.separator) ||
      policy.stripSuffixes.some(
        (suffix) => !["law", "act", "ordinance"].includes(suffix),
      ) ||
      policy.smallWords.some((word) => !/^[a-z]+$/.test(word)) ||
      typeof policy.caseInsensitiveSmallWords !== "boolean")
  )
    throw new Error("A measure title has an invalid name policy.");
}

/** One renderer for every body's declared enact/repeal title policy. */
export function renderMeasureTitle(
  template: MeasureTitleTemplate,
  questionName: string,
  year: string,
  repeal: boolean,
): string {
  assertMeasureTitleTemplate(template);
  const policy = template.name;
  let name = questionName;
  if (policy) {
    if (policy.stripSuffixes.length)
      name = name.replace(
        new RegExp(`\\s+(${policy.stripSuffixes.join("|")})$`, "i"),
        "",
      );
    name = name
      .split(policy.separator === "space" ? " " : /\s+/)
      .map((word, index) => {
        const small = policy.caseInsensitiveSmallWords
          ? word.toLowerCase()
          : word;
        return index > 0 && policy.smallWords.includes(small)
          ? small
          : word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(" ");
  }
  return (repeal ? template.repeal : template.enact).replace(
    /\{(name|year)\}/g,
    (_, key: "name" | "year") => (key === "name" ? name : year),
  );
}
