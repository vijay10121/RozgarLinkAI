import asyncio

import httpx

from app.config import Settings
from app.database import SupabaseGateway

SETTINGS = Settings(
    supabase_url="https://example.supabase.co",
    supabase_publishable_key="sb_publishable_test-key",
    explicit_skill_weight=0.6,
    semantic_skill_weight=0.2,
    preference_weight=0.2,
)
USER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"


def test_authentication_uses_supabase_user_lookup_with_verified_token():
    def respond(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/auth/v1/user"
        assert request.headers["apikey"] == SETTINGS.supabase_publishable_key
        assert request.headers["authorization"] == "Bearer candidate-access-token"
        return httpx.Response(200, json={"id": USER_ID})

    gateway = SupabaseGateway(SETTINGS, httpx.MockTransport(respond))
    identity = asyncio.run(gateway.authenticate("candidate-access-token"))
    assert identity["id"] == USER_ID


def test_profile_query_is_scoped_to_verified_user_and_forwards_rls_token():
    def respond(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/rest/v1/profiles"
        assert request.url.params["id"] == f"eq.{USER_ID}"
        assert request.url.params["limit"] == "1"
        assert request.headers["authorization"] == "Bearer candidate-access-token"
        return httpx.Response(200, json=[{"id": USER_ID}])

    gateway = SupabaseGateway(SETTINGS, httpx.MockTransport(respond))
    profile = asyncio.run(gateway.profile(USER_ID, "candidate-access-token"))
    assert profile == {"id": USER_ID}


def test_published_course_query_avoids_provider_migration_only_columns():
    def respond(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/rest/v1/courses"
        assert request.url.params["status"] == "eq.published"
        assert "specialization" not in request.url.params["select"]
        assert request.headers["authorization"] == "Bearer candidate-access-token"
        return httpx.Response(200, json=[])

    gateway = SupabaseGateway(SETTINGS, httpx.MockTransport(respond))
    courses = asyncio.run(gateway.published_courses("candidate-access-token"))
    assert courses == []
