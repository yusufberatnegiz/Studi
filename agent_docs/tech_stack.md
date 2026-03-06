# Tech Stack & Tools

## Stack (MVP)
- **Frontend:** Next.js (App Router) + TypeScript
- **Backend:** Next.js Route Handlers / API routes (server-side)
- **Database:** Supabase Postgres
- **Auth:** Supabase Auth
- **Storage:** Supabase Storage (private bucket)
- **Styling:** Tailwind CSS + shadcn/ui
- **Payments:** Stripe
- **Hosting:** Vercel
- **Validation:** Zod
- **AI:** LLM API (OpenAI or Anthropic) called server-side only

## Setup Commands
```bash
pnpm create next-app studi --ts --tailwind --eslint --app
cd studi
pnpm add @supabase/supabase-js zod
pnpm dev
```

## Env Vars
Create `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # server only
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
AI_API_KEY=...
```

## Error Handling (API)
```ts
import { z } from "zod";
import { NextResponse } from "next/server";

const Schema = z.object({ courseId: z.string().uuid() });

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = Schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  return NextResponse.json({ ok: true });
}
```

## Naming Conventions
- Components: `PascalCase`
- Functions: `camelCase`
- DB tables: `snake_case`
