Station 334 PWA FULL v7

Fix:
- Corrects the JavaScript syntax error in netlify/functions/calls.js.
- Keeps full dashboard, TORONTO FIRE header, P334/FB334 tabs, PWA icon, and multi-day selector.
- Attempts to parse IncidentType from ASC as the call type.

To update GitHub:
1. Unzip this v7 folder.
2. In your GitHub repo, replace the old files with the INSIDE contents of this folder.
3. Commit changes.
4. Netlify should redeploy.
5. Test:
   https://station334calls.netlify.app/.netlify/functions/calls?truck=p334&days=3

If the test shows JSON, the app should work.
