import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { authApi } from "../../../api/authApi";
import { FormTextField } from "../../../components/forms/FormTextField";
import { PasswordField } from "../../../components/forms/PasswordField";
import { Button } from "../../../components/common/Button";
import { Card } from "../../../components/common/Card";
import { useAuth } from "../../../hooks/useAuth";
import { loginSchema, type LoginFormValues } from "./loginSchema";

function getLoginErrorMessage(error: unknown): string {
  if (!isAxiosError(error)) return "Something went wrong. Please try again.";

  if (!error.response) {
    return "Login API is not reachable. Start the backend server and try again.";
  }

  if (error.response.status === 401) {
    return "Invalid email or password.";
  }

  const data = error.response.data as { detail?: unknown } | undefined;
  if (typeof data?.detail === "string") return data.detail;

  return "Could not sign in. Please try again.";
}

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { control, handleSubmit } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const loginMutation = useMutation({
    mutationFn: (values: LoginFormValues) => authApi.login(values.email, values.password),
    onSuccess: (tokens) => {
      login(tokens);
      navigate("/dashboard", { replace: true });
    },
    onError: (error) => {
      setErrorMessage(getLoginErrorMessage(error));
    },
  });

  const onSubmit = (values: LoginFormValues) => {
    setErrorMessage(null);
    loginMutation.mutate(values);
  };

  return (
    <Card className="w-full max-w-md p-6 sm:p-10">
      <h1 className="text-2xl font-extrabold">Welcome Back</h1>
      <p className="mb-6 mt-1 text-content-muted">Sign in to your account</p>

      {errorMessage && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-500">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <FormTextField name="email" control={control} label="Email" autoComplete="email" />
        <PasswordField name="password" control={control} label="Password" autoComplete="current-password" />

        <Button type="submit" isLoading={loginMutation.isPending} className="mb-4 mt-2 w-full py-3">
          {loginMutation.isPending ? "Signing in..." : "Sign In"}
        </Button>

        <div className="flex justify-center gap-1.5 text-sm">
          <span className="text-content-muted">Don't have an account?</span>
          <Link to="/register" className="font-semibold text-brand-teal hover:underline">
            Register
          </Link>
        </div>
        <div className="mt-2 flex justify-center text-sm">
          <Link to="/forgot-password" className="font-semibold text-brand-teal hover:underline">
            Forgot your password?
          </Link>
        </div>
      </form>
    </Card>
  );
}
