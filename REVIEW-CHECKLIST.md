# REVIEW-CHECKLIST.md

## Before every commit
- [ ] `pnpm lint` passes
- [ ] `pnpm build` passes
- [ ] No secrets in code or logs
- [ ] API routes validated with Zod
- [ ] Manual UI check for the changed flow
- [ ] DB changes include migration and are reversible

## Before deploying to production
- [ ] RLS enabled and tested
- [ ] Storage bucket is private
- [ ] Stripe webhook tested
- [ ] AI failure handling + user-friendly errors
- [ ] Rate limits + caps enforced by plan
