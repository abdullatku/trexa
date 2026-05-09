import { cn } from './utils';

interface TrexaLogoProps {
  className?: string;
  title?: string;
}

export function TrexaLogo({ className, title = 'Trexa' }: TrexaLogoProps) {
  const logoSrc = new URL('../../../trexa_logo.png', import.meta.url).href;

  return (
    <img
      src={logoSrc}
      alt={title}
      className={cn('object-contain', className)}
      style={{height: 70}}
    />
  );
}
