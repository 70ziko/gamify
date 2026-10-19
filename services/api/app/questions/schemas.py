"""Question kinds a step can hold, as serializable content plus the answer key.

Every kind is a Pydantic model discriminated by `kind`. A question carries everything needed to render and grade
it: the prompt, any media, and the answer key. `spec` (a ClassVar, not serialized) says how the learner answers and
how hard the kind is expected to be. Kinds that mix inputs override `inputs()`. To add a kind: define the model with a
`spec`, add it to `Question`, add its response and grader to `grading.py`. `tests/test_questions.py` fails until all three exist.
"""

import re
from dataclasses import dataclass
from typing import Annotated, ClassVar, Literal, Self
from uuid import uuid4

from pydantic import BaseModel, Field, computed_field, model_validator

# What the learner answers with. Clients can skip or swap kinds whose input the device or moment can't provide.
Input = Literal["tap", "keyboard", "microphone", "camera", "self"]
# Expected cognitive demand, easiest first: pick the right thing, produce it from memory, produce it freely,
# do it in the real world.
Demand = Literal["recognize", "recall", "produce", "perform"]
# Who decides correctness: the answer key, an on-device recognizer feeding the answer key, an AI judge, or the learner.
Grading = Literal["auto", "sensor", "ai", "self"]
Difficulty = Literal["easy", "normal", "hard"]
Review = Literal["ai", "self"]

ItemId = Annotated[str, Field(pattern=r"^[a-z0-9_]{1,24}$")]
Note = Annotated[str, Field(pattern=r"^[A-G](#|b)?\d$")]
PitchClass = Annotated[str, Field(pattern=r"^[A-G](#|b)?$")]
Lang = Annotated[str, Field(pattern=r"^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$")]  # BCP 47, e.g. "es" or "pt-BR"
Unit = Annotated[float, Field(ge=0, le=1)]  # a coordinate as a fraction of the image's width or height
Answer = Annotated[str, Field(min_length=1, max_length=200, pattern=r"\S")]

PLACEHOLDER = re.compile(r"\{\{([a-z0-9_]{1,24})\}\}")


@dataclass(frozen=True)
class KindSpec:
    input: Input
    demand: Demand
    grading: Grading


# Media is referenced, never embedded: `src` is an https URL or "asset:<id>" for a file in the app's storage.
class MediaBase(BaseModel):
    src: str = Field(pattern=r"^(https://|asset:)\S+$")
    caption: str = Field(default="", max_length=200)


class Image(MediaBase):
    type: Literal["image"]
    alt: str = Field(min_length=1, max_length=300)  # what the image shows; AI authors and screen readers rely on it


class Video(MediaBase):
    type: Literal["video"]
    alt: str = Field(min_length=1, max_length=300)
    start_s: float | None = Field(default=None, ge=0)
    end_s: float | None = Field(default=None, gt=0)
    loop: bool = False

    @model_validator(mode="after")
    def clip_in_order(self) -> Self:
        if self.start_s is not None and self.end_s is not None and self.end_s <= self.start_s:
            raise ValueError("end_s must be after start_s")
        return self


class Audio(MediaBase):
    type: Literal["audio"]
    transcript: str = Field(default="", max_length=1000)


class Speech(BaseModel):
    """Text the device reads aloud, so AI-written language courses get audio without recorded files."""

    type: Literal["speech"]
    text: str = Field(min_length=1, max_length=500)
    lang: Lang
    slow: bool = False


Media = Annotated[Image | Video | Audio | Speech, Field(discriminator="type")]
Visual = Annotated[Image | Video, Field(discriminator="type")]


class Choice(BaseModel):
    """A tappable item: an option, a tile, a card. It shows text, media, or both."""

    id: ItemId
    text: str = Field(default="", max_length=200)
    media: Media | None = None

    @model_validator(mode="after")
    def has_content(self) -> Self:
        if not self.text.strip() and self.media is None:
            raise ValueError("a choice needs text or media")
        return self


class Option(Choice):
    rationale: str = Field(default="", max_length=300)  # why this option is right or wrong, shown after checking


class TextMatch(BaseModel):
    """How typed text is compared to accepted answers. Whitespace runs always collapse."""

    case_sensitive: bool = False
    ignore_accents: bool = False  # off for languages, where an accent can change the word
    ignore_punctuation: bool = True
    typos: int = Field(default=1, ge=0, le=2)  # edit distance accepted as "almost", for answers of 5+ characters


