// Stub hook — currently returns static data.
// Replace the implementation with a real API call when the backend is ready.
// Expected API shape: GET /api/assessments/:id/domains
// Returns: DomainScore[]

import { useState, useEffect } from "react";

interface DomainScore {
  domain: string;
  score: number;
  maxScore: number;
  status: "normal" | "borderline" | "impaired";
  question?: string;
  response?: string;
}

export function useDomainScores(assessmentId: string) {
  const [data, setData] = useState<DomainScore[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // TODO: replace with fetch(`/api/assessments/${assessmentId}/domains`)
    setLoading(false);
    setData(null); // static data is passed as props for now
  }, [assessmentId]);

  return { data, loading, error };
}
