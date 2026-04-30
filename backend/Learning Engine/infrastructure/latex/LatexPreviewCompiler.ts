import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import {
  LATEX_PREVIEW_CACHE_MAX_ENTRIES,
  LATEX_PREVIEW_CACHE_TTL_MS,
  LATEX_PREVIEW_TIMEOUT_MS,
} from '@/src/domain/contentLimits';
import { normalizeLatexSource } from '@/src/domain/latexSource';
import type {
  LatexPreviewAsset,
  LatexPreviewError,
  LatexPreviewErrorKind,
  LatexPreviewReady,
  LatexPreviewResult,
} from '@/src/domain/models';
import type { LatexPreviewGateway } from '@/src/domain/ports';
const MAX_DIAGNOSTIC_CHARACTERS = 16_000;
const MAX_CAPTURED_OUTPUT_CHARACTERS = 24_000;
const MAX_EXPOSED_DIAGNOSTIC_LINES = 12;
const COMPILER_NAMES = ['latexmk', 'pdflatex'] as const;
const LATEX_PREVIEW_PIPELINE_VERSION = 'latex-preview-pipeline-v4-direct-pdf';

type CompilerName = (typeof COMPILER_NAMES)[number];

type LatexPreviewCacheEntry =
  | {
      kind: 'ready';
      asset: LatexPreviewAsset;
      result: LatexPreviewReady;
      createdAt: number;
      lastAccessedAt: number;
    }
  | {
      kind: 'error';
      result: LatexPreviewError;
      createdAt: number;
      lastAccessedAt: number;
    };

type LatexPreviewGlobalState = {
  cache?: Map<string, LatexPreviewCacheEntry>;
  pending?: Map<string, Promise<LatexPreviewResult>>;
  compilerPromise?: Promise<CompilerName | null>;
};

function getGlobalState() {
  return globalThis as typeof globalThis & { __csRangerLatexPreview?: LatexPreviewGlobalState };
}

function getCache() {
  const globalState = getGlobalState();
  globalState.__csRangerLatexPreview ??= {};
  globalState.__csRangerLatexPreview.cache ??= new Map<string, LatexPreviewCacheEntry>();
  return globalState.__csRangerLatexPreview.cache;
}

function getPendingCompilations() {
  const globalState = getGlobalState();
  globalState.__csRangerLatexPreview ??= {};
  globalState.__csRangerLatexPreview.pending ??= new Map<string, Promise<LatexPreviewResult>>();
  return globalState.__csRangerLatexPreview.pending;
}

async function resolveCompilerName() {
  const globalState = getGlobalState();
  globalState.__csRangerLatexPreview ??= {};

  if (!globalState.__csRangerLatexPreview.compilerPromise) {
    globalState.__csRangerLatexPreview.compilerPromise = (async () => {
      for (const compilerName of COMPILER_NAMES) {
        if (await commandExists(compilerName, ['-version'])) {
          return compilerName;
        }
      }

      return null;
    })();
  }

  return globalState.__csRangerLatexPreview.compilerPromise;
}

async function commandExists(command: string, args: string[]) {
  return new Promise<boolean>((resolve) => {
    const process = spawn(command, args, { stdio: 'ignore' });
    process.once('error', () => resolve(false));
    process.once('exit', (code) => resolve(code === 0));
  });
}

function hashSource(source: string) {
  return createHash('sha256')
    .update(LATEX_PREVIEW_PIPELINE_VERSION)
    .update('\n')
    .update(source)
    .digest('hex');
}

function createReadyResult(previewKey: string, mode: LatexPreviewReady['mode'], cached: boolean): LatexPreviewReady {
  return {
    status: 'ready',
    previewKey,
    mode,
    sourceHash: previewKey,
    cached,
  };
}

function createErrorResult(
  previewKey: string,
  input: {
    kind: LatexPreviewErrorKind;
    mode: LatexPreviewError['mode'];
    error: string;
    diagnostics: string[];
    lineNumber?: number | null;
    focus?: string | null;
    hint?: string | null;
  },
  cached: boolean
): LatexPreviewError {
  return {
    status: 'error',
    kind: input.kind,
    mode: input.mode,
    error: input.error,
    diagnostics: input.diagnostics,
    lineNumber: input.lineNumber ?? null,
    focus: input.focus ?? null,
    hint: input.hint ?? null,
    sourceHash: previewKey,
    cached,
  };
}

class LatexPreviewRenderError extends Error {
  readonly diagnostics: string[];
  readonly hint: string | null;

