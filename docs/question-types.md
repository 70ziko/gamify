# Question types

The course model's smallest unit: one question inside a step. Code lives in
`services/api/app/questions/` (`schemas.py` holds the kinds, `grading.py` holds the responses and graders), with
one worked example per kind in `services/api/tests/test_questions.py`.

**Status:** designed and tested, but not wired in yet. `StepDraft.exercises` still uses the old
`quiz | check | timer` union. See [Next decisions](#next-decisions).

## Shape of every question

```
QuestionBase
├── id           stable, generated on first save (for mistakes review and analytics later)
├── kind         the discriminator
├── prompt       the instruction: "Complete the sentence", "Play a C major chord"
├── media[]      the stimulus, up to 4: image | video | audio | speech
├── hints[]      up to 3
├── explanation  shown after checking
├── difficulty   easy | normal | hard, within the kind
└── <kind body>  the interaction content and its answer key
```

Each kind also has a `spec` that is not serialized. It is fixed per kind, so neither authors nor AI set it.
`inputs()` gives what one question needs from the device. It defaults to `spec.input`, and kinds that mix inputs
(`dialogue`) override it.

| Axis | Values | Used for |
|---|---|---|
| `input` | tap · keyboard · microphone · camera · self | Skip or swap questions the device or the moment can't support |
| `demand` | recognize → recall → produce → perform | Easier kinds early in a unit, harder ones later |
| `grading` | auto · sensor · ai · self | Where the verdict comes from |

## The 18 kinds

| Input | Kind | Demand | Example | Answer key |
|---|---|---|---|---|
| tap | `choice` | recognize | Which photo shows C major? | `correct: [option ids]`, `multiple` |
| tap | `match` | recognize | Tap the pairs: gato ↔ cat | `pairs[{left, right}]` |
| tap | `order` | recognize | Build "Yo bebo café" from tiles | `items` in order, `alternatives`, `distractors` |
| tap | `categorize` | recognize | Major or minor? | `answer: {item: bucket}` |
| tap | `hotspot` | recognize | Tap where your index finger goes | `regions` (normalized rect/circle), `correct` |
| tap | `fill_bank` | recognize | Yo {{b1}} café | `blanks[{id, answer, options?}]` + `distractors` |
| keyboard | `fill_typed` | recall | {{kw}} x in items: | `blanks[{id, accepted[]}]` + `match` rules |
| keyboard | `short_answer` | recall | Type what you hear | `accepted[]` + `match` rules |
| keyboard | `numeric` | recall | Frequency of A4? | `value`, `tolerance`, `unit` |
| keyboard | `open_response` | produce | Describe today's practice | `rubric`, `sample_answer`, `review: ai\|self` |
| keyboard | `code` | produce | Reverse the list | `solution`, `rubric`, `starter`, `language` |
| microphone | `speak` | produce | Say "Buenos días" | `text`, `lang`, `min_accuracy` |
| microphone | `play` | perform | Play C major / play this melody | `chord: [pitch classes]` or `melody: [notes]` |
| tap + mic | `dialogue` | recall | Order a coffee from Lucía | `turns`: `line` · `choose{options, correct}` · `speak{text}` |
| microphone | `tune` | perform | Tune the low E string | `note`, `tolerance_cents`, `hold_s` (`frequency_hz` is computed) |
| camera | `capture` | perform | Photo of your hand on the C chord | `rubric`, `reference` media, `review` |
| self | `check` | perform | Finish eight intervals | none |
| self | `timer` | perform | Warm up for 5 minutes | `minutes` |

Most kinds are tap kinds (the quick, closed questions), as the brief asked. In `fill_bank`, a blank with
`options` shows a dropdown (QTI's "inline choice", useful for ser/estar). The other blanks take tiles from the
shared bank. `play` stays a single kind for chords and melodies (decided 2026-10-17). Keyboard, microphone and camera kinds
are for the subjects that need them.

## Design rules

1. **No passive content.** There are no content-only cards. Teaching material (a clip of how to hold the C chord,
   a new word with its audio) goes in a question's `media`, and the question asks the learner to act on it right
   away: "Play the C major chord" with the clip attached and the microphone listening. Every screen is interactive.
   To introduce something gently, pair it with an easy kind (`choice`, `match`) or `difficulty: easy`. Decided
   2026-10-17, after a separate `learn` kind was tried and dropped.
2. **Placeholders are `{{id}}` tokens that point at a declared blank.** Each declared blank must appear exactly
   once. A `{{name}}` that names no blank stays literal, so code and templates in the text need no escaping.
   `Cloze.segments()` splits the text into strings and `{"blank": id}` markers for renderers.
   - Why not put answers inline like H5P's `*6/six*`? That syntax gives `/`, `*` and `:` special meaning, and its
     users can't type fractions or phonetic slashes (see [H5P](#h5p)). Khan Academy's Perseus uses the same
     approach as ours: a placeholder in the text plus a map of widgets keyed by id (see [Perseus](#khan-academy-perseus)).
3. **Answers use ids, not indexes.** Options, tiles, pairs and regions have stable `id`s, so shuffling and editing
   never break the answer key. The legacy `quiz.answer: int` is the exception and should be migrated.
4. **Media is referenced, never embedded.** `src` is `https://…` or `asset:<id>`. Images and videos require `alt`,
   because the AI author can't see them and screen readers need it. `speech` media is text the device reads aloud,
   so AI-written language courses get audio without recorded files. Video takes `start_s`/`end_s`/`loop` to show a
   clip, for example how to hold a chord.
5. **Sensors observe and the grader compares.** Microphone and camera kinds submit what the on-device recognizer
   saw (a transcript, detected notes, a cents offset, an uploaded photo), never raw audio. Grading stays a pure
   function of `(question, response)`, and recognizers can change without touching the stored content.
6. **Typed answers are forgiving but honest.** `TextMatch` ignores case and punctuation by default and keeps
   accents. A missing accent, or up to `typos` edits on answers of 5+ characters (a swap of neighbouring letters
   counts as one edit), returns `almost`: it passes, with a nudge.
7. **Partial credit is reported, not awarded.** `Grade.score` and `Grade.wrong` exist so the UI can highlight the
   wrong blanks or pairs. XP still comes only from `step_xp(minutes)`.
8. **Dialogues are graded turn by turn.** Lines from other speakers are read aloud in the dialogue's `lang`. The
   learner's turns are `choose` (graded by the answer key) or `speak` (graded by transcript accuracy), and
   `Grade.wrong` names the turns that missed.
9. **Judged kinds return `pending`.** `open_response`, `code` and `capture` wait for an AI judge or the learner's
   self-assessment. `review` is authored per question, because AI judging costs quota.

## Adding a kind

1. Add the model to `schemas.py` with a `spec`, and add it to `Question`. If it mixes inputs, override `inputs()`.
2. Add its response model and grader to `grading.py`, then register both in `Response` and `GRADERS`.
3. Add an example to `EXAMPLES` in `tests/test_questions.py`. `test_every_kind_has_an_example_response_and_grader`
   fails until steps 1–3 are all done.
4. Add a renderer in the app (and a recognizer, for sensor kinds).

## Next decisions

These change other code, so each needs a go-ahead:

1. **Wire in.** Replace `Exercise` in `roadmaps/schemas.py` with `Question`. Migrate stored `quiz` rows
   (`steps.exercises`, `listing_versions.content`, `seed.sql`) to `choice` with ids `a`, `b`, …. Regenerate
   `api-types.ts`.
2. **Gate kinds by renderer.** Until the app renders a kind, `StepDraft` and the AI flows should reject it, so AI
   output never contains a question the app can't show.
3. **AI prompts.** `roadmap_draft` would pick kinds by category and unit position: recognize first, perform last.
4. **Recognizers.** Speech-to-text, pitch and chord detection, and a camera upload path to an asset store. None of
   these is chosen yet.
5. **Client grading.** Tap and keyboard kinds should grade instantly on the device. That means a TypeScript port of
   `grading.py`, maintained by hand the way the XP curve is, or having the server grade each answer.

## Research

How each claim was established: **read** means the page was fetched and read. **snippet** means only a search
summary was seen, so these claims are the most likely to be stale.

### Duolingo

- **read**: Duolingo's blog lists lessons, reviews, harder "Legendary" levels with no hints, timed Side Quests,
  Match Madness (match words between two languages), and Practice Hub sessions for mistakes and all-speaking
  practice. ([Ways to practice](https://blog.duolingo.com/ways-to-practice-in-duolingo))
- **read**: Difficulty adapts to performance. Level design moves from "encoding", to recognition through reading and
  listening, to speaking and pronunciation. Hard exercises are labelled as hard. This is the basis for our
  `demand` axis and the `difficulty` field. ([Difficult exercises](https://blog.duolingo.com/duolingo-difficult-exercises))
- **read**: Immersion exercises are "Complete the sentence" from a word bank, a dialogue reply picked from two
  speech bubbles, and "Read and respond", a multiple-choice question about a short paragraph. These map to
  `fill_bank` and `choice` with media or text. The dialogue reply is the seed of the `dialogue` kind. ([Immersion exercises](https://blog.duolingo.com/new-immersion-exercises-maximize-your-language-learning))
- **snippet**: A fan wiki lists "arrange the words", "complete the translation" (type the missing word), "mark the
  correct meaning", and picture flashcard matching. The page returned HTTP 402, so it was never read, and the list
  is dated January 2023. ([Duolingo Wiki](https://duolingo.fandom.com/wiki/Exercise))
- **snippet**: A 2018 update added phonetics drills and an exercise where you tap words as you hear them.
  ([TechCrunch](https://techcrunch.com/2018/04/09/duolingo-adds-new-language-exercises-and-revamps-its-leveling-system))

### Khan Academy Perseus

- **read**: The widget folder includes `radio`, `numeric-input`, `matcher`, `orderer`, `categorizer`, `label-image`,
  `dropdown`, `fill-in-the-blank`, `free-response`, `python-program`, `video` and `image`, among others.
  ([widgets/](https://github.com/Khan/perseus/tree/main/packages/perseus/src/widgets))
- **read**: Content is Markdown that references widgets as `[[☃ widget-id]]`, and every placeholder must have an
  entry in the `widgets` map. Radio choices carry a `rationale`. Numeric answers carry `maxError`. Categorizer
  `values` give each item's category index. These are the precedents for our placeholders, `Option.rationale`,
  `tolerance` and `categorize.answer`. ([data-schema.ts](https://github.com/Khan/perseus/blob/main/packages/perseus-core/src/data-schema.ts))

### QTI (IMS assessment standard)

- **snippet**, from vendor docs and not the spec itself: the interactions include choice (up to `maxChoices`), text
  entry (fill in the blank with exact text), gap match (drag choices into gaps in text), inline choice (a dropdown
  in text), and hotspot (select regions of an image). ([TAO interactions](https://userguide.taotesting.com/user-documentation/latest/public/standard-interactions-for-test-takers),
  [Pyslet QTI 2](https://pyslet.readthedocs.io/en/latest/qtiv2/interactions.html))

### H5P

- **snippet**: Fill in the blanks marks answers inline as `*6/six*`, with `:` for hints. Users report they can't
  enter fractions or slash-delimited phonemes. An escape syntax is still an open request (HFP-764).
  ([tutorial](https://h5p.org/tutorials/fill-in-the-blanks), [HFP-764](https://h5ptechnology.atlassian.net/browse/HFP-764))

### Yousician (music)

- **snippet**: It listens through the device microphone, and recognition suffers when the instrument is out of tune
  or the room is noisy. A review notes it hears whether a chord rang out, not how the hand is placed. That gap is
  why `capture` (a photo or video judged against a rubric) sits alongside `play`.
  ([support](https://support.yousician.com/hc/en-us/articles/46277332028817-Guitar-sound-recognition-issues),
  [review](https://violetrecording.com/yousician-review/))
- **inferred**: Chord detection compares pitch classes, which is why `play.chord` stores pitch classes and ignores
  octave. A patent snippet describes chromagram-to-template matching, but nothing confirms Yousician uses it. The
  real check is to test a pitch-detection library on device.
