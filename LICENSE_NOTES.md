# Remotion License Notes

Summary of Remotion's license terms as of 2026-10-29, read from the official docs source
(`remotion-dev/remotion/packages/docs/docs/license/faq.mdx`). This is a summary, not legal advice.
The binding text is the [Terms and Conditions](https://www.remotion.dev/docs/terms) and
[LICENSE.md](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md). Re-check before each new client.

## Free License
Free, with full functionality, for:
- individuals (personal or commercial use)
- organizations or teams of **up to 3 people** (total headcount, not just Remotion users)
- non-profit / not-for-profit organizations (as defined in the terms)
- evaluation, before commercial use

## Company License (4+ people)
Required when the organization's total headcount is 4 or more. Buy at [remotion.pro/license](https://remotion.pro/license).
- **Remotion for Creators:** $25/month per person who writes Remotion code (by hand or with AI coding tools). No per-render fee.
- **Remotion for Automators:** $0.01 per render, minimum $100/month. For owning code that renders programmatically
  (for example `npx remotion render` in an automated pipeline, `renderMedia()`, Lambda, the `<Player>`).
- Combined minimum spend of $100/month applies if both are active.
- Enterprise License: same base pricing, $500/month minimum, adds signed agreements, paperwork and priority support.

## Agency and client work (who is responsible)
The rule is about who owns or operates the **Remotion project**, not who owns the final video:
- **You deliver only the finished MP4.** The client never gets or runs the project. Only **your agency's headcount**
  counts. 3 or fewer people: Free License. 4 or more: your agency needs a Company License.
- **The client owns or operates the Remotion project** (you hand over the code, or you work in the same project together).
  Both companies' headcounts are **added together** for the 4-person threshold, and the license must be bought by
  **the entity that ultimately owns the IP of the Remotion project** (the agency can administer it for the client).
- **You bring in other agencies or freelancers** on the same project: their headcount is added to yours.

## Other notes
- Any commercial use is allowed, except reselling Remotion itself or letting others render their own Remotion code through you.
- Server-side rendering has no automatic telemetry for Free License and "Creators" users.

## Whiteboard scene assets (checked 2026-10-31)
All are free for commercial use, including client videos. The video itself needs no attribution; keep these
notices in the repo.
| Asset | Where it lives | License | Source |
|---|---|---|---|
| Tabler icons 3.50.0 (5,203 outline icons) | `src/whiteboard/icons.json` (path data) | MIT, © Paweł Kuna | npm `@tabler/icons`, tabler.io/icons |
| EMS Tech, EMS Readability, EMS Felix (single-line fonts) | `src/whiteboard/fonts.json` (glyph paths) | SIL Open Font License 1.1, by Sheldon B. Michaels (derivatives of Architects Daughter, Source Sans Pro, Felipa) | npm `hersheytext` 2.0.0 (MIT) `svg_fonts/` |
| Rough.js 4.6.6 (hand-drawn arrows, circles, underlines) | npm dependency | MIT | npm `roughjs` |
| `@remotion/paths` 4.0.539 | npm dependency | MIT (npm metadata); part of Remotion, see the Remotion license above | npm |
| Built-in marker drawing | `src/whiteboard/Marker.tsx` | Our own vector drawing | this repo |

OFL note: the fonts may be used, embedded and modified freely, but may not be sold on their own, and
modified versions must not use the original font names. We only convert them to path data for rendering.

**Hand images:** do not reuse hand PNGs from other projects unless their license is stated (for example,
`srt-whiteboard-animation`'s `drawing-hand.png` has no stated source or license). The US Copyright Office
(Copyrightability report, January 2025) says images generated from prompts alone are not copyrightable, so an
AI-generated hand can be used but not owned exclusively. A photo of your own hand is the cleanest option.

## Per-client decision log
| Client | Who owns the project? | Combined headcount | License needed | Decided on |
|---|---|---|---|---|
| (example) Demo HVAC | Us (MP4 delivery only) | 2 | Free | |
