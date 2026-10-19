"""What a learner submits for each question kind, and the pure function that grades it.

Microphone and camera kinds submit what the on-device recognizer observed (a transcript, detected notes, a pitch
offset, an uploaded photo), never raw audio, so grading stays a comparison with the answer key.
"""

import difflib
import unicodedata
from collections.abc import Callable
from typing import Annotated, Any, Literal

from pydantic import BaseModel, Field

from app.questions.schemas import (
    NOTE_INDEX,
    CategorizeQuestion,
    ChoiceQuestion,
    ChooseReply,
    DialogueQuestion,
    FillBankQuestion,
    FillTypedQuestion,
    HotspotQuestion,
    MatchQuestion,
    NumericQuestion,
    OrderQuestion,
    PlayQuestion,
    Question,
    ShortAnswerQuestion,
    SpeakQuestion,
    SpeakReply,
    TextMatch,
    TimerQuestion,
    TuneQuestion,
    midi,
)

Outcome = Literal["correct", "almost", "incorrect", "pending"]


class Grade(BaseModel):
    outcome: Outcome  # "almost" passes with a nudge (a typo, a missing accent); "pending" awaits an AI or the learner
    score: float = Field(ge=0, le=1)
    wrong: list[str] = Field(default_factory=list)  # ids of the options, items, or blanks to highlight
    feedback: str = ""

    @property
    def passed(self) -> bool:
        return self.outcome in ("correct", "almost")


class Point(BaseModel):
    x: float = Field(ge=0, le=1)
    y: float = Field(ge=0, le=1)


class ChoiceResponse(BaseModel):
    kind: Literal["choice"]
    selected: list[str]


class MatchResponse(BaseModel):
    kind: Literal["match"]
    pairs: dict[str, str]  # left id -> right id


class OrderResponse(BaseModel):
    kind: Literal["order"]
    order: list[str]


class CategorizeResponse(BaseModel):
    kind: Literal["categorize"]
    placed: dict[str, str]  # item id -> bucket id


class HotspotResponse(BaseModel):
    kind: Literal["hotspot"]
    taps: list[Point] = Field(max_length=10)


class FillBankResponse(BaseModel):
    kind: Literal["fill_bank"]
    filled: dict[str, str]  # blank id -> tile text


class FillTypedResponse(BaseModel):
    kind: Literal["fill_typed"]
    filled: dict[str, str]


class ShortAnswerResponse(BaseModel):
    kind: Literal["short_answer"]
    text: str = Field(max_length=500)


class NumericResponse(BaseModel):
    kind: Literal["numeric"]
    value: float


class OpenResponseResponse(BaseModel):
    kind: Literal["open_response"]
    text: str = Field(max_length=5000)


class CodeResponse(BaseModel):
    kind: Literal["code"]
    code: str = Field(max_length=10000)


class SpeakResponse(BaseModel):
    kind: Literal["speak"]
    transcript: str = Field(max_length=1000)


class PlayResponse(BaseModel):
    kind: Literal["play"]
    notes: list[str] = Field(max_length=64)  # detected notes ("E4") or pitch classes ("E"), in the order heard


class TuneResponse(BaseModel):
    kind: Literal["tune"]
    cents_off: float  # median offset from the target while held
    held_s: float = Field(ge=0)


class DialogueResponse(BaseModel):
    kind: Literal["dialogue"]
    replies: dict[str, str]  # reply id -> option id for a choose turn, transcript for a speak turn


class CaptureResponse(BaseModel):
    kind: Literal["capture"]
    asset: str = Field(pattern=r"^asset:\S+$")


class CheckResponse(BaseModel):
    kind: Literal["check"]
    done: bool


class TimerResponse(BaseModel):
    kind: Literal["timer"]
    elapsed_s: float = Field(ge=0)


Response = Annotated[
    ChoiceResponse
    | MatchResponse
    | OrderResponse
    | CategorizeResponse
    | HotspotResponse
    | FillBankResponse
    | FillTypedResponse
    | ShortAnswerResponse
    | NumericResponse
    | OpenResponseResponse
    | CodeResponse
    | SpeakResponse
    | PlayResponse
    | TuneResponse
    | DialogueResponse
    | CaptureResponse
    | CheckResponse
    | TimerResponse,
    Field(discriminator="kind"),
]