class QuestionBase(BaseModel):
    spec: ClassVar[KindSpec]

    id: str = Field(default_factory=lambda: uuid4().hex[:12], pattern=r"^[A-Za-z0-9_-]{1,36}$")
    prompt: str = Field(min_length=1, max_length=300)  # the instruction, e.g. "Complete the sentence"
    # The stimulus and any teaching content: an image, a clip of how to hold a chord, a sentence to hear. There are
    # no content-only cards; new material always comes attached to something the learner has to do.
    media: list[Media] = Field(default_factory=list, max_length=4)
    hints: list[str] = Field(default_factory=list, max_length=3)
    explanation: str = Field(default="", max_length=1000)  # shown after the answer is checked
    difficulty: Difficulty = "normal"  # within the kind's demand; lets a session pick harder items as the learner improves

    def inputs(self) -> set[Input]:
        """What this question needs from the device. Kinds that mix inputs override it."""
        return {self.spec.input}


def unique(ids: list[str], what: str) -> None:
    if len(set(ids)) != len(ids):
        raise ValueError(f"{what} ids must be unique")


# Tap: closed questions answered in a second or two.


class ChoiceQuestion(QuestionBase):
    """Pick one (or several) options. Covers true/false, pick the image, pick the meaning."""

    spec = KindSpec("tap", "recognize", "auto")
    kind: Literal["choice"]
    options: list[Option] = Field(min_length=2, max_length=8)
    correct: list[ItemId] = Field(min_length=1)
    multiple: bool = False
    shuffle: bool = True

    @model_validator(mode="after")
    def correct_in_options(self) -> Self:
        unique([o.id for o in self.options], "option")
        unique(self.correct, "correct")
        if not set(self.correct) <= {o.id for o in self.options}:
            raise ValueError("correct must name option ids")
        if not self.multiple and len(self.correct) != 1:
            raise ValueError("a single-answer choice needs exactly one correct option")
        return self


class Pair(BaseModel):
    left: Choice
    right: Choice


class MatchQuestion(QuestionBase):
    """Tap the pairs: connect each left item to its right item, e.g. word to translation or audio to chord name."""

    spec = KindSpec("tap", "recognize", "auto")
    kind: Literal["match"]
    pairs: list[Pair] = Field(min_length=2, max_length=6)

    @model_validator(mode="after")
    def ids_unique(self) -> Self:
        unique([item.id for pair in self.pairs for item in (pair.left, pair.right)], "item")
        return self


class OrderQuestion(QuestionBase):
    """Arrange items into sequence: words into a sentence (`words`) or steps into a process (`list`)."""

    spec = KindSpec("tap", "recognize", "auto")
    kind: Literal["order"]
    items: list[Choice] = Field(min_length=2, max_length=12)  # in the correct order
    distractors: list[Choice] = Field(default_factory=list, max_length=6)  # extra tiles that belong nowhere
    alternatives: list[list[ItemId]] = Field(default_factory=list, max_length=5)  # other accepted orders of `items`
    layout: Literal["words", "list"] = "words"

    @model_validator(mode="after")
    def alternatives_permute_items(self) -> Self:
        ids = [item.id for item in self.items]
        unique(ids + [d.id for d in self.distractors], "item")
        if any(sorted(order) != sorted(ids) for order in self.alternatives):
            raise ValueError("each alternative must order exactly the items")
        return self

    @property
    def accepted(self) -> list[list[str]]:
        return [[item.id for item in self.items], *self.alternatives]


class Bucket(BaseModel):
    id: ItemId
    label: str = Field(min_length=1, max_length=60)


class CategorizeQuestion(QuestionBase):
    """Sort items into buckets, e.g. major vs minor chords, mammals vs reptiles."""

    spec = KindSpec("tap", "recognize", "auto")
    kind: Literal["categorize"]
    buckets: list[Bucket] = Field(min_length=2, max_length=4)
    items: list[Choice] = Field(min_length=2, max_length=10)
    answer: dict[ItemId, ItemId]  # item id -> bucket id

    @model_validator(mode="after")
    def answer_covers_items(self) -> Self:
        unique([b.id for b in self.buckets], "bucket")
        unique([i.id for i in self.items], "item")
        if set(self.answer) != {i.id for i in self.items}:
            raise ValueError("answer must place every item exactly once")
        if not set(self.answer.values()) <= {b.id for b in self.buckets}:
            raise ValueError("answer must name bucket ids")
        return self


