'use client';

import { useState, useCallback, useRef } from 'react';
import { CardData } from '../components/CheckerInputCard';
import { CardResult } from '../components/ResultGrid';
import { createSupabaseClient } from '@/lib/supabase/client';

/**
 * Custom React hook for batch processing of card checks
 * Ported from bot2.py lines 35-40 ThreadPoolExecutor logic
 * Limits concurrency to avoid overwhelming the API
 * 
 * Sub-plan 4.2: Automatically saves "Live" (approved) cards to Supabase
 */
export function useCardRunner(concurrencyLimit: number = 5) {
  const [results, setResults] = useState<CardResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [savedCount, setSavedCount] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const supabaseRef = useRef<ReturnType<typeof createSupabaseClient> | null>(null);

  // Initialize Supabase client
  if (!supabaseRef.current) {
    try {
      supabaseRef.current = createSupabaseClient();
    } catch (error) {
      console.warn('Supabase client not initialized:', error);
    }
  }

  /**
   * Save approved result to Supabase
   */
  const saveToSupabase = async (result: CardResult): Promise<boolean> => {
    if (!supabaseRef.current) {
      console.warn('Supabase client not available');
      return false;
    }

    try {
      const { data, error } = await supabaseRef.current
        .from('results')
        .insert({
          card_number: result.number,
          exp_month: result.month,
          exp_year: result.year,
          cvv: result.cvv,
          status: result.status,
          message: result.message,
          checked_at: new Date(result.timestamp || Date.now()).toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase save error:', error);
        return false;
      }

      console.log('Saved to Supabase:', data);
      return true;
    } catch (error) {
      console.error('Failed to save to Supabase:', error);
      return false;
    }
  };

  /**
   * Process a single card check
   */
  const checkCard = async (
    card: CardData,
    signal: AbortSignal
  ): Promise<CardResult> => {
    const cardId = `${card.number}-${Date.now()}-${Math.random()}`;

    try {
      const response = await fetch('/api/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(card),
        signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        id: cardId,
        ...card,
        status: data.status === 'approved' ? 'approved' : 'declined',
        message: data.message || data.code || 'Unknown result',
        timestamp: Date.now(),
      };
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw error; // Re-throw abort errors
      }

      return {
        id: cardId,
        ...card,
        status: 'declined',
        message: error.message || 'Check failed',
        timestamp: Date.now(),
      };
    }
  };

  /**
   * Process cards with concurrency control
   * Similar to Python's ThreadPoolExecutor with max_workers
   */
  const runBatch = useCallback(
    async (cards: CardData[]) => {
      if (isRunning) {
        console.warn('A batch is already running');
        return;
      }

      setIsRunning(true);
      setProgress({ completed: 0, total: cards.length });
      setResults([]);

      // Create abort controller for cancellation
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      // Initialize pending results
      const initialResults: CardResult[] = cards.map((card, index) => ({
        id: `${card.number}-${Date.now()}-${index}`,
        ...card,
        status: 'pending',
        timestamp: Date.now(),
      }));
      setResults(initialResults);

      try {
        // Process cards with concurrency limit
        const queue = [...cards];
        const active: Promise<CardResult>[] = [];
        const completedResults: CardResult[] = [];
        let completedCount = 0;

        while (queue.length > 0 || active.length > 0) {
          // Check if aborted
          if (abortController.signal.aborted) {
            break;
          }

          // Fill up to concurrency limit
          while (active.length < concurrencyLimit && queue.length > 0) {
            const card = queue.shift()!;
            const promise = checkCard(card, abortController.signal)
              .then(async (result) => {
                completedCount++;
                completedResults.push(result);
                
                // Sub-plan 4.2: Save approved cards to Supabase
                if (result.status === 'approved') {
                  const saved = await saveToSupabase(result);
                  if (saved) {
                    setSavedCount((prev) => prev + 1);
                    // TODO: Display 'Saved' toast notification (not implemented yet)
                    console.log('✓ Card saved to database');
                  }
                }
                
                // Update progress
                setProgress({ completed: completedCount, total: cards.length });
                
                // Update results in real-time
                setResults((prev) => {
                  const index = prev.findIndex((r) => 
                    r.number === result.number && 
                    r.month === result.month && 
                    r.year === result.year
                  );
                  if (index >= 0) {
                    const updated = [...prev];
                    updated[index] = result;
                    return updated;
                  }
                  return prev;
                });

                return result;
              })
              .catch((error) => {
                if (error.name === 'AbortError') {
                  throw error;
                }
                // Already handled in checkCard, just pass through
                return error;
              });

            active.push(promise);
          }

          // Wait for at least one to complete
          if (active.length > 0) {
            const completed = await Promise.race(active);
            const index = active.indexOf(Promise.resolve(completed));
            active.splice(index, 1);
          }
        }

        // Wait for all remaining
        if (active.length > 0) {
          await Promise.all(active);
        }

      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('Batch processing error:', error);
        }
      } finally {
        setIsRunning(false);
        abortControllerRef.current = null;
      }
    },
    [isRunning, concurrencyLimit]
  );

  /**
   * Cancel the current batch
   */
  const cancelBatch = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsRunning(false);
    }
  }, []);

  /**
   * Reset results and state
   */
  const reset = useCallback(() => {
    if (isRunning) {
      cancelBatch();
    }
    setResults([]);
    setProgress({ completed: 0, total: 0 });
    setSavedCount(0);
  }, [isRunning, cancelBatch]);

  return {
    results,
    isRunning,
    progress,
    savedCount,
    runBatch,
    cancelBatch,
    reset,
  };
}
