from app.schemas import Course, RecommendedCourse
from app.skills import normalize_skill


def recommend_courses(
    skill_gaps: list[str], course_rows: list[dict[str, object]]
) -> list[RecommendedCourse]:
    gaps = {normalize_skill(skill): skill for skill in skill_gaps}
    recommendations: list[RecommendedCourse] = []
    for row in course_rows:
        course = Course.model_validate(row)
        covered = [
            gaps[normalize_skill(skill)]
            for skill in course.skills_taught
            if normalize_skill(skill) in gaps
        ]
        if covered:
            recommendations.append(
                RecommendedCourse(
                    course=course,
                    matching_skills=list(dict.fromkeys(covered)),
                    explanation="This published course lists one or more identified skill gaps.",
                )
            )
    return recommendations
