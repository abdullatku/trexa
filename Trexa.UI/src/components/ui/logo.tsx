import { cn } from './utils';

interface TrexaLogoProps {
  className?: string;
  title?: string;
}

export function TrexaLogo({ className, title = 'Trexa' }: TrexaLogoProps) {
  const logoSrc = new URL('../../../trexa_logo.svg', import.meta.url).href;

  return (
    <img
      src={logoSrc}
      alt={title}
      className={cn('trexa-logo object-contain', className)}
    />
  );
}
