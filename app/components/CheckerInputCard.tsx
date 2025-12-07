'use client';

import { useState, useCallback } from 'react';
import { Upload } from 'lucide-react';

export interface CardData {
  number: string;
  month: number;
  year: number;
  cvv: string;
}

interface CheckerInputCardProps {
  onCardsExtracted: (cards: CardData[]) => void;
}

/**
 * Port of the regex logic from bot1.py's parse_dummys_from_text
 * OPTIMIZATION: Fast path for well-formatted cards (most common case)
 * This regex handles pipe-delimited format: 1234567890123456|12|2025|123
 */
export function CheckerInputCard({ onCardsExtracted }: CheckerInputCardProps) {
  const [inputText, setInputText] = useState('');
  const [validCards, setValidCards] = useState<CardData[]>([]);
  const [error, setError] = useState<string | null>(null);

  /**
   * Ported from bot1.py lines 51-78: fast_pattern for pipe-delimited format
   * Pattern: (\d{13,19})\s*\|\s*(\d{1,2})\s*\|\s*(\d{2,4})\s*\|\s*(\d{3,4})
   */
  const parseCards = useCallback((text: string): CardData[] => {
    const cards: CardData[] = [];
    const seenCards = new Set<string>();

    // Fast path: pipe-delimited format (1234567890123456|12|2025|123)
    const fastPattern = /(\d{13,19})\s*\|\s*(\d{1,2})\s*\|\s*(\d{2,4})\s*\|\s*(\d{3,4})/g;
    let match;

    while ((match = fastPattern.exec(text)) !== null) {
      try {
        const number = match[1];
        const month = parseInt(match[2], 10);
        let year = parseInt(match[3], 10);
        const cvv = match[4];

        // Validate month (must be 1-12)
        if (month < 1 || month > 12) {
          continue;
        }

        // Handle 2-digit vs 4-digit year
        if (year < 100) {
          year += 2000;
        }

        // Create unique key for deduplication
        const cardKey = `${number}|${month}|${year}|${cvv}`;
        
        if (!seenCards.has(cardKey)) {
          seenCards.add(cardKey);
          cards.push({
            number,
            month,
            year,
            cvv,
          });
        }
      } catch (e) {
        // Skip invalid matches
        continue;
      }
    }

    return cards;
  }, []);

  /**
   * Real-time validation as user types
   */
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setInputText(text);
    setError(null);

    if (text.trim()) {
      const extracted = parseCards(text);
      setValidCards(extracted);
      
      if (extracted.length === 0) {
        setError('No valid cards found. Use format: Number|Month|Year|CVV');
      }
    } else {
      setValidCards([]);
    }
  }, [parseCards]);

  /**
   * Handle file upload
   */
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setInputText(text);
      
      const extracted = parseCards(text);
      setValidCards(extracted);
      
      if (extracted.length === 0) {
        setError('No valid cards found in file');
      } else {
        setError(null);
      }
    };
    reader.readAsText(file);
  }, [parseCards]);

  /**
   * Submit cards for processing
   */
  const handleSubmit = useCallback(() => {
    if (validCards.length > 0) {
      onCardsExtracted(validCards);
    }
  }, [validCards, onCardsExtracted]);

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
        Card Input
      </h2>
      
      {/* File Upload */}
      <div className="mb-4">
        <label
          htmlFor="file-upload"
          className="flex items-center justify-center w-full p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
        >
          <Upload className="w-5 h-5 mr-2 text-gray-500 dark:text-gray-400" />
          <span className="text-sm text-gray-600 dark:text-gray-300">
            Upload .txt file or paste below
          </span>
          <input
            id="file-upload"
            type="file"
            accept=".txt"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>

      {/* Text Area Input */}
      <div className="mb-4">
        <textarea
          value={inputText}
          onChange={handleInputChange}
          placeholder={"Paste cards here (one per line)\nFormat: 4242424242424242|12|2025|123"}
          className="w-full h-64 p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Validation Feedback */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 rounded text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {validCards.length > 0 && (
        <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-700 rounded text-green-700 dark:text-green-300 text-sm">
          ✓ Found {validCards.length} valid card{validCards.length !== 1 ? 's' : ''}
        </div>
      )}

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={validCards.length === 0}
        className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
      >
        Check {validCards.length} Card{validCards.length !== 1 ? 's' : ''}
      </button>
    </div>
  );
}
