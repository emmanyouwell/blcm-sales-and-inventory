import { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { useForm, Controller } from 'react-hook-form';
import Select from 'react-select';
import ConfirmModal from '../components/ConfirmModal';

const Products = () => {
  const { isAdmin, isSupplier } = useAuth();
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, productId: null });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm();
  
  // Determine if user can add/edit products
  const canManageProducts = isAdmin || isSupplier;

  useEffect(() => {
    fetchProducts();
    fetchSuppliers();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get('/products');
      setProducts(response.data.data);
    } catch (error) {
      // Error handled by axios interceptor
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      // Only fetch suppliers if user is admin (suppliers don't need the dropdown)
      if (isAdmin) {
        const response = await axios.get('/suppliers?isActive=true');
        setSuppliers(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch suppliers');
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get('/categories?isActive=true');
      setCategories(response.data.data);
    } catch (error) {
      console.error('Failed to fetch categories');
    }
  };

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      const productData = {
        ...data,
        price: parseFloat(data.price),
        stockQuantity: parseInt(data.stockQuantity),
        lowStockThreshold: parseInt(data.lowStockThreshold) || 10,
        category: data.category || undefined // Ensure category is a string or undefined
      };

      // For suppliers, don't send supplier field - backend will auto-set it
      if (isSupplier) {
        delete productData.supplier;
      }

      if (editingProduct) {
        await axios.put(`/products/${editingProduct._id}`, productData);
        toast.success('Product updated successfully');
      } else {
        await axios.post('/products', productData);
        toast.success('Product created successfully');
      }
      setShowModal(false);
      setEditingProduct(null);
      reset();
      fetchProducts();
    } catch (error) {
      // Error handled by axios interceptor
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    // Fetch categories again in case new ones were added
    fetchCategories();
    const categoryName = typeof product.category === 'string' ? product.category : product.category?.value || product.category;
    const categoryOption = categories.find(cat => cat.name === categoryName);
    
    const formData = {
      ...product,
      category: categoryName || ''
    };
    
    // Only set supplier field for admins
    if (isAdmin) {
      formData.supplier = product.supplier?._id || product.supplier;
    }
    
    reset(formData);
    setShowModal(true);
  };

  const handleDelete = (id) => {
    setConfirmModal({ isOpen: true, productId: id });
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      await axios.delete(`/products/${confirmModal.productId}`);
      toast.success('Product deleted successfully');
      setConfirmModal({ isOpen: false, productId: null });
      fetchProducts();
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
        <h1 className="text-2xl sm:text-3xl font-bold">Products</h1>
        {canManageProducts && (
          <button
            onClick={() => {
              setEditingProduct(null);
              reset();
              fetchCategories(); // Refresh categories when opening modal
              setShowModal(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 w-full sm:w-auto"
          >
            Add Product
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
              {isAdmin && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>}
              {canManageProducts && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {products.length === 0 ? (
              <tr>
                <td colSpan={isAdmin && canManageProducts ? 6 : isAdmin ? 5 : canManageProducts ? 5 : 4} className="px-6 py-4 text-center text-gray-500">
                  No products found
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product._id}>
                  <td className="px-6 py-4 whitespace-nowrap">{product.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{product.category || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">${product.price.toFixed(2)}</td>
                  <td className={`px-6 py-4 whitespace-nowrap ${
                    product.stockQuantity <= product.lowStockThreshold ? 'text-orange-600 font-semibold' : ''
                  }`}>
                    {product.stockQuantity}
                  </td>
                  {isAdmin && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      {product.supplier?.companyName || '-'}
                    </td>
                  )}
                  {canManageProducts && (
                    <td className="px-6 py-4 whitespace-nowrap space-x-2">
                      <button
                        onClick={() => handleEdit(product)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Edit
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(product._id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      )}
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
            setConfirmModal({ isOpen: false, productId: null });
          }
        }}
        onConfirm={confirmDelete}
        title="Delete Product"
        message="Are you sure you want to delete this product? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
        isLoading={isDeleting}
      />

      {showModal && canManageProducts && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-4 sm:p-6 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl sm:text-2xl font-bold mb-4">
              {editingProduct ? 'Edit Product' : 'Add Product'}
            </h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <input
                  {...register('name', { required: 'Product name is required' })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
                {errors.name && (
                  <p className="text-red-600 text-sm">{errors.name.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  {...register('description')}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows="3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <Controller
                  name="category"
                  control={control}
                  render={({ field }) => {
                    const categoryOptions = categories.map(cat => ({
                      value: cat.name,
                      label: cat.name
                    }));

                    return (
                      <Select
                        {...field}
                        options={categoryOptions}
                        isClearable
                        isSearchable
                        placeholder="Select or search for a category"
                        className="react-select-container"
                        classNamePrefix="react-select"
                        value={categoryOptions.find(option => option.value === field.value) || null}
                        onChange={(selectedOption) => {
                          field.onChange(selectedOption ? selectedOption.value : '');
                        }}
                        styles={{
                          control: (base) => ({
                            ...base,
                            minHeight: '42px',
                            borderColor: errors.category ? '#ef4444' : base.borderColor,
                            '&:hover': {
                              borderColor: errors.category ? '#ef4444' : base.borderColor
                            }
                          })
                        }}
                      />
                    );
                  }}
                />
                {errors.category && (
                  <p className="text-red-600 text-sm mt-1">{errors.category.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Price *</label>
                <input
                  {...register('price', {
                    required: 'Price is required',
                    min: { value: 0, message: 'Price must be positive' }
                  })}
                  type="number"
                  step="0.01"
                  className="w-full px-3 py-2 border rounded-lg"
                />
                {errors.price && (
                  <p className="text-red-600 text-sm">{errors.price.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Stock Quantity *</label>
                <input
                  {...register('stockQuantity', {
                    required: 'Stock quantity is required',
                    min: { value: 0, message: 'Stock cannot be negative' }
                  })}
                  type="number"
                  className="w-full px-3 py-2 border rounded-lg"
                />
                {errors.stockQuantity && (
                  <p className="text-red-600 text-sm">{errors.stockQuantity.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Low Stock Threshold</label>
                <input
                  {...register('lowStockThreshold', { min: 0 })}
                  type="number"
                  defaultValue={10}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              {isAdmin && (
                <div>
                  <label className="block text-sm font-medium mb-1">Supplier *</label>
                  <select
                    {...register('supplier', { required: isAdmin ? 'Supplier is required' : false })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">Select supplier</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier._id} value={supplier._id}>
                        {supplier.companyName}
                      </option>
                    ))}
                  </select>
                  {errors.supplier && (
                    <p className="text-red-600 text-sm">{errors.supplier.message}</p>
                  )}
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (editingProduct ? 'Updating...' : 'Creating...') : (editingProduct ? 'Update' : 'Create')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingProduct(null);
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

export default Products;

