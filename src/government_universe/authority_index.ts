/**
 * Searchable Qualitative State Authority Reference Index
 *
 * Source: 2022 Census of Governments Individual State Descriptions (G22-CG-ISD).
 * Provides deterministic indexing and lookup of state-level governmental structural authorities,
 * governing body titles, authorized classes, and Census classification rules.
 *
 * Strictly enforces unknown power boundaries: missing legal authority remains unknown,
 * not fabricated or inferred.
 */

import type {
  AuthorizedClassDescription,
  GovernmentClass,
  GovernmentTypeAuthorityRecord,
} from "./types.js";
import { ALL_STATE_AUTHORITY_RECORDS } from "./authority_data.js";
import { getStateByFips } from "./census_id.js";

export class AuthorityReferenceIndex {
  private readonly byState: Map<string, GovernmentTypeAuthorityRecord>;
  private readonly byAuthorityId: Map<string, GovernmentTypeAuthorityRecord>;

  constructor(
    records: readonly GovernmentTypeAuthorityRecord[] = ALL_STATE_AUTHORITY_RECORDS,
  ) {
    this.byState = new Map();
    this.byAuthorityId = new Map();

    for (const record of records) {
      this.byState.set(record.state.toUpperCase(), record);
      this.byAuthorityId.set(record.authorityId, record);
    }
  }

  /**
   * Retrieves the authority record for a given 2-letter state postal abbreviation.
   */
  public getAuthorityForState(
    statePostal: string,
  ): GovernmentTypeAuthorityRecord | undefined {
    return this.byState.get(statePostal.trim().toUpperCase());
  }

  /**
   * Retrieves the authority record for a state by its 2-digit FIPS code.
   */
  public getAuthorityByFips(
    stateFips: string,
  ): GovernmentTypeAuthorityRecord | undefined {
    const mapping = getStateByFips(stateFips);
    if (!mapping) return undefined;
    return this.getAuthorityForState(mapping.postal);
  }

  /**
   * Retrieves an authority record by its authority ID (e.g. "gov-auth-ky").
   */
  public getAuthorityById(
    authorityId: string,
  ): GovernmentTypeAuthorityRecord | undefined {
    return this.byAuthorityId.get(authorityId);
  }

  /**
   * Returns all indexed state authority records.
   */
  public getAllAuthorities(): readonly GovernmentTypeAuthorityRecord[] {
    return Array.from(this.byState.values());
  }

  /**
   * Checks whether a state authorizes a particular government class.
   */
  public isClassAuthorizedInState(
    statePostal: string,
    govClass: GovernmentClass,
  ): boolean {
    const auth = this.getAuthorityForState(statePostal);
    if (!auth) return false;
    return auth.authorizedClasses.some((c) => c.class === govClass);
  }

  /**
   * Returns the authorized structural descriptions for a given state and class.
   */
  public getAuthorizedClassesForState(
    statePostal: string,
    govClass?: GovernmentClass,
  ): readonly AuthorizedClassDescription[] {
    const auth = this.getAuthorityForState(statePostal);
    if (!auth) return [];
    if (!govClass) return auth.authorizedClasses;
    return auth.authorizedClasses.filter((c) => c.class === govClass);
  }

  /**
   * Returns whether townships exist as organized local governments in the state.
   */
  public hasTownshipGovernments(statePostal: string): boolean {
    return this.isClassAuthorizedInState(statePostal, "township");
  }

  /**
   * Search qualitative text and classification notes across all state descriptions.
   */
  public searchStateDescriptions(
    query: string,
  ): readonly GovernmentTypeAuthorityRecord[] {
    const q = query.trim().toLowerCase();
    if (!q) return this.getAllAuthorities();

    return this.getAllAuthorities().filter(
      (auth) =>
        auth.state.toLowerCase().includes(q) ||
        auth.stateName.toLowerCase().includes(q) ||
        auth.sourceDescription.toLowerCase().includes(q) ||
        auth.censusClassificationNotes.toLowerCase().includes(q) ||
        auth.authorizedClasses.some(
          (c) =>
            c.governingBodyTitle.toLowerCase().includes(q) ||
            c.stateLegalBasis.toLowerCase().includes(q) ||
            c.subtypeKey.toLowerCase().includes(q),
        ),
    );
  }

  /**
   * Asserts integrity and strict unknown boundaries for all records.
   */
  public validateIntegrity(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const [state, auth] of this.byState.entries()) {
      if (!auth.unprovidedPowersStrictlyUnknown) {
        errors.push(
          `Authority record for ${state} failed strict unknown-power boundary invariant.`,
        );
      }
      if (!auth.sourceCitation?.publication || !auth.sourceCitation?.url) {
        errors.push(
          `Authority record for ${state} missing required source citation or URL.`,
        );
      }
      if (auth.authorizedClasses.length === 0) {
        errors.push(`Authority record for ${state} has no authorized classes.`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export const defaultAuthorityIndex = new AuthorityReferenceIndex();
