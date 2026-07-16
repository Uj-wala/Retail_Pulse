import { useState, type ReactNode } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { isAxiosError } from "axios";
import { ShieldCheck } from "lucide-react";
import { profileApi } from "../../api/profileApi";
import { authApi } from "../../api/authApi";
import { PasswordField } from "../../components/forms/PasswordField";
import { Button } from "../../components/common/Button";
import { Card } from "../../components/common/Card";
import { Badge } from "../../components/common/Badge";
import { Spinner } from "../../components/common/Spinner";
import { formatDateTime } from "../../services/formatters";
import { useNotification } from "../../hooks/useNotification";

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmNewPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Passwords do not match",
    path: ["confirmNewPassword"],
  });

type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

function ProfileRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-content-muted">{label}</span>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  );
}

export function ProfilePage() {
  const { notify } = useNotification();
  const { data, isLoading } = useQuery({ queryKey: ["profile"], queryFn: profileApi.getProfile });

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { control, handleSubmit, reset } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmNewPassword: "" },
  });

  const changePasswordMutation = useMutation({
    mutationFn: (values: ChangePasswordValues) =>
      authApi.changePassword({
        current_password: values.currentPassword,
        new_password: values.newPassword,
        confirm_new_password: values.confirmNewPassword,
      }),
    onSuccess: () => {
      notify("Password changed successfully.");
      setErrorMessage(null);
      reset();
    },
    onError: (error) => {
      if (isAxiosError(error) && error.response?.status === 401) {
        setErrorMessage("Current password is incorrect.");
      } else {
        setErrorMessage("Could not change password. Please try again.");
      }
    },
  });

  if (isLoading || !data) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size={28} />
      </div>
    );
  }

  const { user, company } = data;

  return (
    <div className="grid max-w-5xl grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,720px)_1fr]">
      <div>
        <h1 className="mb-4 text-xl font-bold">Profile</h1>

        <Card className="mb-6 p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-brand-teal text-lg font-bold text-[#042F2E]">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-base font-bold">{user.name}</p>
              <p className="text-sm text-content-muted">{user.email}</p>
            </div>
          </div>

          <div className="mb-4 h-px bg-border/15" />

          <div className="space-y-3">
            <ProfileRow label="Role" value={<Badge>{user.role}</Badge>} />
            <ProfileRow label="Company" value={company.name} />
            <ProfileRow
              label="Account Status"
              value={<Badge tone={user.status === "ACTIVE" ? "success" : "neutral"}>{user.status}</Badge>}
            />
            <ProfileRow label="Last Login" value={formatDateTime(user.last_login)} />
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 text-base font-bold">Change Password</h2>

          {errorMessage && (
            <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-500">
              {errorMessage}
            </div>
          )}

          <form
            onSubmit={handleSubmit((values) => {
              setErrorMessage(null);
              changePasswordMutation.mutate(values);
            })}
            noValidate
          >
            <PasswordField name="currentPassword" control={control} label="Current Password" autoComplete="current-password" />
            <PasswordField name="newPassword" control={control} label="New Password" autoComplete="new-password" />
            <PasswordField name="confirmNewPassword" control={control} label="Confirm New Password" autoComplete="new-password" />
            <Button type="submit" isLoading={changePasswordMutation.isPending} className="mt-2">
              {changePasswordMutation.isPending ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </Card>
      </div>

      <Card className="hidden overflow-hidden bg-brand-navy p-6 text-white lg:block">
        <ShieldCheck className="mb-3 h-8 w-8 text-brand-amber" />
        <p className="text-xs font-bold uppercase tracking-wide text-brand-amber">Account Space</p>
        <h2 className="mt-2 text-lg font-extrabold">Your company workspace is active.</h2>
        <p className="mt-2 text-sm text-white/70">
          Profile, access level, and password controls stay connected to your company boundary.
        </p>
        <div className="mt-6 space-y-2">
          {["Tenant isolated", "JWT protected", "Audit logged"].map((item) => (
            <div key={item} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold">
              {item}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
