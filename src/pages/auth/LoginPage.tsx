import { SignIn } from '@clerk/clerk-react';
import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import { Logo } from '@/components/Logo';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      {/* Left Panel - Sign In */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[440px]"
        >
          <div className="mb-6">
            <Logo size="lg" />
          </div>

          <SignIn 
            appearance={{
              elements: {
                rootBox: "w-full",
                cardBox: "w-full shadow-none",
                card: "bg-transparent shadow-none p-0 w-full",
                header: "mb-4",
                headerTitle: "text-2xl font-bold text-foreground",
                headerSubtitle: "text-muted-foreground",
                socialButtonsBlockButton: "bg-card border border-border hover:bg-muted",
                socialButtonsBlockButtonText: "text-foreground font-medium",
                dividerLine: "bg-border",
                dividerText: "text-muted-foreground",
                formButtonPrimary: "bg-primary hover:bg-primary-hover text-primary-foreground",
                formFieldLabel: "text-foreground font-medium",
                formFieldInput: "bg-background border-border text-foreground",
                formFieldInputShowPasswordButton: "text-muted-foreground hover:text-foreground",
                footerAction: "mt-4",
                footerActionText: "text-muted-foreground",
                footerActionLink: "text-primary hover:text-primary-hover font-medium",
                identityPreview: "bg-card border border-border",
                identityPreviewText: "text-foreground",
                identityPreviewEditButton: "text-primary hover:text-primary-hover",
                formResendCodeLink: "text-primary hover:text-primary-hover",
                alert: "bg-destructive/10 border-destructive/20 text-destructive",
              }
            }}
            routing="path"
            path="/login"
            signUpUrl="/signup"
            forceRedirectUrl="/dashboard"
          />
        </motion.div>
      </div>

      {/* Right Panel - Features */}
      <div className="hidden lg:flex flex-1 bg-primary/5 items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="max-w-md"
        >
          <h2 className="text-2xl font-bold text-foreground mb-6">
            Why choose DeliVeri?
          </h2>
          <div className="space-y-4">
            {[
              'Instant receipt scanning with AI extraction',
              'Real-time delivery verification',
              'Automatic discrepancy reports',
              'Track supplier accuracy over time',
              'Recover lost revenue effortlessly',
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="flex items-center gap-3"
              >
                <div className="w-6 h-6 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0">
                  <CheckCircle size={14} className="text-success" />
                </div>
                <span className="text-foreground">{feature}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
