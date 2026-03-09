/**
 * Client-side scoring helper.
 * Mirrors the server-side scoring logic for optimistic UI.
 */

interface Preferences {
  passFailCriteria?: {
    noStructuralRust?: boolean;
    pre1976?: boolean;
    cleanTitle?: boolean;
  };
  bonusWeights?: Record<string, number>;
}

interface AuctionForScoring {
  year?: number;
  rustNotes?: string;
  titleStatus?: string;
  bonusFeatures?: Array<{
    featureKey: string;
    featureLabel?: string;
    pointsDefault: number;
  }>;
}

interface ScoreResult {
  score: number;
  disqualified: boolean;
  reason: string | null;
  base: number;
  bonus: number;
}

export function computeScore(
  auction: AuctionForScoring,
  prefs: Preferences
): ScoreResult {
  // Pass/fail checks
  if (prefs.passFailCriteria?.noStructuralRust && auction.rustNotes) {
    const rust = auction.rustNotes.toLowerCase();
    if (rust.includes("moderate") || rust.includes("heavy")) {
      return { score: 0, disqualified: true, reason: "Structural rust", base: 0, bonus: 0 };
    }
  }

  if (prefs.passFailCriteria?.pre1976 && auction.year && auction.year > 1975) {
    return { score: 0, disqualified: true, reason: "Post-1976", base: 0, bonus: 0 };
  }

  if (
    prefs.passFailCriteria?.cleanTitle &&
    auction.titleStatus &&
    auction.titleStatus.toLowerCase() !== "clean"
  ) {
    return { score: 0, disqualified: true, reason: "Non-clean title", base: 0, bonus: 0 };
  }

  // Base score (placeholder until rubric is implemented)
  const base = 60;

  // Bonus from features
  let bonus = 0;
  for (const feat of auction.bonusFeatures ?? []) {
    const weight = prefs.bonusWeights?.[feat.featureKey] ?? feat.pointsDefault;
    bonus += weight;
  }

  return {
    score: Math.min(base + bonus, 100),
    disqualified: false,
    reason: null,
    base,
    bonus,
  };
}
