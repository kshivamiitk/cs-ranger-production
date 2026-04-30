import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { createServerContainer } from '@/src/infrastructure/container/server';
import { forgotPasswordSchema } from '@/src/presentation/schemas';
import { failure, safeNextPath } from '@/src/presentation/http/routeUtils';

const genericMessage =
  'If an account exists for this email, you will receive a password reset link shortly. Check your inbox and spam folder.';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = forgotPasswordSchema.parse(body);
    const nextPath = safeNextPath(typeof body?.next === 'string' ? body.next : null);
    const origin = new URL(request.url).origin;
    const redirectTo = `${origin}/auth/callback?recovery=1&next=${encodeURIComponent(nextPath)}`;

    const { authService } = await createServerContainer();
    await authService.requestPasswordReset({
      email: parsed.email,
      redirectTo,
    });

    return NextResponse.json({ message: genericMessage });
  } catch (error) {
    if (error instanceof ZodError) {
      return failure(error);
    }
    return NextResponse.json({ message: genericMessage });
  }
}


