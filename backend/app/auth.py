from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from app.config import Settings
from app.database import SupabaseGateway
from app.schemas import Profile

bearer = HTTPBearer(auto_error=False)


def get_gateway() -> SupabaseGateway:
    try:
        return SupabaseGateway(Settings.from_environment())
    except (RuntimeError, ValueError) as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Matching service is not configured.",
        ) from error


@dataclass(frozen=True)
class CandidateContext:
    profile: Profile
    access_token: str


async def require_candidate(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
    gateway: Annotated[SupabaseGateway, Depends(get_gateway)],
) -> CandidateContext:
    if credentials is None or credentials.scheme.casefold() != "bearer":
        raise HTTPException(status_code=401, detail="A Supabase bearer token is required.")
    try:
        identity = await gateway.authenticate(credentials.credentials)
    except PermissionError as error:
        raise HTTPException(status_code=401, detail="Supabase session is invalid.") from error
    except Exception as error:
        raise HTTPException(status_code=503, detail="Identity verification is unavailable.") from error

    try:
        profile_data = await gateway.profile(identity["id"], credentials.credentials)
        profile = Profile.model_validate(profile_data) if profile_data else None
    except Exception as error:
        raise HTTPException(status_code=503, detail="Candidate profile could not be verified.") from error

    if profile is None or profile.id != identity["id"]:
        raise HTTPException(status_code=403, detail="Candidate profile is unavailable.")
    if profile.role != "job_seeker" or profile.account_status != "active":
        raise HTTPException(status_code=403, detail="An active job seeker account is required.")
    return CandidateContext(profile=profile, access_token=credentials.credentials)
