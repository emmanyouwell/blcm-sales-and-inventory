import { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { useForm } from 'react-hook-form';
import ConfirmModal from '../components/ConfirmModal';

const Suppliers = () => {
  const { isAdmin } = useAuth();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, supplierId: null });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const response = await axios.get('/suppliers');
      setSuppliers(response.data.data);
    } catch (error) {
      // Error handled by axios interceptor
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      if (editingSupplier) {
        await axios.put(`/suppliers/${editingSupplier._id}`, data);
        toast.success('Supplier updated successfully');
      } else {
        await axios.post('/suppliers', data);
        toast.success('Supplier created successfully');
      }
      setShowModal(false);
      setEditingSupplier(null);
      reset();
      fetchSuppliers();
    } catch (error) {
      // Error handled by axios interceptor
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (supplier) => {
    setEditingSupplier(supplier);
    reset(supplier);
    setShowModal(true);
  };

  const handleDelete = (id) => {
    setConfirmModal({ isOpen: true, supplierId: id });
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      await axios.delete(`/suppliers/${confirmModal.supplierId}`);
      toast.success('Supplier deleted successfully');
      setConfirmModal({ isOpen: false, supplierId: null });
      fetchSuppliers();
    } catch (error) {
      // Error handled by axios interceptor
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return <div className="text-center">Loading...</div>;
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">Suppliers</h1>
        <p className="text-sm text-gray-600">
          Note: New suppliers should be created from the User Management page
        </p>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact Details</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Username</th>
              {isAdmin && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {suppliers.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 4 : 3} className="px-6 py-4 text-center text-gray-500">
                  No suppliers found
                </td>
              </tr>
            ) : (
              suppliers.map((supplier) => (
                <tr key={supplier._id}>
                  <td className="px-6 py-4 whitespace-nowrap">{supplier.companyName}</td>
                  <td className="px-6 py-4">{supplier.contactDetails || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{supplier.userId?.username || '-'}</td>
                  {isAdmin && (
                    <td className="px-6 py-4 whitespace-nowrap space-x-2">
                      <button
                        onClick={() => handleEdit(supplier)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(supplier._id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </td>
                  )}
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
          if (!isDeleting) {
            setConfirmModal({ isOpen: false, supplierId: null });
          }
        }}
        onConfirm={confirmDelete}
        title="Delete Supplier"
        message="Are you sure you want to delete this supplier? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
        isLoading={isDeleting}
      />

      {showModal && isAdmin && editingSupplier && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-4 sm:p-6 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl sm:text-2xl font-bold mb-4">Edit Supplier</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Company Name *</label>
                <input
                  {...register('companyName', { required: 'Company name is required' })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
                {errors.companyName && (
                  <p className="text-red-600 text-sm">{errors.companyName.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Contact Details *</label>
                <textarea
                  {...register('contactDetails', { required: 'Contact details are required' })}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows="3"
                />
                {errors.contactDetails && (
                  <p className="text-red-600 text-sm">{errors.contactDetails.message}</p>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Updating...' : 'Update'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingSupplier(null);
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
    </div>
  );
};

export default Suppliers;

