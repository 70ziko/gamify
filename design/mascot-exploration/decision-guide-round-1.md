# Gamify mascot and character direction

**Proposed decision:** develop **Questling in soft shape-shaded 2D** first, with **Lantern Moth** as the strongest alternative. This ranking is design judgment, not measured preference or a scoring study. The concepts and boards are review explorations; they do not lock an identity or constitute integrated production assets.

Open the [interactive visual guide](index.html) to compare candidates, switch themes, and view the neutral cutout at exact CSS image-box sizes. Review assets: [style directions](review/01-style-directions.png), [mascot shortlist](review/02-mascot-shortlist.png), [refined future course family](review/05-course-character-family-refined.png), and [neutral Questling](review/04-questling-neutral.png). The [exact prompts](generation-prompts.json) record five built-in imagegen generations, including one targeted refinement.

**Primary observation — generated images inspected:** the shortlist shares rounded plum contours, modest oval eyes, and broad shaded color regions. The style board uses an earlier Questling variant; its face patch, arms and crest differ from the later neutral cutout, so the boards are not a finalized identity sheet. The [first family board](review/03-course-character-family.png) gave its cooking cat a fox-like tail and added glossy highlights. The refined board improves the cat silhouette and reduces main-panel shine, while small insets and some gradients still differ from the target rules. The neutral cutout has genuine alpha transparency, verified through PNG inspection. Its crest still reads as a flame to the reviewers; that association remains a decision risk, not a resolved design detail.

## What the application needs

**Primary observation — source code read:** the live entry renders `GamifyApp`. Its welcome screen promises “Turn anything into a quest” and names habits, skills, and side projects. Courses and habits contain units, steps, and quiz, check, or timer exercises. This is a broad self-improvement product rather than a single-subject learning tool. Sources: [entry](/Users/70ziko/projekty/_personal/gamify/apps/mobile/src/app/index.tsx:1), [welcome copy](/Users/70ziko/projekty/_personal/gamify/apps/mobile/src/components/gamify-app.tsx:317), [exercise and roadmap schemas](/Users/70ziko/projekty/_personal/gamify/services/api/app/roadmaps/schemas.py:16).

**Primary observation — source code read:** interests cover fitness, languages, music, coding, reading, mindfulness, finance, cooking, career, and art; custom roadmaps are supported. Suggestions include running a 10k, learning Rust, and sleeping earlier. Profile fields do not establish an age group. Sources: [categories](/Users/70ziko/projekty/_personal/gamify/apps/mobile/src/components/gamify-app.tsx:97), [goal examples](/Users/70ziko/projekty/_personal/gamify/apps/mobile/src/components/gamify-app.tsx:1083), [profile fields](/Users/70ziko/projekty/_personal/gamify/services/api/app/profiles/schemas.py:21).

**Inferred — design interpretation:** the official mascot should be a curious companion who helps someone take the next small step. A calm, encouraging personality fits the broad goals better than a subject-specific teacher. This interpretation would be supported if representative users describe the character as inviting across coding, fitness, and mindfulness; it would be weakened if it feels too childish, passive, or unrelated to their goals.

**Primary observation — source code read:** the Home card pairs its mascot with a greeting and coach copy such as “Fresh start. One step is plenty.” Streak recovery says “You missed yesterday. It happens.” The reusable placeholder is a gold rounded square with a smile. Only one actual `MascotPlaceholder` render was found in the reviewed live component; other screens use symbols and abstract shapes. Sources: [coach lines](/Users/70ziko/projekty/_personal/gamify/apps/mobile/src/components/gamify-app.tsx:474), [Home placement](/Users/70ziko/projekty/_personal/gamify/apps/mobile/src/components/gamify-app.tsx:536), [recovery copy](/Users/70ziko/projekty/_personal/gamify/apps/mobile/src/components/gamify-app.tsx:1550), [placeholder](/Users/70ziko/projekty/_personal/gamify/apps/mobile/src/components/gamify-ui.tsx:538).

