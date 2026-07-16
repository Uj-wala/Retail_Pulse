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
import { registerSchema, type RegisterFormValues } from "./registerSchema";

function getApiErrorMessage(error: unknown): string {
  if (!isAxiosError(error)) return "Something went wrong. Please try again.";

  if (!error.response) {
    return "Registration API is not reachable. Start the backend server and try again.";
  }

  const data = error.response.data as { detail?: unknown } | undefined;
  if (typeof data?.detail === "string") return data.detail;
  if (Array.isArray(data?.detail) && data.detail.length > 0) {
    const firstMessage = (data.detail[0] as { msg?: unknown })?.msg;
    if (typeof firstMessage === "string") return firstMessage;
  }

  if (error.response.status === 409) {
    return "This company or email is already registered.";
  }

  return "Could not create the account. Please check the details and try again.";
}

export function RegisterPage() {
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { control, handleSubmit } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      companyName: "",
      industry: "",
      companyEmail: "",
      companyAddress: "",
      companyPhone: "",
      ownerName: "",
      ownerEmail: "",
      password: "",
      confirmPassword: "",
    },
  });

  const registerMutation = useMutation({
    mutationFn: (values: RegisterFormValues) =>
      authApi.register({
        company_name: values.companyName,
        industry: values.industry,
        company_email: values.companyEmail,
        company_address: values.companyAddress,
        company_phone: values.companyPhone,
        owner_name: values.ownerName,
        owner_email: values.ownerEmail,
        password: values.password,
        confirm_password: values.confirmPassword,
      }),
    onSuccess: () => {
      navigate("/login", { replace: true });
    },
    onError: (error) => {
      setErrorMessage(getApiErrorMessage(error));
    },
  });

  const onSubmit = (values: RegisterFormValues) => {
    setErrorMessage(null);
    registerMutation.mutate(values);
  };

  return (
    <Card className="w-full max-w-3xl p-6 sm:p-8">
      <h1 className="text-2xl font-extrabold">Create Your Company Account</h1>
      <p className="mb-6 mt-1 text-content-muted">Register your company to get started with RetailPulse</p>

      {errorMessage && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-500">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <p className="mb-1 mt-1 text-sm font-extrabold text-brand-amber">Company Details</p>
        <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
          <FormTextField name="companyName" control={control} label="Company Name" />
          <FormTextField name="industry" control={control} label="Industry" />
          <FormTextField name="companyEmail" control={control} label="Company Email" autoComplete="email" />
          <FormTextField name="companyPhone" control={control} label="Company Phone Number" />
          <div className="sm:col-span-2">
            <FormTextField name="companyAddress" control={control} label="Company Address" />
          </div>
        </div>

        <div className="my-2 h-px bg-border/15" />

        <p className="mb-1 mt-3 text-sm font-extrabold text-brand-amber">Owner Account</p>
        <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
          <FormTextField name="ownerName" control={control} label="Owner Name" />
          <FormTextField name="ownerEmail" control={control} label="Owner Email" autoComplete="email" />
          <PasswordField name="password" control={control} label="Password" autoComplete="new-password" />
          <PasswordField name="confirmPassword" control={control} label="Confirm Password" autoComplete="new-password" />
        </div>

        <Button type="submit" isLoading={registerMutation.isPending} className="mb-4 mt-3 w-full py-3">
          {registerMutation.isPending ? "Creating account..." : "Create Account"}
        </Button>

        <div className="flex justify-center gap-1.5 text-sm">
          <span className="text-content-muted">Already have an account?</span>
          <Link to="/login" className="font-semibold text-brand-teal hover:underline">
            Sign In
          </Link>
        </div>
      </form>
    </Card>
  );
}
