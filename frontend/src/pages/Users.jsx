import { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import ConfirmModal from '../components/ConfirmModal';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, userId: null });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittingSupplier, setIsSubmittingSupplier] = useState(false);
  const [isResettingAccount, setIsResettingAccount] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm();
  const { register: registerSupplier, handleSubmit: handleSubmitSupplier, reset: resetSupplier, formState: { errors: errorsSupplier } } = useForm();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/users');
      setUsers(response.data.data);
    } catch (error) {
      // Error handled by axios interceptor
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      if (editingUser) {
        await axios.put(`/users/${editingUser._id}`, data);
        toast.success('User updated successfully');
      } else {
        await axios.post('/users', data);
        toast.success('User created successfully');
      }
      setShowModal(false);
      setEditingUser(null);
      reset();
      fetchUsers();
    } catch (error) {
      // Error handled by axios interceptor
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmitSupplier = async (data) => {
    setIsSubmittingSupplier(true);
    try {
      await axios.post('/suppliers', data);
      toast.success('Supplier created successfully');
      setShowSupplierModal(false);
      resetSupplier();
      fetchUsers();
    } catch (error) {
      // Error handled by axios interceptor
    } finally {
      setIsSubmittingSupplier(false);
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    reset({ 
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      role: user.role, 
      isActive: user.isActive 
    });
    setShowModal(true);
  };

  const handleResetAccount = (userId) => {
    setConfirmModal({ isOpen: true, userId });
  };

  const confirmResetAccount = async () => {
    setIsResettingAccount(true);
    try {
      await axios.post(`/auth/reset-account/${confirmModal.userId}`);
      toast.success('Account unlocked successfully');
      setConfirmModal({ isOpen: false, userId: null });
      fetchUsers();
    } catch (error) {
      // Error handled by axios interceptor
    } finally {
      setIsResettingAccount(false);
    }
  };

  if (loading) {
    return <div className="text-center">Loading...</div>;
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">User Management</h1>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <button
            onClick={() => {
              setEditingUser(null);
              reset();
              setShowModal(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Add User
          </button>
          <button
            onClick={() => {
              resetSupplier();
              setShowSupplierModal(true);
            }}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            Add Supplier
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Username</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Failed Attempts</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Account Locked</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.length === 0 ? (
              <tr>
                <td colSpan="9" className="px-6 py-4 text-center text-gray-500">
                  No users found
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user._id}>
                  <td className="px-6 py-4 whitespace-nowrap">{user.username}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.firstName} {user.lastName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{user.email || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{user.phone || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap capitalize">{user.role}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.isActive ? (
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">Active</span>
                    ) : (
                      <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">Inactive</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{user.failedLoginAttempts || 0}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.accountLocked ? (
                      <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">Locked</span>
                    ) : (
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">Unlocked</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap space-x-2">
                    <button
                      onClick={() => handleEdit(user)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Edit
                    </button>
                    {user.accountLocked && (
                      <button
                        onClick={() => handleResetAccount(user._id)}
                        className="text-orange-600 hover:text-orange-800 text-sm"
                      >
                        Unlock
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => {
          if (!isResettingAccount) {
            setConfirmModal({ isOpen: false, userId: null });
          }
        }}
        onConfirm={confirmResetAccount}
        title="Reset Account Lock"
        message="Are you sure you want to unlock this user's account? This will reset their failed login attempts."
        confirmText="Unlock Account"
        variant="warning"
        isLoading={isResettingAccount}
      />

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-4 sm:p-6 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl sm:text-2xl font-bold mb-4">
              {editingUser ? 'Edit User' : 'Add User'}
            </h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {!editingUser && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">Username *</label>
                    <input
                      {...register('username', {
                        required: 'Username is required',
                        minLength: { value: 3, message: 'Username must be at least 3 characters' }
                      })}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                    {errors.username && (
                      <p className="text-red-600 text-sm">{errors.username.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Password *</label>
                    <input
                      {...register('password', {
                        required: !editingUser && 'Password is required',
                        minLength: { value: 8, message: 'Password must be at least 8 characters' },
                        pattern: {
                          value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
                          message: 'Password must contain uppercase, lowercase, number, and special character'
                        }
                      })}
                      type="password"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                    {errors.password && (
                      <p className="text-red-600 text-sm">{errors.password.message}</p>
                    )}
                  </div>
                </>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">First Name *</label>
                  <input
                    {...register('firstName', {
                      required: 'First name is required'
                    })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                  {errors.firstName && (
                    <p className="text-red-600 text-sm">{errors.firstName.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Last Name *</label>
                  <input
                    {...register('lastName', {
                      required: 'Last name is required'
                    })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                  {errors.lastName && (
                    <p className="text-red-600 text-sm">{errors.lastName.message}</p>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email *</label>
                <input
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^\S+@\S+\.\S+$/,
                      message: 'Please provide a valid email address'
                    }
                  })}
                  type="email"
                  className="w-full px-3 py-2 border rounded-lg"
                />
                {errors.email && (
                  <p className="text-red-600 text-sm">{errors.email.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone *</label>
                <input
                  {...register('phone', {
                    required: 'Phone number is required'
                  })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
                {errors.phone && (
                  <p className="text-red-600 text-sm">{errors.phone.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Role *</label>
                <select
                  {...register('role', { required: 'Role is required' })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="admin">Admin</option>
                  <option value="staff">Staff</option>
                  <option value="supplier">Supplier</option>
                </select>
                {errors.role && (
                  <p className="text-red-600 text-sm">{errors.role.message}</p>
                )}
              </div>
              {editingUser && (
                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      {...register('isActive')}
                      type="checkbox"
                      className="w-4 h-4"
                    />
                    <span>Active</span>
                  </label>
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (editingUser ? 'Updating...' : 'Creating...') : (editingUser ? 'Update' : 'Create')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingUser(null);
                    reset();
                  }}
                  disabled={isSubmitting}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSupplierModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-4 sm:p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl sm:text-2xl font-bold mb-4">Add Supplier</h2>
            <form onSubmit={handleSubmitSupplier(onSubmitSupplier)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">First Name *</label>
                <input
                  {...registerSupplier('firstName', { required: 'First name is required' })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
                {errorsSupplier.firstName && (
                  <p className="text-red-600 text-sm">{errorsSupplier.firstName.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Last Name *</label>
                <input
                  {...registerSupplier('lastName', { required: 'Last name is required' })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
                {errorsSupplier.lastName && (
                  <p className="text-red-600 text-sm">{errorsSupplier.lastName.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Username *</label>
                <input
                  {...registerSupplier('username', {
                    required: 'Username is required',
                    minLength: { value: 3, message: 'Username must be at least 3 characters' }
                  })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
                {errorsSupplier.username && (
                  <p className="text-red-600 text-sm">{errorsSupplier.username.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Password *</label>
                <input
                  {...registerSupplier('password', {
                    required: 'Password is required',
                    minLength: { value: 8, message: 'Password must be at least 8 characters' },
                    pattern: {
                      value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
                      message: 'Password must contain uppercase, lowercase, number, and special character'
                    }
                  })}
                  type="password"
                  className="w-full px-3 py-2 border rounded-lg"
                />
                {errorsSupplier.password && (
                  <p className="text-red-600 text-sm">{errorsSupplier.password.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email *</label>
                <input
                  {...registerSupplier('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^\S+@\S+\.\S+$/,
                      message: 'Please provide a valid email address'
                    }
                  })}
                  type="email"
                  className="w-full px-3 py-2 border rounded-lg"
                />
                {errorsSupplier.email && (
                  <p className="text-red-600 text-sm">{errorsSupplier.email.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone *</label>
                <input
                  {...registerSupplier('phone', { required: 'Phone number is required' })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
                {errorsSupplier.phone && (
                  <p className="text-red-600 text-sm">{errorsSupplier.phone.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Company Name *</label>
                <input
                  {...registerSupplier('companyName', { required: 'Company name is required' })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
                {errorsSupplier.companyName && (
                  <p className="text-red-600 text-sm">{errorsSupplier.companyName.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Contact Details *</label>
                <textarea
                  {...registerSupplier('contactDetails', { required: 'Contact details are required' })}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows="3"
                />
                {errorsSupplier.contactDetails && (
                  <p className="text-red-600 text-sm">{errorsSupplier.contactDetails.message}</p>
                )}
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="submit"
                  disabled={isSubmittingSupplier}
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmittingSupplier ? 'Creating...' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSupplierModal(false);
                    resetSupplier();
                  }}
                  disabled={isSubmittingSupplier}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;