def binary(ok: bool, wrong: list[str] | None = None) -> Grade:
    return Grade(outcome="correct" if ok else "incorrect", score=1 if ok else 0, wrong=wrong or [])


def partial(right: int, total: int, wrong: list[str]) -> Grade:
    return Grade(outcome="correct" if right == total else "incorrect", score=right / total, wrong=wrong)


def normalize(text: str, match: TextMatch, *, accents: bool | None = None) -> str:
    text = unicodedata.normalize("NFKC", text)
    if not match.case_sensitive:
        text = text.casefold()
    if accents if accents is not None else match.ignore_accents:
        text = "".join(c for c in unicodedata.normalize("NFD", text) if unicodedata.category(c) != "Mn")
    if match.ignore_punctuation:
        text = "".join(" " if unicodedata.category(c).startswith("P") else c for c in text)
    return " ".join(text.split())


def distance(a: str, b: str) -> int:
    """Edits between two strings, counting a swap of neighbouring letters as one (optimal string alignment)."""
    d = [[i + j if i * j == 0 else 0 for j in range(len(b) + 1)] for i in range(len(a) + 1)]
    for i in range(1, len(a) + 1):
        for j in range(1, len(b) + 1):
            d[i][j] = min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] != b[j - 1]))
            if i > 1 and j > 1 and a[i - 1] == b[j - 2] and a[i - 2] == b[j - 1]:
                d[i][j] = min(d[i][j], d[i - 2][j - 2] + 1)
    return d[-1][-1]


def text_outcome(answer: str, accepted: list[str], match: TextMatch) -> Outcome:
    given = normalize(answer, match)
    targets = [normalize(a, match) for a in accepted]
    if given in targets:
        return "correct"
    if normalize(answer, match, accents=True) in [normalize(a, match, accents=True) for a in accepted]:
        return "almost"
    if match.typos and any(len(t) >= 5 and distance(given, t) <= match.typos for t in targets):
        return "almost"
    return "incorrect"


def grade_choice(q: ChoiceQuestion, r: ChoiceResponse) -> Grade:
    picked, correct = set(r.selected), set(q.correct)
    return Grade(
        outcome="correct" if picked == correct else "incorrect",
        score=len(picked & correct) / len(picked | correct) if picked else 0,
        wrong=sorted(picked - correct),
    )


def grade_match(q: MatchQuestion, r: MatchResponse) -> Grade:
    wrong = [p.left.id for p in q.pairs if r.pairs.get(p.left.id) != p.right.id]
    return partial(len(q.pairs) - len(wrong), len(q.pairs), wrong)


def grade_order(q: OrderQuestion, r: OrderResponse) -> Grade:
    if r.order in q.accepted:
        return binary(True)
    canonical = q.accepted[0]
    wrong = [item for i, item in enumerate(canonical) if i >= len(r.order) or r.order[i] != item]
    return Grade(outcome="incorrect", score=(len(canonical) - len(wrong)) / len(canonical), wrong=wrong)


def grade_categorize(q: CategorizeQuestion, r: CategorizeResponse) -> Grade:
    wrong = [item for item, bucket in q.answer.items() if r.placed.get(item) != bucket]
    return partial(len(q.answer) - len(wrong), len(q.answer), wrong)


def grade_hotspot(q: HotspotQuestion, r: HotspotResponse) -> Grade:
    hit = {next((reg.id for reg in q.regions if reg.area.contains(t.x, t.y)), "") for t in r.taps}
    correct = set(q.correct)
    return Grade(
        outcome="correct" if hit == correct else "incorrect",
        score=len(hit & correct) / len(hit | correct) if hit else 0,
        wrong=sorted(hit - correct - {""}),
    )


def grade_fill_bank(q: FillBankQuestion, r: FillBankResponse) -> Grade:
    wrong = [b.id for b in q.blanks if r.filled.get(b.id) != b.answer]
    return partial(len(q.blanks) - len(wrong), len(q.blanks), wrong)


def combine(outcomes: dict[str, Outcome]) -> Grade:
    wrong = [key for key, outcome in outcomes.items() if outcome == "incorrect"]
    if wrong:
        outcome: Outcome = "incorrect"
    else:
        outcome = "almost" if "almost" in outcomes.values() else "correct"
    feedback = "Watch the spelling and accents." if outcome == "almost" else ""
    return Grade(outcome=outcome, score=(len(outcomes) - len(wrong)) / len(outcomes), wrong=wrong, feedback=feedback)


