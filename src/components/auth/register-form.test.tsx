import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { signUp } = vi.hoisted(() => ({ signUp: vi.fn() }));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { signUp },
  }),
}));

import { RegisterForm } from "@/components/auth/register-form";

describe("registration form", () => {
  beforeEach(() => {
    signUp.mockReset();
  });

  it("shows job-seeker fields without a sector selector", async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);

    await user.click(screen.getByRole("radio", { name: /job seeker/i }));

    expect(screen.getByLabelText(/Initial location/)).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: /select your sector/i })).toBeNull();
    expect(screen.getByLabelText("Full name")).toBeInTheDocument();
  });

  it("shows admin sector and access-request fields", async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);

    await user.click(screen.getByRole("radio", { name: /^admin/i }));

    expect(
      screen.getByRole("group", { name: /select your sector/i }),
    ).toBeInTheDocument();
    const privateSector = screen.getByRole("radio", { name: "Private" });
    await user.click(privateSector);
    expect(privateSector).toBeChecked();
    expect(screen.getByLabelText("Organization name")).toBeInTheDocument();
    expect(screen.getByLabelText("Designation")).toBeInTheDocument();
    expect(screen.getByText(/administrator privileges are not granted/i)).toBeInTheDocument();
  });

  it("shows provider specialization and sector options", async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);

    await user.click(
      screen.getByRole("radio", { name: /training provider/i }),
    );

    expect(screen.getByLabelText("Institute or company name")).toBeInTheDocument();
    expect(screen.getByLabelText("Area of specialization")).toBeInTheDocument();
    const governmentSector = screen.getByRole("radio", {
      name: "Government",
    });
    await user.click(governmentSector);
    expect(governmentSector).toBeChecked();
    expect(signUp).not.toHaveBeenCalled();
  });

  it("shows accessible field-level validation before submitting", async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);

    await user.click(screen.getByRole("radio", { name: "Admin" }));
    await user.click(
      screen.getByRole("button", { name: /request admin access/i }),
    );

    expect(screen.getByText("Choose a sector.")).toHaveAttribute(
      "id",
      "sector-error",
    );
    expect(screen.getByLabelText("Email address")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByText("Enter your full name.")).toBeInTheDocument();
    expect(signUp).not.toHaveBeenCalled();
  });

  it("creates an immediately authenticated account without an email-confirmation step", async () => {
    const user = userEvent.setup();
    signUp.mockResolvedValue({
      data: {
        user: { id: "auth-user-id", identities: [{ id: "identity-id" }] },
        session: { access_token: "test-access-token" },
      },
      error: null,
    });
    render(<RegisterForm />);

    await user.click(screen.getByRole("radio", { name: /job seeker/i }));
    await user.type(screen.getByLabelText("Full name"), "Alex Morgan");
    await user.type(screen.getByLabelText("Email address"), "alex@example.com");
    await user.type(screen.getByLabelText("Password"), "longpassword123");
    await user.type(
      screen.getByLabelText("Confirm password"),
      "longpassword123",
    );
    await user.click(
      screen.getByRole("checkbox", {
        name: /agree to the terms of service/i,
      }),
    );
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "alex@example.com",
        password: "longpassword123",
        options: expect.objectContaining({
          data: {
            full_name: "Alex Morgan",
            terms_accepted: true,
            account_type: "job_seeker",
          },
        }),
      }),
    );
    expect(await screen.findByText("Account created")).toBeInTheDocument();
    expect(
      screen.queryByText(/verification link|check your inbox/i),
    ).not.toBeInTheDocument();
  });

  it("does not claim success if Supabase still requires email confirmation", async () => {
    const user = userEvent.setup();
    signUp.mockResolvedValue({
      data: {
        user: { id: "auth-user-id", identities: [{ id: "identity-id" }] },
        session: null,
      },
      error: null,
    });
    render(<RegisterForm />);

    await user.click(screen.getByRole("radio", { name: /job seeker/i }));
    await user.type(screen.getByLabelText("Full name"), "Alex Morgan");
    await user.type(screen.getByLabelText("Email address"), "alex@example.com");
    await user.type(screen.getByLabelText("Password"), "longpassword123");
    await user.type(
      screen.getByLabelText("Confirm password"),
      "longpassword123",
    );
    await user.click(
      screen.getByRole("checkbox", {
        name: /agree to the terms of service/i,
      }),
    );
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(
      await screen.findByText(/turn off Confirm email in Supabase Auth settings/i),
    ).toBeInTheDocument();
    expect(screen.queryByText("Account created")).not.toBeInTheDocument();
  });

  it("reports duplicate emails and network errors rather than showing success", async () => {
    const user = userEvent.setup();
    signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: new Error("User already registered"),
    });
    render(<RegisterForm />);

    await user.click(screen.getByRole("radio", { name: /job seeker/i }));
    await user.type(screen.getByLabelText("Full name"), "Alex Morgan");
    await user.type(screen.getByLabelText("Email address"), "alex@example.com");
    await user.type(screen.getByLabelText("Password"), "longpassword123");
    await user.type(
      screen.getByLabelText("Confirm password"),
      "longpassword123",
    );
    await user.click(
      screen.getByRole("checkbox", {
        name: /agree to the terms of service/i,
      }),
    );
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(
      await screen.findByText(/account with this email already exists/i),
    ).toBeInTheDocument();
    expect(screen.queryByText("Check your inbox")).toBeNull();
  });

  it("reports network failures and keeps the form available for retry", async () => {
    const user = userEvent.setup();
    signUp.mockRejectedValue(new TypeError("fetch failed"));
    render(<RegisterForm />);

    await user.click(screen.getByRole("radio", { name: /job seeker/i }));
    await user.type(screen.getByLabelText("Full name"), "Alex Morgan");
    await user.type(screen.getByLabelText("Email address"), "alex@example.com");
    await user.type(screen.getByLabelText("Password"), "longpassword123");
    await user.type(
      screen.getByLabelText("Confirm password"),
      "longpassword123",
    );
    await user.click(
      screen.getByRole("checkbox", {
        name: /agree to the terms of service/i,
      }),
    );
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(
      await screen.findByText(/couldn’t reach supabase/i),
    ).toBeInTheDocument();
    expect(screen.queryByText("Check your inbox")).toBeNull();
    expect(
      screen.getByRole("button", { name: /create account/i }),
    ).toBeEnabled();
  });

  it("prevents duplicate signup submissions while Supabase is pending", async () => {
    const user = userEvent.setup();
    let resolveSignup:
      | ((value: {
          data: {
            user: { id: string; identities: { id: string }[] };
            session: { access_token: string };
          };
          error: null;
        }) => void)
      | undefined;
    signUp.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSignup = resolve;
        }),
    );
    render(<RegisterForm />);

    await user.click(screen.getByRole("radio", { name: /job seeker/i }));
    await user.type(screen.getByLabelText("Full name"), "Taylor Lee");
    await user.type(screen.getByLabelText("Email address"), "taylor@example.com");
    await user.type(screen.getByLabelText("Password"), "longpassword123");
    await user.type(
      screen.getByLabelText("Confirm password"),
      "longpassword123",
    );
    await user.click(
      screen.getByRole("checkbox", {
        name: /agree to the terms of service/i,
      }),
    );
    await user.click(screen.getByRole("button", { name: /create account/i }));

    const submitButton = screen.getByRole("button", {
      name: /creating your account/i,
    });
    expect(submitButton).toBeDisabled();
    expect(signUp).toHaveBeenCalledOnce();

    resolveSignup?.({
      data: {
        user: { id: "signup-test-user", identities: [{ id: "identity" }] },
        session: { access_token: "test-access-token" },
      },
      error: null,
    });
    expect(await screen.findByText("Account created")).toBeInTheDocument();
  });

  it("submits admin access as a request instead of assuming admin privileges", async () => {
    const user = userEvent.setup();
    signUp.mockResolvedValue({
      data: {
        user: { id: "auth-user-id", identities: [{ id: "identity-id" }] },
        session: { access_token: "test-access-token" },
      },
      error: null,
    });
    render(<RegisterForm />);

    await user.click(screen.getByRole("radio", { name: "Admin" }));
    await user.click(screen.getByRole("radio", { name: "Private" }));
    await user.type(screen.getByLabelText("Full name"), "Alex Morgan");
    await user.type(screen.getByLabelText("Email address"), "alex@example.com");
    await user.type(screen.getByLabelText("Password"), "longpassword123");
    await user.type(
      screen.getByLabelText("Confirm password"),
      "longpassword123",
    );
    await user.type(
      screen.getByLabelText("Organization name"),
      "Skills Agency",
    );
    await user.type(screen.getByLabelText("Designation"), "Coordinator");
    await user.click(
      screen.getByRole("checkbox", {
        name: /agree to the terms of service/i,
      }),
    );
    await user.click(
      screen.getByRole("button", { name: /request admin access/i }),
    );

    expect(signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          data: {
            full_name: "Alex Morgan",
            terms_accepted: true,
            account_type: "admin",
            sector: "private",
            organization_name: "Skills Agency",
            designation: "Coordinator",
          },
        }),
      }),
    );
    expect(
      await screen.findByText(/remain a job-seeker account until an existing administrator approves/i),
    ).toBeInTheDocument();
  });
});
