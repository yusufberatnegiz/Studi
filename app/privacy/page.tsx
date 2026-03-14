import Link from "next/link";

export const metadata = {
  title: "Privacy Policy - Exai",
};

export default function PrivacyPage() {
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
          <p className="text-sm text-gray-400 dark:text-zinc-500 mb-2">Last updated: March 2026</p>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Privacy Policy</h1>
          <p className="mt-3 text-gray-500 dark:text-zinc-400 leading-relaxed">
            This Privacy Policy explains how Exai collects, uses, and protects your information when you use our service.
          </p>
        </div>

        <div className="space-y-10 text-gray-700 dark:text-zinc-300">

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">1. Introduction</h2>
            <p className="leading-relaxed">
              Exai is a study tool that helps university students prepare for exams using AI-generated practice questions. Users can upload past exams or course materials, and Exai generates similar exam-style questions to help them study effectively, track weak topics, and improve their performance over time.
            </p>
            <p className="leading-relaxed">
              By using Exai, you agree to the collection and use of information as described in this Privacy Policy.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">2. Information We Collect</h2>
            <p className="leading-relaxed">
              We collect only the information necessary to provide and improve the service.
            </p>
            <p className="font-medium text-gray-900 dark:text-white">Account Information</p>
            <p className="leading-relaxed">
              When you create an account, we collect your email address to identify your account and send important service notifications such as authentication emails or account-related updates.
            </p>
            <p className="font-medium text-gray-900 dark:text-white">Uploaded Materials</p>
            <p className="leading-relaxed">
              You may upload course materials such as PDFs, images, or documents. These materials are used to generate AI-based practice questions and topic insights related to your studies.
            </p>
            <p className="font-medium text-gray-900 dark:text-white">Study Data</p>
            <p className="leading-relaxed">
              We store generated questions, your answers, grading results, and topic performance data to help track your progress and identify weak areas.
            </p>
            <p className="font-medium text-gray-900 dark:text-white">Usage Data</p>
            <p className="leading-relaxed">
              We may collect limited technical and usage information necessary to operate, maintain, and improve the service. This may include basic interaction data, feature usage, and system diagnostics.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">3. Uploaded Materials</h2>
            <p className="leading-relaxed">
              Files and text that you upload to Exai are used solely to generate practice questions and topic insights specific to your courses.
            </p>
            <p className="leading-relaxed">
              Your materials are stored securely and are never shared with other users. Each user&apos;s data is isolated and accessible only to their account.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">4. AI Processing</h2>
            <p className="leading-relaxed">
              To generate practice questions, explanations, and grading feedback, some content you upload or submit may be processed by AI models provided by third-party services.
            </p>
            <p className="leading-relaxed">
              For example, Exai may use services provided by OpenAI to process text and generate study materials. This processing occurs on a per-request basis to operate core features of the service.
            </p>
            <p className="leading-relaxed">
              We do not use your uploaded materials to train AI models.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">5. Third-Party Services</h2>
            <p className="leading-relaxed">
              Exai relies on trusted third-party infrastructure providers to operate the service. These providers may process limited information necessary to perform their functions.
            </p>
            <p className="leading-relaxed">Examples include services such as:</p>
            <ul className="space-y-2 pl-4">
              {[
                "Supabase for authentication and database services",
                "Vercel for application hosting and infrastructure",
                "Paddle for payment processing",
                "OpenAI for AI-powered text processing",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 leading-relaxed">
                  <span className="mt-2 w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-zinc-500 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="leading-relaxed">
              These providers process data only as required to operate the service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">6. Payments</h2>
            <p className="leading-relaxed">
              Payments for premium features or subscriptions are processed by our payment provider, Paddle.
            </p>
            <p className="leading-relaxed">
              Exai does not store full payment card information. Payment details are handled securely by Paddle according to their own privacy and security policies.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">7. Cookies and Authentication</h2>
            <p className="leading-relaxed">
              Exai may use cookies or authentication tokens to maintain user sessions, keep users signed in, and ensure the security of accounts.
            </p>
            <p className="leading-relaxed">
              These technologies are used only to operate the service and provide a reliable user experience.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">8. Data Security</h2>
            <p className="leading-relaxed">
              We take reasonable technical and organizational measures to protect your account and uploaded materials from unauthorized access, loss, or misuse.
            </p>
            <p className="leading-relaxed">
              Your data is stored using industry-standard cloud infrastructure with appropriate access controls in place.
            </p>
            <p className="leading-relaxed">
              However, no method of transmission over the internet or electronic storage is completely secure. While we work to protect your data, we cannot guarantee absolute security.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">9. Data Retention</h2>
            <p className="leading-relaxed">
              You can delete your courses and uploaded materials at any time from within the app.
            </p>
            <p className="leading-relaxed">
              When you delete a course, associated materials, generated questions, and answer history related to that course are removed.
            </p>
            <p className="leading-relaxed">
              If you wish to delete your account entirely, you may contact us and we will remove your data from the service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">10. Children&apos;s Privacy</h2>
            <p className="leading-relaxed">
              Exai is not intended for children under the age of 13.
            </p>
            <p className="leading-relaxed">
              We do not knowingly collect personal information from children under this age. If we become aware that such information has been collected, we will take steps to remove it.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">11. Changes to This Policy</h2>
            <p className="leading-relaxed">
              We may update this Privacy Policy from time to time as the service evolves.
            </p>
            <p className="leading-relaxed">
              When we make significant changes, we will update the &quot;Last updated&quot; date at the top of this page.
            </p>
            <p className="leading-relaxed">
              Continued use of Exai after changes are posted constitutes acceptance of the updated Privacy Policy.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">12. Contact</h2>
            <p className="leading-relaxed">
              If you have questions about this Privacy Policy or how your data is handled, you may contact us at{" "}
              <a href="mailto:support@exai.study" className="underline underline-offset-2 hover:text-gray-900 dark:hover:text-white transition-colors">
                support@exai.study
              </a>
            </p>
          </section>

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
