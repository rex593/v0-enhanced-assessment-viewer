import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ReferenceLine,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronDown,
  Play,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

type DomainStatus = "normal" | "borderline" | "impaired";

interface DomainScore {
  domain: string;
  score: number;
  maxScore: number;
  status: DomainStatus;
}

interface Assessment {
  id: string;
  date: string;
  totalScore: number;
  maxScore: number;
  provider: string;
  testType: string;
  isCurrent?: boolean;
  isBaseline?: boolean;
  hasVideoReview?: boolean;
  domainScores?: DomainScore[];
}

interface AssessmentHistoryProps {
  patientName: string;
  onNavigateToReview: (assessmentId: string | null, focusDomain?: string) => void;
  currentScore?: number;
}

// ─── Color Palette (Light Theme) ─────────────────────────────────────────────

const STATUS_COLORS: Record<DomainStatus, { bg: string; text: string; border: string }> = {
  normal: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-100",
  },
  borderline: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-100",
  },
  impaired: {
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-100",
  },
};

const SCORE_COLORS = {
  dotAbove: "oklch(0.56 0.16 162)",
  dotBelow: "oklch(0.68 0.17 72)",
};

// ─── Mock Data ───────────────────────────────────────────────────────────────

export const assessmentHistory: Assessment[] = [
  {
    id: "current",
    date: "2026-02-11",
    totalScore: 22,
    maxScore: 30,
    provider: "R. Torres, NP",
    testType: "MoCA Standard",
    isCurrent: true,
    hasVideoReview: true,
    domainScores: [
      { domain: "Visuospatial", score: 3, maxScore: 5, status: "impaired" },
      { domain: "Naming", score: 3, maxScore: 3, status: "normal" },
      { domain: "Attention", score: 4, maxScore: 6, status: "borderline" },
      { domain: "Language", score: 2, maxScore: 3, status: "borderline" },
      { domain: "Abstraction", score: 2, maxScore: 2, status: "normal" },
      { domain: "Delayed Recall", score: 2, maxScore: 5, status: "impaired" },
      { domain: "Orientation", score: 5, maxScore: 6, status: "borderline" },
    ],
  },
  {
    id: "a2",
    date: "2025-08-14",
    totalScore: 27,
    maxScore: 30,
    provider: "R. Torres, NP",
    testType: "MoCA Standard",
    hasVideoReview: true,
    domainScores: [
      { domain: "Visuospatial", score: 4, maxScore: 5, status: "borderline" },
      { domain: "Naming", score: 3, maxScore: 3, status: "normal" },
      { domain: "Attention", score: 5, maxScore: 6, status: "normal" },
      { domain: "Language", score: 3, maxScore: 3, status: "normal" },
      { domain: "Abstraction", score: 2, maxScore: 2, status: "normal" },
      { domain: "Delayed Recall", score: 4, maxScore: 5, status: "borderline" },
      { domain: "Orientation", score: 6, maxScore: 6, status: "normal" },
    ],
  },
  {
    id: "a3",
    date: "2025-02-03",
    totalScore: 28,
    maxScore: 30,
    provider: "J. Kimura, MD",
    testType: "MoCA Standard",
    hasVideoReview: false,
    domainScores: [
      { domain: "Visuospatial", score: 4, maxScore: 5, status: "borderline" },
      { domain: "Naming", score: 3, maxScore: 3, status: "normal" },
      { domain: "Attention", score: 6, maxScore: 6, status: "normal" },
      { domain: "Language", score: 3, maxScore: 3, status: "normal" },
      { domain: "Abstraction", score: 2, maxScore: 2, status: "normal" },
      { domain: "Delayed Recall", score: 4, maxScore: 5, status: "borderline" },
      { domain: "Orientation", score: 6, maxScore: 6, status: "normal" },
    ],
  },
  {
    id: "a4",
    date: "2024-07-22",
    totalScore: 29,
    maxScore: 30,
    provider: "J. Kimura, MD",
    testType: "MoCA Standard",
    hasVideoReview: false,
    domainScores: [
      { domain: "Visuospatial", score: 5, maxScore: 5, status: "normal" },
      { domain: "Naming", score: 3, maxScore: 3, status: "normal" },
      { domain: "Attention", score: 5, maxScore: 6, status: "normal" },
      { domain: "Language", score: 3, maxScore: 3, status: "normal" },
      { domain: "Abstraction", score: 2, maxScore: 2, status: "normal" },
      { domain: "Delayed Recall", score: 5, maxScore: 5, status: "normal" },
      { domain: "Orientation", score: 6, maxScore: 6, status: "normal" },
    ],
  },
  {
    id: "a5",
    date: "2024-01-15",
    totalScore: 29,
    maxScore: 30,
    provider: "R. Torres, NP",
    testType: "MoCA Standard",
    isBaseline: true,
    hasVideoReview: false,
    domainScores: [
      { domain: "Visuospatial", score: 5, maxScore: 5, status: "normal" },
      { domain: "Naming", score: 3, maxScore: 3, status: "normal" },
      { domain: "Attention", score: 6, maxScore: 6, status: "normal" },
      { domain: "Language", score: 3, maxScore: 3, status: "normal" },
      { domain: "Abstraction", score: 2, maxScore: 2, status: "normal" },
      { domain: "Delayed Recall", score: 4, maxScore: 5, status: "borderline" },
      { domain: "Orientation", score: 6, maxScore: 6, status: "normal" },
    ],
  },
];

