import { ApplicationError, requireValue } from '@/src/application/errors';
import { canAccessNodeContent } from '@/src/domain/courseAccess';
import type { CourseRepository, FinanceRepository } from '@/src/domain/ports';
import type { QuizNodePayload, QuizOptionKey, Viewer } from '@/src/domain/models';

export class QuizApplicationService {
  constructor(
    private readonly courseRepository: CourseRepository,
    private readonly financeRepository: FinanceRepository
  ) {}

  async submitAttempt(
    viewer: Viewer,
    input: {
      courseId: string;
      nodeId: string;
      answers: Record<string, QuizOptionKey>;
    }
  ) {
    const course = requireValue(await this.courseRepository.getCourseTreeById(input.courseId), 'Course not found.');
    const activeEntitlement = await this.financeRepository.getActiveEntitlement({
      learnerUserId: viewer.user.id,
      courseId: input.courseId,
    });

    const nodeSummary = course.modules.flatMap((module) => module.nodes).find((entry) => entry.id === input.nodeId);

    if (!nodeSummary) {
      throw new ApplicationError('Quiz node was not found.', 404);
    }

    if (!canAccessNodeContent(viewer, course, nodeSummary, activeEntitlement)) {
      throw new ApplicationError('Premium access is required before attempting this quiz.', 403);
    }

    const node = requireValue(await this.courseRepository.getReadableNodeById(input.nodeId), 'Quiz node was not found.', 404);

    if (node.type !== 'quiz') {
      throw new ApplicationError('Quiz node was not found.', 404);
    }

    const payload = node.payload as QuizNodePayload;
    const maxScore = payload.items.length;
    const score = payload.items.reduce((total, item) => {
      return total + (input.answers[item.id] === item.correctOption ? 1 : 0);
    }, 0);

    return this.courseRepository.saveQuizAttempt({
      courseId: course.id,
      nodeId: node.id,
      learnerUserId: viewer.user.id,
      score,
      maxScore,
      answers: input.answers,
    });
  }
}