  constructor(message: string, input?: { diagnostics?: string[]; hint?: string | null }) {
    super(message);
    this.name = 'LatexPreviewRenderError';
    this.diagnostics = input?.diagnostics ?? [];
    this.hint = input?.hint ?? null;
  }
}

function sanitizeDiagnosticLine(line: string) {
  return line
    .replace(/\u001b\[[0-9;]*m/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isDiagnosticNoiseLine(line: string) {
  return (
    line.length === 0 ||
    /^This is pdfTeX/i.test(line) ||
    /^restricted \\write18/i.test(line) ||
    /^entering extended mode/i.test(line) ||
    /^Rc files read:/i.test(line) ||
    /^Latexmk:/i.test(line) ||
    /^Package .* (Info|Warning):/i.test(line) ||
    /^Output written on /i.test(line) ||
    /^Transcript written on /i.test(line) ||
    /^No file .*\.aux/i.test(line) ||
    /^\*geometry\*/i.test(line) ||
    /^\[Loading /i.test(line) ||
    /^\([^)]+\.sty\)?$/i.test(line) ||
    /^\([^)]+\.def\)?$/i.test(line)
  );
}

function findFirstIndex(lines: string[], matcher: (line: string) => boolean) {
  const index = lines.findIndex(matcher);
  return index >= 0 ? index : null;
}

function extractLineNumber(lines: string[]) {
  for (const line of lines) {
    const previewTexMatch = line.match(/preview\.tex:(\d+):/i);
    if (previewTexMatch) {
      return Number(previewTexMatch[1]);
    }

    const latexLogMatch = line.match(/\bl\.(\d+)\b/);
    if (latexLogMatch) {
      return Number(latexLogMatch[1]);
    }
  }

  return null;
}

function extractFocusLine(lines: string[]) {
  for (const line of lines) {
    const trimmed = sanitizeDiagnosticLine(line);
    if (!trimmed) {
      continue;
    }

    if (trimmed.startsWith('l.') && trimmed.length > 4) {
      return trimmed.replace(/^l\.\d+\s*/, '').trim() || trimmed;
    }

    if (trimmed.startsWith('<recently read>')) {
      return trimmed;
    }
  }

  return null;
}

function extractPackageName(line: string) {
  const match = line.match(/(?:! )?LaTeX Error: File [`']([^`']+)[`'] not found\./i);
  return match?.[1] ?? null;
}

function summarizeSignificantLine(line: string) {
  return sanitizeDiagnosticLine(line)
    .replace(/^!+\s*/, '')
    .replace(/^\.?\/?preview\.tex:\d+:\s*/i, '')
    .replace(/^latexmk:\s*/i, '');
}

function selectDiagnosticSnippet(lines: string[], focusIndex: number | null) {
  if (lines.length === 0) {
    return ['The LaTeX compiler exited without returning diagnostics.'];
  }

  if (focusIndex === null) {
    return lines.slice(-MAX_EXPOSED_DIAGNOSTIC_LINES);
  }

  const start = Math.max(0, focusIndex - 3);
  const end = Math.min(lines.length, focusIndex + 7);
  return lines.slice(start, end);
}

function classifyLatexFailure(
  rawLines: string[],
  fallbackError: string,
  mode: LatexPreviewError['mode']
) {
  const lines = rawLines.map(sanitizeDiagnosticLine).filter(Boolean);
  const usefulLines = lines.filter((line) => !isDiagnosticNoiseLine(line));
  const candidateLines = usefulLines.length > 0 ? usefulLines : lines;
  const lineNumber = extractLineNumber(candidateLines);
  const focus = extractFocusLine(candidateLines);

  if (fallbackError.startsWith('LaTeX preview timed out')) {
    return {
      kind: 'timeout' as const,
      mode,
      error: fallbackError,
      diagnostics: selectDiagnosticSnippet(candidateLines, null),
      lineNumber,
      focus,
      hint: 'The server-side TeX runtime did not finish within the preview timeout. Reduce document complexity or increase the timeout on the host.',
    };
  }

  const packageMissingIndex = findFirstIndex(candidateLines, (line) => extractPackageName(line) !== null);
  if (packageMissingIndex !== null) {
    const packageName = extractPackageName(candidateLines[packageMissingIndex]) ?? 'the required TeX package';
    return {
      kind: 'package_missing' as const,
      mode,
      error: `The server TeX runtime is missing \`${packageName}\`, so this document cannot be previewed here.`,
      diagnostics: selectDiagnosticSnippet(candidateLines, packageMissingIndex),
      lineNumber,
      focus,
      hint: `Install the TeX package that provides \`${packageName}\` on the preview host.`,
    };
  }

  const significantIndex =
    findFirstIndex(candidateLines, (line) => /^! /.test(line)) ??
    findFirstIndex(candidateLines, (line) => /\b(?:LaTeX|Package)\s+Error:/.test(line)) ??
    findFirstIndex(candidateLines, (line) => /\bUndefined control sequence\b/.test(line)) ??
    findFirstIndex(candidateLines, (line) => /\bRunaway argument\b/.test(line)) ??
    findFirstIndex(candidateLines, (line) => /\bExtra alignment tab\b/.test(line)) ??
    findFirstIndex(candidateLines, (line) => /\bMissing \$ inserted\b/.test(line)) ??
    findFirstIndex(candidateLines, (line) => /preview\.tex:\d+:/i.test(line));

  const significantLine = significantIndex !== null ? summarizeSignificantLine(candidateLines[significantIndex]) : null;

  let hint: string | null = null;
  if (significantLine) {
    if (/Undefined control sequence/i.test(significantLine)) {
      hint = 'A command or environment used in the document is not available in the current TeX runtime or depends on a missing package.';
    } else if (/Missing \\begin\{document\}/i.test(significantLine)) {
      hint = 'This source is being treated as a full document, but the document body never starts. Add `\\begin{document}` or author the section as a fragment instead.';
    } else if (/can be used only in preamble/i.test(significantLine)) {
      hint = 'A preamble-only command is being used after the document body started. If this is meant to be a full standalone document, keep the preamble and body together in the same field.';
    } else if (/Runaway argument/i.test(significantLine)) {
      hint = 'A command argument or environment was not closed before the compiler reached the next section of the document.';
    } else if (/Extra alignment tab/i.test(significantLine)) {
      hint = 'A tabular or aligned environment likely has more `&` separators than the declared column layout allows.';
    } else if (/Missing \$ inserted/i.test(significantLine)) {
      hint = 'The compiler expected math mode at this point. Check unmatched `$`, `\\(`, or `\\[` delimiters near the reported line.';
    }
  }

  return {
    kind: 'compile_error' as const,
    mode,
    error: significantLine ?? 'LaTeX preview failed to compile on the server runtime.',
    diagnostics: selectDiagnosticSnippet(candidateLines, significantIndex),
    lineNumber,
    focus,
    hint,
  };
}

function touchCacheEntry(previewKey: string) {
  const entry = getCache().get(previewKey);
  if (!entry) {
    return;
  }

  entry.lastAccessedAt = Date.now();
}

function pruneCache() {
  const cache = getCache();
  const now = Date.now();

  for (const [previewKey, entry] of cache.entries()) {
    if (now - entry.lastAccessedAt > LATEX_PREVIEW_CACHE_TTL_MS) {
      cache.delete(previewKey);
    }
  }

  if (cache.size <= LATEX_PREVIEW_CACHE_MAX_ENTRIES) {
    return;
  }

  const sortedEntries = [...cache.entries()].sort((left, right) => left[1].lastAccessedAt - right[1].lastAccessedAt);
  for (const [previewKey] of sortedEntries.slice(0, cache.size - LATEX_PREVIEW_CACHE_MAX_ENTRIES)) {
    cache.delete(previewKey);
  }
}

async function readDiagnostics(tempDirectory: string, compilerOutput: string) {
  const logPath = path.join(tempDirectory, 'preview.log');
  let rawDiagnostics = compilerOutput.trim();

  try {
    await access(logPath);
    const logContents = await readFile(logPath, 'utf8');
    rawDiagnostics = logContents.trim() || rawDiagnostics;
  } catch {
    // Ignore missing log file. Compiler output is the fallback diagnostics source.
  }

  if (!rawDiagnostics) {
    return ['The LaTeX compiler exited without returning diagnostics.'];
  }

  const truncated = rawDiagnostics.slice(-MAX_DIAGNOSTIC_CHARACTERS);
  const lines = truncated
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);

  return lines.slice(-120);
}

async function fileExists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function compilerArguments(compilerName: CompilerName, tempDirectory: string) {
  if (compilerName === 'latexmk') {
    return [
      '-pdf',
      '-interaction=nonstopmode',
      '-halt-on-error',
      '-file-line-error',
      '-no-shell-escape',
      `-outdir=${tempDirectory}`,
      'preview.tex',
    ];
  }

  return [
    '-interaction=nonstopmode',
    '-halt-on-error',
    '-file-line-error',
    '-no-shell-escape',
    '-output-directory',
    tempDirectory,
    'preview.tex',
  ];
}

async function runCompiler(command: CompilerName, args: string[], tempDirectory: string) {
  return runCommand(command, args, tempDirectory);
}

async function runCommand(command: string, args: string[], tempDirectory: string) {
  return new Promise<string>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: tempDirectory,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let compilerOutput = '';
    const timeout = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`LaTeX preview timed out after ${Math.floor(LATEX_PREVIEW_TIMEOUT_MS / 1000)} seconds.`));
    }, LATEX_PREVIEW_TIMEOUT_MS);

    const appendOutput = (chunk: Buffer | string) => {
      compilerOutput += chunk.toString();
      if (compilerOutput.length > MAX_CAPTURED_OUTPUT_CHARACTERS) {
        compilerOutput = compilerOutput.slice(-MAX_CAPTURED_OUTPUT_CHARACTERS);
      }
    };

    child.stdout?.on('data', appendOutput);
    child.stderr?.on('data', appendOutput);

    child.once('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    child.once('exit', (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve(compilerOutput);
        return;
      }

      reject(new Error(compilerOutput));
    });
  });
}

