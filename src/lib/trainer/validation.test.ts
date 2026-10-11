import { describe, expect, it } from "vitest";

import {
  isCourseImage,
  parseTrainerCourseInput,
} from "@/lib/trainer/validation";

function validCourse(overrides: Record<string, string> = {}) {
  const formData = new FormData();
  const values = {
    title: "Foundations of Data Analysis",
    description: "A practical course in data analysis.",
    specialization: "Data analytics",
    skills_taught: "SQL, sql, Reporting",
    difficulty_level: "beginner",
    duration: "6 weeks",
    delivery_mode: "online",
    course_url: "https://provider.example/enroll",
    image_path: "",
    ...overrides,
  };
  Object.entries(values).forEach(([key, value]) => formData.set(key, value));
  return formData;
}

describe("training course validation", () => {
  it("validates and de-duplicates course skills", () => {
    const result = parseTrainerCourseInput(validCourse());

    expect(result.input).toMatchObject({
      title: "Foundations of Data Analysis",
      skillsTaught: ["SQL", "Reporting"],
      deliveryMode: "online",
      difficultyLevel: "beginner",
    });
  });

  it.each(["javascript:alert(1)", "ftp://provider.example/course", "not a URL"])(
    "rejects unsafe or malformed enrollment URLs: %s",
    (courseUrl) => {
      expect(parseTrainerCourseInput(validCourse({ course_url: courseUrl })).error)
        .toMatch(/http or https/i);
    },
  );

  it("rejects image paths not rooted in a provider UUID", () => {
    expect(
      parseTrainerCourseInput(
        validCourse({ image_path: "another-account/course.png" }),
      ).error,
    ).toMatch(/image path is invalid/i);
  });

  it("allows only supported image types up to the storage size limit", () => {
    expect(isCourseImage({ type: "image/png", size: 1024 })).toBe(true);
    expect(isCourseImage({ type: "image/svg+xml", size: 1024 })).toBe(false);
    expect(isCourseImage({ type: "image/jpeg", size: 5 * 1024 * 1024 + 1 })).toBe(
      false,
    );
  });
});
