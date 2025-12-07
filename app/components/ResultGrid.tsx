'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export interface CardResult {
  id: string;
  number: string;
  month: number;
  year: number;
  cvv: string;
  status: 'pending' | 'approved' | 'declined';
  message?: string;
  timestamp?: number;
}

interface ResultGridProps {
  results: CardResult[];
}

/**
 * ResultGrid component displays checking results in a responsive grid
 * States:
 * - Pending: Skeleton loader with animated pulse
 * - Live/Approved: Green border/glow (Success variant)
 * - Dead/Declined: Red opacity (Error variant)
 */
export function ResultGrid({ results }: ResultGridProps) {
  if (results.length === 0) {
    return null;
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
        Results ({results.length})
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {results.map((result) => (
            <ResultCard key={result.id} result={result} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

interface ResultCardProps {
  result: CardResult;
}

function ResultCard({ result }: ResultCardProps) {
  const { status, number, month, year, cvv, message } = result;

  // Mask card number for security (show first 6 and last 4)
  const maskedNumber = number.length >= 10 
    ? `${number.slice(0, 6)}${'*'.repeat(number.length - 10)}${number.slice(-4)}`
    : number;

  // Format expiry date
  const expiryDate = `${String(month).padStart(2, '0')}/${String(year).slice(-2)}`;

  // Card styling based on status
  const cardStyles = {
    pending: {
      border: 'border-gray-300 dark:border-gray-600',
      bg: 'bg-gray-50 dark:bg-gray-800',
      glow: '',
    },
    approved: {
      border: 'border-green-500 dark:border-green-400',
      bg: 'bg-green-50 dark:bg-green-900/20',
      glow: 'shadow-lg shadow-green-500/50',
    },
    declined: {
      border: 'border-red-500 dark:border-red-400',
      bg: 'bg-red-50 dark:bg-red-900/20 opacity-75',
      glow: '',
    },
  };

  const styles = cardStyles[status];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 25,
      }}
      className={`p-4 border-2 rounded-lg ${styles.border} ${styles.bg} ${styles.glow} transition-all duration-300`}
    >
      {/* Status Icon */}
      <div className="flex items-center justify-between mb-3">
        <StatusIcon status={status} />
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
          {new Date(result.timestamp || Date.now()).toLocaleTimeString()}
        </span>
      </div>

      {/* Card Details */}
      <div className="space-y-2">
        <div className="font-mono text-sm text-gray-900 dark:text-white">
          {maskedNumber}
        </div>
        <div className="flex gap-3 text-sm text-gray-700 dark:text-gray-300">
          <span>Exp: {expiryDate}</span>
          <span>CVV: {cvv}</span>
        </div>
      </div>

      {/* Status Message */}
      {message && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
            {message}
          </p>
        </div>
      )}

      {/* Pending Animation */}
      {status === 'pending' && (
        <motion.div
          className="mt-3 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="h-full bg-blue-500"
            animate={{
              x: ['-100%', '100%'],
            }}
            transition={{
              repeat: Infinity,
              duration: 1,
              ease: 'linear',
            }}
            style={{ width: '50%' }}
          />
        </motion.div>
      )}
    </motion.div>
  );
}

function StatusIcon({ status }: { status: CardResult['status'] }) {
  switch (status) {
    case 'pending':
      return (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{
            repeat: Infinity,
            duration: 1,
            ease: 'linear',
          }}
        >
          <Loader2 className="w-5 h-5 text-blue-500" />
        </motion.div>
      );
    case 'approved':
      return (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{
            type: "spring",
            stiffness: 500,
            damping: 15,
          }}
        >
          <CheckCircle2 className="w-5 h-5 text-green-500" />
        </motion.div>
      );
    case 'declined':
      return (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{
            type: "spring",
            stiffness: 500,
            damping: 15,
          }}
        >
          <XCircle className="w-5 h-5 text-red-500" />
        </motion.div>
      );
  }
}

/**
 * Success Card variant for approved results
 */
export function SuccessCard({ result }: ResultCardProps) {
  return <ResultCard result={{ ...result, status: 'approved' }} />;
}

/**
 * Error Card variant for declined results
 */
export function ErrorCard({ result }: ResultCardProps) {
  return <ResultCard result={{ ...result, status: 'declined' }} />;
}
