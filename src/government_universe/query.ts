/**
 * Query and Indexing Engine for U.S. Government-Universe
 *
 * Provides fast, deterministic lookup, multi-criteria filtering, and
 * authority inspection across the normalized governmental universe.
 */

import type { AuthorityReferenceIndex } from "./authority_index.js";
import { defaultAuthorityIndex } from "./authority_index.js";
import type {
  GovernmentClass,
  GovernmentFunctionCategory,
  GovernmentSearchCriteria,
  GovernmentSourceRecord,
  GovernmentTypeAuthorityRecord,
} from "./types.js";

export class GovernmentUniverseQuery {
  private readonly byStableId: Map<string, GovernmentSourceRecord>;
  private readonly byCensusGovId: Map<string, GovernmentSourceRecord>;
  private readonly byState: Map<string, GovernmentSourceRecord[]>;
  private readonly byClass: Map<GovernmentClass, GovernmentSourceRecord[]>;
  private readonly byFunction: Map<
    GovernmentFunctionCategory,
    GovernmentSourceRecord[]
  >;
  private readonly allRecords: readonly GovernmentSourceRecord[];
  private readonly authorityIndex: AuthorityReferenceIndex;

  constructor(
    records: readonly GovernmentSourceRecord[],
    authorityIndex: AuthorityReferenceIndex = defaultAuthorityIndex,
  ) {
    this.allRecords = Object.freeze([...records]);
    this.authorityIndex = authorityIndex;
    this.byStableId = new Map();
    this.byCensusGovId = new Map();
    this.byState = new Map();
    this.byClass = new Map();
    this.byFunction = new Map();

    for (const rec of this.allRecords) {
      this.byStableId.set(rec.stableSourceId, rec);
      this.byCensusGovId.set(rec.censusGovId, rec);

      // By state
      const stateList = this.byState.get(rec.state) ?? [];
      stateList.push(rec);
      this.byState.set(rec.state, stateList);

      // By class
      const classList = this.byClass.get(rec.governmentType) ?? [];
      classList.push(rec);
      this.byClass.set(rec.governmentType, classList);

      // By function
      if (rec.functionCategory) {
        const funcList = this.byFunction.get(rec.functionCategory) ?? [];
        funcList.push(rec);
        this.byFunction.set(rec.functionCategory, funcList);
      }
    }
  }

  /**
   * Look up a government unit by its stable source ID.
   */
  public findGovernmentById(
    stableSourceId: string,
  ): GovernmentSourceRecord | undefined {
    return this.byStableId.get(stableSourceId);
  }

  /**
   * Look up a government unit by its 14-digit Census Government ID.
   */
  public findGovernmentByCensusId(
    censusGovId: string,
  ): GovernmentSourceRecord | undefined {
    return this.byCensusGovId.get(censusGovId.trim());
  }

  /**
   * Returns all normalized records in the store.
   */
  public getAllGovernments(): readonly GovernmentSourceRecord[] {
    return this.allRecords;
  }

  /**
   * Returns all governments in a given state.
   */
  public getGovernmentsForState(
    statePostal: string,
  ): readonly GovernmentSourceRecord[] {
    return this.byState.get(statePostal.trim().toUpperCase()) ?? [];
  }

  /**
   * Returns all governments of a given class (e.g. county, municipal, township, special_district, school_district).
   */
  public getGovernmentsByClass(
    govClass: GovernmentClass,
  ): readonly GovernmentSourceRecord[] {
    return this.byClass.get(govClass) ?? [];
  }

  /**
   * Returns all special districts performing a specific function.
   */
  public getSpecialDistrictsByFunction(
    functionCategory: GovernmentFunctionCategory,
  ): readonly GovernmentSourceRecord[] {
    const list = this.byFunction.get(functionCategory) ?? [];
    return list.filter((r) => r.governmentType === "special_district");
  }

