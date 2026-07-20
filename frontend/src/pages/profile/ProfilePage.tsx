import { useState, type ReactNode } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { isAxiosError } from "axios";
import {
  History,
  LogIn,
  LogOut,
  KeyRound,
  ShieldAlert,
  ShieldQuestion,
  Package,
  Tags,
  Boxes,
  ShoppingCart,
  Building2,
  UserPlus,
  UserCog,
  UserX,
} from "lucide-react";
import { profileApi } from "../../api/profileApi";
import { authApi } from "../../api/authApi";
import { PasswordField } from "../../components/forms/PasswordField";
import { Button } from "../../components/common/Button";
import { Card } from "../../components/common/Card";
import { Badge } from "../../components/common/Badge";
import { Spinner } from "../../components/common/Spinner";
import { formatDate, formatDateTime } from "../../services/formatters";
import { useNotification } from "../../hooks/useNotification";
import type { ActivityLogEntry } from "../../types";

const ACTIVITY_LABELS: Record<string, string> = {
  COMPANY_REGISTERED: "Registered company",
  USER_LOGIN: "Logged in",
  USER_LOGOUT: "Logged out",
  PASSWORD_CHANGED: "Changed password",
  LOGIN_FAILED: "Failed login attempt",
  USER_INVITED: "Invited a user",
  USER_UPDATED: "Updated a user",
  USER_DEACTIVATED: "Deactivated a user",
  PASSWORD_RESET_REQUESTED: "Requested password reset",
  PASSWORD_RESET_COMPLETED: "Reset password",
  PRODUCT_CREATED: "Created product",
  PRODUCT_UPDATED: "Updated product",
  PRODUCT_DELETED: "Deleted product",
  PRODUCT_ACTIVATED: "Activated product",
  PRODUCT_DEACTIVATED: "Deactivated product",
  CATEGORY_CREATED: "Created category",
  CATEGORY_UPDATED: "Updated category",
  CATEGORY_DELETED: "Deleted category",
  INVENTORY_ADJUSTED: "Adjusted inventory",
  SALE_CREATED: "Recorded a sale",
  SALE_REFUNDED: "Refunded a sale",
  COMPANY_UPDATED: "Updated company settings",
};

const ACTIVITY_ICONS: Record<string, ReactNode> = {
  USER_LOGIN: <LogIn className="h-4 w-4" />,
  USER_LOGOUT: <LogOut className="h-4 w-4" />,
  PASSWORD_CHANGED: <KeyRound className="h-4 w-4" />,
  LOGIN_FAILED: <ShieldAlert className="h-4 w-4" />,
  PASSWORD_RESET_REQUESTED: <ShieldQuestion className="h-4 w-4" />,
  PASSWORD_RESET_COMPLETED: <KeyRound className="h-4 w-4" />,
  PRODUCT_CREATED: <Package className="h-4 w-4" />,
  PRODUCT_UPDATED: <Package className="h-4 w-4" />,
  PRODUCT_DELETED: <Package className="h-4 w-4" />,
  PRODUCT_ACTIVATED: <Package className="h-4 w-4" />,
  PRODUCT_DEACTIVATED: <Package className="h-4 w-4" />,
  CATEGORY_CREATED: <Tags className="h-4 w-4" />,
  CATEGORY_UPDATED: <Tags className="h-4 w-4" />,
  CATEGORY_DELETED: <Tags className="h-4 w-4" />,
  INVENTORY_ADJUSTED: <Boxes className="h-4 w-4" />,
  SALE_CREATED: <ShoppingCart className="h-4 w-4" />,
  SALE_REFUNDED: <ShoppingCart className="h-4 w-4" />,
  COMPANY_UPDATED: <Building2 className="h-4 w-4" />,
  USER_INVITED: <UserPlus className="h-4 w-4" />,
  USER_UPDATED: <UserCog className="h-4 w-4" />,
  USER_DEACTIVATED: <UserX className="h-4 w-4" />,
};

function ActivityRow({ entry }: { entry: ActivityLogEntry }) {
  const label = ACTIVITY_LABELS[entry.action] ?? entry.action;
  const icon = ACTIVITY_ICONS[entry.action] ?? <History className="h-4 w-4" />;
  const isFailure = entry.action === "LOGIN_FAILED";

  return (
    <div className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5">
      <div
        className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full ${
          isFailure ? "bg-red-500/20 text-red-300" : "bg-brand-amber/20 text-brand-amber"
        }`}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">
          {label}
          {entry.details && <span className="font-normal text-white/70">: {entry.details}</span>}
        </p>
        <p className="text-xs text-white/50">{formatDateTime(entry.created_at)}</p>
      </div>
    </div>
  );
}

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
  const activityQuery = useQuery({ queryKey: ["profile", "activity"], queryFn: () => profileApi.getActivity(10) });
  const activity = activityQuery.data?.activity ?? [];

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
    <div className="grid max-w-5xl grid-cols-1 gap-6 lg:grid-cols-2 lg:items-stretch">
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

      <Card className="hidden flex-col overflow-hidden bg-brand-navy p-6 text-white lg:flex">
        <History className="mb-2 h-8 w-8 text-brand-amber" />
        <p className="text-xs font-bold uppercase tracking-wide text-brand-amber">Recent Activity</p>
        <h2 className="mt-1 text-lg font-extrabold">Your latest account actions.</h2>
        <p className="mt-1 text-xs text-white/70">
          A live feed of your logins, password changes, and catalog updates — sourced from the audit log.
        </p>
        <div className="mt-3 max-h-80 space-y-1 overflow-y-auto">
          {activityQuery.isLoading ? (
            <div className="flex h-full items-center justify-center">
              <Spinner size={22} />
            </div>
          ) : activity.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <History className="h-8 w-8 text-white/40" />
              <p className="text-sm font-semibold">No activity yet</p>
              <p className="text-xs text-white/50">Actions you take will show up here.</p>
            </div>
          ) : (
            activity.map((entry) => <ActivityRow key={entry.id} entry={entry} />)
          )}
        </div>

        <div className="mt-4 border-t border-white/10 pt-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/50">Member since</span>
            <span className="font-semibold">{formatDate(user.created_at)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-white/50">Company industry</span>
            <span className="font-semibold">{company.industry}</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {["Tenant isolated", "JWT protected", "Audit logged"].map((item) => (
              <span
                key={item}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
