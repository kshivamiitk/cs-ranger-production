import { ApplicationError, requireValue } from '@/src/application/errors';
import { resolveCourseAccess } from '@/src/domain/courseAccess';
import { calculatePurchaseSettlement } from '@/src/domain/paymentSettlement';
import type { CourseRepository, FinanceRepository, PaymentGatewayPort } from '@/src/domain/ports';
import type { Viewer } from '@/src/domain/models';

export class PremiumPaymentApplicationService {
  constructor(
    private readonly courseRepository: CourseRepository,
    private readonly financeRepository: FinanceRepository,
    private readonly paymentGateway: PaymentGatewayPort
  ) {}

  async createOrder(
    viewer: Viewer,
    courseId: string,
    input?: {
      durationMultiplier?: 1 | 3;
      pricingPlanId?: string | null;
    }
  ) {
    const course = requireValue(await this.courseRepository.getCourseById(courseId), 'Course not found.');

    if (course.status !== 'published') {
      throw new ApplicationError('Only published courses can accept premium payments.');
    }

    const activeEntitlement = await this.financeRepository.getActiveEntitlement({
      learnerUserId: viewer.user.id,
      courseId,
    });
    const access = resolveCourseAccess(viewer, course, activeEntitlement);

    if (access.isOwner) {
      throw new ApplicationError('You cannot purchase premium access for your own course.');
    }

    if (access.courseIsFree) {
      throw new ApplicationError('This course does not currently require a premium plan.');
    }

    const selectedPlan = input?.pricingPlanId
      ? await this.financeRepository.getCoursePricingPlanById(input.pricingPlanId)
      : null;

    if (selectedPlan && selectedPlan.courseId !== course.id) {
      throw new ApplicationError('Selected pricing plan does not belong to this course.', 400);
    }

    const durationMultiplier = input?.durationMultiplier === 3 ? 3 : 1;
    const purchasedAccessDays = selectedPlan
      ? selectedPlan.accessDays
      : (course.premiumAccessDays ?? 0) * durationMultiplier;
    if (purchasedAccessDays <= 0) {
      throw new ApplicationError('Course premium duration is not configured.');
    }

    const grossAmount = selectedPlan ? selectedPlan.priceAmount : course.priceAmount * durationMultiplier;
    const settings = await this.financeRepository.getPlatformSettings();
    const settlement = calculatePurchaseSettlement(grossAmount, settings);
    const purchaseId = crypto.randomUUID();
    const provider = this.paymentGateway.getProvider();
    const purchase = await this.financeRepository.createPendingPremiumPurchase({
      purchaseId,
      learnerUserId: viewer.user.id,
      creatorUserId: course.creatorUserId,
      courseId: course.id,
      purchasedAccessDays,
      pricingPlanId: selectedPlan?.id ?? null,
      provider,
      grossAmount: settlement.grossAmount,
      platformFeeAmount: settlement.platformFeeAmount,
      creatorNetAmount: settlement.creatorNetAmount,
      currency: settlement.currency,
    });
    const gatewayOrder = await this.paymentGateway.createPremiumOrder({
      purchaseId: purchase.id,
      pricingPlanId: selectedPlan?.id ?? null,
      courseId: course.id,
      title: course.title,
      amount: settlement.grossAmount,
      currency: settlement.currency,
      learner: viewer,
    });
    await this.financeRepository.attachPurchaseProviderOrderId({
      purchaseId: purchase.id,
      provider: gatewayOrder.provider,
      providerOrderId: gatewayOrder.providerOrderId,
    });

    return {
      order: {
        ...gatewayOrder,
        purchaseId: purchase.id,
        pricingPlanId: purchase.pricingPlanId ?? null,
      },
      settlement,
      access,
    };
  }

