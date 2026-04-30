import { NextResponse } from 'next/server';
import type { ZodIssue } from 'zod';
import { ZodError } from 'zod';

import { ApplicationError } from '@/src/application/errors';
import { messages } from '@/shared/config/messages';

export function ok<T>(payload: T, init?: ResponseInit) {
  return NextResponse.json(payload, init);
}

export function failure(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: formatZodIssue(error.issues[0]) ?? messages.api.validationFailed,
        details: error.flatten(),
      },
      { status: 400 }
    );
  }

  if (error instanceof ApplicationError) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode });
  }

  if (error instanceof Error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ error: messages.api.unexpectedServerError }, { status: 500 });
}

export function safeNextPath(value: string | null | undefined) {
  if (!value || !value.startsWith('/')) {
    return '/dashboard';
  }

  return value;
}

function formatZodIssue(issue: ZodIssue | undefined) {
  if (!issue) {
    return null;
  }

  const issueOrigin = 'origin' in issue ? issue.origin : undefined;

  if (issue.message && !issue.message.startsWith('Too big: expected')) {
    return issue.message;
  }

  if (issue.code === 'too_big' && issueOrigin === 'string') {
    return messages.api.inputTooLarge;
  }

  if (issue.code === 'too_small' && issueOrigin === 'string') {
    return messages.api.inputTooSmall;
  }

  return issue.message || messages.api.validationFailed;
}