**Proposed role split:** the official mascot provides a consistent daily relationship. Future course characters provide topic-specific personality. The reviewed roadmap schema and model contain no character field, so this cast is a future design requirement, not current functionality. Sources: [draft schema](/Users/70ziko/projekty/_personal/gamify/services/api/app/roadmaps/schemas.py:61), [roadmap model](/Users/70ziko/projekty/_personal/gamify/services/api/app/roadmaps/models.py:12).

## Which visual style fits

**Primary observation — source code read:** the UI combines plum backgrounds, lavender primary colors, peach actions, cream/gold official accents, and mint success. It uses Jakarta font weights, rounded cards and pills, and shallow button depth. Sources: [palette and typography](/Users/70ziko/projekty/_personal/gamify/apps/mobile/src/components/gamify-ui.tsx:22), [cards and buttons](/Users/70ziko/projekty/_personal/gamify/apps/mobile/src/components/gamify-ui.tsx:615), [pills](/Users/70ziko/projekty/_personal/gamify/apps/mobile/src/components/gamify-ui.tsx:677).

The following choices are **proposed art directions**:

| Direction | Intended use | Decision rationale and review risk |
|---|---|---|
| **Soft shape-shaded 2D — recommended** | Official mascot and generated course cast | Round silhouettes, flat main colors, one shadow band, and a plum outline echo the UI geometry. Check that shading adds warmth without obscuring the face. |
| **Flat geometric — backup** | Simpler production style | Fewer shapes and no shading give a tighter specification. Check whether it feels too much like another interface icon. |
| **Matte clay 3D — optional** | Campaigns, launch imagery, larger onboarding scenes | Explore tactile volume for large imagery. Keep it separate unless the small-size review shows it belongs throughout the app. |
| **Gouache editorial — optional** | Course covers and occasional illustration | Explore a softer narrative mood. Reject it as the core cast style if variable brush texture makes characters look unrelated. |

**Inferred recommendation:** shape-shaded 2D offers a useful middle ground between the UI's simple symbols and a character with emotional presence. Confirm it by reviewing all four directions inside the actual Home card, at identical sizes and on both themes. Refute it if the flat option is equally expressive and clearly more legible, or if users consistently prefer another direction in the same context.

## Ranked mascot proposals

All five use the same proposed drawing grammar so species and personality can be compared independently of rendering style.

| Rank | Candidate | Proposed identity | Tradeoff to resolve |
|---|---|---|---|
| **1** | [Questling](concepts/01-questling.png) | Warm abstract spark/seed creature; one swept crown tuft; violet four-point forehead badge; tiny limbs | Broad identity and a compact silhouette. Its body must read as a creature, with no red-orange flame, fiery glow, or multiple flame tips that confuse it with the existing streak symbol. |
| **2** | [Lantern Moth](concepts/03-lantern-moth.png) | Folded wings in the canonical small pose, soft antennae, cream face/belly, lavender rim; a light patch without bloom | A gentle guide. Check that its light patches and rim separate the dark body from Home's plum surfaces, while antennae remain readable. |
| **3** | [Trail Fox](concepts/02-trail-fox.png) | Round peach fox, cream muzzle, short ears, one broad tail tucked close | An active companion with clear gesture potential. Tail width needs strict bounds so the face does not shrink in the Home slot. |
| **4** | [Questbara](concepts/05-questbara.png) | Calm cream/gold capybara, compact rounded muzzle, little ears, short paws | A relaxed presence. Test celebration and curiosity carefully: a nearly unchanged face could make the emotional range too narrow. |
| **5** | [Pocket Dragon](concepts/04-pocket-dragon.png) | Small cream/gold dragon, peach belly, lavender ear/wing accents, abbreviated tail | Fits the quest framing. Reduce horns, scales, and wing structure; reject if the fantasy framing overwhelms ordinary everyday goals. |

