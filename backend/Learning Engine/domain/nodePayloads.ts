import type {
  ContentNodePayload,
  CourseNode,
  HtmlNodePayload,
  GithubNodePayload,
  NodePayload,
  NodeType,
  QuestionNodePayload,
  QuizNodePayload,
  PdfNodePayload,
  RichContentSection,
  RichTextFormat,
  VideoNodePayload,
} from '@/src/domain/models';

const defaultSectionFormat: RichTextFormat = 'markdown';

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown, fallback: string) {
  return typeof value === 'string' ? value : fallback;
}

function asFormat(value: unknown, fallback: RichTextFormat = defaultSectionFormat): RichTextFormat {
  return value === 'latex' ? 'latex' : fallback;
}

function normalizeRichContentSection(
  value: unknown,
  fallbackContent: string,
  fallbackFormat: RichTextFormat = defaultSectionFormat
): RichContentSection {
  const section = asObject(value);
  if (section) {
    return {
      format: asFormat(section.format, fallbackFormat),
      content: asString(section.content, fallbackContent),
    };
  }

  return {
    format: fallbackFormat,
    content: asString(value, fallbackContent),
  };
}

function normalizeContentNodePayload(payload: unknown): ContentNodePayload {
  const record = asObject(payload) ?? {};
  const legacyFormat = asFormat(record.format);

  return {
    introduction: normalizeRichContentSection(record.introduction, 'Add the basic introduction here.', legacyFormat),
    explanation: normalizeRichContentSection(record.explanation, 'Add the detailed explanation here.', legacyFormat),
    solvedExamples: normalizeRichContentSection(record.solvedExamples, 'Add solved examples here.', legacyFormat),
  };
}

function normalizeQuestionNodePayload(payload: unknown): QuestionNodePayload {
  const record = asObject(payload) ?? {};
  const items = Array.isArray(record.items) ? record.items : [];

  return {
    format: asFormat(record.format),
    items:
      items.length > 0
        ? items.map((item, index) => {
            const entry = asObject(item) ?? {};
            return {
              id: asString(entry.id, `question-${index + 1}`),
              prompt: asString(entry.prompt, 'Write the question here.'),
              solution: asString(entry.solution, 'Write the solution here.'),
            };
          })
        : [
            {
              id: crypto.randomUUID(),
              prompt: 'Write the question here.',
              solution: 'Write the solution here.',
            },
          ],
  };
}

function normalizeQuizNodePayload(payload: unknown): QuizNodePayload {
  const record = asObject(payload) ?? {};
  const items = Array.isArray(record.items) ? record.items : [];

  return {
    format: asFormat(record.format),
    timerSeconds:
      typeof record.timerSeconds === 'number' && Number.isFinite(record.timerSeconds)
        ? Math.max(10, Math.floor(record.timerSeconds))
        : 300,
    items:
      items.length > 0
        ? items.map((item, index) => {
            const entry = asObject(item) ?? {};
            const options = asObject(entry.options) ?? {};
            return {
              id: asString(entry.id, `quiz-${index + 1}`),
              prompt: asString(entry.prompt, 'Write the quiz question here.'),
              options: {
                A: asString(options.A, 'Option A'),
                B: asString(options.B, 'Option B'),
                C: asString(options.C, 'Option C'),
                D: asString(options.D, 'Option D'),
              },
              correctOption:
                entry.correctOption === 'B' || entry.correctOption === 'C' || entry.correctOption === 'D'
                  ? entry.correctOption
                  : 'A',
            } as QuizNodePayload['items'][number];
          })
        : [
            {
              id: crypto.randomUUID(),
              prompt: 'Write the quiz question here.',
              options: {
                A: 'Option A',
                B: 'Option B',
                C: 'Option C',
                D: 'Option D',
              },
              correctOption: 'A',
            },
          ],
  };
}

function normalizeVideoNodePayload(payload: unknown): VideoNodePayload {
  const record = asObject(payload) ?? {};

  return {
    format: asFormat(record.format),
    videoUrl: asString(record.videoUrl, 'https://www.youtube.com/embed/dQw4w9WgXcQ'),
    note: asString(record.note, 'Add supporting notes below the video.'),
  };
}

function normalizePdfNodePayload(payload: unknown): PdfNodePayload {
  const record = asObject(payload) ?? {};

  return {
    pdfUrl: asString(record.pdfUrl, '/sample-assets/sample-python-notes.pdf'),
    title: asString(record.title, 'PDF lesson notes'),
    note: asString(record.note, 'Upload or link a PDF that learners can read directly inside the node.'),
  };
}

function normalizeGithubNodePayload(payload: unknown): GithubNodePayload {
  const record = asObject(payload) ?? {};

  return {
    repositoryUrl: asString(record.repositoryUrl, 'https://github.com/your-name/your-course-website'),
    previewUrl: asString(record.previewUrl, 'https://your-name.github.io/your-course-website/'),
    branch: asString(record.branch, 'main'),
    note: asString(record.note, 'Paste a GitHub Pages, Vercel, Netlify, or Cloudflare Pages URL to render the full course website in the learner box.'),
  };
}

function normalizeHtmlNodePayload(payload: unknown): HtmlNodePayload {
  const record = asObject(payload) ?? {};

  return {
    html: asString(
      record.html,
      '<section class="demo-card">\n  <p class="eyebrow">CS Ranger HTML node</p>\n  <h1>Interactive lesson page</h1>\n  <p id="message">This HTML, CSS, and JavaScript are rendered together.</p>\n  <button id="next-button" type="button">Go to next node</button>\n</section>'
    ),
    css: asString(
      record.css,
      '.demo-card { min-height: 320px; display: grid; place-content: center; gap: 16px; padding: 32px; border-radius: 28px; background: radial-gradient(circle at top left, #38bdf8, transparent 34%), #111827; color: white; text-align: center; font-family: Inter, system-ui, sans-serif; }\n.demo-card button { border: 0; border-radius: 999px; padding: 12px 18px; font-weight: 800; cursor: pointer; }\n.eyebrow { text-transform: uppercase; letter-spacing: .14em; opacity: .76; }'
    ),
    javascript: asString(
      record.javascript,
      "document.querySelector('#next-button')?.addEventListener('click', () => {\n  document.querySelector('#message').textContent = 'JavaScript is working. Opening the next node...';\n  window.CSRanger?.goToNextNode();\n});"
    ),
  };
}

export function normalizeNodePayload(type: NodeType, payload: unknown): NodePayload {
  switch (type) {
    case 'content':
      return normalizeContentNodePayload(payload);
    case 'html':
      return normalizeHtmlNodePayload(payload);
    case 'question':
      return normalizeQuestionNodePayload(payload);
    case 'quiz':
      return normalizeQuizNodePayload(payload);
    case 'video':
      return normalizeVideoNodePayload(payload);
    case 'pdf':
      return normalizePdfNodePayload(payload);
    case 'github':
      return normalizeGithubNodePayload(payload);
  }
}

export function createDefaultNodePayload(type: CourseNode['type']): CourseNode['payload'] {
  return normalizeNodePayload(type, {});
}


