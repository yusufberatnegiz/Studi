import Link from "next/link";
import { Button } from "@/components/ui/button";

// ─── Inline SVG Icons ────────────────────────────────────────────────────────

function IconUpload({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
      <polyline points="16 12 12 8 8 12" />
      <line x1="12" y1="8" x2="12" y2="20" />
    </svg>
  );
}

function IconSparkle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l2.09 6.26L20 10l-5.91 1.74L12 18l-2.09-6.26L4 10l5.91-1.74L12 2z" />
    </svg>
  );
}

function IconChart({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="3" x2="3" y2="21" />
      <line x1="3" y1="21" x2="21" y2="21" />
      <polyline points="7 16 11 10 15 13 19 7" />
    </svg>
  );
}

function IconFocus({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconCode({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

function IconCheck({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const steps = [
  {
    number: "01",
    title: "Upload your materials",
    description: "PDFs, notes, slides, and exam photos. We extract the content automatically.",
    Icon: IconUpload,
  },
  {
    number: "02",
    title: "Generate practice questions",
    description: "AI creates exam-style questions directly from your course content.",
    Icon: IconSparkle,
  },
  {
    number: "03",
    title: "Improve your weak topics",
    description: "Practice one by one, get graded, and focus where you struggle most.",
    Icon: IconChart,
  },
];

const features = [
  {
    title: "Exam-style question generation",
    description:
      "Questions that mirror your actual exam format - multiple choice, short answer, and open-ended.",
    Icon: IconSparkle,
  },
  {
    title: "One-question-at-a-time practice",
    description:
      "No distractions. One question, one answer, one piece of feedback. Focus by design.",
    Icon: IconFocus,
  },
  {
    title: "Weak topic detection",
    description:
      "Exai tracks every answer and surfaces the topics you need to practice most.",
    Icon: IconChart,
  },
  {
    title: "Coding question support",
    description:
      "Code in the browser, get AI feedback on your solutions for programming courses.",
    Icon: IconCode,
  },
];

const whyPoints = [
  {
    title: "Less messy than chat-based studying",
    description:
      "No scrolling through long conversations to find your question. Every session is clean and focused.",
  },
  {
    title: "Designed for one-question focus",
    description:
      "The entire UI is built around answering one question at a time - the way real exams work.",
  },
  {
    title: "Built around your course materials",
    description:
      "Questions come from what you actually study, not generic AI knowledge.",
  },
  {
    title: "Better for real exam preparation",
    description:
      "Simulate exam conditions, track performance over time, and know exactly where to improve.",
  },
];

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-gray-100 dark:border-zinc-800 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <img src="/logo.png" alt="Exai" className="h-7 w-7 object-contain" />
            <span className="font-semibold text-gray-900 dark:text-white tracking-tight">Exai</span>
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/auth">Sign in</Link>
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              asChild
            >
              <Link href="/auth?mode=signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 pt-24 pb-20 text-center">
        <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-4">
          For quizzes, midterms, and finals
        </p>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white tracking-tight leading-tight max-w-3xl mx-auto">
          Prepare for exams with AI that is actually built for exam practice.
        </h1>
        <p className="mt-6 text-lg text-gray-500 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed">
          Upload your course materials, generate exam-style questions, practice one at a time, and focus on your weak topics.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
          <Button
            size="lg"
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-8"
            asChild
          >
            <Link href="/auth?mode=signup">Get Started</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="#how-it-works">See How It Works</Link>
          </Button>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────────────── */}
      <section
        id="how-it-works"
        className="bg-gray-50 dark:bg-zinc-900 border-y border-gray-100 dark:border-zinc-800"
      >
        <div className="max-w-5xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-3">
              How It Works
            </p>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
              From materials to mastery in three steps
            </h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {steps.map((step) => (
              <div
                key={step.number}
                className="rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6"
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-2 py-1 rounded-md">
                    {step.number}
                  </span>
                  <step.Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-gray-500 dark:text-zinc-400 leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Core Features ─────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-3">
            Features
          </p>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
            Everything you need to study smart
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-5">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 p-6"
            >
              <div className="h-9 w-9 rounded-lg bg-blue-50 dark:bg-blue-950 flex items-center justify-center mb-4">
                <feature.Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1.5">
                {feature.title}
              </h3>
              <p className="text-sm text-gray-500 dark:text-zinc-400 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Why Exai ──────────────────────────────────────────────────────── */}
      <section className="bg-gray-50 dark:bg-zinc-900 border-y border-gray-100 dark:border-zinc-800">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-3">
                Why Exai
              </p>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight leading-snug">
                Built for exam prep. Not for general chat.
              </h2>
              <p className="mt-4 text-gray-500 dark:text-zinc-400 leading-relaxed">
                Generic AI tools are useful, but they were not designed for the focused, repetitive practice that exam preparation requires.
              </p>
            </div>
            <div className="space-y-4">
              {whyPoints.map((point) => (
                <div key={point.title} className="flex gap-3">
                  <div className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center">
                    <IconCheck className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">
                      {point.title}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                      {point.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-3">
            Pricing
          </p>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
            Start free. Upgrade when you need more.
          </h2>
          <p className="mt-3 text-gray-500 dark:text-zinc-400">
            No subscription required to get started.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-5">

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
                <Link href="/app/settings">Upgrade to Premium</Link>
              </Button>
          </div>

        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────────── */}
      <section className="border-t border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900">
        <div className="max-w-5xl mx-auto px-6 py-20 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
            Start preparing smarter with Exai
          </h2>
          <p className="mt-4 text-gray-500 dark:text-zinc-400 max-w-lg mx-auto">
            Upload your first course material and generate practice questions in minutes.
          </p>
          <div className="mt-8">
            <Button
              size="lg"
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-10"
              asChild
            >
              <Link href="/auth?mode=signup">Create Your First Course</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
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
          </div>
        </div>
      </footer>

    </div>
  );
}
