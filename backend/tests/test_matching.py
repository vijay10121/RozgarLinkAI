import pytest
from fastapi.testclient import TestClient

from app.auth import get_gateway
from app.config import Settings, _is_service_role_jwt
from app.eligibility import evaluate_eligibility
from app.main import app
from app.ranking import rank_job
from app.schemas import Job, Profile
from app.skills import normalize_skill

USER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
JOB_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"

SETTINGS = Settings(
    supabase_url="https://example.supabase.co",
    supabase_publishable_key="test-public-key",
    explicit_skill_weight=0.6,
    semantic_skill_weight=0.2,
    preference_weight=0.2,
)


def profile_data(**overrides):
    data = {
        "id": USER_ID,
        "role": "job_seeker",
        "account_status": "active",
        "skills": ["Python", "FastAPI"],
        "qualifications": ["Bachelor of Science"],
        "education": "Bachelor of Science",
        "experience_years": 4,
        "location": "Dhaka",
        "preferred_roles": ["Backend Engineer"],
        "preferred_locations": ["Dhaka"],
    }
    data.update(overrides)
    return data


def job_data(**overrides):
    data = {
        "id": JOB_ID,
        "title": "Backend Engineer",
        "description": "Build backend systems.",
        "requirements": "",
        "location": "Dhaka",
        "employment_type": "full_time",
        "required_skills": ["Python", "FastAPI"],
        "preferred_skills": ["PostgreSQL"],
        "required_qualifications": ["Bachelor of Science"],
        "min_experience_years": 2,
        "application_deadline": None,
        "mandatory_education": "Bachelor of Science",
        "location_restrictions": ["Dhaka"],
        "status": "published",
        "organization_id": "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        "published_at": "2026-01-01T00:00:00+00:00",
        "created_at": "2026-01-01T00:00:00+00:00",
    }
    data.update(overrides)
    return data


def evaluate(profile_overrides=None, job_overrides=None):
    return evaluate_eligibility(
        Profile.model_validate(profile_data(**(profile_overrides or {}))),
        Job.model_validate(job_data(**(job_overrides or {}))),
    )


class FakeGateway:
    def __init__(self, profile=None, jobs=None, courses=None, auth_error=None):
        self.settings = SETTINGS
        self.candidate = profile if profile is not None else profile_data()
        self.jobs = jobs if jobs is not None else [job_data()]
        self.courses = courses if courses is not None else []
        self.auth_error = auth_error
        self.authenticated_tokens = []

    async def authenticate(self, token):
        self.authenticated_tokens.append(token)
        if self.auth_error:
            raise self.auth_error
        return {"id": USER_ID, "app_metadata": {"role": "untrusted_ignored"}}

    async def profile(self, user_id, access_token):
        assert user_id == USER_ID
        assert access_token in self.authenticated_tokens
        return self.candidate

    async def published_job(self, job_id, access_token):
        return next(
            (row for row in self.jobs if row["id"] == job_id and row["status"] == "published"),
            None,
        )

    async def published_jobs(self, access_token):
        return [row for row in self.jobs if row["status"] == "published"]

    async def published_courses(self, access_token):
        return [row for row in self.courses if row["status"] == "published"]


@pytest.fixture
def client():
    gateway = FakeGateway()
    app.dependency_overrides[get_gateway] = lambda: gateway
    with TestClient(app) as test_client:
        yield test_client, gateway
    app.dependency_overrides.clear()


@pytest.mark.parametrize(
    ("profile_overrides", "job_overrides", "criterion"),
    [
        ({"skills": []}, {}, "required_skills"),
        ({"qualifications": []}, {}, "required_qualifications"),
        ({"experience_years": None}, {}, "minimum_experience"),
        ({"education": None}, {}, "mandatory_education"),
        ({"location": None, "preferred_locations": []}, {}, "location_restrictions"),
    ],
)
def test_missing_mandatory_information_needs_verification(
    profile_overrides, job_overrides, criterion
):
    result = evaluate(profile_overrides, job_overrides)
    assert result.status == "needs_verification"
    assert next(item for item in result.criteria if item.criterion == criterion).status == "needs_verification"


@pytest.mark.parametrize(
    ("profile_overrides", "job_overrides", "criterion"),
    [
        ({"skills": ["Java"]}, {}, "required_skills"),
        ({"qualifications": ["Certificate"]}, {}, "required_qualifications"),
        ({"experience_years": 1}, {}, "minimum_experience"),
        ({"education": "High School"}, {}, "mandatory_education"),
        ({"location": "Chittagong", "preferred_locations": []}, {}, "location_restrictions"),
    ],
)
def test_each_proven_mandatory_failure_is_ineligible(
    profile_overrides, job_overrides, criterion
):
    result = evaluate(profile_overrides, job_overrides)
    assert result.status == "ineligible"
    assert next(item for item in result.criteria if item.criterion == criterion).status == "fail"


