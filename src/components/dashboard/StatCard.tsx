import { ReactNode } from 'react';

interface StatCardProps {
  icon: ReactNode;
  value: string | number;
  label: string;
  variant?: 'default' | 'primary' | 'success' | 'warning';
}

export function StatCard({ icon, value, label, variant = 'default' }: StatCardProps) {
  const iconColors = {
    default: 'text-muted-foreground',
    primary: 'text-primary',
    success: 'text-success',
    warning: 'text-warning',
  };

  return (
    <div className="bg-card rounded-xl border border-border p-6 hover:shadow-card-hover transition-shadow duration-200">
      <div className={`mb-3 ${iconColors[variant]}`}>
        {icon}
      </div>
      <div className="font-mono text-3xl font-bold text-foreground mb-1">
        {value}
      </div>
      <div className="text-sm text-muted-foreground">
        {label}
      </div>
    </div>
  );
}
