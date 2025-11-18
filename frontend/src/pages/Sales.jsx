import { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { useForm } from 'react-hook-form';
import ConfirmModal from '../components/ConfirmModal';
import { formatCurrencyDisplay, formatCurrency, formatDate, formatPaymentMethod } from '../utils/utils';

const Sales = () => {
  const { isStaff, isAdmin } = useAuth();
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [cart, setCart] = useState([]);
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [saleToVoid, setSaleToVoid] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVoiding, setIsVoiding] = useState(false);
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm();

  useEffect(() => {
    fetchSales();
    fetchProducts();
  }, []);

  const fetchSales = async () => {
    try {
      const response = await axios.get('/sales');
      setSales(response.data.data);
    } catch (error) {
      // Error handled by axios interceptor
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await axios.get('/products?isActive=true');
      setProducts(response.data.data);
    } catch (error) {
      console.error('Failed to fetch products');
    }
  };

  const addToCart = (product) => {
    const existingItem = cart.find(item => item.product._id === product._id);
    if (existingItem) {
      setCart(cart.map(item =>
        item.product._id === product._id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { product, quantity: 1, price: product.price }]);
    }
  };

  const updateCartQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      setCart(cart.filter(item => item.product._id !== productId));
    } else {
      setCart(cart.map(item =>
        item.product._id === productId
          ? { ...item, quantity }
          : item
      ));
    }
  };

  const calculateTotal = () => {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const vatRate = 0.12; // 12% VAT
    const vat = subtotal * vatRate;
    const total = subtotal + vat;
    return {
      subtotal,
      discount: 0,
      vat,
      total
    };
  };

  const onSubmit = async (data) => {
    if (cart.length === 0) {
      toast.error('Please add items to cart');
      return;
    }

    setIsSubmitting(true);
    try {
      const totals = calculateTotal();
      const saleData = {
        ...data,
        items: cart.map(item => ({
          product: item.product._id,
          quantity: item.quantity
        })),
        subtotal: totals.subtotal,
        discount: 0,
        tax: totals.vat,
        total: totals.total
      };

      await axios.post('/sales', saleData);
      toast.success('Sale processed successfully!');
      setShowModal(false);
      setCart([]);
      reset();
      fetchSales();
    } catch (error) {
      // Error handled by axios interceptor
    } finally {
      setIsSubmitting(false);
    }
  };

  const reset = () => {
    setCart([]);
    setValue('customerName', '');
    setValue('customerEmail', '');
    setValue('customerPhone', '');
    setValue('paymentMethod', 'cash');
  };

  const handleVoidClick = (sale) => {
    setSaleToVoid(sale);
    setShowVoidModal(true);
  };

  const handleVoidConfirm = async () => {
    if (!saleToVoid) return;

    setIsVoiding(true);
    try {
      await axios.patch(`/sales/${saleToVoid._id}/void`);
      toast.success('Sale voided successfully. Stock quantities have been restored.');
      setShowVoidModal(false);
      setSaleToVoid(null);
      fetchSales();
    } catch (error) {
      // Error handled by axios interceptor
    } finally {
      setIsVoiding(false);
    }
  };

  const handleViewReceipt = async (sale) => {
    try {
      // Fetch full sale details with populated product data
      const response = await axios.get(`/sales/${sale._id}`);
      setSelectedSale(response.data.data);
      setShowReceiptModal(true);
    } catch (error) {
      // Error handled by axios interceptor
    }
  };

  const exportReceiptToPDF = async () => {
    if (!selectedSale) {
      toast.error('No receipt data available');
      return;
    }

    try {
      // Dynamically import PDF library
      const { default: jsPDF } = await import('jspdf');
      const { format } = await import('date-fns');

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 14;
      let yPosition = margin;

      // Header - matching modal style
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text('BLCM Sales and Inventory System', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 6;
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text('Sales Receipt', pageWidth / 2, yPosition, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      yPosition += 8;

      // Draw a line separator
      doc.setLineWidth(0.2);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 8;

      // Receipt Details - matching modal flex justify-between style
      doc.setFontSize(9);
      const saleNumberLabel = 'Sale Number:';
      const saleNumberValue = selectedSale.saleNumber;
      doc.text(saleNumberLabel, margin, yPosition);
      doc.text(saleNumberValue, pageWidth - margin, yPosition, { align: 'right' });
      yPosition += 6;
      
      const transactionDate = new Date(selectedSale.createdAt);
      const dateLabel = 'Transaction Date:';
      const dateValue = transactionDate.toLocaleString();
      doc.text(dateLabel, margin, yPosition);
      doc.text(dateValue, pageWidth - margin, yPosition, { align: 'right' });
      yPosition += 10;

      // Customer Details Section - matching modal border-t style
      doc.setLineWidth(0.2);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 8;
      
      doc.setFont(undefined, 'bold');
      doc.setFontSize(10);
      doc.text('Customer Details', margin, yPosition);
      yPosition += 8;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      
      if (selectedSale.customerName) {
        doc.setTextColor(100, 100, 100);
        doc.text('Name:', margin, yPosition);
        doc.setTextColor(0, 0, 0);
        doc.text(selectedSale.customerName, pageWidth - margin, yPosition, { align: 'right' });
        yPosition += 6;
      }
      if (selectedSale.customerEmail) {
        doc.setTextColor(100, 100, 100);
        doc.text('Email:', margin, yPosition);
        doc.setTextColor(0, 0, 0);
        doc.text(selectedSale.customerEmail, pageWidth - margin, yPosition, { align: 'right' });
        yPosition += 6;
      }
      if (selectedSale.customerPhone) {
        doc.setTextColor(100, 100, 100);
        doc.text('Phone:', margin, yPosition);
        doc.setTextColor(0, 0, 0);
        doc.text(selectedSale.customerPhone, pageWidth - margin, yPosition, { align: 'right' });
        yPosition += 6;
      }
      if (!selectedSale.customerName && !selectedSale.customerEmail && !selectedSale.customerPhone) {
        doc.setTextColor(100, 100, 100);
        doc.text('Walk-in Customer', margin, yPosition);
        doc.setTextColor(0, 0, 0);
        yPosition += 6;
      }
      yPosition += 4;

      // Items Section - matching modal table style
      doc.setLineWidth(0.2);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 8;
      
      doc.setFont(undefined, 'bold');
      doc.setFontSize(10);
      doc.text('Items', margin, yPosition);
      yPosition += 8;
      
      // Table headers
      doc.setFontSize(8);
      doc.setFont(undefined, 'bold');
      const col1 = margin;
      const col2 = margin + 80;
      const col3 = margin + 120;
      const col4 = pageWidth - margin;
      
      doc.text('Item', col1, yPosition);
      doc.text('Qty', col2, yPosition, { align: 'center' });
      doc.text('Price', col3, yPosition, { align: 'right' });
      doc.text('Subtotal', col4, yPosition, { align: 'right' });
      yPosition += 6;
      
      // Draw line under headers
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 6;
      
      // Items rows
      doc.setFont(undefined, 'normal');
      selectedSale.items.forEach((item) => {
        const productName = item.product?.name || 'Unknown Product';
        const quantity = item.quantity || 0;
        const price = item.price || item.product?.price || 0;
        const subtotal = item.subtotal || (price * quantity);
        
        // Check if we need a new page
        if (yPosition > 250) {
          doc.addPage();
          yPosition = margin;
        }

        // Truncate product name if too long
        const maxNameWidth = 70;
        let displayName = productName;
        if (doc.getTextWidth(productName) > maxNameWidth) {
          while (doc.getTextWidth(displayName + '...') > maxNameWidth && displayName.length > 0) {
            displayName = displayName.slice(0, -1);
          }
          displayName += '...';
        }
        
        doc.text(displayName, col1, yPosition);
        doc.text(quantity.toString(), col2, yPosition, { align: 'center' });
        doc.text(formatCurrency(price), col3, yPosition, { align: 'right' });
        doc.setFont(undefined, 'bold');
        doc.text(formatCurrency(subtotal), col4, yPosition, { align: 'right' });
        doc.setFont(undefined, 'normal');
        yPosition += 6;
      });

      yPosition += 6;

      // Totals Section - matching modal border-t style
      doc.setLineWidth(0.2);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 8;
      
      doc.setFontSize(9);
      doc.text('Subtotal:', margin, yPosition);
      doc.text(formatCurrency(selectedSale.subtotal), pageWidth - margin, yPosition, { align: 'right' });
      yPosition += 7;
      
      if (selectedSale.discount > 0) {
        doc.text('Discount:', margin, yPosition);
        doc.text(formatCurrency(selectedSale.discount), pageWidth - margin, yPosition, { align: 'right' });
        yPosition += 7;
      }
      
      doc.text('Tax (VAT):', margin, yPosition);
      doc.text(formatCurrency(selectedSale.tax), pageWidth - margin, yPosition, { align: 'right' });
      yPosition += 7;
      
      // Total with border-t style
      doc.setLineWidth(0.2);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 8;
      
      doc.setFont(undefined, 'bold');
      doc.setFontSize(12);
      doc.text('Total:', margin, yPosition);
      doc.text(formatCurrency(selectedSale.total), pageWidth - margin, yPosition, { align: 'right' });
      yPosition += 10;

      // Payment Method Section - matching modal border-t style
      doc.setLineWidth(0.2);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 8;
      
      doc.setFont(undefined, 'bold');
      doc.setFontSize(9);
      doc.text('Payment Method:', margin, yPosition);
      doc.setFont(undefined, 'normal');
      const paymentMethod = formatPaymentMethod(selectedSale.paymentMethod);
      doc.text(paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1), pageWidth - margin, yPosition, { align: 'right' });
      yPosition += 10;

      // Status (if voided)
      if (selectedSale.isVoid) {
        doc.setLineWidth(0.2);
        doc.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += 8;
        doc.setFillColor(254, 226, 226);
        doc.roundedRect(margin, yPosition - 4, pageWidth - (margin * 2), 8, 2, 2, 'F');
        doc.setTextColor(220, 38, 38);
        doc.setFont(undefined, 'bold');
        doc.text('VOIDED', pageWidth / 2, yPosition, { align: 'center' });
        doc.setTextColor(0, 0, 0);
        yPosition += 10;
      }

      // Footer - matching modal style
      doc.setLineWidth(0.2);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 8;
      
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text('Thank you for your purchase!', pageWidth / 2, yPosition, { align: 'center' });
      doc.setTextColor(0, 0, 0);

      // Save the PDF
      const fileName = `Receipt_${selectedSale.saleNumber}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      doc.save(fileName);
      toast.success('Receipt exported to PDF successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to export PDF. Please try again.');
    }
  };

  if (loading) {
    return <div className="text-center">Loading...</div>;
  }

  const totals = calculateTotal();

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">Sales</h1>
        {(isStaff || isAdmin) && (
          <button
            onClick={() => {
              reset();
              setShowModal(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 w-full sm:w-auto"
          >
            New Sale
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sale Number</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sales.length === 0 ? (
              <tr>
                <td colSpan="8" className="px-6 py-4 text-center text-gray-500">
                  No sales found
                </td>
              </tr>
            ) : (
              sales.map((sale) => (
                <tr key={sale._id} className={sale.isVoid ? 'bg-gray-100 opacity-75' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleViewReceipt(sale)}
                      className="font-semibold text-blue-600 hover:text-blue-800 hover:underline transition-colors cursor-pointer"
                    >
                      {sale.saleNumber}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{sale.customerName || 'Walk-in'}</td>
                  <td className="px-6 py-4">{sale.items.length} item(s)</td>
                  <td className="px-6 py-4 whitespace-nowrap font-semibold">{formatCurrencyDisplay(sale.total)}</td>
                  <td className="px-6 py-4 whitespace-nowrap capitalize">{sale.paymentMethod}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {sale.isVoid ? (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                        Void
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {formatDate(sale.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {(isStaff || isAdmin) && !sale.isVoid && (
                      <button
                        onClick={() => handleVoidClick(sale)}
                        className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                      >
                        Void
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

      {showModal && (isStaff || isAdmin) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-4 sm:p-6 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl sm:text-2xl font-bold mb-4">New Sale</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Customer Name</label>
                  <input
                    {...register('customerName')}
                    type="text"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter customer name (optional)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Payment Method *</label>
                  <select
                    {...register('paymentMethod', { required: 'Payment method is required' })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="mobile_payment">Mobile Payment</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Customer Email *</label>
                  <input
                    {...register('customerEmail', {
                      required: 'Customer email is required',
                      pattern: {
                        value: /^\S+@\S+\.\S+$/,
                        message: 'Please enter a valid email address'
                      }
                    })}
                    type="email"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter customer email"
                  />
                  {errors.customerEmail && (
                    <p className="text-red-500 text-xs mt-1">{errors.customerEmail.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Customer Phone *</label>
                  <input
                    {...register('customerPhone', {
                      required: 'Customer phone is required',
                      pattern: {
                        value: /^\d+$/,
                        message: 'Phone number must contain only digits'
                      },
                      maxLength: {
                        value: 11,
                        message: 'Phone number must not exceed 11 digits'
                      },
                      validate: (value) => {
                        if (value && value.length > 11) {
                          return 'Phone number must not exceed 11 digits';
                        }
                        return true;
                      }
                    })}
                    type="tel"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter customer phone (max 11 digits)"
                    onInput={(e) => {
                      // Only allow digits and limit to 11
                      e.target.value = e.target.value.replace(/\D/g, '').slice(0, 11);
                    }}
                  />
                  {errors.customerPhone && (
                    <p className="text-red-500 text-xs mt-1">{errors.customerPhone.message}</p>
                  )}
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">Add Products</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                  {products.filter(p => p.stockQuantity > 0).map((product) => (
                    <button
                      key={product._id}
                      type="button"
                      onClick={() => addToCart(product)}
                      className="text-left p-2 border rounded hover:bg-gray-50"
                    >
                      <div className="font-semibold">{product.name}</div>
                      <div className="text-sm text-gray-600">{formatCurrencyDisplay(product.price)}</div>
                      <div className="text-xs text-gray-500">Stock: {product.stockQuantity}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">Cart</h3>
                {cart.length === 0 ? (
                  <p className="text-gray-500">No items in cart</p>
                ) : (
                  <div className="space-y-2">
                    {cart.map((item) => (
                      <div key={item.product._id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div>
                          <div className="font-semibold">{item.product.name}</div>
                          <div className="text-sm text-gray-600">{formatCurrencyDisplay(item.price)} each</div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => updateCartQuantity(item.product._id, item.quantity - 1)}
                            className="px-2 py-1 bg-gray-200 rounded"
                          >
                            -
                          </button>
                          <span className="w-12 text-center">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateCartQuantity(item.product._id, item.quantity + 1)}
                            disabled={item.quantity >= item.product.stockQuantity}
                            className="px-2 py-1 bg-gray-200 rounded disabled:opacity-50"
                          >
                            +
                          </button>
                          <span className="w-20 text-right font-semibold">
                            {formatCurrencyDisplay(item.price * item.quantity)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between mb-2">
                  <span>Subtotal:</span>
                  <span>{formatCurrencyDisplay(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span>VAT (12%):</span>
                  <span>{formatCurrencyDisplay(totals.vat)}</span>
                </div>
                <div className="flex justify-between text-xl font-bold border-t pt-2">
                  <span>Total:</span>
                  <span>{formatCurrencyDisplay(totals.total)}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Processing...' : 'Process Sale'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
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

      <ConfirmModal
        isOpen={showVoidModal}
        onClose={() => {
          if (!isVoiding) {
            setShowVoidModal(false);
            setSaleToVoid(null);
          }
        }}
        onConfirm={handleVoidConfirm}
        title="Void Sale"
        message={`Are you sure you want to void sale ${saleToVoid?.saleNumber}? This will restore the stock quantities and exclude this sale from revenue reports. This action cannot be undone.`}
        confirmText="Void Sale"
        cancelText="Cancel"
        variant="warning"
        isLoading={isVoiding}
      />

      {/* Receipt Modal */}
      {showReceiptModal && selectedSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold">Digital Receipt</h2>
              <div className="flex gap-2">
                <button
                  onClick={exportReceiptToPDF}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Export PDF
                </button>
                <button
                  onClick={() => {
                    setShowReceiptModal(false);
                    setSelectedSale(null);
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Header */}
              <div className="text-center border-b pb-4">
                <h3 className="text-xl font-bold mb-2">BLCM Sales and Inventory System</h3>
                <p className="text-sm text-gray-600">Digital Receipt</p>
              </div>

              {/* Receipt Details */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="font-semibold">Sale Number:</span>
                  <span>{selectedSale.saleNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">Transaction Date:</span>
                  <span>{new Date(selectedSale.createdAt).toLocaleString()}</span>
                </div>
              </div>

              {/* Customer Details */}
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Customer Details</h4>
                <div className="space-y-2 text-sm">
                  {selectedSale.customerName ? (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Name:</span>
                      <span>{selectedSale.customerName}</span>
                    </div>
                  ) : null}
                  {selectedSale.customerEmail ? (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Email:</span>
                      <span>{selectedSale.customerEmail}</span>
                    </div>
                  ) : null}
                  {selectedSale.customerPhone ? (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Phone:</span>
                      <span>{selectedSale.customerPhone}</span>
                    </div>
                  ) : null}
                  {!selectedSale.customerName && !selectedSale.customerEmail && !selectedSale.customerPhone && (
                    <div className="text-gray-600">Walk-in Customer</div>
                  )}
                </div>
              </div>

              {/* Items */}
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Items</h4>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-semibold">Item</th>
                        <th className="px-4 py-2 text-center text-sm font-semibold">Qty</th>
                        <th className="px-4 py-2 text-right text-sm font-semibold">Price</th>
                        <th className="px-4 py-2 text-right text-sm font-semibold">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {selectedSale.items.map((item, index) => {
                        const productName = item.product?.name || 'Unknown Product';
                        const quantity = item.quantity || 0;
                        const price = item.price || item.product?.price || 0;
                        const subtotal = item.subtotal || (price * quantity);
                        
                        return (
                          <tr key={index}>
                            <td className="px-4 py-2">{productName}</td>
                            <td className="px-4 py-2 text-center">{quantity}</td>
                            <td className="px-4 py-2 text-right">{formatCurrencyDisplay(price)}</td>
                            <td className="px-4 py-2 text-right font-semibold">{formatCurrencyDisplay(subtotal)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals */}
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrencyDisplay(selectedSale.subtotal)}</span>
                </div>
                {selectedSale.discount > 0 && (
                  <div className="flex justify-between">
                    <span>Discount:</span>
                    <span>{formatCurrencyDisplay(selectedSale.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Tax (VAT):</span>
                  <span>{formatCurrencyDisplay(selectedSale.tax)}</span>
                </div>
                <div className="flex justify-between text-xl font-bold border-t pt-2 mt-2">
                  <span>Total:</span>
                  <span>{formatCurrencyDisplay(selectedSale.total)}</span>
                </div>
              </div>

              {/* Payment Method */}
              <div className="border-t pt-4">
                <div className="flex justify-between">
                  <span className="font-semibold">Payment Method:</span>
                  <span className="capitalize">{formatPaymentMethod(selectedSale.paymentMethod)}</span>
                </div>
              </div>

              {/* Status */}
              {selectedSale.isVoid && (
                <div className="border-t pt-4">
                  <div className="bg-red-100 text-red-800 px-4 py-2 rounded text-center font-semibold">
                    VOIDED
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="border-t pt-4 text-center text-sm text-gray-600">
                <p>Thank you for your purchase!</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sales;

