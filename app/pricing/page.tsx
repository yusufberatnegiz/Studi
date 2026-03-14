import Link from "next/link";
import { Button } from "@/components/ui/button";

function IconCheck({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

const FREE_FEATURES = [
  "3 courses",
  "Up to 10 questions per generation",
  "PDF and text uploads",
  "Practice mode with AI grading",
  "Weak topic tracking",
];

const COURSE_FEATURES = [
  "30 questions per generation for that course",
  "No file size limit for that course",
  "Unlimited materials for that course",
  "One-time payment — no subscription",
];

const PREMIUM_FEATURES = [
  "Everything in Free",
  "Unlimited courses",
  "Up to 30 questions per generation",
  "No file size limit on uploads",
  "All current and future premium features",
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-gray-100 dark:border-zinc-800 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="Exai" className="h-7 w-7 object-contain" />
            <span className="font-semibold text-gray-900 dark:text-white tracking-tight">Exai</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/auth">Sign in</Link>
            </Button>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" asChild>
              <Link href="/auth?mode=signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Header */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-12 text-center">
        <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-4">
          Pricing
        </p>
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white tracking-tight leading-tight">
          Simple, transparent pricing
        </h1>
        <p className="mt-4 text-lg text-gray-500 dark:text-zinc-400 max-w-xl mx-auto">
          Start free. Upgrade a single course for $4, or go fully unlimited for $8/month.
        </p>
      </section>

      {/* Plans */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="grid sm:grid-cols-3 gap-6 items-stretch">

          {/* Free */}
          <div className="rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 flex flex-col">
            <div className="mb-5">
              <span className="text-xs font-bold text-gray-400 dark:text-zinc-500 bg-gray-50 dark:bg-zinc-800 px-2 py-1 rounded-md uppercase tracking-widest">
                Free
              </span>
              <div className="mt-4 flex items-end gap-1">
                <span className="text-4xl font-bold text-gray-900 dark:text-white">$0</span>
              </div>
              <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">Free forever</p>
            </div>
            <ul className="space-y-3 flex-1 mb-8">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-gray-500 dark:text-zinc-400">
                  <IconCheck className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/auth?mode=signup">Get started free</Link>
            </Button>
          </div>

          {/* Course Upgrade */}
          <div className="rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 flex flex-col">
            <div className="mb-5">
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-2 py-1 rounded-md uppercase tracking-widest">
                Course
              </span>
              <div className="mt-4 flex items-end gap-1">
                <span className="text-4xl font-bold text-gray-900 dark:text-white">$4</span>
                <span className="text-sm text-gray-400 dark:text-zinc-500 mb-1.5">/ course</span>
              </div>
              <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">One-time per course</p>
            </div>
            <ul className="space-y-3 flex-1 mb-8">
              {COURSE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-gray-500 dark:text-zinc-400">
                  <IconCheck className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" asChild>
              <Link href="/auth?mode=signup">Upgrade a course</Link>
            </Button>
          </div>

          {/* Premium */}
          <div className="rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 flex flex-col">
            <div className="mb-5">
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-2 py-1 rounded-md uppercase tracking-widest">
                Premium
              </span>
              <div className="mt-4 flex items-end gap-1">
                <span className="text-4xl font-bold text-gray-900 dark:text-white">$8</span>
                <span className="text-sm text-gray-400 dark:text-zinc-500 mb-1.5">/ month</span>
              </div>
              <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">Cancel anytime</p>
            </div>
            <ul className="space-y-3 flex-1 mb-8">
              {PREMIUM_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-gray-500 dark:text-zinc-400">
                  <IconCheck className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" asChild>
              <Link href="/auth?mode=signup">Get Premium</Link>
            </Button>
          </div>

        </div>
      </section>
    </div>
  );
}