const THRESHOLD = 26;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDateLong(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function getStatusLabel(status: DomainStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

// ─── Custom Chart Tooltip ────────────────────────────────────────────────────

function ChartTooltipContent({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: { date: string; score: number } }>;
}) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div className="bg-white text-slate-800 px-2.5 py-1.5 rounded-lg shadow-lg text-xs border border-slate-200">
      <p className="font-semibold tabular-nums">{data.score}/30</p>
      <p className="text-slate-500">{formatDateLong(data.date)}</p>
    </div>
  );
}

// ─── Custom Dot for Chart ────────────────────────────────────────────────────

function CustomDot(props: {
  cx?: number;
  cy?: number;
  payload?: { score: number; isCurrent: boolean };
}) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null || !payload) return null;
  const aboveThreshold = payload.score >= THRESHOLD;
  const fill = aboveThreshold ? SCORE_COLORS.dotAbove : SCORE_COLORS.dotBelow;
  const r = payload.isCurrent ? 5 : 3.5;

  return (
    <g>
      {payload.isCurrent && (
        <circle cx={cx} cy={cy} r={8} fill={fill} opacity={0.2} />
      )}
      <circle cx={cx} cy={cy} r={r} fill={fill} stroke="#ffffff" strokeWidth={2} />
    </g>
  );
}

// ─── Score Trend Chart ───────────────────────────────────────────────────────

