import Link from "next/link";

export const metadata = {
  title: "Contact - Exai",
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      {/* Nav */}
      <nav className="border-b border-gray-100 dark:border-zinc-800">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="Exai" className="h-7 w-7 object-contain" />
            <span className="font-semibold text-gray-900 dark:text-white tracking-tight">Exai</span>
          </Link>
          <Link
            href="/auth"
            className="text-sm font-medium text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            Sign in
          </Link>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-10">
          <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-4">
            Contact
          </p>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Get in touch</h1>
          <p className="mt-3 text-gray-500 dark:text-zinc-400 leading-relaxed">
            Have a question, found a bug, or need help with your account? We are happy to help.
          </p>
        </div>

        <div className="space-y-8 text-gray-700 dark:text-zinc-300">

          <div className="rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Email support</h2>
            <p className="text-sm text-gray-500 dark:text-zinc-400 mb-3">
              For general questions, billing issues, or account help.
            </p>
            <a
              href="mailto:support@exai.study"
              className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline underline-offset-2"
            >
              support@exai.study
            </a>
          </div>

          <div className="rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Billing and payments</h2>
            <p className="text-sm text-gray-500 dark:text-zinc-400">
              For billing issues, refund requests, or subscription questions, email us at{" "}
              <a href="mailto:support@exai.study" className="underline underline-offset-2 text-gray-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                support@exai.study
              </a>{" "}
              with your account email and a description of the issue.
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Response time</h2>
            <p className="text-sm text-gray-500 dark:text-zinc-400">
              We typically respond within 1-2 business days.
            </p>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 dark:border-zinc-800 mt-16">
        <div className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between gap-4 text-sm text-gray-400 dark:text-zinc-500">
          <span>© {new Date().getFullYear()} Exai</span>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-gray-700 dark:hover:text-zinc-300 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-gray-700 dark:hover:text-zinc-300 transition-colors">Terms</Link>
            <a href="mailto:support@exai.study" className="hover:text-gray-700 dark:hover:text-zinc-300 transition-colors">support@exai.study</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
