import { useState } from 'react';
import { Header } from '@/components/Header';
import { useAuth, User, UserRole, ROLE_LABELS, ROLE_COLORS } from '@/contexts/AuthContext';
import { Plus, Edit, Trash2, Save, X, Users, Shield, Loader2 } from 'lucide-react';

export function Admin() {
  const { users, user: currentUser, addUser, updateUser, deleteUser } = useAuth();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'operator' as UserRole,
  });

  const resetForm = () => {
    setFormData({ name: '', email: '', password: '', role: 'operator' });
    setIsAdding(false);
    setEditingId(null);
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError('');

    try {
      if (editingId) {
        await updateUser(editingId, {
          name: formData.name,
          email: formData.email,
          role: formData.role,
        });
      } else {
        const result = await addUser({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role,
        });
        if (!result.success) {
          setSubmitError(result.error || 'Failed to create user');
          setIsSubmitting(false);
          return;
        }
      }
      resetForm();
    } catch (error) {
      setSubmitError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEdit = (userToEdit: User) => {
    setFormData({
      name: userToEdit.name,
      email: userToEdit.email,
      password: '',
      role: userToEdit.role,
    });
    setEditingId(userToEdit.id);
    setIsAdding(false);
    setSubmitError('');
  };

  const handleDelete = async (id: string) => {
    if (confirmDelete === id) {
      await deleteUser(id);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(id);
    }
  };

  const handleStartAdding = () => {
    setIsAdding(true);
    setSubmitError('');
  };

  return (
    <>
      <Header
        title="Administration"
        subtitle="Manage users, roles, and system settings"
      />

      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          {/* User Management */}
          <div className="card p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <Users size={24} className="text-[hsl(var(--primary))]" />
                <h2 className="text-lg sm:text-xl font-semibold text-[hsl(var(--foreground))]">
                  User Management
                </h2>
              </div>
              {!isAdding && !editingId && (
                <button
                  onClick={handleStartAdding}
                  className="btn-primary w-full sm:w-auto"
                >
                  <Plus size={18} />
                  Add User
                </button>
              )}
            </div>

            {/* Add/Edit Form */}
            {(isAdding || editingId) && (
              <form onSubmit={handleSubmit} className="mb-6 p-4 bg-[hsl(var(--muted))] rounded-lg">
                <h3 className="font-medium text-[hsl(var(--foreground))] mb-4">
                  {editingId ? 'Edit User' : 'Add New User'}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="label">Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="input-field"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="input-field"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">
                      Password {editingId && '(leave blank to keep current)'}
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      className="input-field"
                      required={!editingId}
                    />
                  </div>
                  <div>
                    <label className="label">Role</label>
                    <select
                      value={formData.role}
                      onChange={e => setFormData(prev => ({ ...prev, role: e.target.value as UserRole }))}
                      className="select-field"
                    >
                      <option value="operator">Lider</option>
                      <option value="supervisor">Supervisor</option>
                      <option value="admin">Manager</option>
                    </select>
                  </div>
                </div>
                {submitError && (
                  <div className="mb-4 p-3 bg-[hsl(var(--destructive))]/10 border border-[hsl(var(--destructive))]/20 rounded text-sm text-[hsl(var(--destructive))]">
                    {submitError}
                  </div>
                )}
                <div className="flex gap-2">
                  <button type="submit" className="btn-primary" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    {editingId ? 'Update' : 'Create'}
                  </button>
                  <button type="button" onClick={resetForm} className="btn-secondary" disabled={isSubmitting}>
                    <X size={16} />
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* Users List - Mobile Cards */}
            <div className="sm:hidden space-y-3">
              {users.map(u => (
                <div key={u.id} className="p-4 bg-[hsl(var(--muted))] rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium">{u.name}</p>
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">{u.email}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${ROLE_COLORS[u.role]}`}>
                      <Shield size={12} />
                      {ROLE_LABELS[u.role]}
                    </span>
                  </div>
                  <div className="flex gap-2 mt-3 pt-3 border-t border-[hsl(var(--border))]">
                    <button
                      onClick={() => startEdit(u)}
                      className="btn-secondary flex-1 text-sm py-2"
                    >
                      <Edit size={14} />
                      Edit
                    </button>
                    {u.id !== currentUser?.id && (
                      <button
                        onClick={() => handleDelete(u.id)}
                        className={`flex-1 text-sm py-2 rounded-md flex items-center justify-center gap-1 ${
                          confirmDelete === u.id
                            ? 'bg-[hsl(var(--destructive))] text-white'
                            : 'btn-secondary text-[hsl(var(--destructive))]'
                        }`}
                      >
                        <Trash2 size={14} />
                        {confirmDelete === u.id ? 'Confirm' : 'Delete'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Users List - Desktop Table */}
            <div className="hidden sm:block table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td className="font-medium">{u.name}</td>
                      <td>{u.email}</td>
                      <td>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${ROLE_COLORS[u.role]}`}>
                          <Shield size={12} />
                          {ROLE_LABELS[u.role]}
                        </span>
                      </td>
                      <td className="text-sm text-[hsl(var(--muted-foreground))]">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <button
                            onClick={() => startEdit(u)}
                            className="p-1.5 text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/10 rounded transition-colors"
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
                          {u.id !== currentUser?.id && (
                            <button
                              onClick={() => handleDelete(u.id)}
                              className={`p-1.5 rounded transition-colors ${
                                confirmDelete === u.id
                                  ? 'bg-[hsl(var(--destructive))] text-white'
                                  : 'text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))]/10'
                              }`}
                              title={confirmDelete === u.id ? 'Confirm delete?' : 'Delete'}
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Role Permissions Info */}
          <div className="card p-4 sm:p-6 mt-4 sm:mt-6">
            <h3 className="font-semibold text-[hsl(var(--foreground))] mb-4 flex items-center gap-2">
              <Shield size={20} className="text-[hsl(var(--primary))]" />
              Role Permissions
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-800 mb-2 text-sm sm:text-base">Operator</h4>
                <ul className="text-xs sm:text-sm text-blue-700 space-y-1">
                  <li>• View Dashboard</li>
                  <li>• Create shifts (Product + Planned Qty)</li>
                  <li>• View History</li>
                </ul>
              </div>
              <div className="p-3 sm:p-4 bg-purple-50 rounded-lg border border-purple-200">
                <h4 className="font-medium text-purple-800 mb-2 text-sm sm:text-base">Supervisor</h4>
                <ul className="text-xs sm:text-sm text-purple-700 space-y-1">
                  <li>• All Operator permissions</li>
                  <li>• Review & complete shifts</li>
                  <li>• Add production results</li>
                  <li>• Upload monitoring photos</li>
                  <li>• Edit/Delete all shifts</li>
                </ul>
              </div>
              <div className="p-3 sm:p-4 bg-red-50 rounded-lg border border-red-200">
                <h4 className="font-medium text-red-800 mb-2 text-sm sm:text-base">Administrator</h4>
                <ul className="text-xs sm:text-sm text-red-700 space-y-1">
                  <li>• All Supervisor permissions</li>
                  <li>• Manage users</li>
                  <li>• Assign roles</li>
                  <li>• System configuration</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