  async verifyPayment(
    viewer: Viewer,
    input: {
      courseId: string;
      purchaseId: string;
      providerOrderId: string;
      providerPaymentId: string;
      providerSignature: string | null;
    }
  ) {
    const purchase = requireValue(
      await this.financeRepository.getCoursePurchaseById(input.purchaseId),
      'Purchase was not found.',
      404
    );

    if (purchase.courseId !== input.courseId || purchase.learnerUserId !== viewer.user.id) {
      throw new ApplicationError('Payment verification does not match the active learner.', 403);
    }

    if (purchase.providerOrderId !== input.providerOrderId) {
      throw new ApplicationError('Payment verification order id does not match the pending purchase.', 400);
    }

    await this.paymentGateway.verifyPremiumPayment({
      provider: purchase.paymentProvider ?? 'sandbox',
      providerOrderId: input.providerOrderId,
      providerPaymentId: input.providerPaymentId,
      providerSignature: input.providerSignature,
      amount: purchase.grossAmount,
      currency: purchase.currency,
    });

    return this.financeRepository.finalizePremiumPurchase({
      purchaseId: purchase.id,
      providerPaymentId: input.providerPaymentId,
      providerSignature: input.providerSignature,
      paymentStatus: 'paid',
    });
  }

  async resumePendingOrder(viewer: Viewer, purchaseId: string) {
    const purchase = requireValue(
      await this.financeRepository.getCoursePurchaseById(purchaseId),
      'Pending payment was not found.',
      404
    );

    if (purchase.learnerUserId !== viewer.user.id) {
      throw new ApplicationError('Pending payment does not belong to the active learner.', 403);
    }

    if (purchase.paymentStatus !== 'pending') {
      throw new ApplicationError('Only pending payments can be resumed.');
    }

    const course = requireValue(await this.courseRepository.getCourseById(purchase.courseId), 'Course not found.', 404);

    if (course.status !== 'published') {
      throw new ApplicationError('Only published courses can accept premium payments.');
    }

    const activeProvider = this.paymentGateway.getProvider();
    if (purchase.paymentProvider && purchase.paymentProvider !== activeProvider) {
      throw new ApplicationError('Pending payment uses a different checkout provider. Start a new payment from the course page.');
    }

    const activeEntitlement = await this.financeRepository.getActiveEntitlement({
      learnerUserId: viewer.user.id,
      courseId: course.id,
    });
    const access = resolveCourseAccess(viewer, course, activeEntitlement);

    const gatewayOrder = await this.paymentGateway.createPremiumOrder({
      purchaseId: purchase.id,
      pricingPlanId: purchase.pricingPlanId ?? null,
      courseId: course.id,
      title: course.title,
      amount: purchase.grossAmount,
      currency: purchase.currency,
      learner: viewer,
    });

    await this.financeRepository.attachPurchaseProviderOrderId({
      purchaseId: purchase.id,
      provider: gatewayOrder.provider,
      providerOrderId: gatewayOrder.providerOrderId,
    });

    return {
      order: {
        ...gatewayOrder,
        purchaseId: purchase.id,
        pricingPlanId: purchase.pricingPlanId ?? null,
      },
      settlement: {
        grossAmount: purchase.grossAmount,
        platformFeeAmount: purchase.platformFeeAmount,
        creatorNetAmount: purchase.creatorNetAmount,
        currency: purchase.currency,
      },
      access,
    };
  }

  async handleWebhook(input: {
    provider: 'razorpay';
    rawBody: string;
    signature: string | null;
  }) {
    const event = await this.paymentGateway.parsePremiumWebhook(input);
    if (!event || event.paymentStatus !== 'paid') {
      return {
        ignored: true,
        reason: 'Event did not represent a captured premium payment.',
      } as const;
    }

    const purchase = await this.financeRepository.getCoursePurchaseByProviderOrderId(event.providerOrderId);
    if (!purchase) {
      return {
        ignored: true,
        reason: 'No premium purchase matched the provider order id.',
      } as const;
    }

    const finalization = await this.financeRepository.finalizePremiumPurchase({
      purchaseId: purchase.id,
      providerPaymentId: event.providerPaymentId ?? event.providerOrderId,
      providerSignature: event.providerSignature,
      paymentStatus: 'paid',
    });

    return {
      ignored: false,
      finalization,
      eventType: event.eventType,
    } as const;
  }
}

