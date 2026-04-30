import { ApplicationError, requireValue } from '@/src/application/errors';
import { resolveCourseAccess } from '@/src/domain/courseAccess';
import type { CertificateRepository, CourseRepository, FinanceRepository } from '@/src/domain/ports';
import type {
  CertificateEligibility,
  CourseCertificateRequirement,
  CreatorCourseCertificateSummary,
  IssuedCertificate,
  IssuedCertificateAdminRow,
  QuizAttemptRecord,
  Viewer,
} from '@/src/domain/models';

function bestAttemptByNode(attempts: QuizAttemptRecord[]) {
  const bestByNode = new Map<string, QuizAttemptRecord>();

  for (const attempt of attempts) {
    const existing = bestByNode.get(attempt.nodeId);
    const scoreRatio = attempt.maxScore > 0 ? attempt.score / attempt.maxScore : 0;
    const existingRatio = existing && existing.maxScore > 0 ? existing.score / existing.maxScore : -1;

    if (!existing || scoreRatio > existingRatio) {
      bestByNode.set(attempt.nodeId, attempt);
    }
  }

  return bestByNode;
}

export class CertificateApplicationService {
  constructor(
    private readonly certificateRepository: CertificateRepository,
    private readonly courseRepository: CourseRepository,
    private readonly financeRepository: FinanceRepository
  ) {}

  async getCreatorOverview(viewer: Viewer): Promise<CreatorCourseCertificateSummary[]> {
    if (viewer.profile.primaryRole !== 'creator') {
      throw new ApplicationError('Creator access is required.', 403);
    }

    return this.certificateRepository.listCourseCertificateSummariesForCreator(viewer.user.id);
  }

  async getAdminIssuedCertificates(viewer: Viewer): Promise<IssuedCertificateAdminRow[]> {
    if (!viewer.profile.isAdmin) {
      throw new ApplicationError('Admin access is required.', 403);
    }

    return this.certificateRepository.listIssuedCertificatesForAdmin();
  }

  async getEligibility(viewer: Viewer, courseId: string): Promise<CertificateEligibility> {
    const course = requireValue(await this.courseRepository.getCourseDetailById(courseId), 'Course not found.', 404);
    const activeEntitlement = await this.financeRepository.getActiveEntitlement({
      learnerUserId: viewer.user.id,
      courseId,
    });
    const access = resolveCourseAccess(viewer, course, activeEntitlement);
    const template = await this.certificateRepository.getActiveTemplate(courseId);
    const issuedCertificate = await this.certificateRepository.getIssuedCertificate({
      learnerUserId: viewer.user.id,
      courseId,
    });

    if (!template) {
      return {
        eligible: false,
        reason: 'No active certificate template is configured for this course.',
        template: null,
        requirements: [],
        issuedCertificate,
      };
    }

    const requirements = await this.certificateRepository.listTemplateRequirements(template.id);

    if (issuedCertificate) {
      return {
        eligible: true,
        reason: null,
        template,
        requirements,
        issuedCertificate,
      };
    }

    if (!access.viewerCanAccessPremium) {
      return {
        eligible: false,
        reason: 'Certificate issuance requires active access to the course content.',
        template,
        requirements,
        issuedCertificate: null,
      };
    }

    const attempts = await this.certificateRepository.listLearnerQuizAttempts({
      learnerUserId: viewer.user.id,
      courseId,
    });
    const quizNodeIds = await this.certificateRepository.listCourseQuizNodeIds(courseId);
    const failureReason = this.resolveRequirementFailure(requirements, attempts, quizNodeIds);

    return {
      eligible: !failureReason,
      reason: failureReason,
      template,
      requirements,
      issuedCertificate: null,
    };
  }

  async issueForCourse(viewer: Viewer, courseId: string): Promise<IssuedCertificate> {
    const eligibility = await this.getEligibility(viewer, courseId);

    if (eligibility.issuedCertificate) {
      return eligibility.issuedCertificate;
    }

    if (!eligibility.eligible || !eligibility.template) {
      throw new ApplicationError(eligibility.reason ?? 'Certificate requirements are not satisfied.', 400);
    }

    const course = requireValue(await this.courseRepository.getCourseById(courseId), 'Course not found.', 404);

    return this.certificateRepository.issueCertificate({
      learnerUserId: viewer.user.id,
      courseId,
      templateId: eligibility.template.id,
      renderPayload: {
        learnerName: viewer.profile.fullName ?? viewer.user.email,
        courseTitle: course.title,
        templateTitle: eligibility.template.title,
        issuedAt: new Date().toISOString(),
      },
    });
  }

  private resolveRequirementFailure(
    requirements: CourseCertificateRequirement[],
    attempts: QuizAttemptRecord[],
    quizNodeIds: string[]
  ) {
    if (requirements.length === 0) {
      return null;
    }

    const bestByNode = bestAttemptByNode(attempts);

    for (const requirement of requirements) {
      switch (requirement.requirementType) {
        case 'all_quiz_nodes_attempted': {
          const allAttempted = quizNodeIds.every((nodeId) => bestByNode.has(nodeId));
          if (!allAttempted) {
            return 'All certificate quiz nodes must be attempted before a certificate can be issued.';
          }
          break;
        }
        case 'quiz_node_min_score': {
          const nodeId = typeof requirement.requirementValue.nodeId === 'string' ? requirement.requirementValue.nodeId : null;
          const minimumPercent = Number(requirement.requirementValue.minimumPercent ?? 0);
          if (!nodeId) {
            return 'Certificate requirement configuration is incomplete.';
          }

          const attempt = bestByNode.get(nodeId);
          const percent = attempt && attempt.maxScore > 0 ? (attempt.score / attempt.maxScore) * 100 : 0;
          if (!attempt || percent < minimumPercent) {
            return `A minimum score of ${minimumPercent}% is required on the linked certificate quiz.`;
          }
          break;
        }
        case 'course_quiz_average_min_score': {
          const minimumPercent = Number(requirement.requirementValue.minimumPercent ?? 0);
          if (quizNodeIds.length === 0) {
            break;
          }

          const percentages = quizNodeIds
            .map((nodeId) => bestByNode.get(nodeId))
            .filter((attempt): attempt is QuizAttemptRecord => Boolean(attempt))
            .map((attempt) => (attempt.maxScore > 0 ? (attempt.score / attempt.maxScore) * 100 : 0));

          if (percentages.length !== quizNodeIds.length) {
            return 'Complete every certificate quiz before requesting a certificate.';
          }

          const average = percentages.reduce((sum, value) => sum + value, 0) / percentages.length;
          if (average < minimumPercent) {
            return `An average quiz score of ${minimumPercent}% is required before the certificate can be issued.`;
          }
          break;
        }
        default:
          return 'Certificate requirement type is not supported by the active service.';
      }
    }

    return null;
  }
}


