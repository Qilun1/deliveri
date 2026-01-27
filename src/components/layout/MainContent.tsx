import React from 'react';
import { cn } from '@/lib/utils';

interface MainContentProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
}

export default function MainContent({ children, className, ...props }: MainContentProps) {
    return (
        <div className={cn("p-6 lg:p-8 animate-in fade-in duration-500", className)} {...props}>
            {children}
        </div>
    );
}
