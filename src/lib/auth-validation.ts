export type AuthField = "email" | "password" | "confirmPassword";
export type AuthFieldErrors = Partial<Record<AuthField, string>>;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d).{10,128}$/;

export function validateEmail(email: string): string | undefined {
  const normalizedEmail = email.trim();
  if (!normalizedEmail) return "Enter your email address.";
  if (
    normalizedEmail.length > 254 ||
    !emailPattern.test(normalizedEmail)
  ) {
    return "Enter a valid email address.";
  }
}

export function validatePassword(password: string): string | undefined {
  if (!password) return "Enter your password.";
  if (!passwordPattern.test(password)) {
    return "Use 10–128 characters with at least one letter and one number.";
  }
}

export function validateLoginPassword(password: string): string | undefined {
  if (!password) return "Enter your password.";
}

export function validateNewPassword(
  password: string,
  confirmPassword: string,
): AuthFieldErrors {
  const errors: AuthFieldErrors = {};
  const passwordError = validatePassword(password);

  if (passwordError) {
    errors.password = passwordError;
  }

  if (!confirmPassword) {
    errors.confirmPassword = "Confirm your password.";
  } else if (password !== confirmPassword) {
    errors.confirmPassword = "Your passwords do not match.";
  }

  return errors;
}
