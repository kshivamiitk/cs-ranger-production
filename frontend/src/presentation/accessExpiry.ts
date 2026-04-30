import { formatDateTimeLabel } from '@/lib/utils';

const minuteMs = 60 * 1000;
const hourMs = 60 * minuteMs;
const dayMs = 24 * hourMs;

export interface AccessExpiryDescriptor {
  exactLabel: string;
  relativeLabel: string;
  statusLabel: string;
  tone: 'success' | 'warning' | 'muted';
  isExpired: boolean;
  isExpiringSoon: boolean;
}

export function describeAccessExpiry(expiresAt: string | null | undefined, now = new Date()): AccessExpiryDescriptor | null {
  if (!expiresAt) {
    return null;
  }

  const expiryDate = new Date(expiresAt);
  const expiryMs = expiryDate.getTime();
  if (!Number.isFinite(expiryMs)) {
    return null;
  }

  const diffMs = expiryMs - now.getTime();
  const isExpired = diffMs <= 0;
  const isExpiringSoon = !isExpired && diffMs <= 7 * dayMs;
  const exactLabel = formatDateTimeLabel(expiryDate);

  return {
    exactLabel,
    relativeLabel: formatRelativeExpiry(diffMs),
    statusLabel: isExpired ? 'Expired' : isExpiringSoon ? 'Expiring soon' : 'Active access',
    tone: isExpired ? 'muted' : isExpiringSoon ? 'warning' : 'success',
    isExpired,
    isExpiringSoon,
  };
}

function formatRelativeExpiry(diffMs: number) {
  const absoluteMs = Math.abs(diffMs);
  const days = Math.floor(absoluteMs / dayMs);
  const hours = Math.floor((absoluteMs % dayMs) / hourMs);
  const minutes = Math.floor((absoluteMs % hourMs) / minuteMs);

  if (diffMs <= 0) {
    if (days > 0) {
      return `Expired ${days}d ${hours}h ago`;
    }

    if (hours > 0) {
      return `Expired ${hours}h ${minutes}m ago`;
    }

    if (minutes > 0) {
      return `Expired ${minutes}m ago`;
    }

    return 'Expired just now';
  }

  if (days > 0) {
    return `Expires in ${days}d ${hours}h`;
  }

  if (hours > 0) {
    return `Expires in ${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `Expires in ${minutes}m`;
  }

  return 'Expires in under 1m';
}


