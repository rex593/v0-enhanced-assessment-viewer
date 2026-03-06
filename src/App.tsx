import { useState, useRef, useEffect } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Slider } from "@/components/ui/slider";
import {
  Play,
  Pause,
  ChevronDown,
  AlertTriangle,
  Clock,
  ChevronLeft,
  Check,
  ArrowLeft,
  FileText,
  History,
} from "lucide-react";
import AssessmentHistory, { assessmentHistory } from "@/components/AssessmentHistory";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type ClipStatus = "pass" | "partial" | "fail";
type ViewMode = "highlights" | "all";
type AppView = "review" | "report" | "history" | "archived-review";

interface Observation {
  time: number;
  text: string;
  high?: boolean;
}

interface AssessmentSection {
  id: string;
  number: string;
  domain: string;
  question: string;
  response: string;
  evalOptions: string[];
  evalAnswer: string;
  score: number;
  maxScore: number;
  status: ClipStatus;
  flagged: boolean;
  duration: number;
  timestamp: string;
  signals?: string[];
  observations: Observation[];
  scoringInstruction?: string;
  hasVideo?: boolean;
}

interface Override {
  sectionId: string;
  answer: string;
  domain: string;
  number: string;
  original: string;
  timestamp: Date;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const SECTIONS: AssessmentSection[] = [
  {
    id: "trail-making",
    number: "001",
    domain: "Trail Making",
    question: "Draw a line alternating between numbers and letters in order: 1-A-2-B-3-C-4-D-5-E.",
    response: "Patient connected most points correctly but hesitated between 3 and C, self-corrected once.",
    evalOptions: ["Correct", "Incorrect"],
    evalAnswer: "Correct",
    score: 1, maxScore: 1, status: "pass",
    flagged: false,
    duration: 35,
    timestamp: "0:00",
    observations: [
      { time: 8, text: "Brief hesitation before connecting 3 to C" },
      { time: 24, text: "Self-corrected minor path error" },
    ],
    scoringInstruction: "Score 1 point if the patient draws the following pattern without any errors: 1→A→2→B→3→C→4→D→5→E.",
  },
  {
    id: "visuospatial",
    number: "002",
    domain: "Visuospatial / Executive",
    question: "Copy the cube drawing. Draw a clock showing ten past eleven.",
    response: "Cube partially reproduced with one face missing. Clock numbers mostly correct; minute hand at incorrect position.",
    evalOptions: ["Correct", "Partially Correct", "Incorrect"],
    evalAnswer: "Partially Correct",
    score: 3, maxScore: 5, status: "partial",
    flagged: false,
    duration: 48,
    timestamp: "0:35",
    observations: [
      { time: 12, text: "Cube proportions slightly off — one face missing" },
      { time: 30, text: "Clock drawn — minute hand placed at 10 instead of 2" },
    ],
    scoringInstruction: "Cube: 1 point if correctly copied. Clock: 3 points possible — contour 1pt, numbers 1pt, hands 1pt.",
  },
  {
    id: "naming",
    number: "003",
    domain: "Naming",
    question: "Name the three animals shown.",
    response: "Patient correctly named: lion, rhinoceros, and camel without prompting.",
    evalOptions: ["All Correct", "Partially Correct", "Incorrect"],
    evalAnswer: "All Correct",
    score: 3, maxScore: 3, status: "pass",
    flagged: false,
    duration: 22,
    timestamp: "1:23",
    observations: [
      { time: 5, text: "All three animals named confidently and without hesitation" },
    ],
    scoringInstruction: "Score 1 point for each correct animal name. Accept regional variants (e.g., hippo for rhinoceros is not acceptable).",
  },
  {
    id: "attention",
    number: "004",
    domain: "Attention",
    question: "Repeat the digit string forward, then backward. Tap each time you hear the letter A.",
    response: "Forward span: 5 digits correct. Backward span: missed 1 digit. Serial 7s: 2 errors.",
    evalOptions: ["Full Score", "Partial", "Failed"],
    evalAnswer: "Partial",
    score: 4, maxScore: 6, status: "partial",
    flagged: false,
    duration: 42,
    timestamp: "1:45",
    observations: [
      { time: 14, text: "Missed one digit on backward span" },
      { time: 30, text: "Two arithmetic errors in serial 7 subtraction" },
    ],
    scoringInstruction: "Digits forward 1pt, backward 1pt. Vigilance 1pt (≤1 error). Serial 7s: 3pts for 3 correct, 2pts for 2, 1pt for 1.",
  },
  {
    id: "language",
    number: "005",
    domain: "Language",
    question: "Repeat the two sentences exactly. Name as many words beginning with 'F' as possible in 60 seconds.",
    response: "Sentence 1 partially correct — omitted one word. Sentence 2 incorrect. Fluency: 4 words in 60 seconds.",
    evalOptions: ["Full Score", "Partial", "Failed"],
    evalAnswer: "Failed",
    score: 1, maxScore: 3, status: "fail",
    flagged: true,
    duration: 38,
    timestamp: "2:27",
    signals: ["Verbal fluency impairment", "Sentence recall failure", "Frustration indicators"],
    observations: [
      { time: 6, text: "Patient omitted key word in first sentence", high: true },
      { time: 20, text: "Verbal fluency: only 4 words named in 60s (threshold: 11)", high: true },
      { time: 35, text: "Visible frustration — paused and asked for repetition" },
    ],
    scoringInstruction: "Sentence repetition: 1pt each for exact repetition. Fluency: 1pt for ≥11 words beginning with F in 60 seconds.",
  },
  {
    id: "abstraction",
    number: "006",
    domain: "Abstraction",
    question: "How are a train and a bicycle alike? How are a watch and a ruler alike?",
    response: "Train/bicycle: 'They have wheels' (surface feature). Watch/ruler: 'You use them for things'.",
    evalOptions: ["Correct", "Partial", "Incorrect"],
    evalAnswer: "Partial",
    score: 1, maxScore: 2, status: "partial",
    flagged: false,
    hasVideo: false,
    duration: 22,
    timestamp: "3:05",
    observations: [
      { time: 10, text: "Described items by surface features rather than abstract category" },
    ],
    scoringInstruction: "Score 1 point for each correct abstract similarity. Surface features (e.g., 'both have wheels') receive 0 points.",
  },
  {
    id: "delayed-recall",
    number: "007",
    domain: "Delayed Recall",
    question: "Recall as many of the five words from earlier as you can.",
    response: "Free recall: 'velvet'. With cues: 'daisy', 'church'. Multiple choice: unable to identify 'red' or 'face'.",
    evalOptions: ["Full Score", "Partial", "Failed"],
    evalAnswer: "Failed",
    score: 1, maxScore: 5, status: "fail",
    flagged: true,
    duration: 55,
    timestamp: "3:27",
    signals: ["Severe free recall deficit", "Cued recall impairment", "Confusion indicators"],
    observations: [
      { time: 5, text: "Recalled only 'velvet' without cues", high: true },
      { time: 22, text: "With semantic cues: recalled 2 additional words" },
      { time: 40, text: "Unable to identify 'red' even with multiple-choice options", high: true },
      { time: 51, text: "Long pause and expressed confusion about having heard the words", high: true },
    ],
    scoringInstruction: "Score 1 point for each word recalled freely. No points for items recalled only with cues (for scoring). Note cue performance separately.",
  },
  {
    id: "orientation",
    number: "008",
    domain: "Orientation",
    question: "What is today's date? Month? Year? Day of the week? Where are we? What city?",
    response: "Correctly stated date, month, year, and city. Uncertain about day — self-corrected from 'Tuesday' to 'Wednesday'.",
    evalOptions: ["Full Score", "Partial", "Failed"],
    evalAnswer: "Partial",
    score: 5, maxScore: 6, status: "pass",
    flagged: false,
    duration: 28,
    timestamp: "4:22",
    observations: [
      { time: 8, text: "Date, month, year, and city all correct" },
      { time: 20, text: "Self-corrected day of week after a pause" },
    ],
    scoringInstruction: "1 point each: date, month, year, day of week, place, city. No half-points.",
  },
];

const PATIENT = {
  name: "Eleanor Chen",
  mrn: "10089234",
  dob: "03/12/1943",
  age: 82,
  provider: "Dr. Sarah Kim",
  assessmentDate: "Mar 15, 2025",
  score: 22,
  maxScore: 30,
  baseline: 27,
  baselineDate: "Aug 2024",
  threshold: 26,
};

const INTRO_QUESTIONS = [
  {
    q: "In the last 24 hours, has the patient taken any non-prescription medication, including things like THC, marijuana, or the like?",
    a: "No",
  },
  {
    q: "Has the patient been experiencing any anxiety or depression?",
    a: "No",
  },
  {
    q: "Does the patient have any known hearing or visual impairments that may affect assessment accuracy?",
    a: "Reading glasses — present during assessment",
  },
];

const HIGHLIGHT_SECTIONS = SECTIONS.filter((s) => s.flagged);

// ─── Semantic color tokens — driven by ClipStatus ─────────────────────────────

const STATUS_TOKENS: Record<ClipStatus, {
  badge: string;
  cardEdge: string;
  pillRow: string;
  pillIcon: string;
  pillText: string;
  signalTag: string;
  obsHigh: string;
  obsNormal: string;
}> = {
  pass: {
    badge:     "text-[var(--color-status-pass-text)] bg-[var(--color-status-pass-bg)] border-[var(--color-status-pass-border)]",
    cardEdge:  "card-border-pass",
    pillRow:   "border-[var(--color-status-pass-border)] bg-[var(--color-status-pass-bg)] hover:bg-emerald-100/60",
    pillIcon:  "text-[var(--color-status-pass-edge)]",
    pillText:  "text-[var(--color-status-pass-text)]",
    signalTag: "bg-[var(--color-status-pass-bg)] border-[var(--color-status-pass-border)] text-[var(--color-status-pass-text)]",
    obsHigh:   "bg-emerald-950/50 text-emerald-300 border-emerald-500",
    obsNormal: "bg-emerald-950/30 text-emerald-400 border-emerald-600",
  },
  partial: {
    badge:     "text-[var(--color-status-partial-text)] bg-[var(--color-status-partial-bg)] border-[var(--color-status-partial-border)]",
    cardEdge:  "card-border-partial",
    pillRow:   "border-[var(--color-status-partial-border)] bg-[var(--color-status-partial-bg)] hover:bg-amber-100/60",
    pillIcon:  "text-[var(--color-status-partial-edge)]",
    pillText:  "text-[var(--color-status-partial-text)]",
    signalTag: "bg-[var(--color-status-partial-bg)] border-[var(--color-status-partial-border)] text-[var(--color-status-partial-text)]",
    obsHigh:   "bg-amber-950/50 text-amber-300 border-amber-500",
    obsNormal: "bg-amber-950/30 text-amber-400 border-amber-600",
  },
  fail: {
    badge:     "text-[var(--color-status-fail-text)] bg-[var(--color-status-fail-bg)] border-[var(--color-status-fail-border)]",
    cardEdge:  "card-border-fail",
    pillRow:   "border-[var(--color-status-fail-border)] bg-[var(--color-status-fail-bg)] hover:bg-rose-100/60",
    pillIcon:  "text-[var(--color-status-fail-edge)]",
    pillText:  "text-[var(--color-status-fail-text)]",
    signalTag: "bg-[var(--color-status-fail-bg)] border-[var(--color-status-fail-border)] text-[var(--color-status-fail-text)]",
    obsHigh:   "bg-red-950/60 text-red-300 border-red-500",
    obsNormal: "bg-rose-950/40 text-rose-300 border-rose-500",
  },
};

function statusLabel(status: ClipStatus) {
  return { pass: "Pass", partial: "Partial", fail: "Fail" }[status];
}

function formatTime(secs: number) {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function evalAnswerToStatus(evalAnswer: string, evalOptions: string[]): ClipStatus {
  const idx = evalOptions.indexOf(evalAnswer);
  if (idx <= 0) return "pass";
  if (idx === evalOptions.length - 1) return "fail";
  return "partial";
}

function evalAnswerToScore(newStatus: ClipStatus, section: AssessmentSection): number {
  if (newStatus === "pass") return section.maxScore;
  if (newStatus === "fail") return 0;
  return section.score;
}

// ─── Inline Video Pill + Player ───────────────────────────────────────────────

interface VideoPillProps {
  section: AssessmentSection;
  defaultExpanded?: boolean;
}

function VideoPill({ section, defaultExpanded = false }: VideoPillProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setExpanded(defaultExpanded);
    setIsPlaying(false);
    setCurrentTime(0);
  }, [defaultExpanded]);

