import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { companyApi } from "../../api/companyApi";
import { Card } from "../../components/common/Card";
import { Button } from "../../components/common/Button";
import { Spinner } from "../../components/common/Spinner";
import { FormTextField } from "../../components/forms/FormTextField";
import { FormTextArea } from "../../components/forms/FormTextArea";
import { useNotification } from "../../hooks/useNotification";

const settingsSchema = z.object({
  name: z.string().min(1, "Company name is required").max(255),
  industry: z.string().min(1, "Industry is required").max(100),
  address: z.string().min(1, "Address is required"),
  phone: z.string().min(1, "Phone number is required").max(50),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export function SettingsPage() {
  const { notify } = useNotification();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["company"], queryFn: companyApi.getCompany });

  const { control, handleSubmit } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    values: {
      name: data?.company.name ?? "",
      industry: data?.company.industry ?? "",
      address: data?.company.address ?? "",
      phone: data?.company.phone ?? "",
    },
  });

  const updateMutation = useMutation({
    mutationFn: companyApi.updateCompany,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company"] });
      notify("Company settings updated");
    },
    onError: () => notify("Could not update company settings.", "error"),
  });

  if (isLoading || !data) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size={28} />
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-1 text-xl font-bold">Settings</h1>
        <p className="mb-6 text-sm text-content-muted">Manage your company profile.</p>

        <Card className="overflow-y-auto p-4 sm:p-6">
          <form onSubmit={handleSubmit((values) => updateMutation.mutate(values))} noValidate>
            <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
              <FormTextField name="name" control={control} label="Company Name" />
              <FormTextField name="industry" control={control} label="Industry" />
              <FormTextField name="phone" control={control} label="Phone Number" />
              <label className="mb-4 block">
                <span className="mb-1.5 block text-sm font-medium text-content-muted">Company Email</span>
                <input
                  value={data.company.email}
                  disabled
                  className="w-full cursor-not-allowed rounded-lg border border-border/25 bg-surface-elevated px-3.5 py-2.5 text-sm text-content-muted"
                />
              </label>
            </div>
            <FormTextArea name="address" control={control} label="Address" />

            <Button type="submit" isLoading={updateMutation.isPending} className="mt-2">
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