async function ensureCompiledPdfExists(tempDirectory: string) {
  const pdfPath = path.join(tempDirectory, 'preview.pdf');
  const exists = await fileExists(pdfPath);
  if (!exists) {
    throw new LatexPreviewRenderError(
      'PDF compiled successfully, but the expected preview PDF file was not found on the server host.',
      {
        diagnostics: ['Expected compiled output file: preview.pdf', `Working directory: ${tempDirectory}`],
        hint: 'The TeX compiler exited successfully but did not leave a preview.pdf artifact. Check the TeX runtime and output directory handling on the host.',
      }
    );
  }

  return pdfPath;
}

async function readCompiledPdfBytes(tempDirectory: string) {
  const pdfPath = await ensureCompiledPdfExists(tempDirectory);
  console.info('[latex-preview] preview asset read started from compiled PDF');

  try {
    const pdfBytes = await readFile(pdfPath);
    console.info(`[latex-preview] preview asset read succeeded with ${pdfBytes.byteLength} byte(s)`);
    return pdfBytes;
  } catch (error) {
    console.error('[latex-preview] preview asset read failed after successful compile');
    throw new LatexPreviewRenderError(
      'PDF compiled successfully, but the preview PDF could not be read from the server host.',
      {
        diagnostics: [error instanceof Error ? error.message : 'The compiled PDF could not be read.'],
        hint: 'Check filesystem permissions and temporary directory cleanup timing on the preview host.',
      }
    );
  }
}

