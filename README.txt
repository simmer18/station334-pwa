Station 334 Vercel Build - Operational Sort Update

This version fixes shift call order.

For a 7am-to-7am shift, calls display newest operationally first:
- 00:00 to 06:59 at the top
- then 23:59 down to 07:00

Example:
05:50
18:02
16:51
11:41
08:04

Deploy:
1. Unzip this file.
2. Upload the INSIDE contents to GitHub over the existing files.
3. Commit changes.
4. Vercel redeploys automatically.
