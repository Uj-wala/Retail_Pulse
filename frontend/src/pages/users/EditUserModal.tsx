import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Modal } from "../../components/common/Modal";
import { Button } from "../../components/common/Button";
import { FormSelect } from "../../components/forms/FormSelect";
import { editUserSchema, type EditUserFormValues } from "./userSchema";
import type { User } from "../../types";

interface EditUserModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: EditUserFormValues) => void;
  isSubmitting: boolean;
  user: User | null;
}

export function EditUserModal({ open, onClose, onSubmit, isSubmitting, user }: EditUserModalProps) {
  const { control, handleSubmit } = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserSchema),
    values: { role: user?.role ?? "VIEWER", status: user?.status ?? "ACTIVE" },
  });

  return (
    <Modal open={open} onClose={onClose} title={`Edit ${user?.name ?? "User"}`}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <FormSelect name="role" control={control} label="Role">
          <option value="VIEWER">Viewer</option>
          <option value="ANALYST">Analyst</option>
          <option value="COMPANY_ADMIN">Company Admin</option>
          <option value="SUPER_ADMIN">Super Admin</option>
        </FormSelect>
        <FormSelect name="status" control={control} label="Status">
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="SUSPENDED">Suspended</option>
        </FormSelect>

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}
