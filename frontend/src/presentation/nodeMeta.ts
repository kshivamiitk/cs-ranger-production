import type {
  ContentNodePayload,
  CourseNode,
  CourseNodePreview,
  GithubNodePayload,
  ModuleWithNodes,
  NodeType,
  QuestionNodePayload,
  QuizNodePayload,
  PdfNodePayload,
  VideoNodePayload,
} from '@/src/domain/models';

export function getNodeTypeLabel(type: NodeType) {
  switch (type) {
    case 'content':
      return 'Content';
    case 'question':
      return 'Question';
    case 'quiz':
      return 'Quiz';
    case 'video':
      return 'Video';
    case 'html':
      return 'HTML';
    case 'pdf':
      return 'PDF';
    case 'github':
      return 'GitHub Site';
  }
}

type NodeLearnerAccessInput = Pick<CourseNodePreview, 'isPremium'> & {
  isLocked?: boolean;
};

export function describeNodeLearnerAccess(node: NodeLearnerAccessInput) {
  if (!node.isPremium) {
    return {
      label: 'Free',
      tone: 'studio-badge-success',
      descriptor: 'free',
    } as const;
  }

  if (node.isLocked === false) {
    return {
      label: 'Unlocked',
      tone: 'studio-badge-success',
      descriptor: 'unlocked',
    } as const;
  }

  return {
    label: 'Premium',
    tone: 'studio-badge-primary',
    descriptor: 'premium',
  } as const;
}

type AnyNodeSummaryInput =
  | CourseNode
  | CourseNodePreview
  | Pick<CourseNodePreview, 'type' | 'excerpt'>;

export function getNodeSummary(node: AnyNodeSummaryInput) {
  if ('excerpt' in node && node.excerpt) {
    return node.excerpt;
  }

  if (!('payload' in node)) {
    switch (node.type) {
      case 'content':
        return 'Structured lesson sections';
      case 'html':
        return 'Interactive HTML, CSS, and JavaScript preview';
      case 'question':
        return 'Worked questions and solutions';
      case 'quiz':
        return 'Timed quiz assessment';
      case 'video':
        return 'Video lesson with notes';
      case 'pdf':
        return 'Readable PDF lesson';
      case 'github':
        return 'Embedded GitHub-powered course website';
    }
  }

  switch (node.type) {
    case 'content': {
      const payload = (node as CourseNode).payload as ContentNodePayload;
      const formats = [
        payload.introduction.format,
        payload.explanation.format,
        payload.solvedExamples.format,
      ];
      const uniqueFormats = [...new Set(formats)];
      return `${uniqueFormats.join(' / ')} • 3 lesson sections`;
    }
    case 'html':
      return 'HTML, CSS, and JavaScript preview';
    case 'pdf': {
      const payload = (node as CourseNode).payload as PdfNodePayload;
      return payload.title ? `PDF • ${payload.title}` : 'PDF lesson reader';
    }
    case 'github': {
      const payload = (node as CourseNode).payload as GithubNodePayload;
      return payload.previewUrl ? 'GitHub website preview embedded in the reader' : 'GitHub repository website';
    }
    case 'question': {
      const payload = (node as CourseNode).payload as QuestionNodePayload;
      return `${payload.items.length} question${payload.items.length === 1 ? '' : 's'} • ${payload.format}`;
    }
    case 'quiz': {
      const payload = (node as CourseNode).payload as QuizNodePayload;
      return `${payload.items.length} item${payload.items.length === 1 ? '' : 's'} • ${payload.timerSeconds}s timer`;
    }
    case 'video': {
      const payload = (node as CourseNode).payload as VideoNodePayload;
      return `${payload.format} • video with notes`;
    }
  }
}

export function getNodeLearnerSubtitle(node: Pick<CourseNodePreview, 'type' | 'isPremium'> & { isLocked?: boolean }) {
  const access = describeNodeLearnerAccess(node);

  switch (node.type) {
    case 'content':
      return node.isPremium
        ? `${access.label} lesson notes with focused reading access.`
        : 'Structured lesson notes ready for focused reading.';
    case 'question':
      return node.isPremium
        ? `${access.label} worked problems with question and solution flow.`
        : 'Worked problems with question and solution flow.';
    case 'quiz':
      return node.isPremium
        ? `${access.label} timed assessment with learner scoring support.`
        : 'Timed assessment with learner scoring support.';
    case 'video':
      return node.isPremium
        ? `${access.label} video lesson with supporting notes.`
        : 'Embedded video lesson with supporting notes.';
    case 'html':
      return node.isPremium
        ? `${access.label} interactive HTML, CSS, and JavaScript output.`
        : 'Interactive HTML, CSS, and JavaScript output.';
    case 'pdf':
      return node.isPremium
        ? `${access.label} PDF lesson with embedded reading support.`
        : 'PDF lesson with embedded reading support.';
    case 'github':
      return node.isPremium
        ? `${access.label} GitHub-powered website embedded inside the lesson box.`
        : 'GitHub-powered website embedded inside the lesson box.';
  }
}

export function getModuleNodeTypeCounts(module: Pick<ModuleWithNodes, 'nodes'>) {
  const counts = new Map<NodeType, number>();
  for (const node of module.nodes) {
    counts.set(node.type, (counts.get(node.type) ?? 0) + 1);
  }

  return (['content', 'question', 'quiz', 'video', 'html', 'pdf', 'github'] as NodeType[])
    .filter((type) => counts.has(type))
    .map((type) => ({
      type,
      label: getNodeTypeLabel(type),
      count: counts.get(type) ?? 0,
    }));
}