  useEffect(() => {
    if (!expanded) {
      setIsPlaying(false);
      setCurrentTime(0);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [expanded]);

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setCurrentTime((t) => {
          if (t >= section.duration) {
            setIsPlaying(false);
            return section.duration;
          }
          return t + 0.5;
        });
      }, 500);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isPlaying, section.duration]);

  const seek = (val: number[]) => {
    setCurrentTime(val[0]);
    if (val[0] >= section.duration) setIsPlaying(false);
  };

  const currentObs = [...section.observations]
    .reverse()
    .find((o) => currentTime >= o.time);

  const markerPositions = section.observations.map((o) => ({
    pct: (o.time / section.duration) * 100,
    high: o.high,
  }));

  const tokens = STATUS_TOKENS[section.status];

  return (
    <div>
      <button
        onClick={() => setExpanded((e) => !e)}
        className={cn(
          "w-full flex items-center gap-2.5 rounded-lg px-3 py-2 border transition-colors text-left",
          section.status !== "pass"
            ? tokens.pillRow
            : "border-gray-200 bg-white hover:bg-gray-50"
        )}
      >
        {section.status !== "pass" && (
          <AlertTriangle className={cn("w-3.5 h-3.5 flex-shrink-0", tokens.pillIcon)} />
        )}
        <span className={cn("text-xs tabular-nums", section.status !== "pass" ? tokens.pillText : "text-gray-500")}>
          {section.timestamp}
        </span>
        <span className="text-gray-300 text-xs">&bull;</span>
        <span className={cn("text-xs", section.status !== "pass" ? tokens.pillText : "text-gray-400")}>
          {section.duration}s
        </span>
        {section.status !== "pass" && section.signals && (
          <>
            <span className="text-gray-300 text-xs">&bull;</span>
            <span className={cn("text-xs font-medium truncate", tokens.pillText)}>
              {section.signals[0]}
            </span>
          </>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          <ChevronDown
            className={cn(
              "w-3.5 h-3.5 transition-transform duration-200",
              section.status !== "pass" ? tokens.pillIcon : "text-gray-400",
              expanded && "rotate-180"
            )}
          />
        </div>
      </button>

      {expanded && (
        <div className="mt-2 rounded-lg border border-gray-200 overflow-hidden">
          <div className="relative bg-gray-900" style={{ aspectRatio: "16/9" }}>
            <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900" />
            <div className="absolute top-2 left-2.5 z-10">
              <span className="text-xs text-white/80 bg-black/40 rounded px-1.5 py-0.5">
                {section.number}) {section.domain}
              </span>
            </div>
            <div className="absolute top-2 right-2.5 z-10 flex items-center gap-1.5">
              {section.maxScore > 0 && (
                <span className="text-xs font-semibold text-white bg-black/40 rounded px-1.5 py-0.5">
                  {section.score}/{section.maxScore}
                </span>
              )}
              <span className={cn("text-xs font-medium rounded px-1.5 py-0.5 border", tokens.badge)}>
                {statusLabel(section.status)}
              </span>
            </div>
            {isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <div className="w-2 h-2 rounded-full bg-white/30 animate-ping" />
              </div>
            )}
          </div>

          <div className="bg-gray-950 px-3 pt-3 pb-2.5 flex flex-col gap-2">
            <div className="relative">
              <div className="absolute top-0 w-full pointer-events-none -translate-y-1 z-10">
                {markerPositions.map((m, i) => (
                  <div
                    key={i}
                    className="absolute w-1.5 h-1.5 rounded-full -translate-x-1/2"
                    style={{
                      left: `${m.pct}%`,
                      backgroundColor: m.high
                        ? "var(--color-status-fail-edge)"
                        : "var(--color-status-partial-edge)",
                    }}
                  />
                ))}
              </div>
              <Slider
                min={0}
                max={section.duration}
                step={0.5}
                value={[currentTime]}
                onValueChange={seek}
                className="mt-1"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPlaying((p) => !p)}
                className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors flex-shrink-0"
              >
                {isPlaying ? (
                  <Pause className="w-3 h-3" />
                ) : (
                  <Play className="w-3 h-3 translate-x-px" />
                )}
              </button>
              <span className="text-xs text-white/50 tabular-nums">
                {formatTime(currentTime)} / {formatTime(section.duration)}
              </span>
              <div className="ml-auto flex items-center gap-1 text-xs text-white/30">
                <Clock className="w-3 h-3" />
                {section.duration}s
              </div>
            </div>

            {currentObs ? (
              <div className={cn(
                "text-xs rounded px-2 py-1.5 border-l-2 leading-snug",
                currentObs.high ? tokens.obsHigh : tokens.obsNormal
              )}>
                {currentObs.text}
              </div>
            ) : (
              <div className="text-xs text-white/25 italic">
                Play to see behavioral observations...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Assessment Section Card ──────────────────────────────────────────────────

interface SectionCardProps {
  section: AssessmentSection;
  autoExpandVideo?: boolean;
  videoResetKey?: number;
  initialEvalAnswer?: string;
  onEvalChange?: (override: Override) => void;
  onEvalReset?: (sectionId: string) => void;
  showSpotlight?: boolean;
}

function SectionCard({
  section,
  autoExpandVideo = false,
  videoResetKey = 0,
  initialEvalAnswer,
  onEvalChange,
  onEvalReset,
  showSpotlight = false,
}: SectionCardProps) {
  const [showInstruction, setShowInstruction] = useState(false);
  const [evalAnswer, setEvalAnswer] = useState(initialEvalAnswer ?? section.evalAnswer);

  const handleEvalChange = (opt: string) => {
    setEvalAnswer(opt);
    const edited = opt !== section.evalAnswer;
    if (edited) {
      onEvalChange?.({
        sectionId: section.id,
        answer: opt,
        domain: section.domain,
        number: section.number,
        original: section.evalAnswer,
        timestamp: new Date(),
      });
    } else {
      onEvalReset?.(section.id);
    }
  };

  const handleReset = () => {
    setEvalAnswer(section.evalAnswer);
    onEvalReset?.(section.id);
  };

  // Expose handlers for future inline eval buttons — suppress unused warnings
  void handleEvalChange;
  void handleReset;

  const displayStatus = evalAnswerToStatus(evalAnswer, section.evalOptions);
  const displayScore = evalAnswerToScore(displayStatus, section);
  const displayTokens = STATUS_TOKENS[displayStatus];

  return (
    <div className={cn(
      "bg-white rounded-2xl border border-slate-200 overflow-hidden transition-shadow",
      displayTokens.cardEdge,
      showSpotlight && "spotlight-border"
    )}>
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h2 className="text-sm font-bold text-slate-800">
            {section.number}) {section.domain}
          </h2>
          <span className={cn(
            "text-xs font-medium rounded px-2.5 py-1 border flex-shrink-0 transition-colors",
            displayTokens.badge
          )}>
            {statusLabel(displayStatus)}
            {section.maxScore > 0 && ` · ${displayScore}/${section.maxScore}`}
          </span>
        </div>

        {section.scoringInstruction && (
          <Collapsible open={showInstruction} onOpenChange={setShowInstruction}>
            <CollapsibleTrigger className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors mb-3">
              Show Scoring Instruction
              <ChevronDown className={cn("w-3 h-3 transition-transform", showInstruction && "rotate-180")} />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <p className="text-xs text-slate-600 bg-slate-50 rounded-lg p-2.5 mb-3 leading-relaxed border border-slate-100">
                {section.scoringInstruction}
              </p>
            </CollapsibleContent>
          </Collapsible>
        )}

        <div className="flex flex-col gap-2.5">
          <div>
            <span className="text-xs font-semibold text-slate-800">Question: </span>
            <span className="text-xs text-slate-600">{section.question}</span>
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-800">Response: </span>
            <span className="text-xs text-slate-600">{section.response}</span>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-100 px-4 py-3">
        <p className={cn(
          "text-xs font-semibold mb-2",
          section.hasVideo === false ? "text-slate-300" : "text-slate-800"
        )}>
          Video Recording:
        </p>

        {section.hasVideo === false ? (
          <div className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 border border-dashed border-brand-secondary/20 bg-brand-secondary/5">
            <span className="text-xs text-brand-secondary/40 italic">Session video not captured</span>
          </div>
        ) : (
          <VideoPill
            key={videoResetKey}
            section={section}
            defaultExpanded={autoExpandVideo}
          />
        )}

        {section.flagged && section.signals && section.signals.length > 1 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {section.signals.map((s) => (
              <span
                key={s}
                className={cn(
                  "text-xs rounded px-2.5 py-1 border",
                  displayTokens.signalTag
                )}
              >
                {s}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── View Filter ──────────────────────────────────────────────────────────────

interface ViewFilterProps {
  mode: ViewMode;
  onModeChange: (m: ViewMode) => void;
}

function ViewFilter({ mode, onModeChange }: ViewFilterProps) {
  return (
    <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
      <button
        onClick={() => onModeChange("highlights")}
        className={cn(
          "flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all border",
          mode === "highlights"
            ? "bg-white text-sky-600 shadow-sm border-sky-200"
            : "text-sky-600 hover:text-sky-700 border-transparent"
        )}
      >
        Highlight Clips
        <span className={cn(
          "rounded-full px-1.5 py-0 text-xs leading-4",
          mode === "highlights"
            ? "bg-sky-100 text-sky-700"
            : "bg-sky-100 text-sky-600",
          mode !== "highlights" && HIGHLIGHT_SECTIONS.length > 0 && "spotlight-badge"
        )}>
          {HIGHLIGHT_SECTIONS.length}
        </span>
      </button>
      <button
        onClick={() => onModeChange("all")}
        className={cn(
          "flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
          mode === "all"
            ? "bg-white text-slate-800 shadow-sm"
            : "text-slate-500 hover:text-slate-700"
        )}
      >
        See All Clips
        <span className={cn(
          "rounded-full px-1.5 py-0 text-xs leading-4",
          mode === "all"
            ? "bg-slate-100 text-slate-700"
            : "bg-slate-200 text-slate-500"
        )}>
          {SECTIONS.length}
        </span>
      </button>
    </div>
  );
}

// ─── Patient Header ───────────────────────────────────────────────────────────

function PatientHeader({
  totalScore = PATIENT.score,
  onOpenHistory,
}: {
  totalScore?: number;
  onOpenHistory?: () => void;
}) {
  const belowThreshold = totalScore <= PATIENT.threshold;
  const scorePct = (totalScore / PATIENT.maxScore) * 100;

  return (
    <div className="bg-white border-b border-brand-secondary/20 px-4 pt-4 pb-4">
      <div className="text-xs text-brand-secondary/50 mb-3 flex items-center gap-1">
        <ChevronLeft className="w-3 h-3" />
        <span>Patient Chart</span>
        <span className="mx-1 text-brand-secondary/30">/</span>
        <span className="text-brand-secondary font-medium">MoCA Video Review</span>
      </div>

      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-base font-bold text-slate-800 leading-tight">{PATIENT.name}</h1>
            <span className="text-xs font-semibold bg-sky-500 text-white rounded px-2 py-0.5 uppercase tracking-wide">
              Pending Review
            </span>
          </div>
          <p className="text-xs text-brand-secondary/50">
            DOB {PATIENT.dob} &middot; {PATIENT.age}y &middot; MRN {PATIENT.mrn}
          </p>
          <p className="text-sm text-brand-secondary/70">
            MoCA Standard &middot; {PATIENT.provider}
          </p>
        </div>

        <div className="flex items-start gap-2">
          <div className="text-right flex-shrink-0">
            <div className="flex items-baseline gap-0.5 justify-end">
              <span className={cn(
                "text-2xl font-black tabular-nums",
                belowThreshold ? "text-[var(--color-status-fail-edge)]" : "text-[var(--color-status-pass-edge)]"
              )}>
                {totalScore}
              </span>
              <span className="text-sm text-slate-400">/{PATIENT.maxScore}</span>
            </div>
          </div>
          {onOpenHistory && (
            <button
              onClick={onOpenHistory}
              className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors flex-shrink-0"
              aria-label="Assessment History"
            >
              <History className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="rounded-full overflow-hidden h-2 bg-slate-100">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300",
            belowThreshold ? "bg-[var(--color-status-fail-edge)]" : "bg-[var(--color-status-pass-edge)]"
          )}
          style={{ width: `${scorePct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Report Page ──────────────────────────────────────────────────────────────

interface ReportPageProps {
  evalOverrides: Record<string, Override>;
  totalScore: number;
  reportTime: Date;
  onBack: () => void;
}

function ReportPage({ evalOverrides, totalScore, reportTime, onBack }: ReportPageProps) {
  const overrideList = Object.values(evalOverrides);
  const hasOverrides = overrideList.length > 0;
  const belowThreshold = totalScore <= PATIENT.threshold;

  const formattedDate = reportTime.toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
  const formattedTime = reportTime.toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit", hour12: true,
  });

  return (
    <div className="max-w-[480px] mx-auto min-h-screen bg-gray-50 flex flex-col font-sans">
      <div className="bg-white border-b border-gray-200 px-4 pt-4 pb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors mb-3"
        >
          <ArrowLeft className="w-3 h-3" />
          Back to Review
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
            <FileText className="w-3.5 h-3.5 text-gray-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-900">Report</h1>
            <p className="text-xs text-gray-400">
              {PATIENT.name} &middot; {PATIENT.assessmentDate}
            </p>
          </div>
          <div className="ml-auto">
            <span className={cn(
              "text-xs font-medium rounded px-2.5 py-1 border",
              belowThreshold ? STATUS_TOKENS.fail.badge : STATUS_TOKENS.pass.badge
            )}>
              {totalScore}/{PATIENT.maxScore}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 px-3 pt-3 pb-8">
        {hasOverrides && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 pt-3 pb-2.5 border-b border-blue-100">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              <p className="text-xs font-bold text-blue-900">Override Audit Trail</p>
              <span className="ml-auto text-xs text-blue-400 tabular-nums">
                {overrideList.length} {overrideList.length === 1 ? "change" : "changes"}
              </span>
            </div>
            <div className="px-4 py-3 flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <span className="text-xs font-semibold text-blue-400 w-16 flex-shrink-0 pt-px">Clinician</span>
                <span className="text-xs text-blue-900 font-medium">{PATIENT.provider}</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xs font-semibold text-blue-400 w-16 flex-shrink-0 pt-px">Overrides</span>
                <div className="flex flex-col gap-1.5 flex-1">
                  {overrideList.map((o) => (
                    <div key={o.sectionId} className="flex flex-col gap-0.5">
                      <span className="text-xs font-semibold text-blue-800">
                        {o.number}) {o.domain}
                      </span>
                      <span className="text-xs text-blue-600">
                        <span className="line-through text-blue-300">{o.original}</span>
                        <span className="mx-1.5 text-blue-400">→</span>
                        <span className="font-medium">{o.answer}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xs font-semibold text-blue-400 w-16 flex-shrink-0 pt-px">Generated</span>
                <span className="text-xs text-blue-800">
                  {formattedDate} at {formattedTime}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="px-4 pt-4 pb-3 border-b border-gray-100">
            <p className="text-sm font-bold text-gray-900">MoCA Report — Unassisted.</p>
            <div className="flex items-center gap-2 mt-1.5">
              <p className="text-xs text-gray-600">
                Total Full MoCA Score:
                <span className={cn(
                  "ml-1.5 font-bold",
                  belowThreshold ? "text-[var(--color-status-fail-edge)]" : "text-[var(--color-status-pass-edge)]"
                )}>
                  {totalScore}/{PATIENT.maxScore}
                </span>
              </p>
              {belowThreshold && (
                <span className={cn("text-xs rounded px-2.5 py-1 border", STATUS_TOKENS.fail.badge)}>
                  Below {PATIENT.threshold}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Clinician: {PATIENT.provider} &middot; {PATIENT.assessmentDate}
            </p>
          </div>

          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-bold text-gray-400 tracking-wide uppercase mb-2.5">Introduction</p>
            <div className="flex flex-col gap-2.5">
              {INTRO_QUESTIONS.map((item, i) => (
                <div key={i}>
                  <p className="text-xs text-gray-600 leading-relaxed">{item.q}</p>
                  <p className="text-xs font-semibold text-gray-800 mt-0.5">{item.a}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="px-4 pt-3 pb-4">
            <p className="text-xs font-bold text-gray-400 tracking-wide uppercase mb-3">MoCA</p>
            <div className="flex flex-col gap-4">
              {SECTIONS.map((section) => {
                const answer = evalOverrides[section.id]?.answer ?? section.evalAnswer;
                const status = evalAnswerToStatus(answer, section.evalOptions);
                const score = evalAnswerToScore(status, section);
                const isOverridden = !!evalOverrides[section.id];

                return (
                  <div key={section.id}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <p className="text-xs font-bold text-gray-800">
                        {section.number}) {section.domain}
                      </p>
                      <span className="text-xs text-gray-400">(Score: {score}/{section.maxScore})</span>
                      {isOverridden && (
                        <span className="text-xs text-blue-500 font-medium">· overridden</span>
                      )}
                      <span className={cn(
                        "ml-auto text-xs font-medium rounded px-2.5 py-1 border",
                        STATUS_TOKENS[status].badge
                      )}>
                        {statusLabel(status)}
                      </span>
                    </div>
                    <div className="ml-3 flex flex-col gap-1 border-l-2 border-gray-100 pl-3">
                      <p className="text-xs text-gray-500">
                        <span className="font-semibold text-gray-600">Question: </span>
                        {section.question}
                      </p>
                      <p className="text-xs text-gray-500">
                        <span className="font-semibold text-gray-600">Response: </span>
                        {section.response}
                      </p>
                      <p className="text-xs text-gray-500">
                        <span className="font-semibold text-gray-600">Score: </span>
                        {section.maxScore === 0 ? "N/A" : `${score} / ${section.maxScore}`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex justify-center">
          <span className="text-xs text-gray-300 border border-gray-200 rounded-full px-3 py-1 bg-white">
            {hasOverrides ? "Contains clinician overrides" : "No overrides applied"} &middot; MoCA Video Review
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const hasPreviousAssessments = assessmentHistory.length > 1;
  const [appView, setAppView] = useState<AppView>(hasPreviousAssessments ? "history" : "review");
  const [archivedReviewId, setArchivedReviewId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("highlights");
  const [videoResetKey, setVideoResetKey] = useState(0);
  const [evalOverrides, setEvalOverrides] = useState<Record<string, Override>>({});
  const [reportTime, setReportTime] = useState<Date | null>(null);
  const [focusedDomain, setFocusedDomain] = useState<string | null>(null);

  const resolveDomainToSection = (historyDomain: string) => {
    return SECTIONS.find((s) =>
      s.domain.toLowerCase().includes(historyDomain.toLowerCase()) ||
      historyDomain.toLowerCase().includes(s.domain.toLowerCase())
    ) ?? null;
  };

  const handleModeChange = (m: ViewMode) => {
    setViewMode(m);
    setVideoResetKey((k) => k + 1);
    setFocusedDomain(null);
  };

  const handleEvalChange = (override: Override) => {
    setEvalOverrides((prev) => ({ ...prev, [override.sectionId]: override }));
  };

  const handleEvalReset = (sectionId: string) => {
    setEvalOverrides((prev) => {
      const next = { ...prev };
      delete next[sectionId];
      return next;
    });
  };

  const handleReviewCompleted = () => {
    setReportTime(new Date());
    setAppView("report");
  };

  const totalScore = SECTIONS.reduce((sum, section) => {
    const answer = evalOverrides[section.id]?.answer ?? section.evalAnswer;
    const status = evalAnswerToStatus(answer, section.evalOptions);
    return sum + evalAnswerToScore(status, section);
  }, 0);

  const handleNavigateToReview = (assessmentId: string | null, focusDomain?: string) => {
    if (assessmentId === null) {
      setArchivedReviewId(null);
      setAppView("review");
      if (focusDomain) {
        setViewMode("all");
        setVideoResetKey((k) => k + 1);
        setFocusedDomain(focusDomain);
      }
    } else {
      setArchivedReviewId(assessmentId);
      setAppView("archived-review");
    }
  };

  // Compute visible sections — focused section floats to top
  const baseSections = viewMode === "highlights" ? HIGHLIGHT_SECTIONS : SECTIONS;
  const focusedSection = focusedDomain ? resolveDomainToSection(focusedDomain) : null;
  const visibleSections = focusedSection
    ? [focusedSection, ...baseSections.filter((s) => s.id !== focusedSection.id)]
    : baseSections;

  if (appView === "report" && reportTime) {
    return (
      <ReportPage
        evalOverrides={evalOverrides}
        totalScore={totalScore}
        reportTime={reportTime}
        onBack={() => setAppView("review")}
      />
    );
  }

  if (appView === "history") {
    return (
      <AssessmentHistory
        patientName={PATIENT.name}
        onNavigateToReview={handleNavigateToReview}
        currentScore={totalScore}
      />
    );
  }

  if (appView === "archived-review" && archivedReviewId) {
    const archivedAssessment = assessmentHistory.find((a) => a.id === archivedReviewId);
    const archivedDate = archivedAssessment
      ? new Date(archivedAssessment.date + "T00:00:00").toLocaleDateString("en-US", {
          month: "long", day: "numeric", year: "numeric",
        })
      : "Unknown Date";

    return (
      <div className="max-w-[480px] mx-auto min-h-screen bg-gray-50 flex flex-col font-sans">
        <div className="px-3 pt-3 pb-2 border-b border-brand-secondary/20 bg-white">
          <nav className="flex items-center gap-1.5 text-xs text-brand-secondary/50 mb-2">
            <button
              onClick={() => setAppView("history")}
              className="hover:text-brand-secondary transition-colors"
            >
              Assessment History
            </button>
            <ChevronLeft className="w-3 h-3 rotate-180" />
            <span className="text-brand-secondary">{archivedDate}</span>
          </nav>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-sm font-bold text-brand-secondary leading-tight">
                Archived Review: {archivedDate}
              </h1>
              <p className="text-xs text-brand-secondary/50 mt-0.5">
                {PATIENT.name} &middot; Read-only
              </p>
            </div>
            <button
              onClick={() => {
                setArchivedReviewId(null);
                setAppView("review");
              }}
              className="flex items-center gap-1.5 text-xs font-medium text-brand-primary hover:text-brand-primary/80 transition-colors"
            >
              <Clock className="w-3.5 h-3.5" />
              Back to Pending Review
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2.5 px-3 pt-3 pb-8">
          <ViewFilter mode={viewMode} onModeChange={handleModeChange} />
          {visibleSections.map((section) => (
            <SectionCard
              key={section.id}
              section={section}
              autoExpandVideo={viewMode === "highlights" && section.flagged}
              videoResetKey={videoResetKey}
              initialEvalAnswer={section.evalAnswer}
              showSpotlight={viewMode === "all" && section.flagged}
            />
          ))}
          <div className="flex justify-center mt-4">
            <span className="text-xs text-brand-secondary/50 border border-brand-secondary/20 rounded-full px-3 py-1 bg-white">
              Archived Assessment &middot; {archivedDate}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[480px] mx-auto min-h-screen bg-gray-50 flex flex-col font-sans">
      <PatientHeader totalScore={totalScore} onOpenHistory={() => setAppView("history")} />

      <div className="flex flex-col gap-2.5 px-3 pt-3 pb-8">
        <ViewFilter mode={viewMode} onModeChange={handleModeChange} />

        {viewMode === "highlights" && HIGHLIGHT_SECTIONS.length === 0 && (
          <div className="mt-4 text-center text-sm text-brand-secondary/50">
            No highlights for this assessment.
          </div>
        )}

        {focusedSection && (
          <div className="flex items-center gap-2 bg-sky-50 border border-sky-200 rounded-xl px-3 py-2">
            <div className="w-1.5 h-1.5 rounded-full bg-sky-400 flex-shrink-0" />
            <p className="text-xs text-sky-700 flex-1">
              Jumped to <span className="font-semibold">{focusedSection.domain}</span> from history
            </p>
            <button
              onClick={() => setFocusedDomain(null)}
              className="text-sky-400 hover:text-sky-600 transition-colors flex-shrink-0"
              aria-label="Dismiss"
            >
              <ArrowLeft className="w-3.5 h-3.5 rotate-[135deg]" />
            </button>
          </div>
        )}

        {visibleSections.map((section) => (
          <SectionCard
            key={section.id}
            section={section}
            autoExpandVideo={viewMode === "highlights" && section.flagged}
            videoResetKey={videoResetKey}
            initialEvalAnswer={evalOverrides[section.id]?.answer}
            onEvalChange={handleEvalChange}
            onEvalReset={handleEvalReset}
            showSpotlight={(viewMode === "all" && section.flagged) || section.id === focusedSection?.id}
          />
        ))}

        <div className="mt-2 flex flex-col gap-2">
          <button
            onClick={handleReviewCompleted}
            className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-semibold text-sm rounded-2xl py-3.5 transition-colors shadow-sm"
          >
            <Check className="w-4 h-4" />
            Review Completed
          </button>
          <div className="flex justify-center">
            <span className="text-xs text-gray-300 border border-gray-200 rounded-full px-3 py-1 bg-white">
              MLP &middot; Mindspan MoCA Video Review
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
