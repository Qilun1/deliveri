import { motion } from 'framer-motion';

interface OnboardingProgressProps {
    currentStep: number;
    totalSteps: number;
}

export default function OnboardingProgress({ currentStep, totalSteps }: OnboardingProgressProps) {
    return (
        <div className="flex items-center justify-center gap-2">
            {Array.from({ length: totalSteps }).map((_, index) => (
                <motion.div
                    key={index}
                    className={`h-2 rounded-full transition-all duration-300 ${index === currentStep
                            ? 'w-8 bg-[#009EE0]'  // Wolt Blue for active
                            : index < currentStep
                                ? 'w-2 bg-[#009EE0]/50'  // Dimmed blue for completed
                                : 'w-2 bg-white/20'  // Subtle for upcoming
                        }`}
                    initial={false}
                    animate={{
                        scale: index === currentStep ? 1 : 0.8,
                        backgroundColor: index === currentStep
                            ? '#009EE0'
                            : index < currentStep
                                ? 'rgba(0, 158, 224, 0.5)'
                                : 'rgba(255, 255, 255, 0.2)'
                    }}
                    transition={{ duration: 0.2 }}
                />
            ))}
        </div>
    );
}
