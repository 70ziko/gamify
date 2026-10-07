# Gamify: mascot designer brief

## The application

**Primary observation, current application code:** Gamify turns personal goals into small, achievable quests. Its welcome screen describes the scope as “Habits, skills, side projects.” Users describe a goal, build a roadmap with AI or manually, or choose an existing course or daily habit from the marketplace. Roadmaps contain units and steps; exercises include quizzes, practical checks, and timers. Completing steps earns XP and contributes to progress, levels, streaks, and daily quests. Sources: [welcome and creation flow](/Users/70ziko/projekty/_personal/gamify/apps/mobile/src/components/gamify-app.tsx:206), [welcome copy](/Users/70ziko/projekty/_personal/gamify/apps/mobile/src/components/gamify-app.tsx:317), [step experience](/Users/70ziko/projekty/_personal/gamify/apps/mobile/src/components/gamify-app.tsx:900), [domain definitions](/Users/70ziko/projekty/_personal/gamify/ARCHITECTURE.md:52).

**Design interpretation:** the companion should make starting feel easy, recognize effort, and welcome a return after a break. Aim for a warm, patient coach with quiet curiosity and gentle delight. This interpretation comes from the existing Home messages, including “Fresh start. One step is plenty.” Validate it through neutral, celebrating, and reassuring expressions beside that copy. Source: [coach messages](/Users/70ziko/projekty/_personal/gamify/apps/mobile/src/components/gamify-app.tsx:475).

## The visual setting

**Primary observation, current application code:** dark mode uses deep plum surfaces with lavender actions, peach accents, pale gold, and mint success states. Light mode uses warm off-white, white cards, darker purple, and peach. Typography is Plus Jakarta Sans, with generous rounded cards, pill controls, bold headings, and buttons with visible depth. Sources: [theme colors](/Users/70ziko/projekty/_personal/gamify/apps/mobile/src/components/gamify-ui.tsx:22), [fonts](/Users/70ziko/projekty/_personal/gamify/apps/mobile/src/app/_layout.tsx:13), [buttons](/Users/70ziko/projekty/_personal/gamify/apps/mobile/src/components/gamify-ui.tsx:208), [rounded layout](/Users/70ziko/projekty/_personal/gamify/apps/mobile/src/components/gamify-app.tsx:1705).

**Primary observation:** the active mascot placeholder appears once, beside the Home coach message. Its square slot is 120 units on regular phones, 96 on compact phones, and shrinks further with narrow screen width. **Proposed review:** test the finished silhouette and face at 50, 96, and 120 pixels on both themes. Keep appendages compact and preserve space for the adjacent lesson text. Sources: [size rules](/Users/70ziko/projekty/_personal/gamify/apps/mobile/src/components/gamify-app.tsx:488), [Home placement](/Users/70ziko/projekty/_personal/gamify/apps/mobile/src/components/gamify-app.tsx:536).

## Direction already agreed

**Client decisions from this conversation, recorded in the [current exploration guide](../mascot-exploration/round-2/shape-and-style-guide.md):** retain all five characters: Questling, Lantern Moth, Trail Fox, Questbara, and Pocket Dragon. Make the animals cuter through fuller bodies, shorter limbs, and simpler details. Keep the palette relationship and correct the colors gently.

The required rendering is **soft shaded 2D with separate solid color areas, no gradients**. Use a base fill, a curved shadow area, and optionally a restrained light area. Softness should come from shape and color choices. The latest board illustrates this direction; its generated colors and details are exploratory references, not a finished production specification. See the [latest cast](../mascot-exploration/round-2/09-solid-shade-cast.png).

Questling needs a more distinctive redesign following the client’s feedback that the first version resembles Duo. Three alternatives remain open: **Moonbean**, an asymmetric gold bean with a lilac side leaf; **Pebble Pal**, a low rounded body with three humps; and **Starbud**, a rounded five-point form. Moonbean is a provisional working preference. The official mascot and exact Questling design are still to be selected. See the [redesign comparison](../mascot-exploration/round-2/01-questling-redesigns.png).

## The system to build

**Client requirement:** users will later generate and add characters for their courses. **Proposed solution:** give the official mascot a recognizable identity while defining a shared character grammar: proportions, facial construction, outline weight, curved shade boundaries, and palette relationships. Species and one simple topic prop may vary. The designer should refine and document these rules so new characters belong together. The [round-two guide](../mascot-exploration/round-2/shape-and-style-guide.md) contains proposed swatches and construction rules to evaluate.

## Requested handoff

**Proposed designer deliverables:** a finished neutral reference and canonical views; idle, focused, cheerful, and reassuring expressions or poses; a silhouette, proportion, and exact color sheet; examples on both application themes at small sizes; and a concise generation guide for the wider course-character family. Provide clean transparent exports with consistent framing. Editable vector masters are welcome where suitable. Resolve the official mascot choice, Questling silhouette, and final corrected palette during design review.
