import json
import time
from collections.abc import Iterator
from uuid import uuid4

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi import HTTPException
from httpx import ASGITransport, AsyncClient

from app import auth
from app.config import get_settings
from app.main import app

KEY = ec.generate_private_key(ec.SECP256R1())
OTHER_KEY = ec.generate_private_key(ec.SECP256R1())
KID = "test-key"


class StubJwksClient:
    def get_signing_key_from_jwt(self, token: str) -> jwt.PyJWK:
        jwk = json.loads(jwt.algorithms.ECAlgorithm.to_jwk(KEY.public_key()))
        return jwt.PyJWK({**jwk, "kid": KID, "alg": "ES256"})


@pytest.fixture(autouse=True)
def stub_jwks(monkeypatch: pytest.MonkeyPatch) -> Iterator[None]:
    monkeypatch.setattr(auth, "get_jwks_client", StubJwksClient)
    yield


def token(key: ec.EllipticCurvePrivateKey = KEY, **overrides: object) -> str:
    claims = {
        "sub": str(uuid4()),
        "email": "alex@example.com",
        "aud": "authenticated",
        "iss": get_settings().auth_issuer,
        "exp": int(time.time()) + 60,
        "app_metadata": {"provider": "email"},
    }
    return jwt.encode({**claims, **overrides}, key, algorithm="ES256", headers={"kid": KID})


def test_valid_token_yields_user() -> None:
    user = auth.decode_token(token(app_metadata={"staff": True}))
    assert user.email == "alex@example.com"
    assert user.is_staff


@pytest.mark.parametrize(
    "bad",
    [
        token(aud="anon"),
        token(iss="https://evil.example/auth/v1"),
        token(exp=int(time.time()) - 10),
        token(OTHER_KEY),
    ],
    ids=["audience", "issuer", "expired", "signature"],
)
def test_invalid_tokens_are_rejected(bad: str) -> None:
    with pytest.raises(HTTPException) as exc:
        auth.decode_token(bad)
    assert exc.value.status_code == 401


async def test_missing_token_is_401() -> None:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/me")
    assert response.status_code == 401
