# Save Me From Me: beat sheet (Phase 1, for approval)

**Song:** 4:33, half-time feel at **81 BPM** (one bar = about 3 s, 87 bars). Loudness -16 LUFS.
**Format:** 16:9, 1920 x 1080. **No on-screen lyrics.**
All times below are snapped to the song's beat grid (`grid.json`). Lyric times come from aligning your lyrics to the isolated vocals.

## What the analysis found
- **The final chorus is sung differently** from the written lyrics: "So save me, save me, oh no / So save me, save me, save me, save me" (3:33 to 4:00).
- **Verse 1 is almost drumless** (intimate). **Pre-chorus 2 drops the bass** (tension). These are natural quiet spots.
- **The two instrumental parts are loud, not calm:** 1:17 to 1:44 is led by a lead instrument (guitar or synth) over full drums, and 3:09 to 3:33 is the hardest-hitting part of the song. The song also **ends with 20 s of full band** (4:00 to 4:20) before the fade.
- **Strong drum hits:** 199 detected (`drum-hits.json`). These drive crack branching and cuts.

## Story on the timeline

| Time | Section | Music | What we see | Effects synced to music |
|---|---|---|---|---|
| 0:00 to 0:18 | Intro | Build-up, no drums | Darkness, then slow 3D drifts over kitchen details: the hanging lamp, the untouched plate, the whiskey glass. Cold blue night. No face yet. | Light slowly fades up with the build |
| 0:18 to 0:28 | Intro (drums in) | Drums enter | First look at Alisson at the table, slow motion, drinking. | Cut on the first drum hit (0:18.2) |
| 0:28 to 0:37 | Verse 1, "In the mirror / My enemy / In my mind / No destiny" | Almost no drums, intimate | Kitchen: slow push toward her, glass at her lips. On "My enemy": a **2-frame flash** of the angry reflection (foreshadowing). | Slow camera moves, no hard cuts |
| 0:37 to 0:50 | Pre-chorus 1, "Can't break out / Can't break free / The worst part is / It's always me" | Builds | She leaves the table. Bathroom: leaning over the sink, sick. On "It's always me" she starts to lift her head. Lights flicker in the build into the chorus. | Light flicker on hits, push toward the mirror |
| 0:50 to 0:59 | Chorus 1, "So save me, save me" | Full band | **The reveal on the downbeat:** she looks down, and her reflection looks up, angry. | Hard cut on 0:50.3 |
| 0:59 | Chorus 1, "From me!" | | **First crack**, a single impact on the mirror | Crack hits exactly on "From me" (0:59.2) |
| 1:10 to 1:17 | Chorus 1, second "From me!" and "Save me..." | | The crack bursts across the whole mirror (1:10.3). On the last "Save me" (1:14) cracks **escape the mirror** onto the wall tiles. | Branches on each drum hit |
| 1:17 to 1:44 | Instrumental break | Lead instrument, full drums | **The spread begins:** cracks race through the bathroom tiles, the sink and out the door. Shards start to lift. Her cutout stands still inside it. | Crack growth follows the lead melody; new branches on hits |
| 1:44 to 1:58 | Verse 2, "Close my eyes / Still I see / All my flaws / Surrounding me" | | She closes her eyes, and cracks **surround her** on every surface around her. | Cracks circle her, slow |
| 1:58 to 2:07 | Verse 2, "Walls I built / Now break apart / Smiles I fake / Hide a shattered heart" | | **The kitchen walls crack** (literal). On "shattered heart" the whiskey glass shatters. | Glass shatter on "shattered" |
| 2:07 to 2:23 | Pre-chorus 2, "I try to run / But I'm still here / No escape / Just fear" | Bass drops out, tense | She moves, but every reflective surface (window, glass, mirror) shows the angry face. Cracks reach the whole house. | Near silence on "Just fear", then a build |
| 2:23 to 2:46 | Chorus 2 | Full band | **Total collapse:** shards fly, purple and pink light pours through the cracks, cuts every 2 beats. | Shards burst on hits, light pulses on the bass |
| 2:46 to 2:56 | Transition | Drums and bass drop | **Stillness:** the house almost fully broken, shards frozen in mid-air. | Time freezes |
| 2:56 to 3:09 | Bridge, "I need a light / To pull me through / But every step / Leads back to you" | | **A warm light appears** through the cracks. "Leads back to you": back to the mirror, face to face with the reflection. Its anger softens. This gives the healing its cause: **she faces herself.** | Warm light grows with the bridge |
| 3:09 to 3:33 | Instrumental 2 | Hardest-hitting part | **The reversal starts:** every drum hit pulls the shards back and the cracks retract, in reverse order of how they spread. | One reverse step per drum hit |
| 3:33 to 4:00 | Final chorus, "So save me, save me, oh no / save me, save me, save me, save me" | Full band | The reversal finishes room by room: kitchen, hallway, bathroom tiles. On the final "save me" (about 3:58) **the mirror becomes whole.** Colors turn warm. | Final crack closes on the last "save me" |
| 4:00 to 4:20 | Instrumental tail | Full band, no vocals | Calm: repaired mirror, her reflection now matches her. Warm kitchen, the glass set down. | Slow, steady moves |
| 4:20 to 4:33 | Outro fade | Fades | The lamp, warm light, fade to black. | Fade out with the music |

## A design decision for 16:9
Your clips are vertical (768 x 1344), so a 16:9 frame can't simply be filled with them. My plan:
1. **Story shots of Alisson:** shown as a tall "window" inside the 16:9 frame. The surrounding area is filled with the same room (extended and softly blurred), and **the cracks run across the whole frame**, through the window and beyond it.
2. **The mirror chorus as a split screen:** **real Alisson on the left, the angry reflection on the right.** "Save me from me" as an image. When the mirror cracks, the crack runs across both halves.
3. **Full 16:9 shots for everything I generate:** cracks, shards, light, and close-ups of objects (lamp, glass, tiles, plate) cropped from the clips. Full-frame close-ups are cropped from 768-pixel-wide video, so they'll be softer; I'll keep them short and use grain.

## Footage reuse (to keep in mind)
About 10 s of real footage covers 4:33. Each real shot appears 3 to 5 times in different forms (slow motion, other crops, 3D moves, before and after cracking). The full draft in Phase 4 will show whether it feels repetitive.
