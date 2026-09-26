import { describe, expect, it } from "vitest";
import {
  programConfigurations,
  programFamilies,
} from "../simulation/legislation-program-families";
import {
  LEGISLATION_CONTENT_GROUPS,
  LEGISLATION_CONTENT_SUBJECTS,
  legislationContentCatalog,
} from "./legislation-content-catalog";
import { availableDraftOptions } from "./legislation-docket";

describe("legislation content navigation", () => {
  it("places every existing configuration once without creating another bill action", () => {
    const options = availableDraftOptions("kentucky");
    const catalog = legislationContentCatalog(options);
    const entries = catalog.flatMap((subject) => subject.entries);
    const bankKeys = programConfigurations().map(
      ({ familyKey, variantKey }) => `${familyKey}/${variantKey}`,
    );

    expect(programFamilies()).toHaveLength(20);
    expect(options).toHaveLength(46);
    expect(
      entries
        .map(({ option }) => `${option.familyKey}/${option.variantKey}`)
        .sort(),
    ).toEqual([...bankKeys].sort());
    expect(new Set(entries.map(({ option }) => option))).toEqual(
      new Set(options),
    );
    expect(LEGISLATION_CONTENT_SUBJECTS).toHaveLength(18);
    expect(
      catalog.every(
        (subject) => subject.entries.length + subject.links.length > 0,
      ),
    ).toBe(true);
    expect(
      catalog
        .flatMap((subject) => subject.links)
        .every((link) =>
          entries.some(
            ({ option }) =>
              option.familyKey === link.familyKey &&
              option.variantKey === link.variantKey,
          ),
        ),
    ).toBe(true);
  });

  it("keeps cross-links as references to a single primary entry", () => {
    const catalog = legislationContentCatalog(
      availableDraftOptions("kentucky"),
    );
    const broadband = catalog.find(
      (subject) => subject.key === "science-technology-communications",
    );
    const link = broadband?.links.find(
      (entry) => entry.variantKey === "unserved-buildout",
    );
    expect(link?.primaryLocation.subjectKey).toBe("infrastructure");
    expect(broadband?.entries).toEqual([]);

    const rail = catalog
      .find((subject) => subject.key === "infrastructure")
      ?.entries.find(
        ({ option }) => option.variantKey === "federal-passenger-rail-v1",
      );
    expect(rail?.primaryTopicPath.map((segment) => segment.label)).toEqual([
      "Transportation",
      "Rail",
      "Passenger Rail",
    ]);
  });

  it("offers only supported options and applicable selected-policy groups", () => {
    expect(
      legislationContentCatalog(availableDraftOptions("lexington")),
    ).toEqual([]);
    expect(
      LEGISLATION_CONTENT_GROUPS.map((group) => group.label).slice(-2),
    ).toEqual(["Timing & Transition", "Amendment & Repeal"]);

    const entries = legislationContentCatalog(
      availableDraftOptions("kentucky"),
    ).flatMap((subject) => subject.entries);
    const groupsFor = (familyKey: string, variantKey: string) =>
      entries
        .find(
          ({ option }) =>
            option.familyKey === familyKey && option.variantKey === variantKey,
        )
        ?.sharedGroups.map((group) => group.key);

    expect(groupsFor("appropriations", "single-programme")).toContain(
      "current-rules-and-programs",
    );
    expect(groupsFor("appropriations", "single-programme")).not.toContain(
      "amendment-and-repeal",
    );
    expect(groupsFor("program-sunset", "repeal-outright")).toContain(
      "amendment-and-repeal",
    );
    expect(groupsFor("assistance-eligibility", "raise-income-limit")).toContain(
      "amendment-and-repeal",
    );
    expect(
      entries.every(
        ({ sharedGroups }) =>
          !sharedGroups.some(
            (group) => group.key === "enforcement-and-appeals",
          ),
      ),
    ).toBe(true);
  });
});
