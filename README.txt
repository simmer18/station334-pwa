
Station 334 PWA Vercel v13

This version is specifically for Vercel.

Changes:
- Adds /api/calls.js for Vercel serverless functions
- Removes package.json so Vercel does not try an unnecessary build
- Keeps the PWA, logo, live call board, call types, and 7am shift-day logic

Upload to GitHub:
1. Unzip this folder.
2. Upload the INSIDE contents to GitHub over the existing files.
3. Commit changes.
4. Vercel redeploys automatically.

Test:
https://YOUR-VERCEL-URL.vercel.app/api/calls?truck=p334&days=3
