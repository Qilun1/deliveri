import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';

export function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <div className="w-20 h-20 rounded-full bg-success-muted flex items-center justify-center mb-6">
        <CheckCircle2 className="w-10 h-10 text-success" />
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-2">
        All caught up!
      </h3>
      <p className="text-muted-foreground max-w-sm">
        You have no pending verifications. All deliveries are complete.
      </p>
    </motion.div>
  );
}
