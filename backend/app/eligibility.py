from datetime import date, datetime, timezone

from app.schemas import (
    CriterionResult,
    CriterionStatus,
    EligibilityResult,
    EligibilityStatus,
    Job,
    Profile,
)
from app.skills import normalize_skill, normalize_text


def evaluate_eligibility(profile: Profile, job: Job) -> EligibilityResult:
    criteria: list[CriterionResult] = []
    skill_gaps: list[str] = []

    required_skills = job.required_skills
    if required_skills:
        if not profile.skills:
            criteria.append(
                CriterionResult(
                    criterion="required_skills",
                    status=CriterionStatus.NEEDS_VERIFICATION,
                    requirement=", ".join(required_skills),
                    reason="The candidate profile does not provide skill evidence.",
                )
            )
            skill_gaps.extend(required_skills)
        else:
            candidate_skills = {normalize_skill(skill) for skill in profile.skills}
            missing = [
                skill for skill in required_skills
                if normalize_skill(skill) not in candidate_skills
            ]
            skill_gaps.extend(missing)
            criteria.append(
                CriterionResult(
                    criterion="required_skills",
                    status=(
                        CriterionStatus.FAIL if missing else CriterionStatus.PASS
                    ),
                    requirement=", ".join(required_skills),
                    evidence=", ".join(profile.skills),
                    reason=(
                        f"Missing required skills: {', '.join(missing)}."
                        if missing
                        else "Every required skill has an explicit or curated-alias profile match."
                    ),
                )
            )

    if job.required_qualifications:
        if not profile.qualifications:
            criteria.append(
                CriterionResult(
                    criterion="required_qualifications",
                    status=CriterionStatus.NEEDS_VERIFICATION,
                    requirement=", ".join(job.required_qualifications),
                    reason="The candidate profile does not provide qualification evidence.",
                )
            )
        else:
            qualifications = {normalize_text(item) for item in profile.qualifications}
            missing_qualifications = [
                item for item in job.required_qualifications
                if normalize_text(item) not in qualifications
            ]
            criteria.append(
                CriterionResult(
                    criterion="required_qualifications",
                    status=(
                        CriterionStatus.FAIL
                        if missing_qualifications
                        else CriterionStatus.PASS
                    ),
                    requirement=", ".join(job.required_qualifications),
                    evidence=", ".join(profile.qualifications),
                    reason=(
                        "Required qualifications not found: "
                        f"{', '.join(missing_qualifications)}."
                        if missing_qualifications
                        else "Every required qualification is listed in the profile."
                    ),
                )
            )

    if job.min_experience_years > 0:
        if profile.experience_years is None:
            criteria.append(
                CriterionResult(
                    criterion="minimum_experience",
                    status=CriterionStatus.NEEDS_VERIFICATION,
                    requirement=f"{job.min_experience_years:g} years",
                    reason="The candidate has not provided experience information.",
                )
            )
        else:
            met = profile.experience_years >= job.min_experience_years
            criteria.append(
                CriterionResult(
                    criterion="minimum_experience",
                    status=CriterionStatus.PASS if met else CriterionStatus.FAIL,
                    requirement=f"{job.min_experience_years:g} years",
                    evidence=f"{profile.experience_years:g} years",
                    reason=(
                        "The minimum experience requirement is met."
                        if met
                        else "The candidate's recorded experience is below the minimum."
                    ),
                )
            )

    if job.mandatory_education:
        if not profile.education or not profile.education.strip():
            criteria.append(
                CriterionResult(
                    criterion="mandatory_education",
                    status=CriterionStatus.NEEDS_VERIFICATION,
                    requirement=job.mandatory_education,
                    reason="The candidate has not provided education information.",
                )
            )
        else:
            met = normalize_text(profile.education) == normalize_text(
                job.mandatory_education
            )
            criteria.append(
                CriterionResult(
                    criterion="mandatory_education",
                    status=CriterionStatus.PASS if met else CriterionStatus.FAIL,
                    requirement=job.mandatory_education,
                    evidence=profile.education,
                    reason=(
                        "The recorded education matches the mandatory requirement."
                        if met
                        else "The recorded education does not match the mandatory requirement."
                    ),
                )
            )

    if job.location_restrictions:
        candidate_locations = {
            normalize_text(item)
            for item in [profile.location or "", *(profile.preferred_locations or [])]
            if item.strip()
        }
        if not candidate_locations:
            criteria.append(
                CriterionResult(
                    criterion="location_restrictions",
                    status=CriterionStatus.NEEDS_VERIFICATION,
                    requirement=", ".join(job.location_restrictions),
                    reason="The candidate has not provided location information.",
                )
            )
        else:
            allowed = {
                normalize_text(item) for item in job.location_restrictions
            }
            met = bool(candidate_locations & allowed)
            criteria.append(
                CriterionResult(
                    criterion="location_restrictions",
                    status=CriterionStatus.PASS if met else CriterionStatus.FAIL,
                    requirement=", ".join(job.location_restrictions),
                    evidence=", ".join(sorted(candidate_locations)),
                    reason=(
                        "A recorded candidate location satisfies a restriction."
                        if met
                        else "No recorded candidate location satisfies the restrictions."
                    ),
                )
            )

    if job.application_deadline:
        try:
            deadline = date.fromisoformat(job.application_deadline[:10])
        except ValueError:
            criteria.append(
                CriterionResult(
                    criterion="application_deadline",
                    status=CriterionStatus.NEEDS_VERIFICATION,
                    requirement=job.application_deadline,
                    reason="The job's application deadline is invalid.",
                )
            )
        else:
            deadline_open = deadline >= datetime.now(timezone.utc).date()
            criteria.append(
                CriterionResult(
                    criterion="application_deadline",
                    status=(
                        CriterionStatus.PASS
                        if deadline_open
                        else CriterionStatus.FAIL
                    ),
                    requirement=job.application_deadline,
                    reason=(
                        "The application deadline has not passed."
                        if deadline_open
                        else "The application deadline has passed."
                    ),
                )
            )

    if job.status != "published":
        criteria.append(
            CriterionResult(
                criterion="job_status",
                status=CriterionStatus.FAIL,
                evidence=job.status,
                reason="Only published jobs are available for eligibility checks.",
            )
        )

    statuses = {criterion.status for criterion in criteria}
    if CriterionStatus.FAIL in statuses:
        status = EligibilityStatus.INELIGIBLE
    elif CriterionStatus.NEEDS_VERIFICATION in statuses:
        status = EligibilityStatus.NEEDS_VERIFICATION
    else:
        status = EligibilityStatus.ELIGIBLE

    return EligibilityResult(
        job_id=job.id,
        status=status,
        criteria=criteria,
        reasons=[criterion.reason for criterion in criteria if criterion.status != CriterionStatus.PASS],
        skill_gaps=list(dict.fromkeys(skill_gaps)),
    )
