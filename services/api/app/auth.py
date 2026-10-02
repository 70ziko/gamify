from dataclasses import dataclass
from functools import lru_cache
from typing import Annotated
from uuid import UUID

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import get_settings

bearer = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class AuthUser:
    id: UUID
    email: str | None
    is_staff: bool


@lru_cache
def get_jwks_client() -> jwt.PyJWKClient:
    return jwt.PyJWKClient(f"{get_settings().auth_issuer}/.well-known/jwks.json")


def decode_token(token: str) -> AuthUser:
    try:
        key = get_jwks_client().get_signing_key_from_jwt(token)
        claims = jwt.decode(
            token,
            key,
            algorithms=["ES256", "RS256"],
            audience="authenticated",
            issuer=get_settings().auth_issuer,
        )
    except jwt.PyJWKClientConnectionError as exc:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Auth keys unavailable") from exc
    except jwt.PyJWTError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token") from exc
    return AuthUser(
        id=UUID(claims["sub"]),
        email=claims.get("email"),
        is_staff=claims.get("app_metadata", {}).get("staff") is True,
    )


def current_user(credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)]) -> AuthUser:
    if credentials is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing bearer token", {"WWW-Authenticate": "Bearer"})
    return decode_token(credentials.credentials)


CurrentUser = Annotated[AuthUser, Depends(current_user)]
