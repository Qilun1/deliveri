import { SignUp } from '@clerk/clerk-react';
import { motion } from 'framer-motion';
import { Package } from 'lucide-react';
import { Logo } from '@/components/Logo';

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      {/* Left Panel - Sign Up */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[440px]"
        >
          <div className="mb-6">
            <Logo size="lg" />
          </div>

          <SignUp 
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
            path="/signup"
            signInUrl="/login"
            forceRedirectUrl="/dashboard"
          />
        </motion.div>
      </div>

      {/* Right Panel - Illustration */}
      <div className="hidden lg:flex flex-1 bg-primary/5 items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="max-w-md text-center"
        >
          <div className="w-32 h-32 mx-auto mb-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Package className="w-16 h-16 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-4">
            Never miss a missing item again
          </h2>
          <p className="text-muted-foreground">
            DeliVeri helps Finnish restaurants verify every delivery against orders, 
            catch discrepancies instantly, and recover lost revenue automatically.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
