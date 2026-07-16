import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { MailCheck } from "lucide-react";
import { authApi } from "../../../api/authApi";
import { FormTextField } from "../../../components/forms/FormTextField";
import { Button } from "../../../components/common/Button";
import { Card } from "../../../components/common/Card";

const forgotPasswordSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
});

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);

  const { control, handleSubmit } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: (values: ForgotPasswordValues) => authApi.forgotPassword(values.email),
    onSuccess: () => setSubmitted(true),
  });

  return (
    <Card className="w-full max-w-md p-6 sm:p-10">
      {submitted ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <MailCheck className="h-10 w-10 text-brand-teal" />
          <h1 className="text-xl font-extrabold">Check your email</h1>
          <p className="text-content-muted">
            If an account exists for that email, we've sent password reset instructions.
          </p>
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

          <form onSubmit={handleSubmit((values) => forgotPasswordMutation.mutate(values))} noValidate>
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