export class LatexPreviewCompiler implements LatexPreviewGateway {
  async compilePreview(input: { source: string }): Promise<LatexPreviewResult> {
    const normalized = normalizeLatexSource(input.source);
    const sourceHash = hashSource(normalized.source);
    pruneCache();

    const cachedEntry = getCache().get(sourceHash);
    if (cachedEntry) {
      console.info(`[latex-preview] cache hit ${sourceHash.slice(0, 12)} (${cachedEntry.kind})`);
      touchCacheEntry(sourceHash);
      return cachedEntry.kind === 'ready'
        ? { ...cachedEntry.result, cached: true }
        : { ...cachedEntry.result, cached: true };
    }

    console.info(`[latex-preview] cache miss ${sourceHash.slice(0, 12)} using ${LATEX_PREVIEW_PIPELINE_VERSION}`);

    const pendingCompilations = getPendingCompilations();
    const existingPromise = pendingCompilations.get(sourceHash);
    if (existingPromise) {
      console.info(`[latex-preview] joined pending compilation ${sourceHash.slice(0, 12)}`);
      return existingPromise;
    }

    const compilationPromise = this.compileIntoCache(sourceHash, normalized)
      .finally(() => {
        pendingCompilations.delete(sourceHash);
      });

    pendingCompilations.set(sourceHash, compilationPromise);
    return compilationPromise;
  }

  async getPreviewAsset(previewKey: string): Promise<LatexPreviewAsset | null> {
    pruneCache();
    const entry = getCache().get(previewKey);
    if (!entry || entry.kind !== 'ready') {
      console.info(`[latex-preview] asset miss ${previewKey.slice(0, 12)}`);
      return null;
    }

    console.info(`[latex-preview] asset hit ${previewKey.slice(0, 12)}`);
    touchCacheEntry(previewKey);
    return entry.asset;
  }

