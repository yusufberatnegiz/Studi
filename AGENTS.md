# AGENTS.md — Master Plan for Exai (MVP)

## Project Snapshot
- **Product:** Exai — Upload past exams → practice similar questions one-by-one → improve weak topics fast.
- **Target users:** University students studying for quizzes, midterms, finals
- **Primary differentiator:** Clean UX with **one-question-at-a-time** practice + weak-topic targeting (not chat)
- **Design vibe:** Clean, minimal, fast, focused, modern
- **Success metric (MVP):** $500 revenue
- **Timeline:** ASAP (1–2 weeks)
- **Budget:** Up to $50/month
- **Stack:** Next.js (App Router) + TypeScript + Supabase Postgres + Vercel + Stripe + AI API

## Active Phase & Goal
### Phase 1 (MVP Build)
Goal: Ship an end-to-end web MVP where a user can:
1) Sign up/login → 2) Create a course → 3) Upload exam (PDF/photo/text) → 4) Generate a question set →
5) Practice questions one-by-one → 6) Submit answers → 7) Get grading + solutions →
8) See weak topics → 9) Generate targeted questions → 10) Review past question banks + past answers.

## How I Should Think
1. **Understand Intent First**: Identify what the user actually needs before acting
2. **Ask If Unsure**: If critical information is missing, ask before proceeding
3. **Plan Before Coding**: Propose a small plan, wait for approval, then implement
4. **Verify After Changes**: Run checks (lint/build/tests) or manual verification after each change
5. **Explain Trade-offs**: When recommending something, mention 2–3 alternatives and why you chose one

## Plan → Execute → Verify (Required)
- **Plan:** Write a short plan (3–7 bullets) for the next task; wait for approval.
- **Execute:** Implement one feature at a time (small PR-sized changes).
- **Verify:** After each feature:
  - Run `pnpm lint` and `pnpm build` (and tests if configured)
  - Manually verify the key UI flow in the browser
  - Fix failures before continuing

## What NOT To Do
- Do NOT delete files without explicit confirmation
- Do NOT modify database schemas without a migration/backout plan
- Do NOT add features not in the current phase
- Do NOT skip verification for “simple” changes
- Do NOT expose API keys in client code
- Do NOT store or log full exam content in analytics/logging

## Engineering Constraints (Vibe-coder friendly but strict where needed)
- Keep architecture simple (single Next.js app + Supabase).
- Server-side only for AI calls (no keys in browser).
- Use **Zod** for runtime validation for all API inputs/outputs.
- Prefer minimal dependencies; check `package.json` before adding new ones.
- Use clear naming and consistent folder structure.

## Repository Structure (Target)
```
studi/
├── AGENTS.md
├── MEMORY.md
├── REVIEW-CHECKLIST.md
├── agent_docs/
│   ├── project_brief.md
│   ├── product_requirements.md
│   ├── tech_stack.md
│   ├── testing.md
│   └── resources.md
├── app/                      # Next.js App Router routes
├── components/
├── lib/
├── .cursor/rules/
│   └── studi.md
└── CLAUDE.md
```

## Milestone Checklist (MVP)
### M1 — Foundation
- [ ] Next.js project initialized (TS, Tailwind)
- [ ] Supabase project connected (Auth + DB + Storage)
- [ ] Basic layout matches "Clean, minimal, fast, focused, modern"

### M2 — Core Data + Security
- [ ] Supabase tables created (profiles, courses, documents, document_chunks, question_sets, questions, attempts, topic_stats, jobs)
- [ ] RLS enabled + policies enforce `user_id = auth.uid()`
- [ ] Storage bucket private + per-user paths

### M3 — Upload & Extraction
- [ ] Upload exam PDF/photo/text to Storage
- [ ] Extraction job creates chunks
- [ ] Document status transitions: uploaded → processing → ready / failed

### M4 — Question Generation
- [ ] Generate question set from chunks with strict JSON schema
- [ ] Store question set + questions in DB
- [ ] “Regenerate” preserves topic/difficulty

### M5 — Practice Player + Grading
- [ ] One-question-at-a-time practice screen
- [ ] Submit answer → AI grade → save attempt
- [ ] Reveal solution + feedback UI

### M6 — Weak Topics + Targeted Practice
- [ ] Update topic_stats on every attempt
- [ ] Weak topics dashboard
- [ ] Generate targeted question set from weak topics

### M7 — History + Billing + Deploy
- [ ] Question bank history list
- [ ] Answer history per question
- [ ] Stripe checkout + plan gating (free/exam/premium)
- [ ] Deploy to Vercel (prod env vars set)

## “If AI quality is bad” Playbook
1) Confirm extraction produced good chunks (OCR/chunking)
2) Increase example questions sent to model (2 → 6)
3) Enforce strict schema + include source refs
4) Add “regenerate” and “thumbs down” feedback
5) Start with 1–2 subjects and tune prompts first

## Where to Look for Details
- Product requirements: `agent_docs/product_requirements.md`
- Tech stack and setup: `agent_docs/tech_stack.md`
- Testing & verification loop: `agent_docs/testing.md`
- Persistent workflow rules: `agent_docs/project_brief.md`
