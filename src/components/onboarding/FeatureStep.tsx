import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, LucideIcon } from 'lucide-react';

interface Feature {
    icon: LucideIcon;
    title: string;
    description: string;
    color: string;
}

interface FeatureStepProps {
    feature: Feature;
    onNext: () => void;
    onBack: () => void;
}

export default function FeatureStep({ feature, onNext, onBack }: FeatureStepProps) {
    const Icon = feature.icon;

    return (
        <div className="text-center space-y-8">
            {/* Animated Icon */}
            <motion.div
                key={feature.title}
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                    type: 'spring',
                    stiffness: 200,
                    damping: 20,
                    delay: 0.1,
                }}
                className="flex justify-center"
            >
                <div className="relative">
                    {/* Glow effect - using feature color (Wolt Blue) */}
                    <motion.div
                        className="absolute inset-0 rounded-2xl blur-2xl"
                        style={{ backgroundColor: `${feature.color}20` }}
                        animate={{
                            scale: [1, 1.1, 1],
                            opacity: [0.5, 0.8, 0.5],
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: 'easeInOut',
                        }}
                    />
                    {/* Icon container */}
                    <div
                        className="relative w-24 h-24 rounded-2xl flex items-center justify-center border border-white/10"
                        style={{ backgroundColor: `${feature.color}15` }}
                    >
                        <Icon
                            className="w-12 h-12"
                            style={{ color: feature.color }}
                        />
                    </div>
                </div>
            </motion.div>

            {/* Text content */}
            <motion.div
                key={`text-${feature.title}`}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="space-y-4"
            >
                <h2 className="text-2xl md:text-3xl font-bold text-white">
                    {feature.title}
                </h2>
                <p className="text-[#9294a0] text-lg max-w-md mx-auto leading-relaxed">
                    {feature.description}
                </p>
            </motion.div>

            {/* Navigation buttons */}
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                className="flex items-center justify-center gap-4 pt-4"
            >
                <Button
                    variant="outline"
                    onClick={onBack}
                    className="px-6 py-5 bg-white text-black hover:bg-gray-100 border-transparent hover:text-black"
                >
                    <ChevronLeft className="w-5 h-5 mr-1" />
                    Back
                </Button>
                <Button
                    onClick={onNext}
                    className="px-6 py-5 bg-gradient-to-r from-[#009EE0] to-[#00B5FF] text-white hover:shadow-[0_0_30px_rgba(0,158,224,0.3)] transition-all duration-300"
                >
                    Continue
                    <ChevronRight className="w-5 h-5 ml-1" />
                </Button>
            </motion.div>
        </div>
    );
}
