import {
    HelpCircle,  // Question mark icon - main icon for this app
    Camera,
    CheckCircle2,
    FileText,
    TrendingUp,
    Sparkles
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface OnboardingStep {
    title: string;
    description: string;
    icon: LucideIcon;
    iconColor?: string;
    features?: string[];
}

export const onboardingSteps: OnboardingStep[] = [
    {
        title: "Welcome to DeliVeri",
        description: "Your complete solution for tracking deliveries and managing shortages. Save time and money by catching every missing item.",
        icon: HelpCircle,  // Question mark as the main icon
        iconColor: "#009EE0",  // Wolt Blue
        features: [
            "Automatic receipt scanning with AI",
            "Quick item-by-item verification",
            "Professional shortage reports",
            "Complete delivery history"
        ]
    },
    {
        title: "Scan Receipts Instantly",
        description: "Take a photo of your delivery receipt. Our AI automatically extracts the supplier, date, and every item with quantities and prices.",
        icon: Camera,
        iconColor: "#009EE0"
    },
    {
        title: "Verify in Seconds",
        description: "Go through each item and confirm what you received. Mark shortages with a single tap. No spreadsheets, no manual calculations.",
        icon: CheckCircle2,
        iconColor: "#009EE0"
    },
    {
        title: "Generate Reports Automatically",
        description: "Get professional emails for suppliers and emergency Wolt orders generated instantly. Copy, edit, and send in one click.",
        icon: FileText,
        iconColor: "#009EE0"
    },
    {
        title: "Track Everything",
        description: "View your complete delivery history, spot shortage patterns, and make data-driven decisions about your suppliers.",
        icon: TrendingUp,
        iconColor: "#009EE0"
    },
    {
        title: "You're All Set!",
        description: "Ready to start? Upload your first receipt and see how fast and easy delivery verification can be.",
        icon: Sparkles,
        iconColor: "#009EE0"
    }
];