**Proposed selection test:** compare neutral, cheering, and reassuring poses at 64 px before deciding. Favor a candidate whose identity survives without a prop, whose face remains clear, and whose recovery pose feels kind. The rank should change if those comparisons favor another candidate. Names remain working labels.

## Shared character grammar

These are **proposed locks**, to approve and then reuse across generation:

- Flat major color blocks with one or two broad shadow shapes. No surface texture, body shine, lighting bloom, or photorealistic material.
- Rounded plum outline, **1.5–2% of character silhouette width**, with consistent thickness and round joins: about 0.75–1 px at 50 px silhouette width. Size relative to the character, since artboard padding varies.
- One dominant head/body mass, approximately **75–85% of character height**; short limbs and few separated appendages. Preserve species differences instead of forcing every animal into identical anatomy.
- Modest dark oval eyes, small mouth, optional short brows. Start with eye height around **6–8% of character height**. Avoid enormous eyes, detailed irises, and faces dependent on tiny pupils.
- Three-quarter front presentation for the canonical identity; full silhouette inside an **8–10% safe margin**. Keep face landmarks and outline visible in every pose.
- Official Questling body **#F7D699**, peach **#F4A98C**, lavender **#B79BFF**, plum **#231A2B**. These values come from the existing dark palette; light theme styling uses different UI values. Source: [palette](/Users/70ziko/projekty/_personal/gamify/apps/mobile/src/components/gamify-ui.tsx:22).
- Reserve the **gold body + swept crown + violet forehead badge combination** for Questling. Course characters share the art grammar, not its identity.

**Variable elements:** species, facial proportions within the approved range, ears/tail, one topic prop, clothing silhouette, and category accent. Build a cast of distinct creatures, not recolored Questling clones. A coding beetle, piano bird, or running rabbit should still belong to the same world without carrying the official forehead badge.

**Primary observation — category tint mapping:** the code assigns the following tint families. **Proposed application:** use these as secondary character accents rather than recoloring the entire official mascot. Sources: [category mapping](/Users/70ziko/projekty/_personal/gamify/apps/mobile/src/components/gamify-app.tsx:98), [dark/light color values](/Users/70ziko/projekty/_personal/gamify/apps/mobile/src/components/gamify-ui.tsx:22).

| Tint family | Existing categories | Dark palette accent |
|---|---|---|
| Primary | Music, coding, career | Lavender #B79BFF |
| Success | Fitness, mindfulness, custom | Mint #74C79C |
| Streak | Reading, finance | Amber #F0B45E |
| Accent deep | Languages, cooking, art | Peach #EF8F80 |

## Expression set tied to product moments

Each expression is a **proposal** based on a **primary observation** of the linked trigger. These states are not currently implemented mascot behavior.

| Expression | Product trigger | Pose rule |
|---|---|---|
| Friendly idle | [Home greeting and coach line](/Users/70ziko/projekty/_personal/gamify/apps/mobile/src/components/gamify-app.tsx:540) | Small smile; open stance; quiet confidence. |
| Focused/listening | [Quiz, check, timer exercises](/Users/70ziko/projekty/_personal/gamify/apps/mobile/src/components/gamify-app.tsx:945) | Slight forward lean; attentive eyes; minimal motion. |
| Thinking/working | [AI drafting phases](/Users/70ziko/projekty/_personal/gamify/apps/mobile/src/components/gamify-app.tsx:1183) | Thoughtful brow; small purposeful gesture. |
| Modest celebration | [Step complete and XP earned](/Users/70ziko/projekty/_personal/gamify/apps/mobile/src/components/gamify-app.tsx:1008) | Raised paw and clear smile; keep silhouette compact. |
| Milestone celebration | [Roadmap finished](/Users/70ziko/projekty/_personal/gamify/apps/mobile/src/components/gamify-app.tsx:744) | Larger gesture with the same face and proportions. |
| Gentle recovery | [Missed day](/Users/70ziko/projekty/_personal/gamify/apps/mobile/src/components/gamify-app.tsx:1550), [failed draft](/Users/70ziko/projekty/_personal/gamify/apps/mobile/src/components/gamify-app.tsx:1194) | Reassuring tilt and offered paw; no anger, tears, or accusation. |

