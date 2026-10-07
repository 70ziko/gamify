# Gamify character family: rounder, simpler, gentler

**Scope — user direction, current conversation:** retain Questling, Lantern Moth, Trail Fox, Questbara, and Pocket Dragon; explore cuter, simpler shapes and gentle color correction. Redesign Questling in response to the user's resemblance feedback. No Questling variant is selected; no application implementation is included.

**Required style — user's clarification:** **soft shaded 2D**, with nicely chosen **solid color areas and no gradients**. This supersedes the earlier pure-flat recommendation. Minimal shapes should retain gentle volume.

## What changed in this exploration

**Primary observation — artwork inspected:** the [original Questling](../review/04-questling-neutral.png) has reflective eyes, a cream heart-shaped face patch, forehead star, and flame-shaped crest. The [redesign study](01-questling-redesigns.png) removes those features and reduces eye size. The [animal study](02-minimal-animals.png) rounds bodies, shortens limbs, and removes fox/capybara accessories.

**Inferred direction:** fuller, quieter silhouettes should feel approachable while preserving species identity. Keep expressions in the mouth, eye curves, and pose. Confirm through actual-size comparison; refute if simplification obscures species or emotion.

## Questling: three open alternatives

**Primary observation — [redesign board](01-questling-redesigns.png):** A, **Moonbean**, is an asymmetrical gold bean with one lilac side leaf. B, **Pebble Pal**, has a low body, three upper humps, and lilac side nub. C, **Starbud**, has **five** rounded points. All have tiny feet, simple eyes, and a small smile.

**Inferred working reference:** Moonbean supplies a compact asymmetrical identity. It remains provisional. Reserve **gold bean + one lilac side leaf** for this working direction; exclude forehead stars, face masks, and crown crests. Keep Pebble Pal and Starbud available for comparison.

## Shape rules for all five

The following are **proposed requirements**, to validate against new artwork:

| Character | Keep | Simplify |
|---|---|---|
| Questling / provisional Moonbean | Asymmetrical bean, one side leaf | Tiny feet and paws; uninterrupted face color |
| Lantern Moth | Two round wings and short bulb antennae | Broad wing fills; remove interior stripe layers and antenna shine |
| Trail Fox | Rounded ears, cream muzzle, tucked tail | Shorter limbs; broad tail tip boundary; no scarf dependency |
| Questbara | Small round ears and broad muzzle | Squat body, short feet, few muzzle marks; no scarf dependency |
| Pocket Dragon | Rounded horns, tiny wings, curved tail | Fewer tail bumps; no horn bands, scales, or detailed wing structure |

**Inferred consistency test:** unlabeled silhouette comparisons should identify characters without clothing or props. Dependence on accessories would weaken the direction.

## Rendering and color lock

**Required rendering — user clarification:** use a base fill, one gently curved **solid shadow patch**, and an optional **solid light region**. Each area's interior stays uniform: no color interpolation, feathering, gradients, or gloss. Softness comes from rounded geometry and gentle value relationships, not blurred transitions.

**Proposed family rules:** rounded plum outlines approximately **1.2–1.5% of silhouette width**, consistent weight, rounded joins; solid dot/short-oval eyes without highlights; small mouth; restrained cheek dots; short limbs. Limit each character to **three main color families plus ink**; shading uses their specified derivatives. No texture, glow, or cast shadow. Keep light regions broad and quiet, avoiding reflective streaks.

**Primary observation — source code read:** the existing [theme palette](/Users/70ziko/projekty/_personal/gamify/apps/mobile/src/components/gamify-ui.tsx:23) combines plum, lavender, peach, gold, light surfaces, and mint success colors. **Proposed correction:** retain that relationship with the following softer character swatches. These are character-art proposals, not changes to the application theme.

| Gold | Peach | Lavender | Mint | Plum ink | Cream |
|---|---|---|---|---|---|
| `#F2D7A0` | `#EDB09B` | `#B9A7E8` | `#9DCAB0` | `#46354F` | `#FFF3DF` |

**Proposed solid shadow swatches:** gold `#DDBE8E`, peach `#D99884`, lavender `#9E8ACA`, cream `#E6D8BD`. Use bounded regions with clear curved edges; these are palette proposals, not sampled or verified artwork colors.

## Review limits and generation guidance

**Primary observation — [latest cast](09-solid-shade-cast.png), visual review/Pillow reads:** shade boundaries are clear; no broad gradients apparent. Questling samples at x180, y240–390 vary only 1–2 RGB channel units; gold near `(248,207,133)` differs from `#F2D7A0`. Small raster variation remains; sampling is limited. Moth antennae remain long/thin; dragon appendages comparatively complex.

**Inferred assessment:** strongest solid-area study so far; confirm with the acceptance checks below. Moonbean Questling remains provisional.

**Primary observation — generation call:** [exact prompt](09-generation-prompt.txt), one text-only built-in imagegen generation without references.

**Proposed generation instruction:** attach the approved reference; specify species, pose, silhouette landmarks, and up to three main color families. Require soft shaded 2D using uniform solid areas, small solid eyes, rounded plum outlines, and short limbs. Preserve proportions across poses. Course characters can vary species and one simple topic prop while keeping this grammar; exclude Questling's working bean-and-leaf identity.

**Proposed acceptance:** compare idle, cheerful, and reassuring poses on both themes at 48, 64, 96, and 120 px. Check silhouettes, faces, outlines, shade-region boundaries, and reference consistency. Board insets illustrate intent; they do not establish exact-size usability or user preference.
