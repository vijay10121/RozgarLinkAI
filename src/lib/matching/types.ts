export type RecommendationJob = {
  id: string;
  organization_id: string;
  title: string;
  location: string;
  employment_type: string;
  required_skills: string[];
  preferred_skills: string[];
  application_deadline: string | null;
};

export type CriterionStatus = "pass" | "fail" | "needs_verification";
export type EligibilityStatus =
  | "eligible"
  | "ineligible"
  | "needs_verification";

export type EligibilityResult = {
  job_id: string;
  status: EligibilityStatus;
  criteria: {
    criterion: string;
    status: CriterionStatus;
    requirement: string | null;
    evidence: string | null;
    reason: string;
  }[];
  reasons: string[];
  skill_gaps: string[];
};

export type JobRecommendation = {
  job_id: string;
  title: string;
  score: number;
  explicit_matches: string[];
  semantic_matches: string[];
  skill_gaps: string[];
  preference_matches: string[];
  explanation: string[];
  job: RecommendationJob;
};

export type JobRecommendations = {
  recommendations: JobRecommendation[];
};

export type SkillGapAnalysis = {
  job_id: string;
  skill_gaps: string[];
  courses: {
    course: {
      id: string;
      title: string;
      course_url: string;
      skills_taught: string[];
      delivery_mode: string;
      duration: string | null;
    };
    matching_skills: string[];
    explanation: string;
  }[];
};
