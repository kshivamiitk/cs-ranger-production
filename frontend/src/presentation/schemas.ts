import { z } from 'zod';
import { AUTHORING_LIMITS, LATEX_PREVIEW_SOURCE_MAX } from '@/src/domain/contentLimits';

const richTextFormatSchema = z.enum(['markdown', 'latex']);
const HTTPS_URL_MESSAGE = 'Enter an HTTPS URL.';
const imageDataUrlPattern = /^data:image\/(?:png|jpe?g|webp|gif);base64,[a-z0-9+/=\s]+$/i;

function requiredBoundedString(label: string, max: number) {
  return z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .max(max, `${label} exceeds the maximum supported size of ${max.toLocaleString()} characters.`);
}

function richContentSectionSchema(label: string, max: number) {
  return z.object({
    format: richTextFormatSchema,
    content: requiredBoundedString(label, max),
  });
}

function isHttpsUrl(value: string) {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

function isAllowedInternalHref(value: string) {
  return value.startsWith('/') && !value.startsWith('//') && !value.includes('\\') && !/[\u0000-\u001f\u007f]/.test(value);
}

const optionalImageUrlSchema = z
  .string()
  .trim()
  .max(1024 * 1024 * 2, 'Payload is too large.')
  .refine(
    (value) => value.length === 0 || isHttpsUrl(value) || imageDataUrlPattern.test(value),
    'Enter an HTTPS image URL or upload a valid image.'
  )
  .transform((value) => (value.length === 0 ? null : value));

export const optionalHttpsOrInternalUrlSchema = z
  .string()
  .trim()
  .max(400, 'URL is too long.')
  .refine(
    (value) => value.length === 0 || isHttpsUrl(value) || isAllowedInternalHref(value),
    'Enter an internal path or HTTPS URL.'
  )
  .transform((value) => (value.length === 0 ? null : value));

const requiredUrlOrDataPdfSchema = z
  .string()
  .trim()
  .min(1, 'PDF URL or uploaded PDF data is required.')
  .max(AUTHORING_LIMITS.pdfUrl, `PDF payload exceeds ${AUTHORING_LIMITS.pdfUrl.toLocaleString()} characters.`)
  .refine(
    (value) => isHttpsUrl(value) || value.startsWith('data:application/pdf;base64,'),
    'Enter a valid PDF URL or upload a valid PDF file.'
  );

const optionalProfilePhotoSchema = optionalImageUrlSchema;

const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'Username must be at least 3 characters.')
  .max(32, 'Username must be at most 32 characters.')
  .regex(/^[a-z][a-z0-9_]*$/, 'Username must start with a letter and can contain lowercase letters, numbers, and underscores only.');

export const signUpSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  username: usernameSchema,
  email: z.email().transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(120),
  primaryRole: z.enum(['learner', 'creator']),
});

export const signInSchema = z.object({
  email: z.email().transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(120),
});

export const forgotPasswordSchema = z.object({
  email: z.email().transform((value) => value.toLowerCase()),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(8).max(120),
});

export const themeModeSchema = z.object({
  themeMode: z.enum(['light', 'dark', 'ocean', 'forest', 'ember']),
});

export const profileUpdateSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  username: usernameSchema,
  profilePhotoUrl: optionalProfilePhotoSchema,
  bio: z
    .string()
    .trim()
    .max(2000)
    .transform((value) => (value.length === 0 ? null : value)),
  themeMode: z.enum(['light', 'dark', 'ocean', 'forest', 'ember']),
  githubUsername: z.string().trim().max(80).transform((value) => (value.length === 0 ? null : value)).nullable().optional(),
  githubProfileUrl: z.string().trim().max(500).refine((value) => {
    if (value.length === 0) return true;
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && ['github.com', 'www.github.com'].includes(url.hostname.toLowerCase());
    } catch {
      return false;
    }
  }, 'Enter a valid HTTPS GitHub profile URL.').transform((value) => (value.length === 0 ? null : value)).nullable().optional(),
});

export const courseSchema = z
  .object({
    title: z.string().trim().min(3).max(160),
    description: z.string().trim().min(10).max(4000),
    imageUrl: optionalImageUrlSchema,
    domainName: z.string().trim().max(80).transform((value) => (value.length === 0 ? null : value)).nullable().optional(),
    priceAmount: z.coerce.number().min(0).max(999999),
    premiumEnabled: z.boolean(),
    premiumAccessDays: z.union([z.coerce.number().int().min(1).max(3650), z.null()]),
    status: z.enum(['draft', 'published']),
  })
  .superRefine((value, context) => {
    if (!value.premiumEnabled) {
      return;
    }

    if (value.priceAmount <= 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['priceAmount'],
        message: 'Premium pricing requires a value greater than zero.',
      });
    }

    if (!value.premiumAccessDays || value.premiumAccessDays <= 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['premiumAccessDays'],
        message: 'Premium pricing requires an access duration in days.',
      });
    }
  });

