# QA report (Stage 7, Gate 3)

Reviewer stance: skeptical editor. Report first; fixes applied afterwards are marked.
Checked: `03-outputs/explainer-video/script-full.md` (8 min) and `videos/essentialism-explainer/config.json` (68 s render).

## Findings

| # | Severity | Where | Finding | Status |
|---|---|---|---|---|
| 1 | High | Full script, Ch. 3 | Two "no" scripts ("let me check my calendar", "what should I deprioritize?") were not in any source we opened. Only "eight responses" and the soft "no, but" are confirmed (reader notes) | **Fixed:** rewritten to the confirmed wording |
| 2 | Medium | 68 s cut, hook | "best-selling" is not in the Claims Table. Source: the author's site calls it a New York Times bestseller (publisher claim, not independent) | Open: keep (low risk) or add as C-15 |
| 3 | Medium | Both | Pronunciation of "McKeown" not verified; Kokoro guessed it | Open: listen and add a pronunciation if wrong |
| 4 | Low | Claims Table | The original violin study PDF link contained parentheses, which break Markdown links | **Fixed:** URL-encoded |
| 5 | Low | Claims Table | doi.org links return 403 to scripts (bot blocking) but open in a browser | No change needed |
| 6 | Low | Both | Access level C: book content is secondhand. Stated in the full script header, not on screen | Open: add "Based on public sources" to the video description |
| 7 | Info | 68 s cut | Stat "55 days" wraps onto two lines on the scorecard card. Readable, but a shorter suffix ("55 d") or label would fit one line | Open, cosmetic |

## Checklist

- [x] Fact trace: every factual line maps to a Claims Table row (after fix 1; see finding 2)
- [x] Links work (finding 5 is bot blocking only)
- [x] Contested claims framed as contested (C-05, C-11)
- [x] Originality: no long quotes, no chapter-by-chapter retelling, author credited
- [x] Persona fit: stretched-thin professional
- [x] Conversion: none by design (informative); closes on the verdict
- [x] Format: full script about 8 min; cut 68 s of narration, inside the 45 to 90 s Explainer16x9 range
- [x] Voice: casual professional; no em dashes
- [x] Language: US English
- [x] Video QC (`node scripts/qc.ts`): PASS, no issues (safe zones, captions in sync, contrast)

## Gate 3

- **State:** self-checked by Claude, 2026-10-31. Awaiting your approval. Open items: 2, 3, 6, 7.

---

# QA v2 (method update: deeper summary, short verdicts, research-backed swaps)

Checked: `script-full-v2.md` (about 6.5 min) and `videos/essentialism-explainer-v2/config.json` (about 75 s).

| # | Severity | Where | Finding | Status |
|---|---|---|---|---|
| 1 | High | Both, 90 Percent Rule | "Never tested" overstated our evidence; we only know that no study was found | **Fixed:** "we found no study testing it" |
| 2 | Medium | Both, breaks swap | "Take more than 10 minutes" stated a suggestion from the meta-analysis as a finding | **Fixed:** "you may need more than ten minutes" |
| 3 | Medium | Full v2, Juran line | First draft said a small share of problems "causes most of the defects"; the source wording is that fixing a small fraction improves quality a lot | **Fixed** before render |
| 4 | Low | S-01 | Implementation-intention effect (d = .65) may be slightly inflated by publication bias | Noted in the Claims Table; script says "help", not a number |
| 5 | Open | Both | v1 items still open: "McKeown" pronunciation, "best-selling" claim (only in v1 hook), Access level C note in the description | Open |

- [x] Every factual sentence carries a C or S ID; S rows are labeled "research shows", never attributed to the book
- [x] Verdicts are one short line each
- [x] Summary = 2 topics with 3 subtopics each (full) and 3 points each (short)
- [x] Video QC passes; no em dashes

**Gate 3 (v2):** self-checked by Claude, 2026-10-31. Awaiting your approval.