class Rect(BaseModel):
    shape: Literal["rect"]
    x: Unit
    y: Unit
    w: Unit
    h: Unit

    def contains(self, x: float, y: float) -> bool:
        return self.x <= x <= self.x + self.w and self.y <= y <= self.y + self.h


class Circle(BaseModel):
    shape: Literal["circle"]
    cx: Unit
    cy: Unit
    r: Unit  # as a fraction of the image width

    def contains(self, x: float, y: float) -> bool:
        return (x - self.cx) ** 2 + (y - self.cy) ** 2 <= self.r**2


class Region(BaseModel):
    id: ItemId
    area: Annotated[Rect | Circle, Field(discriminator="shape")]


class HotspotQuestion(QuestionBase):
    """Tap the right place on an image, e.g. the fret for a note or the muscle being stretched."""

    spec = KindSpec("tap", "recognize", "auto")
    kind: Literal["hotspot"]
    image: Image
    regions: list[Region] = Field(min_length=1, max_length=10)
    correct: list[ItemId] = Field(min_length=1)  # tap all of these; other regions count as wrong taps

    @model_validator(mode="after")
    def correct_in_regions(self) -> Self:
        unique([r.id for r in self.regions], "region")
        if not set(self.correct) <= {r.id for r in self.regions}:
            raise ValueError("correct must name region ids")
        return self


class Cloze(QuestionBase):
    """Text with `{{id}}` placeholders, one per blank, each appearing exactly once.

    A `{{name}}` that names no blank stays literal text, so code or templates in the text don't need escaping.
    """

    text: str = Field(min_length=1, max_length=1000)

    def blank_ids(self) -> list[str]:
        raise NotImplementedError

    def segments(self) -> list[str | dict[str, str]]:
        """The text split for rendering: plain strings and {"blank": id} markers, in reading order."""
        ids, parts, end = set(self.blank_ids()), [], 0
        for found in PLACEHOLDER.finditer(self.text):
            if found[1] in ids:
                parts += [self.text[end : found.start()], {"blank": found[1]}]
                end = found.end()
        parts.append(self.text[end:])
        return [part for part in parts if part != ""]

    @model_validator(mode="after")
    def placeholders_match_blanks(self) -> Self:
        ids = self.blank_ids()
        unique(ids, "blank")
        used = [found[1] for found in PLACEHOLDER.finditer(self.text) if found[1] in ids]
        if sorted(used) != sorted(ids):
            raise ValueError("every blank must appear in text exactly once as {{id}}")
        return self


class BankBlank(BaseModel):
    id: ItemId
    answer: Answer
    options: list[Answer] = Field(default_factory=list, max_length=5)  # a dropdown for this blank, e.g. es / está

    @model_validator(mode="after")
    def answer_in_options(self) -> Self:
        if self.options and (len(self.options) < 2 or len(set(self.options)) != len(self.options)):
            raise ValueError("a dropdown needs at least two distinct options")
        if self.options and self.answer not in self.options:
            raise ValueError("a dropdown must include the answer")
        return self


class FillBankQuestion(Cloze):
    """Complete the sentence by tapping. A blank with `options` is a dropdown; the others take tiles from the bank,
    which is those blanks' answers plus the distractors, shuffled."""

    spec = KindSpec("tap", "recognize", "auto")
    kind: Literal["fill_bank"]
    blanks: list[BankBlank] = Field(min_length=1, max_length=6)
    distractors: list[Answer] = Field(default_factory=list, max_length=8)

    def blank_ids(self) -> list[str]:
        return [b.id for b in self.blanks]

    @model_validator(mode="after")
    def distractors_are_wrong(self) -> Self:
        answers = {b.answer.casefold() for b in self.blanks if not b.options}
        if self.distractors and not answers:
            raise ValueError("distractors need at least one blank without options")
        if any(word.casefold() in answers for word in self.distractors):
            raise ValueError("a distractor must not also be an answer")
        return self

    @property
    def bank(self) -> list[str]:
        return [b.answer for b in self.blanks if not b.options] + self.distractors


