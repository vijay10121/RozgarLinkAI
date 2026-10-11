import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/auth/actions", () => ({
  loginAction: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

import { LoginForm } from "@/components/auth/login-form";
import { loginAction } from "@/app/auth/actions";

describe("login form", () => {
  it("connects server validation errors to the corresponding fields", async () => {
    vi.mocked(loginAction).mockResolvedValue({
      fieldErrors: {
        email: "Enter a valid email address.",
        password: "Enter your password.",
      },
    });
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText("Email address"), "bad-email");
    await user.click(screen.getByRole("button", { name: /^log in/i }));

    expect(await screen.findByText("Enter a valid email address.")).toBeVisible();
    expect(screen.getByLabelText("Email address")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByText("Enter your password.")).toBeVisible();
  });

  it("supports password visibility and provides password recovery", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    const password = screen.getByLabelText("Password");
    expect(password).toHaveAttribute("type", "password");
    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(password).toHaveAttribute("type", "text");
    expect(
      screen.getByRole("button", { name: "Hide password" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("link", { name: /forgot password/i })).toHaveAttribute(
      "href",
      "/forgot-password",
    );
  });
});
