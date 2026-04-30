import type {
  ContentNodePayload,
  CourseNode,
  CourseNodePreview,
  HtmlNodePayload,
  GithubNodePayload,
  NodeType,
  QuestionNodePayload,
  QuizNodePayload,
  PdfNodePayload,
  VideoNodePayload,
} from '@/src/domain/models';
import { normalizeNodePayload } from '@/src/domain/nodePayloads';

function compactText(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function truncate(value: string, maxLength = 180) {
  const compact = compactText(value);
  if (compact.length <= maxLength) {
    return compact;
  }

  return `${compact.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function extractSnippet(type: NodeType, payload: unknown) {
  switch (type) {
    case 'content': {
      const normalized = normalizeNodePayload(type, payload) as ContentNodePayload;
      return truncate(
        `${normalized.introduction.content} ${normalized.explanation.content} ${normalized.solvedExamples.content}`
      );
    }
    case 'html': {
      const normalized = normalizeNodePayload(type, payload) as HtmlNodePayload;
      return truncate(normalized.html.replace(/<[^>]+>/g, ' '));
    }
    case 'question': {
      const normalized = normalizeNodePayload(type, payload) as QuestionNodePayload;
      return truncate(normalized.items.map((item) => `${item.prompt} ${item.solution}`).join(' '));
    }
    case 'quiz': {
      const normalized = normalizeNodePayload(type, payload) as QuizNodePayload;
      return truncate(
        normalized.items.map((item) => `${item.prompt} ${Object.values(item.options).join(' ')}`).join(' ')
      );
    }
    case 'video': {
      const normalized = normalizeNodePayload(type, payload) as VideoNodePayload;
      return truncate(normalized.note);
    }
    case 'pdf': {
      const normalized = normalizeNodePayload(type, payload) as PdfNodePayload;
      return truncate(`${normalized.title ?? ''} ${normalized.note}`);
    }
    case 'github': {
      const normalized = normalizeNodePayload(type, payload) as GithubNodePayload;
      return truncate(`${normalized.repositoryUrl} ${normalized.previewUrl} ${normalized.note}`);
    }
    default:
      return '';
  }
}

export function getSearchableNodeSnippet(
  input: Pick<CourseNode, 'type' | 'payload'> | { type: NodeType; payload: unknown }
) {
  return extractSnippet(input.type, input.payload);
}

export function deriveSafeNodeExcerpt(
  input:
    | Pick<CourseNode, 'type' | 'payload' | 'excerpt'>
    | Pick<CourseNodePreview, 'type' | 'excerpt'>
    | { type: NodeType; payload?: unknown; excerpt?: string | null }
) {
  if (input.excerpt && input.excerpt.trim().length > 0) {
    return truncate(input.excerpt, 220);
  }

  if ('payload' in input && typeof input.payload !== 'undefined') {
    return extractSnippet(input.type, input.payload);
  }

  return '';
}


