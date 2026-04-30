import {
  type AppServiceSupabaseClient,
  type AppSupabaseClient,
  createServerSupabaseClient,
  createServiceRoleSupabaseClient,
} from '@/src/infrastructure/supabase/serverClient';
import { SupabaseAuthGateway } from '@/src/infrastructure/supabase/SupabaseAuthGateway';
import { SupabaseCourseRepository } from '@/src/infrastructure/supabase/SupabaseCourseRepository';
import { SupabaseFinanceRepository } from '@/src/infrastructure/supabase/SupabaseFinanceRepository';
import { SupabaseUserProfileRepository } from '@/src/infrastructure/supabase/SupabaseUserProfileRepository';
import { SupabaseCreatorFollowRepository } from '@/src/infrastructure/supabase/SupabaseCreatorFollowRepository';
import { SupabaseAdminRepository } from '@/src/infrastructure/supabase/SupabaseAdminRepository';
import { SupabaseSearchRepository } from '@/src/infrastructure/supabase/SupabaseSearchRepository';
import { SupabaseCertificateRepository } from '@/src/infrastructure/supabase/SupabaseCertificateRepository';
import { SupabaseNodeDiscussionRepository } from '@/src/infrastructure/supabase/SupabaseNodeDiscussionRepository';
import { SupabaseCourseReviewRepository } from '@/src/infrastructure/supabase/SupabaseCourseReviewRepository';
import { SupabaseLearnerProgressRepository } from '@/src/infrastructure/supabase/SupabaseLearnerProgressRepository';
import { SupabaseWishlistRepository } from '@/src/infrastructure/supabase/SupabaseWishlistRepository';
import { SupabaseCourseCollaborationRepository } from '@/src/infrastructure/supabase/SupabaseCourseCollaborationRepository';
import { SupabaseNodeBookmarkRepository } from '@/src/infrastructure/supabase/SupabaseNodeBookmarkRepository';
import { createPaymentGateway } from '@/src/infrastructure/payments/PaymentGateway';
import { createPayoutGateway } from '@/src/infrastructure/payments/PayoutGateway';
import { LatexPreviewCompiler } from '@/src/infrastructure/latex/LatexPreviewCompiler';
import { AuthApplicationService } from '@/src/application/AuthApplicationService';
import { AdminFinanceApplicationService } from '@/src/application/AdminFinanceApplicationService';
import { CatalogCourseSummaryQueryService } from '@/src/application/CatalogCourseSummaryQueryService';
import { CatalogApplicationService } from '@/src/application/CatalogApplicationService';
import { CourseBuilderApplicationService } from '@/src/application/CourseBuilderApplicationService';
import { CreatorFinanceApplicationService } from '@/src/application/CreatorFinanceApplicationService';
import { QuizApplicationService } from '@/src/application/QuizApplicationService';
import { RichContentPreviewApplicationService } from '@/src/application/RichContentPreviewApplicationService';
import { UserProfileService } from '@/src/application/UserProfileService';
import { CreatorFollowService } from '@/src/application/CreatorFollowService';
import { CreatorPublicProfileService } from '@/src/application/CreatorPublicProfileService';
import { SearchService } from '@/src/application/SearchService';
import { AdminMessageService } from '@/src/application/AdminMessageService';
import { AdminModerationService } from '@/src/application/AdminModerationService';
import { AdminQueryService } from '@/src/application/AdminQueryService';
import { PremiumPaymentApplicationService } from '@/src/application/PremiumPaymentApplicationService';
import { CertificateApplicationService } from '@/src/application/CertificateApplicationService';
import { LearnerFinanceApplicationService } from '@/src/application/LearnerFinanceApplicationService';
import { NodeDiscussionApplicationService } from '@/src/application/NodeDiscussionApplicationService';
import { NodeDiscussionQueryService } from '@/src/application/NodeDiscussionQueryService';
import { CourseReviewApplicationService } from '@/src/application/CourseReviewApplicationService';
import { CourseReviewQueryService } from '@/src/application/CourseReviewQueryService';
import { CreatorLearnerDoubtQueryService } from '@/src/application/CreatorLearnerDoubtQueryService';
import { LearnerProgressApplicationService } from '@/src/application/LearnerProgressApplicationService';
import { LearnerProgressQueryService } from '@/src/application/LearnerProgressQueryService';
import { WishlistApplicationService } from '@/src/application/WishlistApplicationService';
import { WishlistQueryService } from '@/src/application/WishlistQueryService';
import { NodeBookmarkApplicationService } from '@/src/application/NodeBookmarkApplicationService';
import { NodeBookmarkQueryService } from '@/src/application/NodeBookmarkQueryService';
import { LearnerDashboardApplicationService } from '@/src/application/LearnerDashboardApplicationService';
import { CourseCollaborationService } from '@/src/application/CourseCollaborationService';

