import { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import InputModal from '../components/InputModal';

const Inventory = () => {
  const { isAdmin, isSupplier } = useAuth();
  const [inventory, setInventory] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isUpdatingStock, setIsUpdatingStock] = useState(false);
  
  // Determine if user can update stock
  const canUpdateStock = isAdmin || isSupplier;

  useEffect(() => {
    fetchInventory();
  }, [lowStockOnly]);

  const fetchInventory = async () => {
    try {
      const response = await axios.get(`/inventory${lowStockOnly ? '?lowStock=true' : ''}`);
      setInventory(response.data.data);
      setSummary(response.data.summary || {});
    } catch (error) {
      // Error handled by axios interceptor
    } finally {
      setLoading(false);
    }
  };

  const updateStock = async (productId, quantity, operation = 'set') => {
    setIsUpdatingStock(true);
    try {
      await axios.put(`/inventory/${productId}/stock`, { quantity, operation });
      toast.success('Stock updated successfully');
      setIsModalOpen(false);
      setSelectedProduct(null);
      fetchInventory();
    } catch (error) {
      // Error handled by axios interceptor
    } finally {
      setIsUpdatingStock(false);
    }
  };

  const handleUpdateStockClick = (product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleStockUpdate = (quantity) => {
    if (selectedProduct && !isNaN(quantity) && quantity !== '') {
      updateStock(selectedProduct._id, parseInt(quantity), 'set');
    }
  };

  if (loading) {
    return <div className="text-center">Loading...</div>;
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">Inventory</h1>
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="lowStock"
            checked={lowStockOnly}
            onChange={(e) => setLowStockOnly(e.target.checked)}
            className="w-4 h-4"
          />
          <label htmlFor="lowStock" className="text-sm">Show low stock only</label>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-gray-600 text-sm">Total Products</div>
          <div className="text-3xl font-bold mt-2">{summary.totalProducts || 0}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-gray-600 text-sm">Low Stock Alerts</div>
          <div className="text-3xl font-bold mt-2 text-orange-600">
            {summary.lowStockProducts || 0}
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-gray-600 text-sm">Out of Stock</div>
          <div className="text-3xl font-bold mt-2 text-red-600">
            {summary.outOfStockProducts || 0}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Stock</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Low Stock Threshold</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              {canUpdateStock && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {inventory.length === 0 ? (
              <tr>
                <td colSpan={canUpdateStock ? 6 : 5} className="px-6 py-4 text-center text-gray-500">
                  No inventory items found
                </td>
              </tr>
            ) : (
              inventory.map((product) => {
                const isLowStock = product.stockQuantity <= product.lowStockThreshold;
                const isOutOfStock = product.stockQuantity === 0;
                
                return (
                  <tr key={product._id}>
                    <td className="px-6 py-4 whitespace-nowrap font-semibold">{product.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{product.category || '-'}</td>
                    <td className={`px-6 py-4 whitespace-nowrap font-semibold ${
                      isOutOfStock ? 'text-red-600' : isLowStock ? 'text-orange-600' : ''
                    }`}>
                      {product.stockQuantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{product.lowStockThreshold}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {isOutOfStock ? (
                        <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">Out of Stock</span>
                      ) : isLowStock ? (
                        <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs">Low Stock</span>
                      ) : (
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">In Stock</span>
                      )}
                    </td>
                    {canUpdateStock && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleUpdateStockClick(product)}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Update Stock
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        </div>
      </div>

      <InputModal
        isOpen={isModalOpen}
        onClose={() => {
          if (!isUpdatingStock) {
            setIsModalOpen(false);
            setSelectedProduct(null);
          }
        }}
        onConfirm={handleStockUpdate}
        title="Update Stock"
        message={`Update stock quantity for ${selectedProduct?.name || 'this product'}`}
        inputLabel="New Stock Quantity"
        inputType="number"
        inputPlaceholder="Enter quantity"
        confirmText="Update"
        cancelText="Cancel"
        variant="info"
        defaultValue={selectedProduct?.stockQuantity?.toString() || ''}
        isLoading={isUpdatingStock}
      />
    </div>
  );
};

export default Inventory;

