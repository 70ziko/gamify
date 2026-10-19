import typing

import pytest
from pydantic import TypeAdapter, ValidationError

from app.questions.grading import GRADERS, Response, grade
from app.questions.schemas import DialogueQuestion, FillBankQuestion, FillTypedQuestion, Question, TuneQuestion

questions: TypeAdapter[Question] = TypeAdapter(Question)
responses: TypeAdapter[Response] = TypeAdapter(Response)

IMG = {"type": "image", "src": "https://cdn.example.com/c-major.png", "alt": "Fretboard with a C major shape"}

# One authored example per kind, as JSON would arrive from the editor or an AI flow.
EXAMPLES: dict[str, dict] = {
    "learn": {
        "prompt": "How to hold a C major chord",
        "body": "Ring finger on the **3rd fret** of the A string.",
        "media": [{"type": "video", "src": "asset:4f1c", "alt": "Hand forming C major", "start_s": 12, "end_s": 20}],
    },
    "choice": {
        "prompt": "Which photo shows the C major chord?",
        "options": [
            {"id": "a", "media": IMG},
            {"id": "b", "text": "G major", "rationale": "G uses the low E string."},
        ],
        "correct": ["a"],
    },
    "match": {
        "prompt": "Tap the pairs",
        "pairs": [
            {"left": {"id": "gato", "text": "gato"}, "right": {"id": "cat", "text": "cat"}},
            {"left": {"id": "perro", "text": "perro"}, "right": {"id": "dog", "text": "dog"}},
        ],
    },
    "order": {
        "prompt": "Translate: I drink coffee",
        "items": [{"id": "yo", "text": "Yo"}, {"id": "bebo", "text": "bebo"}, {"id": "cafe", "text": "café"}],
        "distractors": [{"id": "como", "text": "como"}],
    },
    "categorize": {
        "prompt": "Major or minor?",
        "buckets": [{"id": "maj", "label": "Major"}, {"id": "min", "label": "Minor"}],
        "items": [{"id": "c", "text": "C E G"}, {"id": "am", "text": "A C E"}],
        "answer": {"c": "maj", "am": "min"},
    },
    "hotspot": {
        "prompt": "Tap where your index finger goes",
        "image": IMG,
        "regions": [
            {"id": "f1", "area": {"shape": "rect", "x": 0.1, "y": 0.2, "w": 0.2, "h": 0.1}},
            {"id": "f2", "area": {"shape": "circle", "cx": 0.6, "cy": 0.5, "r": 0.05}},
        ],
        "correct": ["f1"],
    },
    "fill_bank": {
        "prompt": "Complete the sentence",
        "text": "Yo {{b1}} café por la {{b2}}.",
        "blanks": [{"id": "b1", "answer": "bebo"}, {"id": "b2", "answer": "mañana"}],
        "distractors": ["como", "noche"],
    },
    "fill_typed": {
        "prompt": "Fill in the keyword",
        "text": "{{kw}} x in items:\n    print(f'{{x}}')",
        "blanks": [{"id": "kw", "accepted": ["for"]}],
        "match": {"case_sensitive": True, "typos": 0},
    },
    "short_answer": {
        "prompt": "Type what you hear",
        "media": [{"type": "speech", "text": "¿Dónde está la estación?", "lang": "es"}],
        "accepted": ["¿Dónde está la estación?"],
        "lang": "es",
    },
    "numeric": {"prompt": "What frequency is A4?", "value": 440, "tolerance": 0.5, "unit": "Hz"},
    "open_response": {"prompt": "Describe your practice today", "rubric": "Names one difficulty and one fix."},
    "code": {
        "prompt": "Return the list reversed",
        "language": "python",
        "starter": "def rev(xs):\n    ...",
        "solution": "def rev(xs):\n    return xs[::-1]",
        "rubric": "Returns a new reversed list without mutating xs.",
    },
    "speak": {"prompt": "Say this sentence", "text": "Buenos días, señora", "lang": "es-ES"},
    "play": {"prompt": "Play a C major chord", "instrument": "guitar", "target": "chord", "chord": ["C", "E", "G"]},
    "tune": {"prompt": "Tune your low E string", "note": "E2", "label": "Low E"},
    "dialogue": {
        "prompt": "Order a coffee",
        "lang": "es",
        "speakers": [{"id": "barista", "name": "Lucía"}],
        "turns": [
            {"type": "line", "speaker": "barista", "text": "¡Hola! ¿Qué te pongo?"},
            {
                "type": "choose",
                "id": "order",
                "options": [{"id": "a", "text": "Un café, por favor."}, {"id": "b", "text": "Buenas noches."}],
                "correct": "a",
            },
            {"type": "line", "speaker": "barista", "text": "¿Algo más?"},
            {"type": "speak", "id": "thanks", "text": "No, gracias"},
        ],
    },
    "capture": {
        "prompt": "Show your hand on the C chord",
        "rubric": "Ring finger on the 3rd fret of the A string; thumb behind the neck.",
        "reference": {
            "type": "video",
            "src": "asset:4f1c",
            "alt": "Hand forming C major",
            "start_s": 12,
            "end_s": 20,
            "loop": True,
        },
    },
    "check": {"prompt": "Finish eight rounds of run 1 min, walk 90 s."},
    "timer": {"prompt": "Warm up with a brisk walk.", "minutes": 5},
}