export async function createServerContainer(options?: { writeCookies?: boolean }) {
  const supabase = (await createServerSupabaseClient(options)) as unknown as AppSupabaseClient;
  const serviceSupabase = createServiceRoleSupabaseClient() as unknown as AppServiceSupabaseClient;
  const authGateway = new SupabaseAuthGateway(supabase);
  const userProfileRepository = new SupabaseUserProfileRepository(supabase);
  const courseRepository = new SupabaseCourseRepository(supabase, serviceSupabase);
  const financeRepository = new SupabaseFinanceRepository(supabase, serviceSupabase);
  const creatorFollowRepository = new SupabaseCreatorFollowRepository(supabase);
  const adminRepository = new SupabaseAdminRepository(supabase, serviceSupabase);
  const searchRepository = new SupabaseSearchRepository(serviceSupabase);
  const certificateRepository = new SupabaseCertificateRepository(supabase, serviceSupabase);
  const nodeDiscussionRepository = new SupabaseNodeDiscussionRepository(supabase, serviceSupabase);
  const courseReviewRepository = new SupabaseCourseReviewRepository(supabase, serviceSupabase);
  const learnerProgressRepository = new SupabaseLearnerProgressRepository(supabase, serviceSupabase);
  const wishlistRepository = new SupabaseWishlistRepository(supabase, serviceSupabase);
  const nodeBookmarkRepository = new SupabaseNodeBookmarkRepository(supabase, serviceSupabase);
  const courseCollaborationRepository = new SupabaseCourseCollaborationRepository(supabase, serviceSupabase);
  const paymentGateway = createPaymentGateway();
  const payoutGateway = createPayoutGateway();
  const latexPreviewGateway = new LatexPreviewCompiler();
  const learnerProgressQueryService = new LearnerProgressQueryService(learnerProgressRepository);
  const wishlistQueryService = new WishlistQueryService(wishlistRepository);
  const nodeBookmarkQueryService = new NodeBookmarkQueryService(
    nodeBookmarkRepository,
    courseRepository,
    financeRepository
  );
  const catalogCourseSummaryQueryService = new CatalogCourseSummaryQueryService(
    financeRepository,
    learnerProgressQueryService,
    wishlistQueryService
  );
  const nodeDiscussionService = new NodeDiscussionApplicationService(
    nodeDiscussionRepository,
    financeRepository
  );
  const learnerFinanceService = new LearnerFinanceApplicationService(financeRepository);
  const catalogService = new CatalogApplicationService(
    courseRepository,
    financeRepository,
    catalogCourseSummaryQueryService,
    learnerProgressQueryService
  );
  const nodeDiscussionQueryService = new NodeDiscussionQueryService(nodeDiscussionService);

  return {
    authService: new AuthApplicationService(authGateway, userProfileRepository),
    catalogService,
    courseBuilderService: new CourseBuilderApplicationService(courseRepository, courseCollaborationRepository),
    creatorFinanceService: new CreatorFinanceApplicationService(financeRepository, payoutGateway),
    learnerFinanceService,
    premiumPaymentService: new PremiumPaymentApplicationService(
      courseRepository,
      financeRepository,
      paymentGateway
    ),
    adminFinanceService: new AdminFinanceApplicationService(financeRepository, payoutGateway),
    quizService: new QuizApplicationService(courseRepository, financeRepository),
    richContentPreviewService: new RichContentPreviewApplicationService(latexPreviewGateway),
    userProfileService: new UserProfileService(userProfileRepository),
    creatorFollowService: new CreatorFollowService(creatorFollowRepository, userProfileRepository),
    creatorPublicProfileService: new CreatorPublicProfileService(
      userProfileRepository,
      creatorFollowRepository,
      courseRepository,
      catalogCourseSummaryQueryService
    ),
    searchService: new SearchService(
      searchRepository,
      courseRepository,
      catalogCourseSummaryQueryService
    ),
    adminMessageService: new AdminMessageService(adminRepository),
    adminModerationService: new AdminModerationService(adminRepository, userProfileRepository),
    adminQueryService: new AdminQueryService(adminRepository),
    nodeDiscussionService,
    nodeDiscussionQueryService,
    courseReviewService: new CourseReviewApplicationService(
      courseRepository,
      courseReviewRepository,
      financeRepository
    ),
    courseReviewQueryService: new CourseReviewQueryService(
      courseRepository,
      courseReviewRepository,
      financeRepository
    ),
    creatorLearnerDoubtQueryService: new CreatorLearnerDoubtQueryService(
      nodeDiscussionRepository,
      nodeDiscussionQueryService
    ),
    learnerProgressService: new LearnerProgressApplicationService(
      courseRepository,
      financeRepository,
      learnerProgressRepository
    ),
    learnerProgressQueryService,
    wishlistService: new WishlistApplicationService(courseRepository, wishlistRepository),
    wishlistQueryService,
    nodeBookmarkService: new NodeBookmarkApplicationService(
      courseRepository,
      nodeBookmarkRepository
    ),
    nodeBookmarkQueryService,
    courseCollaborationService: new CourseCollaborationService(
      courseCollaborationRepository,
      userProfileRepository
    ),
    learnerDashboardService: new LearnerDashboardApplicationService(
      catalogService,
      learnerFinanceService,
      nodeBookmarkQueryService,
      wishlistQueryService,
      courseRepository,
      creatorFollowRepository,
      learnerProgressRepository
    ),
    certificateService: new CertificateApplicationService(
      certificateRepository,
      courseRepository,
      financeRepository
    ),
  };
}
