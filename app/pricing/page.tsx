import Link from "next/link";
import { Button } from "@/components/ui/button";

function IconCheck({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

const freePlanFeatures = [
  "2 courses",
  "Up to 15 materials per course",
  "15 question generations per day",
  "10 OCR image scans per day",
];

const perCoursePlanFeatures = [
  "Unlimited generation for that course",
  "Unlimited OCR for that course",
  "Unlimited materials for that course",
];

const premiumPlanFeatures = [
  "All courses unlocked",
  "Unlimited generation across all courses",
  "Unlimited OCR across all courses",
  "Unlimited materials across all courses",
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
            <p className="text-xs font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-3">
              Free
            </p>
            <div className="flex items-end gap-1 mb-1">
              <span className="text-3xl font-bold text-gray-900 dark:text-white">$0</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-zinc-400 mb-6">Always free</p>
            <ul className="space-y-2.5 mb-6 flex-1">
              {freePlanFeatures.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-gray-600 dark:text-zinc-300">
                  <IconCheck className="h-4 w-4 text-gray-400 dark:text-zinc-500 mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/auth?mode=signup">Get Started</Link>
            </Button>
          </div>

          {/* Premium Course */}
          <div className="rounded-xl border-2 border-blue-600 dark:border-blue-500 bg-white dark:bg-zinc-950 p-6 flex flex-col">
            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-3">
              Premium Course
            </p>
            <div className="flex items-end gap-1 mb-1">
              <span className="text-3xl font-bold text-gray-900 dark:text-white">$4</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-zinc-400 mb-6">per course, one-time</p>
            <ul className="space-y-2.5 mb-6 flex-1">
              {perCoursePlanFeatures.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-gray-600 dark:text-zinc-300">
                  <IconCheck className="h-4 w-4 text-blue-500 dark:text-blue-400 mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" asChild>
              <Link href="/auth?mode=signup">Upgrade a Course</Link>
            </Button>
          </div>

          {/* Premium Full */}
          <div className="rounded-xl border-2 border-emerald-600 dark:border-emerald-500 bg-white dark:bg-zinc-950 p-6 flex flex-col">
            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-3">
              Premium
            </p>
            <div className="flex items-end gap-1 mb-1">
              <span className="text-3xl font-bold text-gray-900 dark:text-white">$8</span>
              <span className="text-sm text-gray-400 dark:text-zinc-500 mb-1">/mo</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-zinc-400 mb-6">All courses included</p>
            <ul className="space-y-2.5 mb-6 flex-1">
              {premiumPlanFeatures.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-gray-600 dark:text-zinc-300">
                  <IconCheck className="h-4 w-4 text-emerald-500 dark:text-emerald-400 mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" asChild>
              <Link href="/auth?mode=signup">Upgrade to Premium</Link>
            </Button>
          </div>

        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 dark:border-zinc-800">
        <div className="max-w-5xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-400 dark:text-zinc-500">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Exai" className="h-5 w-5 object-contain opacity-60" />
            <span>Exai - AI-powered exam preparation</span>
          </div>
          <div className="flex items-center gap-4">
            <span>© {new Date().getFullYear()} Exai</span>
            <Link href="/privacy" className="hover:text-gray-700 dark:hover:text-zinc-300 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-gray-700 dark:hover:text-zinc-300 transition-colors">Terms</Link>
            <a href="mailto:support@exai.study" className="hover:text-gray-700 dark:hover:text-zinc-300 transition-colors">support@exai.study</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
