import type {
  FecCandidateRecord,
  FecCommitteeRecord,
  FecCorpusDataset,
  FecCorpusManifest,
  FecLinkageRecord,
  FecOfficeCode,
} from "./types.js";

/**
 * High-performance, in-memory index for FEC candidate, committee, and linkage records.
 */
export class FecCorpusEngine {
  private readonly dataset: FecCorpusDataset;
  private readonly candidatesById: Map<string, FecCandidateRecord> = new Map();
  private readonly committeesById: Map<string, FecCommitteeRecord> = new Map();
  private readonly linkagesByCandidateId: Map<string, FecLinkageRecord[]> =
    new Map();
  private readonly linkagesByCommitteeId: Map<string, FecLinkageRecord[]> =
    new Map();
  private readonly candidatesByOfficeState: Map<string, FecCandidateRecord[]> =
    new Map();

  constructor(dataset: FecCorpusDataset) {
    this.dataset = dataset;
    this.indexDataset();
  }

  private indexDataset(): void {
    for (const cand of this.dataset.candidates) {
      this.candidatesById.set(cand.candidateId, cand);

      const stateOfficeKey = `${cand.officeState}:${cand.office}`;
      const existing = this.candidatesByOfficeState.get(stateOfficeKey) ?? [];
      existing.push(cand);
      this.candidatesByOfficeState.set(stateOfficeKey, existing);
    }

    for (const comm of this.dataset.committees) {
      this.committeesById.set(comm.committeeId, comm);
    }

    for (const link of this.dataset.linkages) {
      const candLinks = this.linkagesByCandidateId.get(link.candidateId) ?? [];
      candLinks.push(link);
      this.linkagesByCandidateId.set(link.candidateId, candLinks);

      const commLinks = this.linkagesByCommitteeId.get(link.committeeId) ?? [];
      commLinks.push(link);
      this.linkagesByCommitteeId.set(link.committeeId, commLinks);
    }
  }

  public getManifest(): FecCorpusManifest {
    return this.dataset.manifest;
  }

  public getCandidateById(candidateId: string): FecCandidateRecord | null {
    return this.candidatesById.get(candidateId) ?? null;
  }

  public getCommitteeById(committeeId: string): FecCommitteeRecord | null {
    return this.committeesById.get(committeeId) ?? null;
  }

  public getLinkagesForCandidate(
    candidateId: string,
  ): readonly FecLinkageRecord[] {
    return this.linkagesByCandidateId.get(candidateId) ?? [];
  }

  public getLinkagesForCommittee(
    committeeId: string,
  ): readonly FecLinkageRecord[] {
    return this.linkagesByCommitteeId.get(committeeId) ?? [];
  }

  /**
   * Finds the Principal Campaign Committee for a candidate if linked.
   */
  public getPrincipalCampaignCommittee(
    candidateId: string,
  ): FecCommitteeRecord | null {
    const candidate = this.getCandidateById(candidateId);
    if (candidate?.principalCampaignCommitteeId) {
      const comm = this.getCommitteeById(
        candidate.principalCampaignCommitteeId,
      );
      if (comm) return comm;
    }

    const linkages = this.getLinkagesForCandidate(candidateId);
    const pccLink = linkages.find((l) => l.committeeDesignation === "P");
    if (pccLink) {
      return this.getCommitteeById(pccLink.committeeId);
    }

    return null;
  }

  public findCandidatesByOfficeAndState(
    state: string,
    office: FecOfficeCode,
  ): readonly FecCandidateRecord[] {
    return this.candidatesByOfficeState.get(`${state}:${office}`) ?? [];
  }

  public searchCandidatesByName(query: string): readonly FecCandidateRecord[] {
    const upperQuery = query.trim().toUpperCase();
    if (!upperQuery) return [];
    return this.dataset.candidates.filter((c) =>
      c.candidateName.toUpperCase().includes(upperQuery),
    );
  }

  public getAllCandidates(): readonly FecCandidateRecord[] {
    return this.dataset.candidates;
  }

  public getAllCommittees(): readonly FecCommitteeRecord[] {
    return this.dataset.committees;
  }

  public getAllLinkages(): readonly FecLinkageRecord[] {
    return this.dataset.linkages;
  }
}
