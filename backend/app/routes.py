from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import ValidationError

from app.auth import CandidateContext, get_gateway, require_candidate
from app.courses import recommend_courses
from app.database import SupabaseGateway
from app.eligibility import evaluate_eligibility
from app.schemas import (
    EligibilityResult,
    EligibilityStatus,
    Job,
    JobRecommendations,
    RecommendedJob,
    SkillGapAnalysis,
)
from app.ranking import rank_job

router = APIRouter(prefix="/v1")
Context = Annotated[CandidateContext, Depends(require_candidate)]
Gateway = Annotated[SupabaseGateway, Depends(get_gateway)]


def parse_job(row: dict[str, object] | None) -> Job:
    if row is None:
        raise HTTPException(status_code=404, detail="Published job not found.")
    try:
        return Job.model_validate(row)
    except ValidationError as error:
        raise HTTPException(status_code=503, detail="Job data is incomplete.") from error


@router.get("/jobs/{job_id}/eligibility", response_model=EligibilityResult)
async def get_job_eligibility(
    job_id: str, context: Context, gateway: Gateway
) -> EligibilityResult:
    try:
        row = await gateway.published_job(job_id, context.access_token)
    except Exception as error:
        raise HTTPException(status_code=503, detail="Job eligibility is unavailable.") from error
    return evaluate_eligibility(context.profile, parse_job(row))


@router.get("/recommendations/jobs", response_model=JobRecommendations)
async def get_job_recommendations(
    context: Context,
    gateway: Gateway,
) -> JobRecommendations:
    try:
        rows = await gateway.published_jobs(context.access_token)
    except Exception as error:
        raise HTTPException(status_code=503, detail="Job recommendations are unavailable.") from error

    eligible: list[tuple[float, RecommendedJob]] = []
    for row in rows:
        try:
            job = Job.model_validate(row)
        except ValidationError as error:
            raise HTTPException(status_code=503, detail="Published job data is incomplete.") from error
        evaluation = evaluate_eligibility(context.profile, job)
        if evaluation.status != EligibilityStatus.ELIGIBLE:
            continue
        rank = rank_job(context.profile, job, gateway.settings)
        eligible.append(
            (
                float(rank["score"]),
                RecommendedJob(job=job, **rank),
            )
        )
    eligible.sort(key=lambda pair: (-pair[0], pair[1].job.published_at or ""))
    return JobRecommendations(
        recommendations=[item for _, item in eligible]
    )


@router.get(
    "/jobs/{job_id}/skill-gaps",
    response_model=SkillGapAnalysis,
)
async def get_skill_gaps(
    job_id: str, context: Context, gateway: Gateway
) -> SkillGapAnalysis:
    try:
        row = await gateway.published_job(job_id, context.access_token)
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=503, detail="Skill-gap analysis is unavailable.") from error
    job = parse_job(row)
    try:
        course_rows = await gateway.published_courses(context.access_token)
    except Exception as error:
        raise HTTPException(status_code=503, detail="Course recommendations are unavailable.") from error
    eligibility = evaluate_eligibility(context.profile, job)
    return SkillGapAnalysis(
        job_id=job.id,
        skill_gaps=eligibility.skill_gaps,
        courses=recommend_courses(eligibility.skill_gaps, course_rows),
    )
