
Station 334 PWA FULL v12

Fix:
- The Netlify backend now rewrites each call's date to its shift date before sending it to the app.
- Calls from 00:00–06:59 are returned as the previous day.
- Example: 05:50 on May 14 is sent to the app as May 13.
- Adds cache-busting to the live API request.

Update:
1. Unzip v12.
2. Upload the INSIDE contents to GitHub over the existing files.
3. Commit changes.
4. Let Netlify redeploy.
5. Test the function URL:
   https://station334calls.netlify.app/.netlify/functions/calls?truck=p334&days=3
Look for the 05:50 call. It should have "date":"2026-05-13" and "rawDate":"2026-05-14".
