import base64
import binascii
import json
import math
import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    supabase_url: str
    supabase_publishable_key: str
    explicit_skill_weight: float
    semantic_skill_weight: float
    preference_weight: float

    @classmethod
    def from_environment(cls) -> "Settings":
        url = os.environ.get("SUPABASE_URL", "").strip().rstrip("/")
        key = os.environ.get("SUPABASE_PUBLISHABLE_KEY", "").strip()
        if not url or not key:
            raise RuntimeError(
                "Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY for the matching API."
            )
        if key.startswith("sb_secret_") or _is_service_role_jwt(key):
            raise RuntimeError(
                "SUPABASE_PUBLISHABLE_KEY must not contain a service-role key."
            )

        weights = (
            float(os.environ.get("MATCHING_WEIGHT_EXPLICIT_SKILL", "0.60")),
            float(os.environ.get("MATCHING_WEIGHT_SEMANTIC_SKILL", "0.20")),
            float(os.environ.get("MATCHING_WEIGHT_PREFERENCE", "0.20")),
        )
        if (
            any(not math.isfinite(weight) or weight < 0 or weight > 1 for weight in weights)
            or sum(weights) == 0
        ):
            raise RuntimeError("Matching weights must be between 0 and 1.")

        return cls(url, key, *weights)


def _is_service_role_jwt(key: str) -> bool:
    parts = key.split(".")
    if len(parts) != 3:
        return False
    try:
        payload = parts[1] + "=" * (-len(parts[1]) % 4)
        claims = json.loads(base64.urlsafe_b64decode(payload))
    except (ValueError, binascii.Error):
        return False
    return isinstance(claims, dict) and claims.get("role") == "service_role"
