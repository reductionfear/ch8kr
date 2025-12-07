# Card Checker UI Components

This directory contains the Next.js implementation of the modular card-based UI to replace the Python Telegram bot.

## Components

### 1. CheckerInputCard (`components/CheckerInputCard.tsx`)
**Sub-plan 3.1: The "Input Card" Component**

A React component that:
- Accepts text input (bulk list) or file upload
- Implements regex parsing logic ported from `bot1.py` (`parse_dummys_from_text`)
- Uses the `fast_pattern` regex: `(\d{13,19})\s*\|\s*(\d{1,2})\s*\|\s*(\d{2,4})\s*\|\s*(\d{3,4})`
- Validates and extracts CC details (Number|Month|Year|CVV) in real-time
- Shows validation feedback to the user

**Format**: `4242424242424242|12|2025|123`

### 2. ResultGrid (`components/ResultGrid.tsx`)
**Sub-plan 3.2: The "Live Result" Cards**

A responsive grid component that:
- Displays results in a CSS Grid layout
- Shows three states with visual feedback:
  - **Pending**: Skeleton loader with animated pulse
  - **Approved** (Live): Green border/glow with `SuccessCard` variant
  - **Declined** (Dead): Red opacity with `ErrorCard` variant
- Uses Framer Motion for smooth entry animations
- Updates in real-time as results arrive

## Hooks

### useCardRunner (`hooks/useCardRunner.ts`)
**Sub-plan 4.1 & 4.2: Batch Processing & Persistence**

A custom React hook that:
- Manages batch card checking with **concurrency control** (default: 5 concurrent requests)
- Ported from `bot2.py` lines 35-40 (ThreadPoolExecutor logic)
- Updates state in real-time as results arrive
- **Automatically saves "Approved" cards to Supabase** (`results` table)
- Provides progress tracking and cancellation support
- Returns: `{ results, isRunning, progress, savedCount, runBatch, cancelBatch, reset }`

## Pages

### Checker Page (`checker/page.tsx`)
A complete integration demo that:
- Combines all components (Input, Grid, Hook)
- Shows progress bar during processing
- Displays summary statistics on completion
- Supports batch cancellation and reset

## Usage

```tsx
import { CheckerInputCard } from './components/CheckerInputCard';
import { ResultGrid } from './components/ResultGrid';
import { useCardRunner } from './hooks/useCardRunner';

export default function CheckerPage() {
  const { results, isRunning, runBatch } = useCardRunner(5);

  return (
    <>
      <CheckerInputCard onCardsExtracted={runBatch} />
      <ResultGrid results={results} />
    </>
  );
}
```

## Features

✅ Real-time card validation (regex from Python bot)  
✅ Responsive grid with animations  
✅ Concurrency control (5 simultaneous checks)  
✅ Automatic Supabase persistence for approved cards  
✅ Progress tracking and cancellation  
✅ Dark mode support  
✅ TypeScript type safety  

## Next Steps

- [ ] Add toast notifications for saved cards (mentioned in Sub-plan 4.2)
- [ ] Implement site selection UI
- [ ] Add detailed result viewer
- [ ] Connect to actual `/api/check` endpoint with gateway logic
