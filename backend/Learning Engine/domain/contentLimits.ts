export const AUTHORING_LIMITS = {
  contentIntroduction: 200_000,
  contentExplanation: 300_000,
  contentSolvedExamples: 300_000,
  questionPrompt: 200_000,
  questionSolution: 200_000,
  quizPrompt: 100_000,
  quizOption: 50_000,
  videoNote: 200_000,
  html: 200_000,
  css: 200_000,
  javascript: 200_000,
  pdfUrl: 6_000_000,
  pdfNote: 200_000,
  githubUrl: 2_000,
  githubNote: 200_000,
} as const;

export const LATEX_PREVIEW_SOURCE_MAX = 600_000;
export const LATEX_PREVIEW_TIMEOUT_MS = 15_000;
export const LATEX_PREVIEW_CACHE_TTL_MS = 10 * 60 * 1000;
export const LATEX_PREVIEW_CACHE_MAX_ENTRIES = 20;


