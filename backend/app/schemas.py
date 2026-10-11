from enum import StrEnum
from pydantic import BaseModel, ConfigDict, Field


class EligibilityStatus(StrEnum):
    ELIGIBLE = "eligible"
    INELIGIBLE = "ineligible"
    NEEDS_VERIFICATION = "needs_verification"


class CriterionStatus(StrEnum):
    PASS = "pass"
    FAIL = "fail"
    NEEDS_VERIFICATION = "needs_verification"


class Profile(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    role: str
    account_status: str
    skills: list[str] | None = None
    qualifications: list[str] | None = None
    education: str | None = None
    experience_years: float | None = None
    location: str | None = None
    preferred_roles: list[str] | None = None
    preferred_locations: list[str] | None = None


class Job(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    title: str
    description: str
    requirements: str = ""
    location: str
    employment_type: str
    required_skills: list[str]
    preferred_skills: list[str]
    required_qualifications: list[str]
    min_experience_years: float
    application_deadline: str | None = None
    mandatory_education: str | None = None
    location_restrictions: list[str]
    status: str
    organization_id: str
    published_at: str | None = None
    created_at: str | None = None


class Course(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    title: str
    description: str
    skills_taught: list[str]
    status: str
    course_url: str
    delivery_mode: str
    duration: str | None = None


class CriterionResult(BaseModel):
    criterion: str
    status: CriterionStatus
    requirement: str | None = None
    evidence: str | None = None
    reason: str


class EligibilityResult(BaseModel):
    job_id: str
    status: EligibilityStatus
    criteria: list[CriterionResult]
    reasons: list[str]
    skill_gaps: list[str]


class SkillMatch(BaseModel):
    job_id: str
    title: str
    score: float = Field(ge=0, le=1)
    explicit_matches: list[str]
    semantic_matches: list[str]
    skill_gaps: list[str]
    preference_matches: list[str]
    explanation: list[str]


class RecommendedJob(SkillMatch):
    job: Job


class JobRecommendations(BaseModel):
    recommendations: list[RecommendedJob]


class RecommendedCourse(BaseModel):
    course: Course
    matching_skills: list[str]
    explanation: str


class SkillGapAnalysis(BaseModel):
    job_id: str
    skill_gaps: list[str]
    courses: list[RecommendedCourse]
