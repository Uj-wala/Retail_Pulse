import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, UserX, Users as UsersIcon } from "lucide-react";
import { userApi } from "../../api/userApi";
import { Button } from "../../components/common/Button";
import { EmptyState } from "../../components/common/EmptyState";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import { Spinner } from "../../components/common/Spinner";
import { Badge } from "../../components/common/Badge";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "../../components/tables/Table";
import { formatDate } from "../../services/formatters";
import { useAuth } from "../../hooks/useAuth";
import { useNotification } from "../../hooks/useNotification";
import { InviteUserModal } from "./InviteUserModal";
import { EditUserModal } from "./EditUserModal";
import type { User } from "../../types";

export function UsersPage() {
  const { user: currentUser } = useAuth();
  const { notify } = useNotification();
  const queryClient = useQueryClient();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [deactivating, setDeactivating] = useState<User | null>(null);

  const usersQuery = useQuery({ queryKey: ["users"], queryFn: userApi.listUsers });

  const inviteMutation = useMutation({
    mutationFn: userApi.inviteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      notify("User invited");
      setInviteOpen(false);
    },
    onError: () => notify("Could not invite user. The email may already be in use.", "error"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof userApi.updateUser>[1] }) =>
      userApi.updateUser(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      notify("User updated");
      setEditing(null);
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => userApi.deactivateUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      notify("User deactivated");
      setDeactivating(null);
    },
  });

  const users = usersQuery.data?.users ?? [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Users</h1>
          <p className="text-sm text-content-muted">Manage who has access to your company workspace.</p>
        </div>
        <Button icon={<Plus className="h-4 w-4" />} onClick={() => setInviteOpen(true)}>
          Invite User
        </Button>
      </div>

      {usersQuery.isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner size={28} />
        </div>
      ) : users.length === 0 ? (
        <EmptyState icon={<UsersIcon className="h-10 w-10" />} title="No users found" />
      ) : (
        <Table>
          <TableHead>
            <tr>
              <TableHeaderCell>Name</TableHeaderCell>
              <TableHeaderCell>Email</TableHeaderCell>
              <TableHeaderCell>Role</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Joined</TableHeaderCell>
              <TableHeaderCell className="text-right">Actions</TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-semibold">{user.name}</TableCell>
                <TableCell className="text-content-muted">{user.email}</TableCell>
                <TableCell>
                  <Badge>{user.role}</Badge>
                </TableCell>
                <TableCell>
                  <Badge tone={user.status === "ACTIVE" ? "success" : "neutral"}>{user.status}</Badge>
                </TableCell>
                <TableCell className="text-content-muted">{formatDate(user.created_at)}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => setEditing(user)}
                      className="rounded-lg p-2 text-content-muted hover:bg-surface-elevated hover:text-content"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    {user.id !== currentUser?.id && user.status === "ACTIVE" && (
                      <button
                        type="button"
                        onClick={() => setDeactivating(user)}
                        className="rounded-lg p-2 text-content-muted hover:bg-red-500/10 hover:text-red-500"
                      >
                        <UserX className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <InviteUserModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        isSubmitting={inviteMutation.isPending}
        onSubmit={(values) => inviteMutation.mutate(values)}
      />

      <EditUserModal
        open={!!editing}
        onClose={() => setEditing(null)}
        user={editing}
        isSubmitting={updateMutation.isPending}
        onSubmit={(values) => editing && updateMutation.mutate({ id: editing.id, payload: values })}
      />

      <ConfirmDialog
        open={!!deactivating}
        title="Deactivate User"
        message={`Are you sure you want to deactivate "${deactivating?.name}"? They will no longer be able to sign in.`}
        confirmLabel="Deactivate"
        isLoading={deactivateMutation.isPending}
        onCancel={() => setDeactivating(null)}
        onConfirm={() => deactivating && deactivateMutation.mutate(deactivating.id)}
      />
    </div>
  );
}