## Reusable generation instruction

**Proposed template:** fill the variable fields and attach the approved character/style reference. Text instructions alone should not be treated as proof of identity consistency.

> Create one Gamify character: [SPECIES AND IDENTITY], for [COURSE TOPIC OR OFFICIAL ROLE], in [EXPRESSION/POSE]. Use the attached approved reference as the identity and style authority. Soft shape-shaded 2D: round plum #231A2B outline 1.5–2% of character silhouette width, flat major colors, one or two broad shadow shapes, large simple head/body, tiny limbs, modest dark oval eyes, small readable mouth. Use [BODY COLOR] and [ONE CATEGORY ACCENT], with cream facial contrast. Preserve [LOCKED LANDMARKS AND PROPORTIONS]. Include at most one simple prop: [PROP OR NONE]. Keep every appendage within an 8–10% safe margin on a large square artboard. Transparent background; no text, scenery, glow, texture, body shine, or cast shadow. For course characters, exclude Questling's official forehead badge and crown tuft. Produce one complete silhouette.

**Proposed identity flow:** approve one neutral master; record palette, silhouette, face landmarks, and proportions; edit from that master for expressions; reject drift. Approve each course character's own neutral master under the shared style reference before deriving poses. Check reference consistency in every result.

## Production review and handoff

**Primary observation — source code read:** Home targets 96/120 px slots and can shrink using `screen.width - 270`. Source: [responsive sizing](/Users/70ziko/projekty/_personal/gamify/apps/mobile/src/components/gamify-app.tsx:488). **Proposed review:** inspect every expression at exactly **48, 50, 64, 96, and 120 px**, on dark **#231A2B**, light **#FAF6F8**, and the warm card surfaces from the [palette](/Users/70ziko/projekty/_personal/gamify/apps/mobile/src/components/gamify-ui.tsx:22). Miniatures inside generated boards are illustrative; use the separate neutral asset in an actual-size preview for pixel-size judgments.

- Check silhouette, margins, ears/tail, eyes, mouth, badge, and 1.5–2% outline at all five sizes; reject clipping or merged facial marks.
- Compare the three essential poses together: idle, celebration, recovery. Ask for their meaning before showing expression labels.
- Place the art beside the actual greeting and Start button. Check that wide tails/wings do not reduce the visible face or steal space from the lesson.
- Compare the official mascot with at least three distinct course species, using identical rendering rules.
- After identity approval, prepare single-character **PNG files with alpha**, preferably from **1024 × 1024 or larger** source art. Suggested names: `questling-idle.png`, `questling-cheer.png`, `questling-reassure.png`, and `course-coding-beetle-idle.png`.

These filenames and exports specify a proposed handoff. Final identity approval, production export verification, expression QA, and implementation follow this exploration.

## Review performed

**Primary observation — local browser checks:** all 15 illustrated image elements loaded; the theme switch worked; the preview buttons produced image-box widths of 48, 50, 64, 96, and 120 CSS pixels; no JavaScript page errors or horizontal page overflow appeared at 320, 390, and 1440 px viewport widths. All 48 HTML asset/local-link references resolved. These checks apply to the exploration guide, not the live mobile app.

**Primary visual observation — rendered studies inspected:** the Questling face and forehead badge remain discernible in the 50 px image box, with transparent source padding included. Dark feet lose contrast on the plum surfaces. See the [dark preview](review/06-slot-review-dark.png) and [light preview](review/07-slot-review-light.png). This is reviewer judgment from rendered art, not a user recognition test. Only Questling has a standalone exact-size preview; the other candidates still require equivalent cutouts before a final comparison.

**Inferred next refinement:** if Questling is selected, test a lighter foot fill/edge and a less flame-like crest before locking its identity. Then validate fixed proportions across the proposed expression set. A side-by-side review of those variations would confirm or challenge these suggestions.
