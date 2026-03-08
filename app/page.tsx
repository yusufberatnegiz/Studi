import Link from "next/link";
import { Button } from "@/components/ui/button";

const features = [
  {
    title: "Upload any exam",
    description: "PDF, photo, or paste text. We handle the extraction.",
  },
  {
    title: "AI-generated questions",
    description: "Similar exam-style questions generated instantly from your materials.",
  },
  {
    title: "Target weak topics",
    description: "See exactly where you're struggling and drill those first.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-semibold text-gray-900 tracking-tight">
            Exai
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/auth">Sign in</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/auth">Get started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 py-24 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight leading-tight">
          Practice smarter
          <br />
          for your exams
        </h1>
        <p className="mt-5 text-lg text-gray-500 max-w-xl mx-auto leading-relaxed">
          Upload your past exams and get AI-generated practice questions.
          Study one question at a time and crush your weak topics fast.
        </p>
        <div className="mt-8">
          <Button size="lg" asChild>
            <Link href="/auth">Start for free</Link>
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="grid sm:grid-cols-3 gap-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-gray-100 bg-gray-50 p-6"
            >
              <h3 className="font-semibold text-gray-900">{f.title}</h3>
              <p className="mt-1.5 text-sm text-gray-500 leading-relaxed">
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
