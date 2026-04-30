import type { LatexSourceMode } from '@/src/domain/models';

const PREVIEW_DOCUMENT_HEADER = String.raw`\documentclass[12pt]{article}
\usepackage[utf8]{inputenc}
\usepackage[T1]{fontenc}
\usepackage{lmodern}
\usepackage{amsmath,amssymb,amsfonts,mathtools}
\usepackage{xcolor}
\usepackage{array,booktabs,longtable,tabularx,multirow}
\usepackage{graphicx}
\usepackage[most]{tcolorbox}
\usepackage{hyperref}
\usepackage[margin=1in]{geometry}
\setlength{\parskip}{0.8em}
\setlength{\parindent}{0pt}
\begin{document}
`;

const PREVIEW_DOCUMENT_FOOTER = String.raw`
\end{document}
`;

export function detectLatexSourceMode(source: string): LatexSourceMode {
  const trimmed = source.replace(/^\uFEFF/, '').trim();

  if (!trimmed) {
    return 'fragment';
  }

  if (
    /\\documentclass\b/.test(trimmed) ||
    /\\begin\s*\{document\}/.test(trimmed) ||
    /\\end\s*\{document\}/.test(trimmed)
  ) {
    return 'document';
  }

  return 'fragment';
}

export function normalizeLatexSource(source: string) {
  const trimmed = source.replace(/^\uFEFF/, '').trim();
  const mode = detectLatexSourceMode(trimmed);

  if (mode === 'document') {
    return {
      mode,
      source: trimmed,
    };
  }

  return {
    mode,
    source: `${PREVIEW_DOCUMENT_HEADER}${trimmed}${PREVIEW_DOCUMENT_FOOTER}`,
  };
}


