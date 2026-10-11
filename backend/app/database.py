from typing import Any

import httpx

from app.config import Settings


class SupabaseGateway:
    """RLS-scoped access to the existing Supabase Auth and PostgREST APIs."""

    def __init__(
        self,
        settings: Settings,
        transport: httpx.AsyncBaseTransport | None = None,
    ):
        self.settings = settings
        self.transport = transport

    async def _request(
        self, path: str, access_token: str | None = None, params: dict[str, str] | None = None
    ) -> Any:
        headers = {
            "apikey": self.settings.supabase_publishable_key,
            "Accept": "application/json",
        }
        if access_token:
            headers["Authorization"] = f"Bearer {access_token}"
        async with httpx.AsyncClient(
            timeout=8.0,
            transport=self.transport,
        ) as client:
            response = await client.get(
                f"{self.settings.supabase_url}{path}",
                headers=headers,
                params=params,
            )
        if response.status_code >= 400:
            if path == "/auth/v1/user" and response.status_code in (400, 401, 403):
                raise PermissionError("Supabase access token is invalid or expired.")
            raise RuntimeError(
                f"Supabase request failed with status {response.status_code}."
            )
        return response.json()

    async def authenticate(self, access_token: str) -> dict[str, Any]:
        data = await self._request("/auth/v1/user", access_token)
        if not isinstance(data, dict) or not isinstance(data.get("id"), str):
            raise PermissionError("Supabase did not return a verified user identity.")
        return data

    async def profile(self, user_id: str, access_token: str) -> dict[str, Any] | None:
        rows = await self._request(
            "/rest/v1/profiles",
            access_token,
            {
                "select": "id,role,account_status,skills,qualifications,education,experience_years,location,preferred_roles,preferred_locations",
                "id": f"eq.{user_id}",
                "limit": "1",
            },
        )
        if not isinstance(rows, list):
            raise RuntimeError("Supabase returned an invalid profile response.")
        return rows[0] if rows else None

    async def published_job(self, job_id: str, access_token: str) -> dict[str, Any] | None:
        rows = await self._request(
            "/rest/v1/jobs",
            access_token,
            {
                "select": "id,title,description,requirements,location,employment_type,required_skills,preferred_skills,required_qualifications,min_experience_years,application_deadline,mandatory_education,location_restrictions,status,organization_id,published_at,created_at",
                "id": f"eq.{job_id}",
                "status": "eq.published",
                "limit": "1",
            },
        )
        if not isinstance(rows, list):
            raise RuntimeError("Supabase returned an invalid job response.")
        return rows[0] if rows else None

    async def published_jobs(self, access_token: str) -> list[dict[str, Any]]:
        rows = await self._request(
            "/rest/v1/jobs",
            access_token,
            {
                "select": "id,title,description,requirements,location,employment_type,required_skills,preferred_skills,required_qualifications,min_experience_years,application_deadline,mandatory_education,location_restrictions,status,organization_id,published_at,created_at",
                "status": "eq.published",
                "order": "published_at.desc",
                "limit": "100",
            },
        )
        if not isinstance(rows, list):
            raise RuntimeError("Supabase returned an invalid jobs response.")
        return rows

    async def published_courses(self, access_token: str) -> list[dict[str, Any]]:
        rows = await self._request(
            "/rest/v1/courses",
            access_token,
            {
                "select": "id,title,description,skills_taught,status,course_url,delivery_mode,duration",
                "status": "eq.published",
                "order": "published_at.desc",
                "limit": "100",
            },
        )
        if not isinstance(rows, list):
            raise RuntimeError("Supabase returned an invalid courses response.")
        return rows
