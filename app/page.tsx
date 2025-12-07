import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 w-full max-w-5xl items-center justify-center font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-8">
          Card Checker Migration
        </h1>
        <p className="text-center mb-8 text-lg">
          Welcome to the new Card Checker web application. This platform is
          being migrated from the legacy Python bot to a modern Next.js-based
          interface.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto mb-8">
          <div className="p-6 border border-gray-300 dark:border-gray-700 rounded-lg">
            <h3 className="font-bold text-lg mb-2">✨ New Features</h3>
            <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <li>• Real-time card validation</li>
              <li>• Animated result cards</li>
              <li>• Batch processing (5 concurrent)</li>
              <li>• Auto-save to Supabase</li>
              <li>• Dark mode support</li>
            </ul>
          </div>
          
          <div className="p-6 border border-gray-300 dark:border-gray-700 rounded-lg">
            <h3 className="font-bold text-lg mb-2">🚀 Plans Completed</h3>
            <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <li>• ✅ Input Card Component</li>
              <li>• ✅ Result Grid with States</li>
              <li>• ✅ Batch Processing Hook</li>
              <li>• ✅ Supabase Persistence</li>
            </ul>
          </div>
        </div>
        
        <div className="flex justify-center gap-4">
          <Link
            href="/checker"
            className="rounded-lg bg-blue-600 px-6 py-3 text-white font-semibold hover:bg-blue-700 transition-colors"
          >
            Try Card Checker
          </Link>
          <Link
            href="/dashboard"
            className="rounded-lg border border-gray-300 dark:border-gray-700 px-6 py-3 font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            View Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