  /**
   * Returns all public school districts in a state or nationally.
   */
  public getSchoolDistricts(
    statePostal?: string,
  ): readonly GovernmentSourceRecord[] {
    const base = statePostal
      ? this.getGovernmentsForState(statePostal)
      : this.allRecords;
    return base.filter((r) => r.governmentType === "school_district");
  }

  /**
   * Returns all general-purpose governments (counties, municipalities, townships).
   */
  public getGeneralPurposeGovernments(
    statePostal?: string,
  ): readonly GovernmentSourceRecord[] {
    const base = statePostal
      ? this.getGovernmentsForState(statePostal)
      : this.allRecords;
    return base.filter(
      (r) =>
        r.governmentType === "county" ||
        r.governmentType === "municipal" ||
        r.governmentType === "township",
    );
  }

  /**
   * Returns all special-purpose governments (special districts, school districts).
   */
  public getSpecialPurposeGovernments(
    statePostal?: string,
  ): readonly GovernmentSourceRecord[] {
    const base = statePostal
      ? this.getGovernmentsForState(statePostal)
      : this.allRecords;
    return base.filter(
      (r) =>
        r.governmentType === "special_district" ||
        r.governmentType === "school_district",
    );
  }

  /**
   * Returns all governments associated with a specific county within a state.
   */
  public getGovernmentsForCounty(
    statePostal: string,
    countyQuery: string,
  ): readonly GovernmentSourceRecord[] {
    const stateGovs = this.getGovernmentsForState(statePostal);
    const q = countyQuery.trim().toLowerCase();

    return stateGovs.filter((r) => {
      if (!r.countyAssociation) return false;
      return (
        r.countyAssociation.countyName.toLowerCase().includes(q) ||
        r.countyAssociation.countyFips === q ||
        r.countyAssociation.fipsCountyCode === q ||
        r.geographicIdentifiers.censusCountyCode === q
      );
    });
  }

  /**
   * Searches governments matching multi-criteria query parameters.
   */
  public searchGovernments(
    criteria: GovernmentSearchCriteria,
  ): readonly GovernmentSourceRecord[] {
    let results = this.allRecords;

    if (criteria.state) {
      const st = criteria.state.trim().toUpperCase();
      results = results.filter((r) => r.state === st);
    }

    if (criteria.governmentType) {
      results = results.filter(
        (r) => r.governmentType === criteria.governmentType,
      );
    }

    if (criteria.functionCategory) {
      results = results.filter(
        (r) => r.functionCategory === criteria.functionCategory,
      );
    }

    if (criteria.activeStatus) {
      results = results.filter((r) => r.activeStatus === criteria.activeStatus);
    }

    if (criteria.county) {
      const cq = criteria.county.trim().toLowerCase();
      results = results.filter((r) => {
        if (!r.countyAssociation) return false;
        return (
          r.countyAssociation.countyName.toLowerCase().includes(cq) ||
          r.countyAssociation.countyFips === cq ||
          r.countyAssociation.fipsCountyCode === cq
        );
      });
    }

    if (criteria.query) {
      const q = criteria.query.trim().toLowerCase();
      results = results.filter(
        (r) =>
          r.officialName.toLowerCase().includes(q) ||
          r.stableSourceId.toLowerCase().includes(q) ||
          r.censusGovId.includes(q) ||
          r.placeAssociation?.placeName.toLowerCase().includes(q),
      );
    }

    const offset = criteria.offset ?? 0;
    const limit = criteria.limit ?? results.length;

    return results.slice(offset, offset + limit);
  }

  /**
   * Retrieves the qualitative structural authority record for a given state.
   */
  public getAuthorityForState(
    statePostal: string,
  ): GovernmentTypeAuthorityRecord | undefined {
    return this.authorityIndex.getAuthorityForState(statePostal);
  }

  /**
   * Access to the underlying authority index.
   */
  public getAuthorityIndex(): AuthorityReferenceIndex {
    return this.authorityIndex;
  }
}
