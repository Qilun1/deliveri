import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

import WelcomeStep from './WelcomeStep';
import FeatureStep from './FeatureStep';
import RoleSelectStep from './RoleSelectStep';
import SuccessStep from './SuccessStep';
import OnboardingProgress from './OnboardingProgress';
import { onboardingSteps } from './onboardingSteps';

type OnboardingPhase = 'welcome' | 'features' | 'role-select' | 'success';

export default function OnboardingPage() {
    const navigate = useNavigate();
    const { user, updateUserMetadata } = useAuth();
    const [phase, setPhase] = useState<OnboardingPhase>('welcome');
    const [featureIndex, setFeatureIndex] = useState(0);
    const [userName, setUserName] = useState('');
    const [userRole, setUserRole] = useState<'restaurant' | 'supplier'>('restaurant');
    const [isSkipping, setIsSkipping] = useState(false);

    // Check if user should see onboarding
    useEffect(() => {
        // If user already has a role set in metadata, skip onboarding
        if (user?.role) {
            const forceShow = localStorage.getItem('force_show_onboarding');
            if (!forceShow) {
                const dashboardPath = user.role === 'supplier' ? '/supplier/dashboard' : '/dashboard';
                navigate(dashboardPath, { replace: true });
            }
        }
    }, [user, navigate]);

    const handleSkip = useCallback(async () => {
        if (isSkipping) return;

        // If we're not in role-select, take them to role-select
        if (phase !== 'role-select') {
            setPhase('role-select');
            return;
        }

        // If they are already in role-select, they MUST pick a role.
        // The Skip button should be hidden in this phase anyway.
    }, [isSkipping, phase]);

    const handleWelcomeNext = () => {
        setPhase('features');
    };

    const handleFeatureNext = () => {
        if (featureIndex < onboardingSteps.length - 2) {
            setFeatureIndex(featureIndex + 1);
        } else {
            setPhase('role-select');
        }
    };

    const handleFeatureBack = () => {
        if (featureIndex > 0) {
            setFeatureIndex(featureIndex - 1);
        } else {
            setPhase('welcome');
        }
    };

    const handleRoleBack = () => {
        setFeatureIndex(onboardingSteps.length - 2);
        setPhase('features');
    };

    const handleRoleComplete = () => {
        localStorage.setItem('deliveri_onboarding_completed', 'true');
        setPhase('success');
    };

    // Calculate total steps for progress indicator
    // Welcome (1) + Features (onboardingSteps.length - 1) + Role Select (1) + Success (1)
    const totalSteps = onboardingSteps.length + 2;
    const currentStepIndex = phase === 'welcome'
        ? 0
        : phase === 'features'
            ? featureIndex + 1
            : phase === 'role-select'
                ? onboardingSteps.length
                : totalSteps - 1;

    return (
        <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
            {/* Background gradient */}
            <div className="fixed inset-0 bg-gradient-to-br from-[#009EE0]/5 via-transparent to-[#00B5FF]/5 pointer-events-none" />

            {/* Question mark floating background elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <motion.div
                    className="absolute top-20 left-10 text-[#009EE0]/5"
                    animate={{
                        y: [0, -20, 0],
                        rotate: [0, 10, 0],
                    }}
                    transition={{ duration: 5, repeat: Infinity }}
                >
                    <HelpCircle className="w-32 h-32" />
                </motion.div>
                <motion.div
                    className="absolute bottom-20 right-10 text-[#009EE0]/5"
                    animate={{
                        y: [0, 20, 0],
                        rotate: [0, -10, 0],
                    }}
                    transition={{ duration: 6, repeat: Infinity, delay: 1 }}
                >
                    <HelpCircle className="w-24 h-24" />
                </motion.div>
            </div>

            {/* Header with progress */}
            {phase !== 'success' && (
                <header className="relative z-10 px-6 py-8 flex items-center justify-center">
                    <OnboardingProgress
                        currentStep={currentStepIndex}
                        totalSteps={totalSteps}
                    />
                    {phase !== 'role-select' && (
                        <button
                            onClick={handleSkip}
                            className="absolute right-6 text-sm font-medium text-[#009EE0] hover:text-[#0088C4] transition-colors"
                        >
                            Skip
                        </button>
                    )}
                </header>
            )}

            {/* Main content */}
            <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-8">
                <div className="w-full max-w-lg">
                    <AnimatePresence mode="wait">
                        {phase === 'welcome' && (
                            <motion.div
                                key="welcome"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                            >
                                <WelcomeStep
                                    onNext={handleWelcomeNext}
                                    onSkip={handleSkip}
                                />
                            </motion.div>
                        )}

                        {phase === 'features' && (
                            <motion.div
                                key={`feature-${featureIndex}`}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                            >
                                <FeatureStep
                                    feature={{
                                        icon: onboardingSteps[featureIndex + 1].icon,
                                        title: onboardingSteps[featureIndex + 1].title,
                                        description: onboardingSteps[featureIndex + 1].description,
                                        color: onboardingSteps[featureIndex + 1].iconColor || '#009EE0',
                                    }}
                                    onNext={handleFeatureNext}
                                    onBack={handleFeatureBack}
                                />
                            </motion.div>
                        )}

                        {phase === 'role-select' && (
                            <motion.div
                                key="role-select"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                            >
                                <RoleSelectStep
                                    onNext={handleRoleComplete}
                                    onBack={handleRoleBack}
                                />
                            </motion.div>
                        )}

                        {phase === 'success' && (
                            <motion.div
                                key="success"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.5 }}
                            >
                                <SuccessStep
                                    userName={userName || 'there'}
                                    userRole={userRole}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
}