export const moduleSchema = z.object({
  title: z.string().trim().min(2).max(160),
  summary: z.string().trim().min(2).max(1200),
});

const questionItemSchema = z.object({
  id: z.string().min(1),
  prompt: requiredBoundedString('Question prompt', AUTHORING_LIMITS.questionPrompt),
  solution: requiredBoundedString('Question solution', AUTHORING_LIMITS.questionSolution),
});

const quizItemSchema = z.object({
  id: z.string().min(1),
  prompt: requiredBoundedString('Quiz question prompt', AUTHORING_LIMITS.quizPrompt),
  options: z.object({
    A: requiredBoundedString('Quiz option A', AUTHORING_LIMITS.quizOption),
    B: requiredBoundedString('Quiz option B', AUTHORING_LIMITS.quizOption),
    C: requiredBoundedString('Quiz option C', AUTHORING_LIMITS.quizOption),
    D: requiredBoundedString('Quiz option D', AUTHORING_LIMITS.quizOption),
  }),
  correctOption: z.enum(['A', 'B', 'C', 'D']),
});

const nodeMetaSchema = z.object({
  title: z.string().trim().min(2).max(160),
  isPremium: z.boolean().default(false),
  excerpt: z
    .string()
    .trim()
    .max(220)
    .transform((value) => (value.length === 0 ? null : value))
    .nullable()
    .default(null),
});

export const nodeSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('content'),
    payload: z.object({
      introduction: richContentSectionSchema('Basic intro', AUTHORING_LIMITS.contentIntroduction),
      explanation: richContentSectionSchema('Detailed explanation', AUTHORING_LIMITS.contentExplanation),
      solvedExamples: richContentSectionSchema('Solved examples', AUTHORING_LIMITS.contentSolvedExamples),
    }),
  }).extend(nodeMetaSchema.shape),
  z.object({
    type: z.literal('html'),
    payload: z.object({
      html: z.string().max(
        AUTHORING_LIMITS.html,
        `HTML source exceeds the maximum supported size of ${AUTHORING_LIMITS.html.toLocaleString()} characters.`
      ),
      css: z.string().max(
        AUTHORING_LIMITS.css,
        `CSS source exceeds the maximum supported size of ${AUTHORING_LIMITS.css.toLocaleString()} characters.`
      ),
      javascript: z.string().max(
        AUTHORING_LIMITS.javascript,
        `JavaScript source exceeds the maximum supported size of ${AUTHORING_LIMITS.javascript.toLocaleString()} characters.`
      ),
    }),
  }).extend(nodeMetaSchema.shape),
  z.object({
    type: z.literal('question'),
    payload: z.object({
      format: richTextFormatSchema,
      items: z.array(questionItemSchema).min(1).max(100),
    }),
  }).extend(nodeMetaSchema.shape),
  z.object({
    type: z.literal('quiz'),
    payload: z.object({
      format: richTextFormatSchema,
      timerSeconds: z.coerce.number().int().min(10).max(7200),
      items: z.array(quizItemSchema).min(1).max(100),
    }),
  }).extend(nodeMetaSchema.shape),
  z.object({
    type: z.literal('video'),
    payload: z.object({
      format: richTextFormatSchema,
      videoUrl: z.string().trim().refine(isHttpsUrl, HTTPS_URL_MESSAGE),
      note: requiredBoundedString('Video notes', AUTHORING_LIMITS.videoNote),
    }),
  }).extend(nodeMetaSchema.shape),
  z.object({
    type: z.literal('pdf'),
    payload: z.object({
      pdfUrl: requiredUrlOrDataPdfSchema,
      title: z.string().trim().max(160).transform((value) => (value.length === 0 ? null : value)).nullable().optional(),
      note: requiredBoundedString('PDF notes', AUTHORING_LIMITS.pdfNote),
    }),
  }).extend(nodeMetaSchema.shape),
]);

export const latexPreviewSourceSchema = z
  .string()
  .trim()
  .min(1, 'Add a LaTeX document to preview.')
  .max(
    LATEX_PREVIEW_SOURCE_MAX,
    `This LaTeX document exceeds the maximum supported size for preview (${LATEX_PREVIEW_SOURCE_MAX.toLocaleString()} characters).`
  );

