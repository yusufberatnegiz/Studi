# Testing Strategy

## Automated Tests
- MVP: optional (add later)
- If added:
  - Unit: Vitest + React Testing Library
  - E2E: Playwright

## Manual Checks (Required)
1. Auth (signup/signin/signout)
2. Create course + list courses
3. Upload PDF/photo/text → doc status updates
4. Generate question set → open it
5. Practice: answer 3 questions → see grading + solutions
6. Weak topics: see updated topics
7. History: open past sets + view past answers
8. Billing: checkout + plan gating

## Pre-commit
Run before commit:
- `pnpm lint`
- `pnpm build`
