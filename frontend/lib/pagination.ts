export const listPageSizeOptions = [10, 50, 100] as const;

export type SearchParamsInput = Record<string, string | string[] | undefined> | undefined;

function scalar(input: string | string[] | undefined) {
  return Array.isArray(input) ? input[0] : input;
}

export function resolveListPagination(searchParams: SearchParamsInput, defaults?: { page?: number; size?: number }) {
  const requestedPage = Number.parseInt(scalar(searchParams?.page) ?? '', 10);
  const requestedSize = Number.parseInt(scalar(searchParams?.size) ?? '', 10);
  const size = listPageSizeOptions.includes(requestedSize as (typeof listPageSizeOptions)[number])
    ? requestedSize
    : defaults?.size ?? 10;
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : defaults?.page ?? 1;
  return { page, size };
}

export function paginateList<T>(items: T[], page: number, size: number) {
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / size));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const startIndex = (safePage - 1) * size;
  const endIndex = Math.min(startIndex + size, totalItems);
  return {
    items: items.slice(startIndex, endIndex),
    page: safePage,
    size,
    totalItems,
    totalPages,
    startIndex,
    endIndex,
  };
}


