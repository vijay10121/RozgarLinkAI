"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, LoaderCircle, MailCheck } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { getRegistrationErrorMessage } from "@/lib/registration";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailVerified = searchParams.get("verified") === "1";
  const verificationError =
    searchParams.get("error") === "email_verification";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Enter your email address and password.");
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        setError(
          authError.message.toLowerCase().includes("email not confirmed")
            ? "Verify your email using the link we sent before logging in."
            : "We couldn’t log you in with those details. Check your email and password, then try again.",
        );
        return;
      }

      router.replace("/");
    } catch (loginError) {
      setError(getRegistrationErrorMessage(loginError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      {emailVerified ? (
        <Alert>
          <MailCheck aria-hidden="true" />
          <AlertTitle>Email verified</AlertTitle>
          <AlertDescription>
            Your email is confirmed. Log in to continue.
          </AlertDescription>
        </Alert>
      ) : null}
      {verificationError ? (
        <Alert variant="destructive">
          <AlertTitle>Verification link could not be used</AlertTitle>
          <AlertDescription>
            The link may have expired or already been used. Request a fresh
            confirmation email from Supabase Auth.
          </AlertDescription>
        </Alert>
      ) : null}
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Login failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label
            className="text-sm font-medium text-foreground"
            htmlFor="login-email"
          >
            Email address
          </label>
          <Input
            autoComplete="email"
            className="h-11 bg-background"
            id="login-email"
            inputMode="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
            type="email"
            value={email}
          />
        </div>
        <div className="space-y-2">
          <label
            className="text-sm font-medium text-foreground"
            htmlFor="login-password"
          >
            Password
          </label>
          <Input
            autoComplete="current-password"
            className="h-11 bg-background"
            id="login-password"
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </div>
        <Button
          className="h-12 w-full gap-2 text-base"
          disabled={isSubmitting}
          size="lg"
          type="submit"
        >
          {isSubmitting ? (
            <>
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
              Logging in…
            </>
          ) : (
            <>
              Log in
              <ArrowRight aria-hidden="true" className="size-4" />
            </>
          )}
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        New to RozgarLink?{" "}
        <Link
          className="font-semibold text-brand underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          href="/register"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
