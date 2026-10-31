# Script rules (conversion first)

The goal of every script is the action in the CTA (a booked call, a sample request, a quote), not just awareness.

## Structure by format
- **SocialReel9x16:** hook, 3 points (signs, mistakes, specs, steps), CTA. About 70 to 90 words for 30 s.
- **Explainer16x9:** hook, problem, solution, 3 benefits with proof, CTA. About 120 to 200 words for 50 to 80 s.
- **PromoSquare1x1:** offer up front, 1 or 2 proof shots, CTA. About 40 to 60 words for 15 to 25 s.

## Hook (first 3 seconds)
- Lead with the viewer's problem or a specific stake, not the company name.
- One of: a cost ("costs you twice"), a deadline ("before the first 95 degree day"), a number ("3 numbers"), a direct question to a specific role ("Specifying anodized aluminum?").
- Under about 8 words before the first pause.

## Body
- **Benefits, not features:** say what changes for the viewer ("inspection takes minutes, not hours"), then the feature that causes it.
- **Specific numbers:** prices, minutes, degrees, percent, days, microns. Never "save money", "fast", "quality", "best-in-class", "solutions".
- **Proof next to every claim:** certification, test report, years, reviews, measured result. Unverified numbers are marked as placeholders for the client to confirm.
- **One idea per scene,** one sentence or two short ones. Each scene's narration matches its on-screen headline.
- **Speak the buyer's language:**
  - B2B industrial: risk, tolerance, lead time, standards by name (AAMA 611, ASTM B680), documentation. Calm, precise.
  - B2C home services: comfort, surprise bills, emergencies, time, price, local and fast. Friendly, plain words.

## CTA
- One action, with what they get and how fast: "Send us your drawing. Quote in 24 hours." / "Book a $29 tune-up. Tap to pick your time."
- Match the goal: lead = low-friction ask (sample, quote, checklist); sale = offer + deadline or limited slots; awareness = follow / learn more.

## Whiteboard scenes (optional)
A `whiteboard` scene draws a handwritten title, then icons and short labels stroke by stroke, each starting
on a cue word in the narration. Use it when **showing how something works** beats telling:
- Good fits: a process (anodizing steps, how an integration moves data, what a tune-up covers), a cause and
  effect chain ("dirty filter, less air, frozen coil"), a before/after.
- Not for the hook: drawing takes time, and the first 3 seconds must land a stake. Open with a normal `hook`
  scene, then draw. Not for proof or the CTA either: numbers and buttons read better as `point` and `cta`.
- **1 to 4 items per scene** (3 max on a reel), 1 to 3 words per label, title max about 5 words.
- **Cue words:** each item's `at` is one word the voice says, in order. Leave about 1.5 s of narration before
  the first cue (the title is written first), about 0.6 s between cues, and end the sentence about 1 s after
  the last cue so the finished drawing stays on screen. QC warns when cues are too close.
- The narration must say what the drawing shows: the viewer hears "dirty filter" as "Dirty filter" appears.
- Icons: any Tabler outline icon; find names with `npm run icon -- <keyword>`. Pick literal, simple icons.

## On-screen text
- Headlines: max about 6 words; stat labels max about 5 words.
- Write numbers as digits on screen ("$29", "18 µm"). In narration, write them the way they should be spoken if the voice might misread them, or add a pronunciation.

## Before showing the script
- Count words and estimate length (about 2.5 words per second).
- List every number and claim the client must confirm.
- Check against the brand's `toneOfVoice` notes.
