# CLAUDE.md — Claude Code Configuration for Exai

## Project Context
**App:** Exai
**Stack:** Next.js + Supabase + Vercel + Stripe + AI API
**Stage:** MVP Development
**User Level:** A (Vibe-coder)

## Directives
1. Always read `AGENTS.md` first.
2. Use `agent_docs/` for stack/requirements/testing.
3. Plan-first: propose a brief plan and wait for approval before coding.
4. Implement incrementally (one feature at a time).
5. Verify after changes: `pnpm lint`, `pnpm build`, and manual checks.
6. Security: AI calls server-side only; never expose secrets.

## Commands
- `pnpm dev`
- `pnpm lint`
- `pnpm build`
