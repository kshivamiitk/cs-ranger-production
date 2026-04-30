import { cn } from '@/lib/utils';
import { BrandSymbol } from '@/components/brand/BrandSymbol';

export function UserAvatar(props: {
  src?: string | null;
  alt: string;
  name?: string | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const initials = props.name
    ? props.name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('')
    : null;

  return (
    <div className={cn('user-avatar', props.className)} data-size={props.size ?? 'md'}>
      {props.src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={props.src} alt={props.alt} className="user-avatar-image" referrerPolicy="no-referrer" />
      ) : initials ? (
        <span className="user-avatar-fallback">{initials}</span>
      ) : (
        <BrandSymbol size={props.size === 'lg' ? 'md' : 'sm'} className="user-avatar-brand" />
      )}
    </div>
  );
}


