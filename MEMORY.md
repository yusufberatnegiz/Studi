# MEMORY.md

## 🏗️ Active Phase & Goal
**Phase:** MVP Build (Phase 1)  
**Goal:** Ship Exai MVP end-to-end:
- Upload exam (PDF/photo/text) → extract → generate question set → practice one-by-one → grade + solutions → weak topics → targeted practice → history → billing → deploy.

## ✅ Current Status
- PRD: created
- Tech Design: created
- Agent instruction system: ready

## 🔜 Next Tasks (Top 10)
1. Initialize Next.js app and push to GitHub
2. Create Supabase project, set env vars, connect locally
3. Create DB tables + RLS policies
4. Build auth + protected layout
5. Build courses dashboard
6. Build upload flow to Supabase Storage
7. Implement extraction job + chunk storage
8. Implement question generation endpoint + store sets
9. Implement practice player + grading + attempts
10. Implement weak topics + targeted practice + history + billing

## 🔒 Guardrails
- Keep costs under Up to $50/month
- Keep AI keys server-side only
- No scope creep beyond MVP features
