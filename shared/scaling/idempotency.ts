export type IdempotencyKey = string;

export function createIdempotencyKey(parts: Array<string | number | null | undefined>): IdempotencyKey {
  return parts.filter((part) => part !== null && part !== undefined && String(part).length > 0).join(':');
}