def grade_fill_typed(q: FillTypedQuestion, r: FillTypedResponse) -> Grade:
    return combine({b.id: text_outcome(r.filled.get(b.id, ""), b.accepted, q.match) for b in q.blanks})


def grade_short_answer(q: ShortAnswerQuestion, r: ShortAnswerResponse) -> Grade:
    return combine({"answer": text_outcome(r.text, q.accepted, q.match)}).model_copy(update={"wrong": []})


def grade_numeric(q: NumericQuestion, r: NumericResponse) -> Grade:
    return binary(abs(r.value - q.value) <= q.tolerance + 1e-9)


def speech_accuracy(text: str, transcript: str) -> float:
    """Share of the target's words heard in order. Spelling and accents are the recognizer's job, so both are ignored."""
    words = TextMatch(ignore_accents=True, typos=0)
    target, heard = normalize(text, words).split(), normalize(transcript, words).split()
    blocks = difflib.SequenceMatcher(a=target, b=heard, autojunk=False).get_matching_blocks()
    return sum(block.size for block in blocks) / len(target)


def grade_speak(q: SpeakQuestion, r: SpeakResponse) -> Grade:
    accuracy = speech_accuracy(q.text, r.transcript)
    return Grade(outcome="correct" if accuracy >= q.min_accuracy else "incorrect", score=accuracy)


def grade_dialogue(q: DialogueQuestion, r: DialogueResponse) -> Grade:
    def outcome(reply: ChooseReply | SpeakReply) -> Outcome:
        given = r.replies.get(reply.id, "")
        if isinstance(reply, ChooseReply):
            return "correct" if given == reply.correct else "incorrect"
        return "correct" if speech_accuracy(reply.text, given) >= reply.min_accuracy else "incorrect"

    return combine({reply.id: outcome(reply) for reply in q.replies})


def pitch_class(note: str) -> int:
    shift = {"#": 1, "b": -1}.get(note[1:2], 0)
    return (NOTE_INDEX[note[0]] + shift) % 12


def grade_play(q: PlayQuestion, r: PlayResponse) -> Grade:
    if q.target == "chord":
        target, heard = {pitch_class(n) for n in q.chord}, {pitch_class(n) for n in r.notes}
        return Grade(outcome="correct" if heard == target else "incorrect", score=len(target & heard) / len(target | heard))
    played = [midi(n) for n in r.notes if n[-1].isdigit()]
    ratio = difflib.SequenceMatcher(a=[midi(n) for n in q.melody], b=played, autojunk=False).ratio()
    return Grade(outcome="correct" if ratio == 1 else "incorrect", score=ratio)


def grade_tune(q: TuneQuestion, r: TuneResponse) -> Grade:
    feedback = "" if abs(r.cents_off) <= q.tolerance_cents else ("Tune down." if r.cents_off > 0 else "Tune up.")
    return binary(abs(r.cents_off) <= q.tolerance_cents and r.held_s >= q.hold_s).model_copy(update={"feedback": feedback})


def pending(_q: Any, _r: Any) -> Grade:
    return Grade(outcome="pending", score=0)


def grade_check(_q: Any, r: CheckResponse) -> Grade:
    return binary(r.done)


def grade_timer(q: TimerQuestion, r: TimerResponse) -> Grade:
    return binary(r.elapsed_s >= q.minutes * 60)


GRADERS: dict[str, Callable[[Any, Any], Grade]] = {
    "choice": grade_choice,
    "match": grade_match,
    "order": grade_order,
    "categorize": grade_categorize,
    "hotspot": grade_hotspot,
    "fill_bank": grade_fill_bank,
    "fill_typed": grade_fill_typed,
    "short_answer": grade_short_answer,
    "numeric": grade_numeric,
    "open_response": pending,
    "code": pending,
    "speak": grade_speak,
    "play": grade_play,
    "tune": grade_tune,
    "dialogue": grade_dialogue,
    "capture": pending,
    "check": grade_check,
    "timer": grade_timer,
}


def grade(question: Question, response: Response) -> Grade:
    if question.kind != response.kind:
        raise ValueError(f"a {response.kind} response can't answer a {question.kind} question")
    return GRADERS[question.kind](question, response)
