import { resolveCapability } from "../rule-capability-resolver";
import type { GovernmentScope } from "../rule-capability-resolver";
import type {
  ResolvedRuleField,
  RuleCapabilityResolver,
} from "./rule-capability-port";

/**
 * The composition binding from the nationwide producers' port to RULES TO
 * PLAY's rules-capability/v1 resolver. RULES resolves every field of a scope;
 * the port asks for specific fields, so only those are returned, and a field
 * RULES does not resolve for that scope comes back UNKNOWN rather than absent.
 */
export const rulesCapabilityResolver: RuleCapabilityResolver = (request) => {
  const scope: GovernmentScope =
    request.scope.kind === "state"
      ? { kind: "state", stateUsps: request.scope.stateUsps }
      : { kind: "local", governmentUnitId: request.scope.unit.id };
  const resolution = resolveCapability({
    scope,
    officeKey: request.officeKey ?? null,
    action: request.action,
    onDate: request.onDate,
  });
  const fields: ResolvedRuleField[] = request.fields.map(
    (field) =>
      resolution.fields.find((entry) => entry.field === field) ?? {
        field,
        state: "UNKNOWN",
        ruleScope: null,
        ruleVersion: resolution.resolverVersion,
        validFrom: null,
        validThrough: null,
        source: null,
        reason:
          resolution.refusal ?? `${field} is not resolved for this scope.`,
      },
  );
  const firstUnadmitted = fields.find((entry) => entry.state !== "ADMITTED");
  return {
    resolverVersion: resolution.resolverVersion,
    action: resolution.action,
    onDate: resolution.onDate,
    fields,
    refusal: firstUnadmitted
      ? `${firstUnadmitted.field} is not established: ${firstUnadmitted.reason ?? "no rule was resolved."}`
      : null,
  };
};