def test_eligible_only_when_all_mandatory_criteria_pass():
    result = evaluate()
    assert result.status == "eligible"
    assert result.reasons == []
    assert {item.status for item in result.criteria} == {"pass"}


def test_skill_aliases_normalize_spelling_and_case():
    assert normalize_skill("JS") == "javascript"
    assert normalize_skill("Postgres") == "postgresql"
    assert normalize_skill("React.JS") == "react"
    result = evaluate(
        {"skills": ["py", "Fast API"]},
        {"required_skills": ["Python", "FastAPI"], "preferred_skills": []},
    )
    assert result.status == "eligible"


def test_curated_related_skills_are_not_mandatory_eligibility_aliases():
    result = evaluate(
        {"skills": ["Python"]},
        {"required_skills": ["FastAPI"], "preferred_skills": []},
    )
    assert result.status == "ineligible"
    assert result.skill_gaps == ["FastAPI"]


def test_high_similarity_never_overrides_a_failed_mandatory_requirement():
    candidate = Profile.model_validate(
        profile_data(
            skills=["Python", "FastAPI", "PostgreSQL"],
            qualifications=["Certificate"],
        )
    )
    job = Job.model_validate(job_data())
    eligibility = evaluate_eligibility(candidate, job)
    score = rank_job(candidate, job, SETTINGS)
    assert score["score"] > 0.7
    assert eligibility.status == "ineligible"


def test_recommendation_endpoint_never_returns_high_score_ineligible_job():
    gateway = FakeGateway(
        profile=profile_data(
            skills=["Python", "FastAPI", "PostgreSQL"],
            qualifications=["Certificate"],
        ),
        jobs=[job_data()],
    )
    app.dependency_overrides[get_gateway] = lambda: gateway
    try:
        with TestClient(app) as test_client:
            response = test_client.get(
                "/v1/recommendations/jobs",
                headers={"Authorization": "Bearer verified-session"},
            )
        assert response.status_code == 200
        assert response.json()["recommendations"] == []
    finally:
        app.dependency_overrides.clear()


def test_ranking_returns_explicit_and_related_matches_separately():
    candidate = Profile.model_validate(profile_data(skills=["Python"]))
    job = Job.model_validate(job_data(required_skills=["Python"], preferred_skills=["FastAPI"]))
    result = rank_job(candidate, job, SETTINGS)
    assert result["explicit_matches"] == ["Python"]
    assert result["semantic_matches"] == ["FastAPI"]
    assert result["skill_gaps"] == []


def test_health_does_not_expose_configuration():
    with TestClient(app) as test_client:
        response = test_client.get("/healthz")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_matching_settings_reject_service_role_keys():
    import base64
    import json

    encoded_claims = base64.urlsafe_b64encode(
        json.dumps({"role": "service_role"}).encode()
    ).decode().rstrip("=")
    assert _is_service_role_jwt(f"header.{encoded_claims}.signature")
    assert not _is_service_role_jwt("sb_publishable_public-key")