def make(kind: str, **changes: object) -> Question:
    return questions.validate_python({"kind": kind, **EXAMPLES[kind], **changes})


def check(kind: str, response: dict, **changes: object):
    return grade(make(kind, **changes), responses.validate_python({"kind": kind, **response}))


def kinds_of(union: object) -> set[str]:
    members = typing.get_args(typing.get_args(union)[0])
    return {typing.get_args(m.model_fields["kind"].annotation)[0] for m in members}


def test_every_kind_has_an_example_response_and_grader() -> None:
    kinds = kinds_of(Question)
    assert kinds == set(EXAMPLES) == kinds_of(Response) == set(GRADERS)


@pytest.mark.parametrize("kind", EXAMPLES)
def test_questions_round_trip_through_json(kind: str) -> None:
    question = make(kind)
    again = questions.validate_json(questions.dump_json(question))
    assert again == question
    assert type(question).spec.input in ("tap", "keyboard", "microphone", "camera", "self")


def test_closed_kinds_are_recognition_and_open_kinds_are_not() -> None:
    demand = {kind: type(make(kind)).spec.demand for kind in EXAMPLES}
    assert {k for k, d in demand.items() if d == "recognize"} == {
        "choice", "match", "order", "categorize", "hotspot", "fill_bank"
    }


def test_placeholders_must_match_blanks() -> None:
    with pytest.raises(ValidationError, match="exactly once"):
        make("fill_bank", text="Yo {{b1}} café.")
    with pytest.raises(ValidationError, match="exactly once"):
        make("fill_bank", text="{{b1}} {{b1}} {{b2}}")


def test_blanks_can_be_dropdowns_outside_the_bank() -> None:
    blanks = [{"id": "b1", "answer": "bebo", "options": ["bebo", "bebes"]}, {"id": "b2", "answer": "mañana"}]
    question = make("fill_bank", blanks=blanks)
    assert isinstance(question, FillBankQuestion) and question.bank == ["mañana", "como", "noche"]
    assert check("fill_bank", {"filled": {"b1": "bebo", "b2": "mañana"}}, blanks=blanks).passed
    with pytest.raises(ValidationError, match="include the answer"):
        make("fill_bank", blanks=[{"id": "b1", "answer": "bebo", "options": ["como", "bebes"]}, blanks[1]])
    with pytest.raises(ValidationError, match="without options"):
        make("fill_bank", text="Yo {{b1}}.", blanks=blanks[:1])


def test_unknown_placeholders_stay_literal() -> None:
    question = make("fill_typed")
    assert isinstance(question, FillTypedQuestion)
    assert question.segments() == [{"blank": "kw"}, " x in items:\n    print(f'{{x}}')"]


def test_invalid_answer_keys_are_rejected() -> None:
    with pytest.raises(ValidationError, match="exactly one"):
        make("choice", correct=["a", "b"])
    with pytest.raises(ValidationError, match="name option ids"):
        make("choice", correct=["z"])
    with pytest.raises(ValidationError, match="distractor"):
        make("fill_bank", distractors=["Bebo"])
    with pytest.raises(ValidationError, match="alternative"):
        make("order", alternatives=[["yo", "cafe"]])
    with pytest.raises(ValidationError, match="text or media"):
        make("order", items=[{"id": "a"}, {"id": "b", "text": "b"}])
    with pytest.raises(ValidationError):
        make("short_answer", accepted=["   "])


