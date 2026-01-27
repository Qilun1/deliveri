import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Sparkles, HelpCircle } from 'lucide-react';

interface WelcomeStepProps {
    onNext: () => void;
    onSkip: () => void;
}

export default function WelcomeStep({ onNext, onSkip }: WelcomeStepProps) {
    return (
        <div className="text-center space-y-8">
            {/* Animated logo with question mark */}
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="flex justify-center"
            >
                <div className="relative">
                    {/* Glow ring - Wolt Blue */}
                    <motion.div
                        className="absolute inset-0 rounded-full bg-[#009EE0]/20 blur-xl"
                        animate={{
                            scale: [1, 1.2, 1],
                            opacity: [0.5, 0.8, 0.5],
                        }}
                        transition={{
                            duration: 3,
                            repeat: Infinity,
                            ease: 'easeInOut',
                        }}
                    />
                    <div className="relative bg-gradient-to-br from-[#1a1a24] to-[#12121a] p-6 rounded-2xl border border-white/10">
                        {/* Question mark icon instead of logo */}
                        <div className="w-16 h-16 rounded-xl bg-[#009EE0]/15 flex items-center justify-center">
                            <HelpCircle className="w-10 h-10 text-[#009EE0]" />
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Text content */}
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="space-y-4"
            >
                <h1 className="text-3xl md:text-4xl font-bold text-white">
                    Welcome to{' '}
                    <span className="text-[#009EE0]">DeliVeri</span>
                </h1>
                <p className="text-[#9294a0] text-lg max-w-md mx-auto leading-relaxed">
                    Streamline your delivery workflow and never miss an item again.
                </p>
            </motion.div>

            {/* CTA Button - Wolt Blue gradient */}
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.5 }}
                className="pt-4"
            >
                <Button
                    onClick={onNext}
                    size="lg"
                    className="px-8 py-6 text-base font-semibold bg-gradient-to-r from-[#009EE0] to-[#00B5FF] text-white hover:shadow-[0_0_30px_rgba(0,158,224,0.3)] transition-all duration-300"
                >
                    <Sparkles className="w-5 h-5 mr-2" />
                    Get Started
                </Button>
            </motion.div>

            {/* Skip text */}
            <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                onClick={onSkip}
                className="text-[#55556a] hover:text-[#9294a0] text-sm transition-colors mt-4"
            >
                I'll explore on my own
            </motion.button>
        </div>
    );
}