def test_settings_reject_service_role_key_prefix(monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setenv("SUPABASE_PUBLISHABLE_KEY", "sb_secret_do-not-use")
    with pytest.raises(RuntimeError, match="must not contain a service-role key"):
        Settings.from_environment()


def test_protected_endpoint_requires_bearer_auth(client):
    test_client, _ = client
    response = test_client.get(f"/v1/jobs/{JOB_ID}/eligibility")
    assert response.status_code == 401


def test_invalid_supabase_access_token_is_rejected():
    gateway = FakeGateway(auth_error=PermissionError("invalid"))
    app.dependency_overrides[get_gateway] = lambda: gateway
    try:
        with TestClient(app) as test_client:
            response = test_client.get(
                f"/v1/jobs/{JOB_ID}/eligibility",
                headers={"Authorization": "Bearer invalid"},
            )
        assert response.status_code == 401
    finally:
        app.dependency_overrides.clear()


@pytest.mark.parametrize(
    "candidate",
    [
        profile_data(role="admin"),
        profile_data(role="training_provider"),
        profile_data(account_status="suspended"),
    ],
)
def test_non_active_job_seekers_are_forbidden(candidate):
    gateway = FakeGateway(profile=candidate)
    app.dependency_overrides[get_gateway] = lambda: gateway
    try:
        with TestClient(app) as test_client:
            response = test_client.get(
                f"/v1/jobs/{JOB_ID}/eligibility",
                headers={"Authorization": "Bearer valid"},
            )
        assert response.status_code == 403
    finally:
        app.dependency_overrides.clear()


def test_profile_identity_must_match_verified_supabase_user():
    gateway = FakeGateway(
        profile=profile_data(id="dddddddd-dddd-4ddd-8ddd-dddddddddddd")
    )
    app.dependency_overrides[get_gateway] = lambda: gateway
    try:
        with TestClient(app) as test_client:
            response = test_client.get(
                f"/v1/jobs/{JOB_ID}/eligibility",
                headers={"Authorization": "Bearer verified-session"},
            )
        assert response.status_code == 403
    finally:
        app.dependency_overrides.clear()


def test_eligibility_endpoint_returns_criterion_level_results(client):
    test_client, gateway = client
    response = test_client.get(
        f"/v1/jobs/{JOB_ID}/eligibility",
        headers={"Authorization": "Bearer verified-session"},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "eligible"
    assert gateway.authenticated_tokens == ["verified-session"]
    assert response.json()["criteria"][0]["criterion"] == "required_skills"


def test_recommendations_exclude_failed_and_unknown_eligibility_jobs(client):
    test_client, gateway = client
    gateway.jobs = [
        job_data(),
        job_data(
            id="dddddddd-dddd-4ddd-8ddd-dddddddddddd",
            required_qualifications=["Doctorate"],
        ),
        job_data(
            id="eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
            min_experience_years=7,
        ),
    ]
    response = test_client.get(
        "/v1/recommendations/jobs",
        headers={"Authorization": "Bearer verified-session"},
    )
    assert response.status_code == 200
    assert [item["job_id"] for item in response.json()["recommendations"]] == [JOB_ID]


def test_recommendations_exclude_jobs_needing_more_profile_verification():
    gateway = FakeGateway(profile=profile_data(skills=[]), jobs=[job_data()])
    app.dependency_overrides[get_gateway] = lambda: gateway
    try:
        with TestClient(app) as test_client:
            response = test_client.get(
                "/v1/recommendations/jobs",
                headers={"Authorization": "Bearer verified-session"},
            )
        assert response.status_code == 200
        assert response.json()["recommendations"] == []
    finally:
        app.dependency_overrides.clear()


def test_job_eligibility_is_derived_from_verified_identity_not_request_input(client):
    test_client, gateway = client
    response = test_client.get(
        f"/v1/jobs/{JOB_ID}/eligibility?candidate_id=dddddddd-dddd-4ddd-8ddd-dddddddddddd&role=admin",
        headers={"Authorization": "Bearer verified-session"},
    )
    assert response.status_code == 200
    assert gateway.authenticated_tokens == ["verified-session"]


def test_private_or_unpublished_job_is_not_returned(client):
    test_client, gateway = client
    gateway.jobs = [job_data(status="draft")]
    response = test_client.get(
        f"/v1/jobs/{JOB_ID}/eligibility",
        headers={"Authorization": "Bearer verified-session"},
    )
    assert response.status_code == 404


def test_expired_deadline_is_a_mandatory_failure():
    result = evaluate(job_overrides={"application_deadline": "2000-01-01"})
    assert result.status == "ineligible"
    assert next(
        item for item in result.criteria if item.criterion == "application_deadline"
    ).status == "fail"


def test_course_recommendations_only_use_published_matching_courses(client):
    test_client, gateway = client
    gateway.jobs = [job_data(required_skills=["Postgres"], preferred_skills=[])]
    gateway.courses = [
        {
            "id": "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
            "title": "Database fundamentals",
            "description": "SQL course",
            "skills_taught": ["PostgreSQL"],
            "status": "published",
            "course_url": "https://example.test/course",
            "delivery_mode": "online",
            "duration": "4 weeks",
        },
        {
            "id": "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
            "title": "Draft course",
            "description": "Not public",
            "skills_taught": ["PostgreSQL"],
            "status": "draft",
            "course_url": "https://example.test/draft",
            "delivery_mode": "online",
            "duration": None,
        },
    ]
    response = test_client.get(
        f"/v1/jobs/{JOB_ID}/skill-gaps",
        headers={"Authorization": "Bearer verified-session"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["skill_gaps"] == ["Postgres"]
    assert [item["course"]["title"] for item in body["courses"]] == [
        "Database fundamentals"
    ]
