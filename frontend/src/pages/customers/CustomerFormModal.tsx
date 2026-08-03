import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { Modal } from "../../components/common/Modal";
import { Button } from "../../components/common/Button";
import { FormTextField } from "../../components/forms/FormTextField";
import { FormTextArea } from "../../components/forms/FormTextArea";
import { FormSelect } from "../../components/forms/FormSelect";
import { customerSchema, type CustomerFormInput, type CustomerFormValues } from "./customerSchema";
import type { Customer } from "../../types";

interface CustomerFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: CustomerFormValues) => void;
  isSubmitting: boolean;
  initial?: Customer | null;
}

export function CustomerFormModal({ open, onClose, onSubmit, isSubmitting, initial }: CustomerFormModalProps) {
  const { control, handleSubmit, reset } = useForm<CustomerFormInput, unknown, CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    values: {
      fullName: initial?.full_name ?? "",
      email: initial?.email ?? "",
      phone: initial?.phone ?? "",
      customerType: initial?.customer_type ?? "RETAIL",
      dateOfBirth: initial?.date_of_birth ?? "",
      gender: initial?.gender ?? "",
      address: initial?.address ?? "",
      city: initial?.city ?? "",
      state: initial?.state ?? "",
      country: initial?.country ?? "",
      postalCode: initial?.postal_code ?? "",
      preferredChannel: initial?.preferred_channel ?? "",
      isActive: initial?.is_active ?? true,
    },
  });

  return (
    <Modal open={open} onClose={onClose} title={initial ? "Edit Customer" : "Add Customer"} maxWidthClassName="max-w-2xl">
      <form
        onSubmit={handleSubmit((values) => {
          onSubmit(values);
          reset();
        })}
        noValidate
      >
        <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
          <FormTextField name="fullName" control={control} label="Full Name" />
          <FormTextField name="email" control={control} label="Email" type="email" />
          <FormTextField name="phone" control={control} label="Phone Number" />
          <FormSelect name="customerType" control={control} label="Customer Type">
            <option value="RETAIL">Retail</option>
            <option value="WHOLESALE">Wholesale</option>
            <option value="CORPORATE">Corporate</option>
          </FormSelect>
          <FormTextField name="dateOfBirth" control={control} label="Date of Birth" type="date" />
          <FormSelect name="gender" control={control} label="Gender">
            <option value="">Not specified</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
            <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
          </FormSelect>
          <FormTextField name="city" control={control} label="City" />
          <FormTextField name="state" control={control} label="State" />
          <FormTextField name="country" control={control} label="Country" />
          <FormTextField name="postalCode" control={control} label="Postal Code" />
          <FormSelect name="preferredChannel" control={control} label="Preferred Sales Channel">
            <option value="">Not specified</option>
            <option value="RETAIL_STORE">Retail Store</option>
            <option value="ONLINE_STORE">Online Store</option>
            <option value="MARKETPLACE">Marketplace</option>
          </FormSelect>
        </div>
        <FormTextArea name="address" control={control} label="Address" />

        <Controller
          name="isActive"
          control={control}
          render={({ field }) => (
            <label className="mb-4 flex items-center gap-2 text-sm font-medium text-content-muted">
              <input
                type="checkbox"
                checked={field.value}
                onChange={(event) => field.onChange(event.target.checked)}
                className="h-4 w-4 rounded border-border/40 accent-brand-teal"
              />
              Active
            </label>
          )}
        />

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {initial ? "Save Changes" : "Create Customer"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
