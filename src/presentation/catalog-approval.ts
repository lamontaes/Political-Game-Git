import approvalsData from "../../art/approvals/character-catalog-approvals.json";
import characterCatalog from "../../art/manifest/character_catalog.json";

import {
  promoteCandidateComponent,
  type CharacterComponentManifestRecord,
} from "./character-components";

/**
 * Who said a piece of character art may be worn by a person.
 *
 * D-063 settled that banked art and catalog art are different things, and that
 * the step between them is a person looking at the art and accepting it. What
 * it did not settle is where that acceptance is written down, so it was written
 * down nowhere: `promoteCandidateComponent` has existed since, correct and
 * covered by tests, and has never had a caller. An acceptance that lives only
 * in a chat message cannot be checked by anything, and a promotion with no
 * record of who accepted it is the thing D-063 exists to prevent.
 *
 * So acceptance is a file. `art/approvals/character-catalog-approvals.json`
 * names, per approval, who accepted what and against which evidence. No script
 * in this repository writes to it — not this one — because a program that can
 * record an approval can approve.
 *
 * The gate below is the other half, and it is the half that bites. Every
 * component id in every catalog generation must be either a grandfathered
 * development fixture, listed one by one, or named in an approval. So the
 * catalog cannot grow by a hand edit, by a generated file, or by a script that
 * means well.
 */

export interface CatalogApproval {
  readonly approvalId: string;
  /** The person who looked. A name, not a role and not a session. */
  readonly approvedBy: string;
  /** ISO date. */
  readonly approvedAt: string;
  /** What they looked at: a repository path, or a link to it. */
  readonly evidence: string;
  /** The generation these components are accepted into. */
  readonly generation: number;
  readonly componentIds: readonly string[];
}

interface ApprovalsFile {
  readonly schema: string;
  readonly grandfathered: {
    readonly reason: string;
    /**
     * Listed one by one, not by generation. Grandfathering a whole generation
     * would leave the door open: a forty-seventh development fixture appended
     * to generation 2 would have passed a rule written that way, and the file's
     * own prose claimed it would not. An id list is the only form of this rule
     * that says what it means.
     */
    readonly componentIds: readonly string[];
  };
  readonly approvals: readonly CatalogApproval[];
}

interface CatalogGeneration {
  readonly generation: number;
  readonly component_ids: readonly string[];
}

export const CHARACTER_CATALOG_APPROVALS = approvalsData as ApprovalsFile;

/**
 * Component ids the catalog carries with no approval behind them.
 *
 * Empty is the passing state. A non-empty result names each id and the
 * generation it sits in, which is the sentence someone needs in order to go and
 * get the approval rather than to go and read the code.
 */
export function unapprovedCatalogComponents(
  approvals: ApprovalsFile = CHARACTER_CATALOG_APPROVALS,
  generations: readonly CatalogGeneration[] = (
    characterCatalog as { generations: readonly CatalogGeneration[] }
  ).generations,
): readonly string[] {
  const grandfathered = new Set(approvals.grandfathered.componentIds);
  const approved = new Map<string, number>();
  for (const approval of approvals.approvals) {
    for (const id of approval.componentIds)
      approved.set(id, approval.generation);
  }
  const problems: string[] = [];
  for (const generation of generations) {
    for (const id of generation.component_ids) {
      if (grandfathered.has(id)) continue;
      const into = approved.get(id);
      if (into === undefined) {
        problems.push(
          `'${id}' sits in catalog generation ${generation.generation} with no approval naming it.`,
        );
      } else if (into !== generation.generation) {
        problems.push(
          `'${id}' is approved into generation ${into} but sits in generation ${generation.generation}.`,
        );
      }
    }
  }
  return problems;
}

/**
 * The promoted records one approval calls for, or an explanation.
 *
 * Pure, and writes nothing. It is the step between an approval and a manifest,
 * and it is deliberately separate from whatever writes the manifest so that the
 * decision about which records change can be read and checked on its own.
 *
 * A component the approval names and the bank does not hold is an error rather
 * than a skip. An approval is a person's statement about specific art; quietly
 * promoting the subset that happens to be present would promote something they
 * did not say.
 */
export function promoteApproval(
  approval: CatalogApproval,
  bank: readonly CharacterComponentManifestRecord[],
): readonly CharacterComponentManifestRecord[] {
  const byId = new Map(bank.map((record) => [record.asset_id, record]));
  const missing = approval.componentIds.filter((id) => !byId.has(id));
  if (missing.length > 0) {
    throw new Error(
      `Approval '${approval.approvalId}' names ${missing.length} component(s) the bank does not hold: ${missing.join(", ")}. An approval is about specific art; promoting the rest would promote something nobody accepted.`,
    );
  }
  return approval.componentIds.map((id) =>
    promoteCandidateComponent(byId.get(id)!, approval.generation),
  );
}