export const latexPreviewRequestSchema = z.object({
  source: latexPreviewSourceSchema,
});

export const reorderSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(500),
});

const optionalUuidSchema = z
  .string()
  .trim()
  .uuid('Enter a valid user id.')
  .or(z.literal(''))
  .transform((value) => (value.length === 0 ? null : value));

export const adminMessageSchema = z.object({
  subject: z
    .string()
    .trim()
    .max(160)
    .transform((value) => (value.length === 0 ? null : value)),
  message: z.string().trim().min(10).max(4000),
  messageType: z.enum(['suggestion', 'complaint', 'support']),
  targetUserId: optionalUuidSchema,
});

export const adminMessageStatusSchema = z.object({
  status: z.enum(['open', 'reviewed', 'closed']),
});

export const moderationActionSchema = z.object({
  actionType: z.enum(['ban', 'unban']),
  targetUserId: z.string().trim().uuid('Enter a valid user id.'),
  sourceMessageId: optionalUuidSchema,
  reason: z
    .string()
    .trim()
    .max(500)
    .transform((value) => (value.length === 0 ? null : value)),
});

export const withdrawalSchema = z.object({
  amount: z.coerce.number().positive().max(9999999),
  payoutMethodSnapshot: z.string().trim().min(5).max(2000),
});

export const adminManualPayoutSchema = z.object({
  creatorUserId: z.string().uuid(),
  amount: z.coerce.number().positive().max(9999999),
  payoutMethodSnapshot: z.string().trim().min(5).max(2000),
});


export const creatorPayoutProfileSchema = z.object({
  payoutMethodSnapshot: z.string().trim().min(5).max(2000),
});

export const adminBulkPayoutRunSchema = z.object({
  dryRun: z.coerce.boolean().optional().default(false),
  mode: z.enum(['manual_run', 'scheduled_run']).optional().default('manual_run'),
});

export const premiumOrderSchema = z
  .object({
    provider: z.enum(['sandbox', 'razorpay']).optional(),
    durationMultiplier: z.union([z.literal(1), z.literal(3)]).optional(),
    months: z.union([z.literal(1), z.literal(3)]).optional(),
    pricingPlanId: z.string().uuid().optional().nullable(),
  })
  .transform((value) => ({
    provider: value.provider,
    durationMultiplier: value.durationMultiplier ?? value.months ?? 1,
    pricingPlanId: value.pricingPlanId ?? null,
  }));

export const premiumPaymentVerifySchema = z.object({
  purchaseId: z.string().uuid(),
  providerOrderId: z.string().trim().min(1),
  providerPaymentId: z.string().trim().min(1),
  providerSignature: z
    .string()
    .trim()
    .transform((value) => (value.length === 0 ? null : value))
    .nullable()
    .default(null),
});

export const adminFinanceSettingsSchema = z.object({
  platformFeePercent: z.coerce.number().min(20).max(100),
  minimumWithdrawalAmount: z.coerce.number().min(0).max(9999999),
  settlementHoldDays: z.coerce.number().int().min(0).max(365),
});

export const adminWithdrawalStatusSchema = z.object({
  withdrawalRequestId: z.string().uuid(),
  status: z.enum(['paid', 'rejected']),
});

export const certificateIssueSchema = z.object({
  courseId: z.string().uuid(),
});

export const quizAttemptSchema = z.object({
  nodeId: z.string().min(1),
  answers: z.record(z.string(), z.enum(['A', 'B', 'C', 'D'])),
});

export const nodeDiscussionCreateCommentSchema = z.object({
  body: z.string().trim().min(1).max(5000),
  commentTag: z.enum(['discussion', 'doubt']).optional().default('discussion'),
  parentCommentId: z
    .string()
    .trim()
    .uuid('Enter a valid parent comment id.')
    .or(z.literal(''))
    .or(z.null())
    .optional()
    .transform((value) => (typeof value === 'string' && value.length === 0 ? null : (value ?? null))),
});

export const nodeDiscussionUpdateCommentSchema = z.object({
  body: z.string().trim().min(1).max(5000),
});

export const courseReviewUpsertSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  reviewText: z
    .string()
    .trim()
    .max(4000)
    .or(z.null())
    .optional()
    .transform((value) => {
      if (value == null) {
        return null;
      }

      return value.length === 0 ? null : value;
    }),
});
