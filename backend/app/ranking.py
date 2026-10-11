from app.config import Settings
from app.schemas import Job, Profile
from app.skills import normalize_skill, normalize_text, semantic_related


def rank_job(profile: Profile, job: Job, settings: Settings) -> dict[str, object]:
    candidate_skills = profile.skills or []
    required = job.required_skills
    preferred = job.preferred_skills
    all_job_skills = list(dict.fromkeys([*required, *preferred]))
    normalized_candidate = {normalize_skill(item) for item in candidate_skills}
    explicit_matches = [
        skill for skill in all_job_skills
        if normalize_skill(skill) in normalized_candidate
    ]
    semantic_matches = [
        skill for skill in all_job_skills
        if skill not in explicit_matches
        and any(semantic_related(candidate, skill) for candidate in candidate_skills)
    ]
    skill_gaps = [skill for skill in required if skill not in explicit_matches]

    skill_denominator = len(all_job_skills)
    explicit_score = len(explicit_matches) / skill_denominator if skill_denominator else 0.0
    semantic_score = len(semantic_matches) / skill_denominator if skill_denominator else 0.0
    preference_matches: list[str] = []
    role_preferences = [normalize_text(item) for item in profile.preferred_roles or []]
    location_preferences = [
        normalize_text(item)
        for item in [profile.location or "", *(profile.preferred_locations or [])]
        if item.strip()
    ]
    if any(role in normalize_text(job.title) for role in role_preferences):
        preference_matches.append("preferred_role")
    if any(location in normalize_text(job.location) for location in location_preferences):
        preference_matches.append("preferred_location")
    preference_score = len(preference_matches) / 2

    weights = (
        settings.explicit_skill_weight,
        settings.semantic_skill_weight,
        settings.preference_weight,
    )
    total_weight = sum(weights)
    score = (
        explicit_score * weights[0]
        + semantic_score * weights[1]
        + preference_score * weights[2]
    ) / total_weight
    explanation = [
        f"{len(explicit_matches)} explicit or curated-alias skill matches",
        f"{len(semantic_matches)} curated related-skill matches",
        f"{len(preference_matches)} role/location preference matches",
    ]
    return {
        "job_id": job.id,
        "title": job.title,
        "score": round(score, 4),
        "explicit_matches": explicit_matches,
        "semantic_matches": semantic_matches,
        "skill_gaps": skill_gaps,
        "preference_matches": preference_matches,
        "explanation": explanation,
    }
