import type {
  NormalizedCorpusPackage,
  ResearchValidationEpisode,
  ResearchValidationResult,
  ValidationDiscrepancy
} from "./types.js";
import { normalizeJurisdictionKey, sanitizeKey } from "./ids.js";

export function validateResearchEpisode(
  episode: ResearchValidationEpisode,
  corpus: NormalizedCorpusPackage
): ResearchValidationResult {
  const discrepancies: ValidationDiscrepancy[] = [];
  const normJurKey = normalizeJurisdictionKey(episode.jurisdictionKey);
  const normBillId = sanitizeKey(episode.measureIdentifier);

  // Find measure in corpus
  const measure = corpus.measures.find((m) => {
    const jurMatch = m.jurisdictionKey === normJurKey;
    const billMatch = sanitizeKey(m.identifier) === normBillId;
    const sessionMatch = !episode.sessionId || m.sessionId.toLowerCase().includes(sanitizeKey(episode.sessionId));
    return jurMatch && billMatch && sessionMatch;
  });

  if (!measure) {
    return {
      episodeId: episode.episodeId,
      measureIdentifier: episode.measureIdentifier,
      valid: false,
      discrepancies: [
        {
          field: "measure",
          claimedValue: episode.measureIdentifier,
          corpusValue: null,
          severity: "critical_contradiction",
          explanation: `Measure '${episode.measureIdentifier}' not found in normalized corpus for jurisdiction '${normJurKey}'.`
        }
      ],
      matchSummary: `Measure lookup failed for ${episode.measureIdentifier} in ${normJurKey}.`
    };
  }

  // Find associated session
  const session = corpus.sessions.find((s) => s.sessionId === measure.sessionId);
  if (episode.claimedSessionType && session) {
    if (session.classification !== episode.claimedSessionType) {
      discrepancies.push({
        field: "session.classification",
        claimedValue: episode.claimedSessionType,
        corpusValue: session.classification,
        severity: "mismatch",
        explanation: `Claimed session classification '${episode.claimedSessionType}' contradicts corpus classification '${session.classification}'.`
      });
    }
  }

  // Find associated votes
  const measureVotes = corpus.votes.filter((v) => v.measureId === measure.measureId);

  if (episode.claimedChamberVotes && episode.claimedChamberVotes.length > 0) {
    for (const claimedVote of episode.claimedChamberVotes) {
      // Find matching vote by chamber (and optionally motion or date)
      const matchingVotes = measureVotes.filter((v) => {
        if (v.chamber !== claimedVote.chamber) return false;
        if (claimedVote.motion) {
          const mNorm = claimedVote.motion.toLowerCase();
          const vNorm = v.motion.toLowerCase();
          if (!vNorm.includes(mNorm) && !mNorm.includes(vNorm)) return false;
        }
        if (claimedVote.date && v.date !== claimedVote.date) return false;
        return true;
      });

      const matchedVote = matchingVotes[0] || measureVotes.find((v) => v.chamber === claimedVote.chamber);

      if (!matchedVote) {
        discrepancies.push({
          field: `vote.${claimedVote.chamber}`,
          claimedValue: claimedVote,
          corpusValue: null,
          severity: "critical_contradiction",
          explanation: `No vote found in corpus for chamber '${claimedVote.chamber}'.`
        });
      } else {
        if (matchedVote.yeas !== claimedVote.yeas) {
          discrepancies.push({
            field: `vote.${claimedVote.chamber}.yeas`,
            claimedValue: claimedVote.yeas,
            corpusValue: matchedVote.yeas,
            severity: "critical_contradiction",
            explanation: `Vote yeas mismatch in ${claimedVote.chamber}: claimed ${claimedVote.yeas}, corpus record proves ${matchedVote.yeas} (motion: "${matchedVote.motion}").`
          });
        }
        if (matchedVote.nays !== claimedVote.nays) {
          discrepancies.push({
            field: `vote.${claimedVote.chamber}.nays`,
            claimedValue: claimedVote.nays,
            corpusValue: matchedVote.nays,
            severity: "critical_contradiction",
            explanation: `Vote nays mismatch in ${claimedVote.chamber}: claimed ${claimedVote.nays}, corpus record proves ${matchedVote.nays} (motion: "${matchedVote.motion}").`
          });
        }
      }
    }
  }

  // Check signed date
  if (episode.claimedSignedDate) {
    const corpusSignedDate = measure.derivedLifecycle.becameLawEvidence?.signedDate;
    if (!corpusSignedDate) {
      discrepancies.push({
        field: "signedDate",
        claimedValue: episode.claimedSignedDate,
        corpusValue: null,
        severity: "critical_contradiction",
        explanation: `Claimed signed date '${episode.claimedSignedDate}', but corpus has no affirmative signature/enactment record.`
      });
    } else if (corpusSignedDate !== episode.claimedSignedDate) {
      discrepancies.push({
        field: "signedDate",
        claimedValue: episode.claimedSignedDate,
        corpusValue: corpusSignedDate,
        severity: "critical_contradiction",
        explanation: `Signed date contradiction: claimed ${episode.claimedSignedDate}, corpus truth proves ${corpusSignedDate}.`
      });
    }
  }

  // Check Acts / Chapter identifier
  if (episode.claimedActsChapter) {
    const corpusChapter = measure.derivedLifecycle.becameLawEvidence?.chapterOrActId;
    const cleanClaimed = episode.claimedActsChapter.toLowerCase().replace(/[^a-z0-9]+/g, "");
    const cleanCorpus = (corpusChapter || "").toLowerCase().replace(/[^a-z0-9]+/g, "");

    if (!corpusChapter) {
      discrepancies.push({
        field: "actsChapter",
        claimedValue: episode.claimedActsChapter,
        corpusValue: null,
        severity: "mismatch",
        explanation: `Claimed chapter '${episode.claimedActsChapter}', but no chapter was indexed in corpus enactment evidence.`
      });
    } else if (!cleanCorpus.includes(cleanClaimed) && !cleanClaimed.includes(cleanCorpus)) {
      discrepancies.push({
        field: "actsChapter",
        claimedValue: episode.claimedActsChapter,
        corpusValue: corpusChapter,
        severity: "critical_contradiction",
        explanation: `Acts chapter contradiction: claimed '${episode.claimedActsChapter}', corpus truth proves '${corpusChapter}'.`
      });
    }
  }

  // Check Lifecycle Status
  if (episode.claimedLifecycle) {
    if (measure.derivedLifecycle.status !== episode.claimedLifecycle) {
      discrepancies.push({
        field: "derivedLifecycle.status",
        claimedValue: episode.claimedLifecycle,
        corpusValue: measure.derivedLifecycle.status,
        severity: "critical_contradiction",
        explanation: `Lifecycle contradiction: claimed status '${episode.claimedLifecycle}', but corpus derived status is '${measure.derivedLifecycle.status}' (${measure.derivedLifecycle.rationale}).`
      });
    }
  }

  const valid = discrepancies.length === 0;
  const matchSummary = valid
    ? `Episode '${episode.episodeId}' for ${episode.measureIdentifier} perfectly matches normalized source corpus truth.`
    : `Episode '${episode.episodeId}' contains ${discrepancies.length} discrepancy(ies) against source corpus truth.`;

  return {
    episodeId: episode.episodeId,
    measureIdentifier: episode.measureIdentifier,
    valid,
    discrepancies,
    matchSummary
  };
}
