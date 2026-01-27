import { Check } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
}

export function Logo({ size = 'md', showSubtitle = false }: LogoProps) {
  const sizes = {
    sm: { text: 'text-xl', icon: 14, subtitle: 'text-xs' },
    md: { text: 'text-2xl', icon: 18, subtitle: 'text-sm' },
    lg: { text: 'text-4xl', icon: 28, subtitle: 'text-base' },
  };

  const s = sizes[size];

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-0.5">
        <span className={`font-bold ${s.text} text-foreground`}>Deli</span>
        <span className="relative inline-flex items-center justify-center">
          <span className={`font-bold ${s.text} text-primary`}>
            <Check 
              size={s.icon} 
              strokeWidth={3.5} 
              className="inline-block -mt-0.5"
            />
          </span>
        </span>
        <span className={`font-bold ${s.text} text-foreground`}>eri</span>
      </div>
      {showSubtitle && (
        <span className={`${s.subtitle} text-muted-foreground -mt-1`}>
          Delivery Verification
        </span>
      )}
    </div>
  );
}