def test_ids_are_generated_once_and_kept() -> None:
    question = make("check")
    assert questions.validate_python(questions.dump_python(question)).id == question.id


def test_typed_answers_forgive_case_typos_and_accents() -> None:
    assert check("short_answer", {"text": "donde esta la estacion"}).outcome == "almost"
    assert check("short_answer", {"text": "¿dónde está la estaicón?"}).outcome == "almost"
    assert check("short_answer", {"text": "Dónde está la estación"}).outcome == "correct"
    assert check("short_answer", {"text": "hola"}).outcome == "incorrect"
    assert check("fill_typed", {"filled": {"kw": "For"}}).outcome == "incorrect"


def test_partial_credit_names_wrong_parts() -> None:
    result = check("fill_bank", {"filled": {"b1": "bebo", "b2": "noche"}})
    assert (result.outcome, result.score, result.wrong) == ("incorrect", 0.5, ["b2"])
    assert check("match", {"pairs": {"gato": "cat", "perro": "dog"}}).passed
    assert check("order", {"order": ["bebo", "yo", "cafe"]}, alternatives=[["bebo", "yo", "cafe"]]).passed


def test_hotspot_taps_hit_regions() -> None:
    assert check("hotspot", {"taps": [{"x": 0.15, "y": 0.25}]}).passed
    assert check("hotspot", {"taps": [{"x": 0.6, "y": 0.52}]}).wrong == ["f2"]
    assert not check("hotspot", {"taps": [{"x": 0.9, "y": 0.9}]}).passed


def test_numeric_tolerance() -> None:
    assert check("numeric", {"value": 440.4}).passed
    assert not check("numeric", {"value": 441}).passed


def test_chords_ignore_octave_order_and_spelling() -> None:
    assert check("play", {"notes": ["G3", "C4", "E4", "C5"]}).passed
    assert check("play", {"notes": ["B#", "Fb", "G"]}).passed
    assert not check("play", {"notes": ["C", "Eb", "G"]}).passed
    melody = {"target": "melody", "chord": [], "melody": ["E4", "D4", "C4"]}
    assert check("play", {"notes": ["E4", "D4", "C4"]}, **melody).passed
    assert not check("play", {"notes": ["E4", "C4"]}, **melody).passed


def test_tuning_needs_pitch_and_hold() -> None:
    assert check("tune", {"cents_off": -3, "held_s": 1.2}).passed
    assert check("tune", {"cents_off": 12, "held_s": 2}).feedback == "Tune down."
    assert not check("tune", {"cents_off": 0, "held_s": 0.4}).passed
    tune = make("tune")
    assert isinstance(tune, TuneQuestion) and tune.frequency_hz == 82.41


def test_speech_accuracy_threshold() -> None:
    assert check("speak", {"transcript": "buenos dias senora"}).passed  # spelling is the recognizer's job
    assert check("speak", {"transcript": "Buenos días, señora."}).passed
    assert not check("speak", {"transcript": "buenos"}).passed


def test_learn_cards_need_content_and_always_pass() -> None:
    assert check("learn", {}).passed
    with pytest.raises(ValidationError, match="body or media"):
        make("learn", body=" ", media=[])


def test_dialogue_grades_each_learner_turn() -> None:
    dialogue = make("dialogue")
    assert isinstance(dialogue, DialogueQuestion) and dialogue.inputs() == {"tap", "microphone"}
    assert check("dialogue", {"replies": {"order": "a", "thanks": "no gracias"}}).passed
    result = check("dialogue", {"replies": {"order": "b", "thanks": "no gracias"}})
    assert (result.passed, result.wrong) == (False, ["order"])
    with pytest.raises(ValidationError, match="speaker id"):
        make("dialogue", turns=[{"type": "line", "speaker": "nobody", "text": "Hola"}, EXAMPLES["dialogue"]["turns"][3]])
    with pytest.raises(ValidationError, match="turn for the learner"):
        make("dialogue", turns=[EXAMPLES["dialogue"]["turns"][0], EXAMPLES["dialogue"]["turns"][2]])


def test_judged_kinds_wait_for_review() -> None:
    assert check("capture", {"asset": "asset:abc"}).outcome == "pending"
    assert check("code", {"code": "def rev(xs): return xs[::-1]"}).outcome == "pending"


def test_response_must_match_kind() -> None:
    with pytest.raises(ValueError, match="can't answer"):
        grade(make("check"), responses.validate_python({"kind": "timer", "elapsed_s": 1}))
