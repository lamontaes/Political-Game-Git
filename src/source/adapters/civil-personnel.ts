import { isClean } from "../core/index";
import type { ArtifactLock } from "../core/index";
import {
  compileCivilServiceLabor,
  openCivilServiceLaborArtifacts,
  validateCivilServiceLaborCorpus,
  CIVIL_SERVICE_LABOR_SOURCES,
} from "../domains/civil-service-labor/index";
import type {
  PersonnelSourceProjection,
  PersonnelRuleObservation,
  CivilPersonnelField,
} from "../../simulation/civil-personnel-contract";
import { PERSONNEL_ATTRIBUTE_KEYS } from "../../simulation/civil-personnel-contract";
import type { PersonnelObservedAttribute } from "../../simulation/civil-personnel-contract";
import { compilePersonnelProcedures } from "./civil-personnel-procedures";

/** Reopens locked bytes on every compilation. A precomputed JSON file is not authority. */
export function compilePersonnelSourceProjection(
  lock: ArtifactLock,
): PersonnelSourceProjection {
  const opened = openCivilServiceLaborArtifacts(lock);
  const compiled = compileCivilServiceLabor(opened);
  if (!isClean(validateCivilServiceLaborCorpus(compiled)))
    throw new Error(
      "Civil personnel projection requires a valid source corpus.",
    );
  return {
    schemaVersion: 2,
    corpusSha256: compiled.corpus.canonicalSha256,
    compilerVersion: compiled.corpus.compiler.version,
    profiles: compiled.records.map((record) => {
      const fields = Object.fromEntries(
        [
          ...Object.entries(record.civilService),
          ...Object.entries(record.laborBargaining),
        ]
          .filter(
            ([, value]) =>
              typeof value === "object" && value !== null && "state" in value,
          )
          .map(([key, value]) => {
            const fact =
              value as typeof record.civilService.appointmentProtection;
            let projected: PersonnelRuleObservation;
            if (fact.state === "KNOWN") {
              const attributes = Object.entries(fact.value).map(
                ([key, value]): PersonnelObservedAttribute => {
                  if (
                    !PERSONNEL_ATTRIBUTE_KEYS.some(
                      (candidate) => candidate === key,
                    ) ||
                    !(
                      value === null ||
                      typeof value === "string" ||
                      (Array.isArray(value) &&
                        value.every((part) => typeof part === "string"))
                    )
                  )
                    throw new Error(
                      `Unsupported personnel source attribute ${key}.`,
                    );
                  return {
                    key: key as PersonnelObservedAttribute["key"],
                    value,
                  };
                },
              );
              projected = {
                state: "known",
                observedOn: fact.asOf,
                attributes,
                citations: fact.evidence.map((evidence) => {
                  const artifact = lock.artifacts.find(
                    (a) => a.artifactId === evidence.artifactId,
                  );
                  const source = CIVIL_SERVICE_LABOR_SOURCES.find(
                    (a) => a.artifactId === evidence.artifactId,
                  );
                  if (
                    !artifact ||
                    !source ||
                    evidence.locator.kind !== "legal-section"
                  )
                    throw new Error(
                      "Missing exact personnel evidence binding.",
                    );
                  return {
                    artifactId: artifact.artifactId,
                    sha256: artifact.bytes.sha256,
                    citation: evidence.locator.citation,
                    url: source.url,
                  };
                }),
              };
            } else {
              if (fact.state !== "UNKNOWN")
                throw new Error(
                  `Personnel projection needs an explicit adapter for ${fact.state}.`,
                );
              projected = {
                state: "unknown",
                reason: fact.reason,
              };
            }
            return [key, projected];
          }),
      ) as Record<CivilPersonnelField, PersonnelRuleObservation>;
      return {
        jurisdictionKey: record.jurisdictionKey,
        jurisdictionName: record.jurisdictionName,
        employerLevel: record.jurisdictionLevel,
        fields,
      };
    }),
    procedures: compilePersonnelProcedures(opened.artifacts, lock),
  };
}
