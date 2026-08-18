import { useState } from "react";
import DashboardLayout from "../../../components/DashboardLayout";
import DataState, { ActionError } from "../../../components/DataState";
import { FormModal } from "../../../components/Modal";
import { useApiData, useApiAction } from "../../../hooks/useApiData";
import { useAuth } from "../../../context/useAuth";
import { USER_ROLES, USER_ROLE_VALUES } from "../../../constants/roles";
import * as usersApi from "../../../api/usersApi";
import "../shared/SharedPages.css";

// User administration (issue #1, manager side).
//
// This page is how Supplier and Logistics Manager accounts come to exist at
// all: public registration hard-codes the Vendor role and ignores anything
// else in the body, so POST /api/v1/users - manager only - is the sole way to
// create the other two.
const MIN_PASSWORD_LENGTH = 8;

// matches the server rule in backend/utils/usersUtils.js so a format error
// shows up here instead of round-tripping to the server first.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function ManagerUsers() {
  const { user: currentUser } = useAuth();

  const { data, isLoading, error, reload } = useApiData(
    () => usersApi.listUsers({ limit: 100 }),
    [],
  );

  const action = useApiAction();

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    role: USER_ROLES.SUPPLIER,
  });

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formError, setFormError] = useState(null);

  const users = data?.items ?? [];

  async function handleCreate(event) {
    event.preventDefault();
    setFormError(null);

    if (form.username.trim().length < 3) {
      setFormError({ message: "Username must be at least 3 characters." });
      return;
    }

    if (!EMAIL_PATTERN.test(form.email.trim())) {
      setFormError({ message: "Enter a valid email, like you@company.com" });
      return;
    }

    if (form.password.length < MIN_PASSWORD_LENGTH) {
      setFormError({
        message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      });
      return;
    }

    setIsCreating(true);

    try {
      await usersApi.createUser({
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
      });

      setForm({
        username: "",
        email: "",
        password: "",
        role: USER_ROLES.SUPPLIER,
      });

      await reload();
    } catch (caught) {
      setFormError(caught);
    } finally {
      setIsCreating(false);
    }
  }

  const changeRole = (target, role) =>
    action.run(target._id, async () => {
      await usersApi.updateUser(target._id, { role });
      await reload();
    });

  async function confirmDelete() {
    const target = deleteTarget;

    const ok = await action.run(target._id, async () => {
      await usersApi.deleteUser(target._id);
      await reload();
    });

    if (ok) setDeleteTarget(null);
  }

  return (
    <DashboardLayout heading="Users">
      <form className="card form-card" onSubmit={handleCreate}>
        <h3>Create an account</h3>
        <p className="muted form-note">
          Self-registration always creates a Vendor. Supplier and Logistics
          Manager accounts can only be made here.
        </p>

        <div className="form-grid">
          <label>
            Username
            <input
              value={form.username}
              onChange={(e) =>
                setForm((p) => ({ ...p, username: e.target.value }))
              }
            />
          </label>

          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={form.password}
              onChange={(e) =>
                setForm((p) => ({ ...p, password: e.target.value }))
              }
            />
          </label>

          <label>
            Role
            <select
              value={form.role}
              onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
            >
              {USER_ROLE_VALUES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </label>
        </div>

        <ActionError error={formError} onDismiss={() => setFormError(null)} />

        <button className="btn" type="submit" disabled={isCreating}>
          {isCreating ? "Creating…" : "Create account"}
        </button>
      </form>

      <ActionError error={action.error} onDismiss={action.clearError} />

      <DataState
        isLoading={isLoading}
        error={error}
        isEmpty={users.length === 0}
        emptyMessage="No users found."
        onRetry={reload}
      >
        <div className="table-wrap">
          <table className="table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((row) => {
              // guard against locking yourself out of the manager area
              const isSelf = row._id === currentUser?._id;
              const isPending = action.isPending(row._id);

              return (
                <tr key={row._id}>
                  <td>
                    {row.username}
                    {isSelf && <span className="mono"> (you)</span>}
                  </td>
                  <td>{row.email}</td>
                  <td>
                    <select
                      value={row.role}
                      disabled={isSelf || isPending}
                      onChange={(e) => changeRole(row, e.target.value)}
                    >
                      {USER_ROLE_VALUES.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    {row.createdAt
                      ? new Date(row.createdAt).toLocaleDateString()
                      : "—"}
                  </td>
                  <td>
                    {!isSelf && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setDeleteTarget(row)}
                        disabled={isPending}
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </DataState>
      {deleteTarget && (
        <FormModal
          title="Delete this account?"
          description="The user loses access immediately. This cannot be undone."
          onClose={() => setDeleteTarget(null)}
          onSubmit={confirmDelete}
          confirmLabel="Delete account"
          pendingLabel="Deleting…"
          isPending={action.isPending(deleteTarget._id)}
          destructive
        >
          <dl className="modal-readouts">
            <div className="modal-readout">
              <dt>Username</dt>
              <dd>{deleteTarget.username}</dd>
            </div>
            <div className="modal-readout">
              <dt>Email</dt>
              <dd>{deleteTarget.email}</dd>
            </div>
            <div className="modal-readout">
              <dt>Role</dt>
              <dd>{deleteTarget.role}</dd>
            </div>
          </dl>
        </FormModal>
      )}
    </DashboardLayout>
  );
}

export default ManagerUsers;
