'use client';

import { useState } from 'react';
import { CheckerInputCard, CardData } from '../components/CheckerInputCard';
import { ResultGrid } from '../components/ResultGrid';
import { useCardRunner } from '../hooks/useCardRunner';

/**
 * Main Checker Page
 * Integrates the Input Card, Result Grid, and Card Runner hook
 */
export default function CheckerPage() {
  const { results, isRunning, progress, savedCount, runBatch, cancelBatch, reset } = useCardRunner(5);
  const [hasStarted, setHasStarted] = useState(false);

  const handleCardsExtracted = (cards: CardData[]) => {
    setHasStarted(true);
    runBatch(cards);
  };

  const handleReset = () => {
    reset();
    setHasStarted(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Card Checker
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Next.js-based card validation interface
          </p>
        </div>

        {/* Input Card - Hide when checking is in progress */}
        {!hasStarted && !isRunning && (
          <div className="mb-8">
            <CheckerInputCard onCardsExtracted={handleCardsExtracted} />
          </div>
        )}

        {/* Progress Bar */}
        {isRunning && (
          <div className="max-w-4xl mx-auto mb-8 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Processing Cards...
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {progress.completed} / {progress.total} completed
                  {savedCount > 0 && ` • ${savedCount} saved to database`}
                </p>
              </div>
              <button
                onClick={cancelBatch}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-300 ease-out"
                style={{
                  width: `${progress.total > 0 ? (progress.completed / progress.total) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Summary when complete */}
        {!isRunning && hasStarted && results.length > 0 && (
          <div className="max-w-4xl mx-auto mb-8 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Batch Complete
                </h3>
                <div className="flex gap-6 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Total: </span>
                    <span className="font-medium text-gray-900 dark:text-white">{results.length}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Approved: </span>
                    <span className="font-medium text-green-600 dark:text-green-400">
                      {results.filter((r) => r.status === 'approved').length}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Declined: </span>
                    <span className="font-medium text-red-600 dark:text-red-400">
                      {results.filter((r) => r.status === 'declined').length}
                    </span>
                  </div>
                  {savedCount > 0 && (
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Saved: </span>
                      <span className="font-medium text-blue-600 dark:text-blue-400">{savedCount}</span>
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                Check More Cards
              </button>
            </div>
          </div>
        )}

        {/* Results Grid */}
        {results.length > 0 && (
          <ResultGrid results={results} />
        )}
      </div>
    </div>
  );
}