# Keyboard: the learner produces the answer, so it is graded against accepted forms.


class TypedBlank(BaseModel):
    id: ItemId
    accepted: list[Answer] = Field(min_length=1, max_length=10)  # the first is shown as the answer


class FillTypedQuestion(Cloze):
    """Type the missing word(s), e.g. a verb form, a keyword in a code line, a value in a formula."""

    spec = KindSpec("keyboard", "recall", "auto")
    kind: Literal["fill_typed"]
    blanks: list[TypedBlank] = Field(min_length=1, max_length=6)
    match: TextMatch = Field(default_factory=TextMatch)
    lang: Lang | None = None  # keyboard language

    def blank_ids(self) -> list[str]:
        return [b.id for b in self.blanks]


class ShortAnswerQuestion(QuestionBase):
    """Type a short answer: a translation, a term, or what you heard (put a `speech` or `audio` item in media)."""

    spec = KindSpec("keyboard", "recall", "auto")
    kind: Literal["short_answer"]
    accepted: list[Answer] = Field(min_length=1, max_length=20)  # the first is shown as the answer
    match: TextMatch = Field(default_factory=TextMatch)
    lang: Lang | None = None
    placeholder: str = Field(default="", max_length=60)


class NumericQuestion(QuestionBase):
    """Type a number, accepted within `tolerance`, e.g. a frequency, a chemistry yield, a sum."""

    spec = KindSpec("keyboard", "recall", "auto")
    kind: Literal["numeric"]
    value: float
    tolerance: float = Field(default=0, ge=0)
    unit: str = Field(default="", max_length=20)  # shown next to the input, never typed


class OpenResponseQuestion(QuestionBase):
    """Write freely, judged against a rubric by an AI or by the learner comparing with the sample answer."""

    spec = KindSpec("keyboard", "produce", "ai")
    kind: Literal["open_response"]
    rubric: str = Field(min_length=1, max_length=1000)
    sample_answer: str = Field(default="", max_length=2000)
    review: Review = "ai"
    max_chars: int = Field(default=500, ge=20, le=5000)


class CodeQuestion(QuestionBase):
    """Write or fix code in an editor. Judged by rubric until a sandboxed runner exists."""

    spec = KindSpec("keyboard", "produce", "ai")
    kind: Literal["code"]
    language: str = Field(pattern=r"^[a-z0-9+#-]{1,20}$")  # editor highlighting, e.g. "python", "sql"
    starter: str = Field(default="", max_length=4000)
    solution: str = Field(min_length=1, max_length=4000)
    rubric: str = Field(min_length=1, max_length=1000)
    review: Review = "ai"


# Microphone: an on-device recognizer turns sound into an observation (a transcript, detected notes, a pitch
# offset), and the grader compares that observation with the answer key.


class SpeakQuestion(QuestionBase):
    """Say a phrase. Speech-to-text produces a transcript compared word by word with `text`."""

    spec = KindSpec("microphone", "produce", "sensor")
    kind: Literal["speak"]
    text: str = Field(min_length=1, max_length=300)
    lang: Lang
    min_accuracy: float = Field(default=0.8, gt=0, le=1)  # share of target words that must be heard


class PlayQuestion(QuestionBase):
    """Play a chord (pitch classes, any octave, any order) or a melody (exact notes in order)."""

    spec = KindSpec("microphone", "perform", "sensor")
    kind: Literal["play"]
    instrument: str = Field(default="", max_length=40)
    target: Literal["chord", "melody"]
    chord: list[PitchClass] = Field(default_factory=list, max_length=6)
    melody: list[Note] = Field(default_factory=list, max_length=32)

    @model_validator(mode="after")
    def target_filled(self) -> Self:
        if self.target == "chord" and len(self.chord) < 2:
            raise ValueError("a chord target needs at least two pitch classes")
        if self.target == "melody" and not self.melody:
            raise ValueError("a melody target needs notes")
        return self


NOTE_INDEX = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}


def midi(note: str) -> int:
    letter, octave = note[0], int(note[-1])
    shift = {"#": 1, "b": -1}.get(note[1:-1], 0)
    return 12 * (octave + 1) + NOTE_INDEX[letter] + shift


