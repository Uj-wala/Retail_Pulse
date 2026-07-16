import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { MailCheck } from "lucide-react";
import { isAxiosError } from "axios";
import { authApi } from "../../../api/authApi";
import { FormTextField } from "../../../components/forms/FormTextField";
import { Button } from "../../../components/common/Button";
import { Card } from "../../../components/common/Card";

const forgotPasswordSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
});

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

function getForgotPasswordErrorMessage(error: unknown): string {
  if (!isAxiosError(error)) return "Something went wrong. Please try again.";

  if (!error.response) {
    return "Password reset API is not reachable. Start the backend server and try again.";
  }

  const data = error.response.data as { detail?: unknown } | undefined;
  if (typeof data?.detail === "string") return data.detail;

  return "Could not submit the password reset request. Please try again.";
}

export function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const [responseMessage, setResponseMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { control, handleSubmit } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: (values: ForgotPasswordValues) => authApi.forgotPassword(values.email),
    onSuccess: (data) => {
      setResponseMessage(data.message);
      setErrorMessage(null);
      setSubmitted(true);
    },
    onError: (error) => {
      setErrorMessage(getForgotPasswordErrorMessage(error));
    },
  });

  const onSubmit = (values: ForgotPasswordValues) => {
    setErrorMessage(null);
    forgotPasswordMutation.mutate(values);
  };

  return (
    <Card className="w-full max-w-md p-6 sm:p-10">
      {submitted ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <MailCheck className="h-10 w-10 text-brand-teal" />
          <h1 className="text-xl font-extrabold">Check your email</h1>
          <p className="text-content-muted">{responseMessage}</p>
          <Link to="/login" className="mt-2 font-semibold text-brand-teal hover:underline">
            Back to Sign In
          </Link>
        </div>
      ) : (
        <>
          <h1 className="text-2xl font-extrabold">Forgot Password</h1>
          <p className="mb-6 mt-1 text-content-muted">
            Enter your email address and we'll send you instructions to reset your password.
          </p>

          {errorMessage && (
            <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-500">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <FormTextField name="email" control={control} label="Email" autoComplete="email" />
            <Button
              type="submit"
              isLoading={forgotPasswordMutation.isPending}
              className="mb-4 mt-2 w-full py-3"
            >
              {forgotPasswordMutation.isPending ? "Sending..." : "Send Reset Instructions"}
            </Button>
            <div className="flex justify-center text-sm">
              <Link to="/login" className="font-semibold text-brand-teal hover:underline">
                Back to Sign In
              </Link>
            </div>
          </form>
        </>
      )}
    </Card>
  );
}
