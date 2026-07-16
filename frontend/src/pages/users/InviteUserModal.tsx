import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Modal } from "../../components/common/Modal";
import { Button } from "../../components/common/Button";
import { FormTextField } from "../../components/forms/FormTextField";
import { PasswordField } from "../../components/forms/PasswordField";
import { FormSelect } from "../../components/forms/FormSelect";
import { inviteUserSchema, type InviteUserFormValues } from "./userSchema";

interface InviteUserModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: InviteUserFormValues) => void;
  isSubmitting: boolean;
}

export function InviteUserModal({ open, onClose, onSubmit, isSubmitting }: InviteUserModalProps) {
  const { control, handleSubmit, reset } = useForm<InviteUserFormValues>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: { name: "", email: "", password: "", role: "VIEWER" },
  });

  return (
    <Modal open={open} onClose={onClose} title="Invite User">
      <form
        onSubmit={handleSubmit((values) => {
          onSubmit(values);
          reset();
        })}
        noValidate
      >
        <FormTextField name="name" control={control} label="Full Name" />
        <FormTextField name="email" control={control} label="Email" autoComplete="email" />
        <PasswordField name="password" control={control} label="Temporary Password" autoComplete="new-password" />
        <FormSelect name="role" control={control} label="Role">
          <option value="VIEWER">Viewer</option>
          <option value="ANALYST">Analyst</option>
          <option value="COMPANY_ADMIN">Company Admin</option>
        </FormSelect>

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Send Invite
          </Button>
        </div>
      </form>
    </Modal>
  );
}
