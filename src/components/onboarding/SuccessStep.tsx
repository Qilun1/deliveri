import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { CheckCircle, Sparkles, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SuccessStepProps {
    userName?: string;
    userRole?: 'restaurant' | 'supplier';
}

export default function SuccessStep({ userName = 'there', userRole = 'restaurant' }: SuccessStepProps) {
    const navigate = useNavigate();

    const handleGoToDashboard = () => {
        localStorage.removeItem('force_show_onboarding');
        const dashboardPath = userRole === 'supplier' ? '/supplier/dashboard' : '/dashboard';
        navigate(dashboardPath, { replace: true });
    };

    return (
        <div className="text-center space-y-8">
            {/* Animated checkmark */}
            <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                    type: 'spring',
                    stiffness: 200,
                    damping: 15,
                    delay: 0.2,
                }}
                className="flex justify-center"
            >
                <div className="relative">
                    {/* Pulsing glow - Wolt Blue */}
                    <motion.div
                        className="absolute inset-0 rounded-full bg-[#009EE0]/30 blur-2xl"
                        animate={{
                            scale: [1, 1.3, 1],
                            opacity: [0.5, 0.8, 0.5],
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: 'easeInOut',
                        }}
                    />
                    {/* Check circle */}
                    <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-[#009EE0] to-[#00B5FF] flex items-center justify-center">
                        <motion.div
                            initial={{ scale: 0, rotate: -45 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
                        >
                            <CheckCircle className="w-12 h-12 text-white" strokeWidth={2.5} />
                        </motion.div>
                    </div>
                </div>
            </motion.div>

            {/* Text content */}
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.5 }}
                className="space-y-3"
            >
                <h2 className="text-3xl md:text-4xl font-bold text-white">
                    You're All Set!
                </h2>
                <p className="text-[#9294a0] text-lg">
                    Welcome aboard, <span className="text-[#009EE0]">{userName}</span>.
                    <br />
                    Let's get started.
                </p>
            </motion.div>

            {/* CTA Button */}
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.5 }}
                className="pt-4"
            >
                <Button
                    onClick={handleGoToDashboard}
                    size="lg"
                    className="px-8 py-6 text-base font-semibold bg-gradient-to-r from-[#009EE0] to-[#00B5FF] text-white hover:shadow-[0_0_30px_rgba(0,158,224,0.3)] transition-all duration-300"
                >
                    <Sparkles className="w-5 h-5 mr-2" />
                    Go to Dashboard
                    <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
            </motion.div>
        </div>
    );
}
