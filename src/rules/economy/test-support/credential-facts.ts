/** Raw dated life/credential receipts; no wage/cohort selection is borrowed. */
import * as life from "../../../simulation/life-queries";
import { hasLifePathCredential } from "../../../simulation/life-paths2";
import {
  credentialReceiptKey,
  type CredentialPayFacts,
} from "../credential-pay";
import type { World, IsoDate } from "../../../simulation/types";
export function credentialPayFacts(
  world: World,
  dates: readonly IsoDate[],
): CredentialPayFacts {
  const roles: CredentialPayFacts["roles"] = new Map(),
    statuses: CredentialPayFacts["statuses"] = new Map(),
    enrollmentStates: CredentialPayFacts["enrollmentStates"] = new Map(),
    credentials: CredentialPayFacts["credentials"] = new Map();
  const contexts = [
    ...dates.map((currentDate) => ({
      currentDate,
      nextSequence: world.history.nextSequence,
    })),
    ...world.history.resourceTransferOutcomes.map((row) => ({
      currentDate: row.occurredAt,
      nextSequence: row.sequence + 1,
    })),
  ];
  const programs = [
    ...new Set(
      world.history.educationEnrollments.map((row) => row.programKind),
    ),
  ];
  for (const context of contexts) {
    const snapshot = {
      ...world,
      currentDate: context.currentDate,
      history: { ...world.history, nextSequence: context.nextSequence },
    };
    const facts = {
      currentDate: context.currentDate,
      records: snapshot.history,
    };
    for (const row of world.history.workRelationships) {
      (roles as Map<string, ReturnType<typeof life.workRoleAt>>).set(
        credentialReceiptKey(facts, row.id),
        life.workRoleAt(snapshot, row.id),
      );
      (statuses as Map<string, ReturnType<typeof life.workStatusAt>>).set(
        credentialReceiptKey(facts, row.id),
        life.workStatusAt(snapshot, row.id),
      );
    }
    for (const row of world.history.educationEnrollments)
      (
        enrollmentStates as Map<
          string,
          ReturnType<typeof life.educationEnrollmentStateAt>
        >
      ).set(
        credentialReceiptKey(facts, row.id),
        life.educationEnrollmentStateAt(snapshot, row.id),
      );
    for (const id of world.personOrder)
      for (const program of programs)
        (credentials as Map<string, boolean>).set(
          credentialReceiptKey(facts, id, program),
          hasLifePathCredential(snapshot, id, program),
        );
  }
  return {
    currentDate: world.currentDate,
    records: world.history,
    roles,
    statuses,
    enrollmentStates,
    credentials,
  };
}