function ScoreTrendChart({ currentScore }: { currentScore?: number }) {
  const chartData = [...assessmentHistory].reverse().map((a) => ({
    date: a.date,
    score: a.isCurrent && currentScore !== undefined ? currentScore : a.totalScore,
    isCurrent: !!a.isCurrent,
  }));

  return (
    <div className="px-4 pb-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Score Trend</p>
        <p className="text-xs text-slate-400">Threshold: {THRESHOLD}/30</p>
      </div>
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-3">
        <ResponsiveContainer width="100%" height={140}>
          <LineChart
            data={chartData}
            margin={{ top: 8, right: 12, bottom: 4, left: -8 }}
          >
            <XAxis
              dataKey="date"
              tickFormatter={formatDateShort}
              tick={{ fontSize: 10, fill: "#64748b" }}
              axisLine={{ stroke: "#e2e8f0" }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 30]}
              ticks={[0, 10, 20, 26, 30]}
              tick={{ fontSize: 10, fill: "#64748b" }}
              axisLine={false}
              tickLine={false}
              width={28}
            />
            <ReferenceLine
              y={THRESHOLD}
              stroke="#f59e0b"
              strokeDasharray="4 4"
              strokeWidth={1}
            />
            <RechartsTooltip content={<ChartTooltipContent />} cursor={false} />
            <Line
              type="monotone"
              dataKey="score"
              stroke="#0ea5e9"
              strokeWidth={2}
              dot={<CustomDot />}
              activeDot={{ r: 5, stroke: "#0ea5e9", strokeWidth: 2, fill: "#ffffff" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── Domain Breakdown Component ──────────────────────────────────────────────

function DomainBreakdown({
  domains,
  onDomainClick,
}: {
  domains: DomainScore[];
  onDomainClick?: (domain: string) => void;
}) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs font-semibold mb-2 uppercase tracking-wide text-slate-500">
        Domain Breakdown
        {onDomainClick && (
          <span className="ml-1.5 normal-case font-normal text-slate-400">· tap to review</span>
        )}
      </p>
      <div className="rounded-lg border bg-white border-slate-200 divide-y divide-slate-100">
        {domains.map((domain) => {
          const colors = STATUS_COLORS[domain.status];
          const isClickable = !!onDomainClick;
          return (
            <div
              key={domain.domain}
              onClick={() => onDomainClick?.(domain.domain)}
              className={cn(
                "flex items-center justify-between px-3 py-2.5 transition-colors",
                isClickable && "cursor-pointer hover:bg-sky-50 active:bg-sky-100 group"
              )}
            >
              <div className="flex items-center gap-1.5">
                <span className={cn(
                  "text-sm text-slate-700 transition-colors",
                  isClickable && "group-hover:text-sky-700"
                )}>
                  {domain.domain}
                </span>
                {isClickable && (
                  <svg
                    className="w-3 h-3 text-slate-300 group-hover:text-sky-400 transition-colors"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold tabular-nums text-slate-800">
                  {domain.score}/{domain.maxScore}
                </span>
                <span className={cn(
                  "text-xs font-medium rounded px-2.5 py-1 border uppercase",
                  colors.bg, colors.text, colors.border
                )}>
                  {getStatusLabel(domain.status)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Timeline Entry ──────────────────────────────────────────────────────────

interface TimelineEntryProps {
  assessment: Assessment;
  previousAssessment?: Assessment;
  isLast: boolean;
  expandedId: string | null;
  onToggle: (id: string) => void;
  onViewVideoReview: (assessmentId: string | null) => void;
  onDomainClick?: (domain: string) => void;
}

function TimelineEntry({
  assessment,
  previousAssessment: _previousAssessment,
  isLast,
  expandedId,
  onToggle,
  onViewVideoReview,
  onDomainClick,
}: TimelineEntryProps) {
  const isExpanded = expandedId === assessment.id;
  const aboveThreshold = assessment.totalScore >= THRESHOLD;
  const scorePercent = (assessment.totalScore / assessment.maxScore) * 100;
  const isCurrent = assessment.isCurrent;

  return (
    <div className="relative flex gap-3">
      {!isLast && (
        <div
          className="absolute left-[7px] top-5 bottom-0 w-px bg-slate-200"
          aria-hidden="true"
        />
      )}

      <div className="relative flex-shrink-0 mt-2">
        <div className={cn(
          "w-[14px] h-[14px] rounded-full border-2",
          isCurrent ? "border-sky-500 bg-sky-500" : "border-slate-300 bg-white"
        )} />
      </div>

      <div className="flex-1 pb-4 min-w-0">
        <Collapsible open={isExpanded} onOpenChange={() => onToggle(assessment.id)}>
          <div className={cn(
            "rounded-xl border overflow-hidden",
            isCurrent ? "bg-white border-slate-200 shadow-md" : "bg-white border-slate-200"
          )}>
            <div className="px-4 pt-3.5 pb-3">
              <div className="flex items-start justify-between mb-1">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn(
                      "text-base font-bold",
                      isCurrent ? "text-slate-800" : "text-slate-700"
                    )}>
                      {formatDateLong(assessment.date)}
                    </span>
                    {isCurrent && (
                      <span className="text-xs font-semibold bg-slate-800 text-white rounded px-2 py-0.5 uppercase tracking-wide">
                        Current
                      </span>
                    )}
                    {assessment.isBaseline && (
                      <span className="text-xs font-medium rounded px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200">
                        Baseline
                      </span>
                    )}
                  </div>
                  <div className="h-5 flex items-center">
                    {assessment.hasVideoReview ? (
                      <span className={cn(
                        "text-xs font-medium rounded px-2 py-0.5 flex items-center gap-1",
                        isCurrent
                          ? "bg-sky-50 text-sky-700 border border-sky-100"
                          : "bg-slate-50 text-slate-600 border border-slate-200"
                      )}>
                        <Play className="w-2.5 h-2.5" />
                        Video Review
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">No video review</span>
                    )}
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <div className="flex items-baseline gap-0.5">
                    <span
                      className="text-2xl font-black tabular-nums"
                      style={{
                        color: aboveThreshold
                          ? "var(--color-status-pass-edge)"
                          : "var(--color-status-partial-edge)",
                      }}
                    >
                      {assessment.totalScore}
                    </span>
                    <span className="text-sm text-slate-400">/{assessment.maxScore}</span>
                  </div>
                </div>
              </div>

              <p className="text-sm mb-2.5 text-slate-500">
                {assessment.testType} &middot; {assessment.provider}
              </p>

              <div className={cn(
                "rounded-full overflow-hidden",
                isCurrent ? "h-2 bg-slate-100" : "h-1.5 bg-slate-100"
              )}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${scorePercent}%`,
                    backgroundColor: aboveThreshold
                      ? "var(--color-status-pass-edge)"
                      : "var(--color-status-partial-edge)",
                  }}
                />
              </div>
            </div>

            <CollapsibleTrigger className={cn(
              "w-full flex items-center justify-center gap-1 border-t px-4 py-2 text-xs transition-colors",
              isCurrent
                ? "border-slate-100 text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                : "border-slate-100 text-slate-400 hover:text-slate-600 hover:bg-slate-50"
            )}>
              <ChevronDown className={cn(
                "w-3.5 h-3.5 transition-transform duration-200",
                isExpanded && "rotate-180"
              )} />
            </CollapsibleTrigger>

            <CollapsibleContent>
              <div className="border-t border-slate-100 px-4 py-3 space-y-4 bg-slate-50">
                {assessment.domainScores && assessment.domainScores.length > 0 && (
                  <DomainBreakdown
                    domains={assessment.domainScores}
                    onDomainClick={
                      isCurrent && assessment.hasVideoReview
                        ? (domain) => onDomainClick?.(domain)
                        : undefined
                    }
                  />
                )}

                {assessment.hasVideoReview && isCurrent && (
                  <button
                    onClick={() => onViewVideoReview(null)}
                    className="w-full flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold rounded-lg px-4 py-3 transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    Start Video Review
                  </button>
                )}

                {assessment.hasVideoReview && !isCurrent && (
                  <button
                    onClick={() => onViewVideoReview(assessment.id)}
                    className="w-full flex items-center justify-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-medium rounded-lg px-4 py-2.5 transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    Review Video for {formatDateLong(assessment.date)}
                  </button>
                )}

                {!assessment.hasVideoReview && !assessment.domainScores?.length && (
                  <p className="text-xs text-center py-2 text-slate-400">
                    No additional details available for this assessment.
                  </p>
                )}
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      </div>
    </div>
  );
}

// ─── Main Component (Slide-up Drawer) ────────────────────────────────────────

export default function AssessmentHistory({
  patientName,
  onNavigateToReview,
  currentScore,
}: AssessmentHistoryProps) {
  const [expandedId, setExpandedId] = useState<string | null>("current");
  const [isVisible, setIsVisible] = useState(false);

  const displayHistory = assessmentHistory.map((assessment) => {
    if (assessment.isCurrent && currentScore !== undefined) {
      return { ...assessment, totalScore: currentScore };
    }
    return assessment;
  });

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleToggle = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleViewVideoReview = (assessmentId: string | null) => {
    onNavigateToReview(assessmentId);
  };

  const handleDomainClick = (domain: string) => {
    setIsVisible(false);
    setTimeout(() => onNavigateToReview(null, domain), 300);
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onNavigateToReview(null), 300);
  };

  const isEmptyHistory = assessmentHistory.length <= 1;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className={cn(
          "absolute inset-0 bg-slate-900/40 transition-all duration-300",
          isVisible ? "opacity-100 backdrop-blur-md" : "opacity-0 backdrop-blur-none pointer-events-none"
        )}
        onClick={handleClose}
        aria-label="Close drawer"
      />

      <div className={cn(
        "absolute bottom-0 left-0 right-0 max-w-[480px] mx-auto bg-gray-50 rounded-t-3xl shadow-2xl flex flex-col transition-transform duration-300 ease-out max-h-[92vh]",
        isVisible ? "translate-y-0" : "translate-y-full"
      )}>
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-300" />
        </div>

        <div className="px-4 pt-2 pb-3 border-b border-slate-200 flex-shrink-0 bg-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-slate-800 leading-tight">
                Assessment History
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                {patientName} &middot; {assessmentHistory.length} assessments on record
              </p>
            </div>
            <button
              onClick={handleClose}
              className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain bg-gray-50">
          <div className="flex flex-col gap-0 pb-8">
            <div className="pt-4">
              <ScoreTrendChart currentScore={currentScore} />
            </div>

            <div className="px-4 pt-4">
              {isEmptyHistory ? (
                <div className="text-center py-8 px-4">
                  <p className="text-sm text-slate-500 leading-relaxed">
                    This is the patient's first MoCA assessment. History will
                    appear here as future assessments are completed.
                  </p>
                </div>
              ) : (
                <div>
                  {displayHistory.map((assessment, idx) => (
                    <TimelineEntry
                      key={assessment.id}
                      assessment={assessment}
                      previousAssessment={
                        idx < displayHistory.length - 1
                          ? displayHistory[idx + 1]
                          : undefined
                      }
                      isLast={idx === displayHistory.length - 1}
                      expandedId={expandedId}
                      onToggle={handleToggle}
                      onViewVideoReview={handleViewVideoReview}
                      onDomainClick={handleDomainClick}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
