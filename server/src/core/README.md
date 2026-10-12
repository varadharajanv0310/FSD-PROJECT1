# `core/` — pure, environment-free logic

Everything in this folder is plain TypeScript with no Node.js, database or
network dependencies. The server's services wrap it with MongoDB, and the
client's standalone build (`npm run build:standalone -w client`) runs the very
same code in the browser — so both produce identical questions, scores and
reports.

Rules for this folder: no imports from `../models`, `../config`, `../ai/index`
or any Node built-in. Type-only imports (`import type`) are fine.
