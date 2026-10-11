import { isUuid } from "@/lib/admin/validation";

export type TrainerCourseInput = {
  title: string;
  description: string;
  specialization: string;
  skillsTaught: string[];
  difficultyLevel: "beginner" | "intermediate" | "advanced";
  duration: string | null;
  deliveryMode: "online" | "in_person" | "hybrid";
  courseUrl: string;
  imagePath: string | null;
};

export type TrainerCourseParseResult =
  | { input: TrainerCourseInput; error?: never }
  | { input?: never; error: string };

function value(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

function parseList(input: string): string[] | null {
  const values = input
    .split(/[,\n]/)
    .map((item) => item.trim().replace(/\s+/g, " "))
    .filter(Boolean);
  if (values.length > 50 || values.some((item) => item.length > 120)) {
    return null;
  }

  const unique = new Map<string, string>();
  for (const item of values) {
    const key = item.toLocaleLowerCase();
    if (!unique.has(key)) unique.set(key, item);
  }
  return [...unique.values()];
}

export function parseTrainerCourseInput(
  formData: FormData,
): TrainerCourseParseResult {
  const title = value(formData, "title");
  const description = value(formData, "description");
  const specialization = value(formData, "specialization");
  const durationValue = value(formData, "duration");
  const deliveryMode = value(formData, "delivery_mode");
  const difficultyLevel = value(formData, "difficulty_level");
  const courseUrl = value(formData, "course_url");
  const imagePathValue = value(formData, "image_path");
  const skillsTaught = parseList(value(formData, "skills_taught"));

  if (!title || title.length > 200) {
    return { error: "Enter a course title up to 200 characters." };
  }
  if (!description || description.length > 20_000) {
    return { error: "Enter a course description up to 20,000 characters." };
  }
  if (!specialization || specialization.length > 160) {
    return { error: "Enter a specialization up to 160 characters." };
  }
  if (skillsTaught === null) {
    return {
      error: "Enter no more than 50 skills, each up to 120 characters.",
    };
  }
  if (
    !["beginner", "intermediate", "advanced"].includes(difficultyLevel)
  ) {
    return { error: "Choose a valid difficulty level." };
  }
  if (!["online", "in_person", "hybrid"].includes(deliveryMode)) {
    return { error: "Choose a valid delivery mode." };
  }
  if (durationValue.length > 120) {
    return { error: "Course duration must be 120 characters or fewer." };
  }

  try {
    const parsedUrl = new URL(courseUrl);
    if (
      !["http:", "https:"].includes(parsedUrl.protocol) ||
      parsedUrl.username ||
      parsedUrl.password
    ) {
      return { error: "Enter a valid http or https enrollment URL." };
    }
  } catch {
    return { error: "Enter a valid http or https enrollment URL." };
  }

  const imagePath = imagePathValue || null;
  if (imagePath && (!isUuid(imagePath.split("/")[0]) || imagePath.length > 500)) {
    return { error: "The uploaded course image path is invalid." };
  }

  return {
    input: {
      title,
      description,
      specialization,
      skillsTaught,
      difficultyLevel: difficultyLevel as TrainerCourseInput["difficultyLevel"],
      duration: durationValue || null,
      deliveryMode: deliveryMode as TrainerCourseInput["deliveryMode"],
      courseUrl,
      imagePath,
    },
  };
}

export function isTrainerCourseIntent(
  value: string,
): value is "draft" | "publish" {
  return value === "draft" || value === "publish";
}

export function isCourseImage(file: Pick<File, "type" | "size">): boolean {
  return (
    ["image/jpeg", "image/png", "image/webp"].includes(file.type) &&
    file.size > 0 &&
    file.size <= 5 * 1024 * 1024
  );
}