  private async compileIntoCache(
    previewKey: string,
    normalized: ReturnType<typeof normalizeLatexSource>
  ): Promise<LatexPreviewResult> {
    const compilerName = await resolveCompilerName();
    if (!compilerName) {
      const result = createErrorResult(
        previewKey,
        {
          kind: 'compiler_missing',
          mode: normalized.mode,
          error: 'LaTeX preview requires a local TeX compiler. Install `latexmk` or `pdflatex` on the server host.',
          diagnostics: [],
          hint: 'Install a TeX distribution such as MacTeX or TeX Live on the server host running the preview route.',
        },
        false
      );
      getCache().set(previewKey, {
        kind: 'error',
        result,
        createdAt: Date.now(),
        lastAccessedAt: Date.now(),
      });
      return result;
    }

    const tempDirectory = await mkdtemp(path.join(os.tmpdir(), 'cs-ranger-latex-'));
    const startedAt = Date.now();
    try {
      await writeFile(path.join(tempDirectory, 'preview.tex'), normalized.source, 'utf8');
      console.info(`[latex-preview] compile started ${previewKey.slice(0, 12)} via ${compilerName} as ${normalized.mode}`);

      try {
        await runCompiler(compilerName, compilerArguments(compilerName, tempDirectory), tempDirectory);
      } catch (error) {
        const diagnostics = await readDiagnostics(tempDirectory, error instanceof Error ? error.message : '');
        const summary = classifyLatexFailure(
          diagnostics,
          error instanceof Error ? error.message : 'LaTeX preview failed.',
          normalized.mode
        );
        const result = createErrorResult(previewKey, summary, false);
        getCache().set(previewKey, {
          kind: 'error',
          result,
          createdAt: Date.now(),
          lastAccessedAt: Date.now(),
        });
        console.error(
          `[latex-preview] compile failed ${previewKey.slice(0, 12)} via ${compilerName} as ${normalized.mode} in ${Date.now() - startedAt}ms: ${result.error}`
        );
        return result;
      }

      console.info(`[latex-preview] compile succeeded ${previewKey.slice(0, 12)} via ${compilerName} as ${normalized.mode}`);

      let previewPdfBytes: Uint8Array;
      try {
        previewPdfBytes = await readCompiledPdfBytes(tempDirectory);
      } catch (error) {
        const renderError = error instanceof LatexPreviewRenderError
          ? error
          : new LatexPreviewRenderError(
              'PDF compiled successfully, but the inline PDF preview asset could not be prepared.',
              {
                diagnostics: [error instanceof Error ? error.message : 'Unknown PDF preview preparation failure.'],
                hint: 'Check the compiled PDF artifact and preview asset preparation path on the server host.',
              }
            );
        const result = createErrorResult(
          previewKey,
          {
            kind: 'render_failed',
            mode: normalized.mode,
            error: renderError.message,
            diagnostics: renderError.diagnostics,
            hint: renderError.hint,
          },
          false
        );
        getCache().set(previewKey, {
          kind: 'error',
          result,
          createdAt: Date.now(),
          lastAccessedAt: Date.now(),
        });
        console.error(
          `[latex-preview] preview render failed ${previewKey.slice(0, 12)} after successful compile in ${Date.now() - startedAt}ms: ${result.error}`
        );
        return result;
      }

      const asset: LatexPreviewAsset = {
        previewKey,
        bytes: previewPdfBytes,
        etag: `W/"${previewKey}"`,
        contentType: 'application/pdf',
      };
      const result = createReadyResult(previewKey, normalized.mode, false);
      getCache().set(previewKey, {
        kind: 'ready',
        asset,
        result,
        createdAt: Date.now(),
        lastAccessedAt: Date.now(),
      });
      console.info(
        `[latex-preview] compiled ${previewKey.slice(0, 12)} via ${compilerName} as ${normalized.mode} in ${Date.now() - startedAt}ms`
      );
      return result;
    } catch (error) {
      const result = createErrorResult(
        previewKey,
        {
          kind: 'render_failed',
          mode: normalized.mode,
          error: error instanceof Error ? error.message : 'LaTeX preview failed after compilation.',
          diagnostics: [error instanceof Error ? error.message : 'Unknown LaTeX preview failure.'],
          hint: 'Check the preview pipeline on the server host. This failure happened outside the TeX compile stage.',
        },
        false
      );
      getCache().set(previewKey, {
        kind: 'error',
        result,
        createdAt: Date.now(),
        lastAccessedAt: Date.now(),
      });
      console.error(
        `[latex-preview] failed ${previewKey.slice(0, 12)} via ${compilerName} as ${normalized.mode} in ${Date.now() - startedAt}ms: ${result.error}`
      );
      return result;
    } finally {
      await rm(tempDirectory, { recursive: true, force: true });
    }
  }
}