class TuneQuestion(QuestionBase):
    """Tune a string to `note` and hold it within `tolerance_cents` for `hold_s` seconds."""

    spec = KindSpec("microphone", "perform", "sensor")
    kind: Literal["tune"]
    note: Note
    label: str = Field(default="", max_length=40)  # e.g. "Low E string"
    tolerance_cents: float = Field(default=5, gt=0, le=50)
    hold_s: float = Field(default=1, gt=0, le=10)

    @computed_field
    @property
    def frequency_hz(self) -> float:
        return round(440 * 2 ** ((midi(self.note) - 69) / 12), 2)


# Mixed input


class Speaker(BaseModel):
    id: ItemId
    name: str = Field(min_length=1, max_length=40)
    avatar: Image | None = None


class Line(BaseModel):
    """A line another speaker says. With `read_aloud`, the device reads it in the dialogue's language."""

    type: Literal["line"]
    speaker: ItemId
    text: str = Field(min_length=1, max_length=300)


class ChooseReply(BaseModel):
    """The learner's turn: pick the right reply."""

    type: Literal["choose"]
    id: ItemId
    options: list[Option] = Field(min_length=2, max_length=4)
    correct: ItemId

    @model_validator(mode="after")
    def correct_in_options(self) -> Self:
        unique([o.id for o in self.options], "option")
        if self.correct not in {o.id for o in self.options}:
            raise ValueError("correct must name an option id")
        return self


class SpeakReply(BaseModel):
    """The learner's turn: say the reply."""

    type: Literal["speak"]
    id: ItemId
    text: str = Field(min_length=1, max_length=300)
    min_accuracy: float = Field(default=0.8, gt=0, le=1)


Turn = Annotated[Line | ChooseReply | SpeakReply, Field(discriminator="type")]


class DialogueQuestion(QuestionBase):
    """A short conversation in which some turns are the learner's: pick the reply, or say it."""

    spec = KindSpec("tap", "recall", "auto")
    kind: Literal["dialogue"]
    lang: Lang
    speakers: list[Speaker] = Field(min_length=1, max_length=4)
    turns: list[Turn] = Field(min_length=2, max_length=20)
    read_aloud: bool = True

    @property
    def replies(self) -> list[ChooseReply | SpeakReply]:
        return [turn for turn in self.turns if not isinstance(turn, Line)]

    def inputs(self) -> set[Input]:
        return {"microphone" if isinstance(reply, SpeakReply) else "tap" for reply in self.replies}

    @model_validator(mode="after")
    def turns_are_consistent(self) -> Self:
        unique([s.id for s in self.speakers], "speaker")
        unique([r.id for r in self.replies], "reply")
        if not self.replies:
            raise ValueError("a dialogue needs at least one turn for the learner")
        speakers = {s.id for s in self.speakers}
        if any(isinstance(turn, Line) and turn.speaker not in speakers for turn in self.turns):
            raise ValueError("every line must name a speaker id")
        return self


# Camera


class CaptureQuestion(QuestionBase):
    """Take a photo as proof or for feedback, e.g. your hand on the C chord, your plated dish."""

    spec = KindSpec("camera", "perform", "ai")
    kind: Literal["capture"]
    rubric: str = Field(min_length=1, max_length=1000)  # what the photo must show
    reference: Visual | None = None  # an example of a good result
    camera: Literal["front", "back"] = "back"
    review: Review = "ai"


# Self-report: real-world practice the app can't observe.


class CheckQuestion(QuestionBase):
    spec = KindSpec("self", "perform", "self")
    kind: Literal["check"]


class TimerQuestion(QuestionBase):
    spec = KindSpec("self", "perform", "self")
    kind: Literal["timer"]
    minutes: int = Field(gt=0, le=240)


Question = Annotated[
    ChoiceQuestion
    | MatchQuestion
    | OrderQuestion
    | CategorizeQuestion
    | HotspotQuestion
    | FillBankQuestion
    | FillTypedQuestion
    | ShortAnswerQuestion
    | NumericQuestion
    | OpenResponseQuestion
    | CodeQuestion
    | SpeakQuestion
    | PlayQuestion
    | TuneQuestion
    | DialogueQuestion
    | CaptureQuestion
    | CheckQuestion
    | TimerQuestion,
    Field(discriminator="kind"),
]
