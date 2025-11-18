import { useState, useEffect, lazy, Suspense } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { formatCurrency, formatCurrencyDisplay, formatPaymentMethod, formatLocalDate } from '../utils/utils';

// Lazy load heavy libraries - only load when needed
const loadRecharts = () => import('recharts').then(module => ({
  LineChart: module.LineChart,
  Line: module.Line,
  BarChart: module.BarChart,
  Bar: module.Bar,
  XAxis: module.XAxis,
  YAxis: module.YAxis,
  CartesianGrid: module.CartesianGrid,
  Tooltip: module.Tooltip,
  Legend: module.Legend,
  ResponsiveContainer: module.ResponsiveContainer,
}));

const loadPDF = () => Promise.all([
  import('jspdf'),
  import('jspdf-autotable')
]).then(([jsPDFModule, autoTableModule]) => ({
  jsPDF: jsPDFModule.default,
  autoTable: autoTableModule.default,
}));

const loadDateFns = () => import('date-fns').then(module => ({
  format: module.format,
}));

// Chart components with lazy loading
const ChartWrapper = ({ reportType, reportData }) => {
  const [chartComponents, setChartComponents] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (reportType === 'revenue-trends' || reportType === 'top-products') {
      loadRecharts().then(components => {
        setChartComponents(components);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [reportType]);

  if (loading) {
    return <div className="flex items-center justify-center h-[300px]">Loading chart...</div>;
  }

  if (!chartComponents) return null;

  const { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } = chartComponents;

  if (reportType === 'revenue-trends' && reportData?.data) {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={reportData.data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="revenue" stroke="#8884d8" name="Revenue (₱)" />
          <Line type="monotone" dataKey="sales" stroke="#82ca9d" name="Number of Sales" />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (reportType === 'top-products' && reportData?.data) {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={reportData.data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="productName" angle={-45} textAnchor="end" height={100} />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="totalRevenue" fill="#8884d8" name="Revenue (₱)" />
          <Bar dataKey="totalQuantity" fill="#82ca9d" name="Quantity Sold" />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return null;
};

const Reports = () => {
  // Calculate default dates without date-fns
  const getDefaultStartDate = () => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return formatLocalDate(date);
  };

  const [reportType, setReportType] = useState('sales');
  const [startDate, setStartDate] = useState(getDefaultStartDate());
  const [endDate, setEndDate] = useState(formatLocalDate(new Date()));
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Clear report data when report type changes
  useEffect(() => {
    setReportData(null);
  }, [reportType]);

  const fetchReport = async () => {
    if (reportType !== 'inventory' && (!startDate || !endDate)) {
      toast.error('Please select start and end dates');
      return;
    }

    setLoading(true);
    try {
      let response;
      switch (reportType) {
        case 'sales':
          response = await axios.get(`/reports/sales?startDate=${startDate}&endDate=${endDate}`);
          break;
        case 'inventory':
          response = await axios.get('/reports/inventory');
          break;
        case 'top-products':
          response = await axios.get(`/reports/top-products?startDate=${startDate}&endDate=${endDate}&limit=10`);
          break;
        case 'revenue-trends':
          response = await axios.get(`/reports/revenue-trends?startDate=${startDate}&endDate=${endDate}&groupBy=day`);
          break;
        default:
          return;
      }
      setReportData(response.data);
    } catch (error) {
      // Error handled by axios interceptor
    } finally {
      setLoading(false);
    }
  };

  const exportSalesToPDF = async () => {
    if (!reportData || reportType !== 'sales') {
      toast.error('No sales report data available');
      return;
    }

    try {
      // Lazy load PDF libraries only when exporting
      const { jsPDF, autoTable } = await loadPDF();
      const { format } = await loadDateFns();
      
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 14;
      let yPosition = margin;

      // Title
      doc.setFontSize(18);
      doc.setFont(undefined, 'bold');
      doc.text('Sales Report', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;

      // Period
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      const periodText = reportData.period
        ? `Period: ${format(new Date(reportData.period.startDate), 'MMMM dd, yyyy')} to ${format(new Date(reportData.period.endDate), 'MMMM dd, yyyy')}`
        : `Period: ${format(new Date(startDate), 'MMMM dd, yyyy')} to ${format(new Date(endDate), 'MMMM dd, yyyy')}`;
      doc.text(periodText, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 5;

      // Generated date
      doc.text(`Generated on: ${format(new Date(), 'MMMM dd, yyyy hh:mm a')}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;

      // Summary Section
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('Summary', margin, yPosition);
      yPosition += 8;

      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      const summaryData = [
        ['Total Sales', (reportData.summary?.totalSales ?? 0).toString()],
        ['Total Revenue', formatCurrency(reportData.summary?.totalRevenue ?? 0)],
        ['Average Sale Value', formatCurrency(reportData.summary?.averageSaleValue ?? 0)],
        ['Total VAT (12%)', formatCurrency(reportData.summary?.totalVAT ?? 0)]
      ];

      autoTable(doc, {
        startY: yPosition,
        head: [['Metric', 'Value']],
        body: summaryData,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
        margin: { left: margin, right: margin },
        styles: { fontSize: 10 }
      });

      yPosition = doc.lastAutoTable.finalY + 10;

      // Transactions List
      if (reportData.data && reportData.data.length > 0) {
        // Check if we need a new page
        if (yPosition > 250) {
          doc.addPage();
          yPosition = margin;
        }

        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('Transactions', margin, yPosition);
        yPosition += 8;

        // Prepare transaction data
        const transactionsData = reportData.data.map(sale => {
          const saleDate = sale.createdAt ? format(new Date(sale.createdAt), 'MM/dd/yy HH:mm') : '-';
          const customer = sale.customerName || 'Walk-in';
          // Truncate customer name if too long
          const truncatedCustomer = customer.length > 15 ? customer.substring(0, 12) + '...' : customer;
          
          // Format items as bullet list - no truncation
          const itemsText = sale.items && sale.items.length > 0
            ? sale.items.map(item => {
                const productName = item.product?.name || 'Unknown';
                return `• ${productName} (${item.quantity}x)`;
              }).join('\n')
            : 'No items';

          // Shorten payment method
          const paymentShort = sale.paymentMethod === 'mobile_payment' ? 'Mobile' : formatPaymentMethod(sale.paymentMethod || 'cash');
          
          // Shorten admin/staff name
          const staffShort = sale.cashier?.username || '-';
          const truncatedStaff = staffShort.length > 10 ? staffShort.substring(0, 7) + '...' : staffShort;

          return [
            sale.saleNumber || '-',
            saleDate,
            truncatedCustomer,
            itemsText,
            formatCurrency(sale.subtotal || 0),
            formatCurrency(sale.tax || 0),
            formatCurrency(sale.total || 0),
            paymentShort,
            truncatedStaff
          ];
        });

        // Calculate total width to ensure it fits on page
        const pageWidth = doc.internal.pageSize.getWidth();
        const usableWidth = pageWidth - (margin * 2);
        
        autoTable(doc, {
          startY: yPosition,
          head: [['Sale #', 'Date', 'Customer', 'Items', 'Subtotal', 'Tax', 'Total', 'Payment', 'Admin/Staff']],
          body: transactionsData,
          theme: 'grid',
          headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold', fontSize: 7 },
          margin: { left: margin, right: margin },
          tableWidth: 'wrap',
          styles: { fontSize: 6, cellPadding: 1 },
          columnStyles: {
            0: { cellWidth: 18 }, // Sale #
            1: { cellWidth: 22 }, // Date
            2: { cellWidth: 20 }, // Customer
            3: { cellWidth: 45, cellMinHeight: 8 }, // Items - increased width and min height for multi-line
            4: { cellWidth: 18 }, // Subtotal
            5: { cellWidth: 15 }, // Tax
            6: { cellWidth: 18 }, // Total
            7: { cellWidth: 18 }, // Payment
            8: { cellWidth: 18 }  // Admin/Staff
          },
          didParseCell: function (data) {
            // Reduce padding for all cells
            data.cell.styles.cellPadding = { top: 1, bottom: 1, left: 1, right: 1 };
            // Enable word wrap for items column (column index 3)
            if (data.column.index === 3) {
              data.cell.styles.cellPadding = { top: 2, bottom: 2, left: 1, right: 1 };
            }
          }
        });
      }

      // Save the PDF
      const fileName = `Sales_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      doc.save(fileName);
      toast.success('Sales report exported to PDF successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to export PDF. Please try again.');
    }
  };

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">Reports & Analytics</h1>

      <div className="bg-white p-4 sm:p-6 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Report Type</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="sales">Sales Report</option>
              <option value="inventory">Inventory Report</option>
              <option value="top-products">Top Products</option>
              <option value="revenue-trends">Revenue Trends</option>
            </select>
          </div>
          {reportType !== 'inventory' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </>
          )}
          <div className="flex items-end">
            <button
              onClick={fetchReport}
              disabled={loading}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Generate Report'}
            </button>
          </div>
        </div>
      </div>

      {reportData && (
        <div className="space-y-6">
          {reportType === 'sales' && reportData?.summary && (
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <h2 className="text-xl sm:text-2xl font-bold">Sales Summary</h2>
                <button
                  onClick={exportSalesToPDF}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center gap-2 w-full sm:w-auto justify-center"
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
                  Export to PDF
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <div className="text-gray-600 text-sm">Total Sales</div>
                  <div className="text-2xl font-bold">{reportData.summary.totalSales ?? 0}</div>
                </div>
                <div>
                  <div className="text-gray-600 text-sm">Total Revenue</div>
                  <div className="text-2xl font-bold">{formatCurrencyDisplay(reportData.summary.totalRevenue ?? 0)}</div>
                </div>
                <div>
                  <div className="text-gray-600 text-sm">Average Sale</div>
                  <div className="text-2xl font-bold">{formatCurrencyDisplay(reportData.summary.averageSaleValue ?? 0)}</div>
                </div>
                <div>
                  <div className="text-gray-600 text-sm">Total VAT (12%)</div>
                  <div className="text-2xl font-bold">{formatCurrencyDisplay(reportData.summary.totalVAT ?? 0)}</div>
                </div>
              </div>
            </div>
          )}

          {reportType === 'inventory' && reportData?.summary && (
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
              <h2 className="text-xl sm:text-2xl font-bold mb-4">Inventory Summary</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <div className="text-gray-600 text-sm">Total Products</div>
                  <div className="text-2xl font-bold">{reportData.summary.totalProducts ?? 0}</div>
                </div>
                <div>
                  <div className="text-gray-600 text-sm">Total Stock Value</div>
                  <div className="text-2xl font-bold">{formatCurrencyDisplay(reportData.summary.totalStockValue ?? 0)}</div>
                </div>
                <div>
                  <div className="text-gray-600 text-sm">Low Stock Items</div>
                  <div className="text-2xl font-bold text-orange-600">{reportData.summary.lowStockCount ?? 0}</div>
                </div>
                <div>
                  <div className="text-gray-600 text-sm">Out of Stock</div>
                  <div className="text-2xl font-bold text-red-600">{reportData.summary.outOfStockCount ?? 0}</div>
                </div>
              </div>
            </div>
          )}

          {reportType === 'revenue-trends' && reportData?.data && (
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
              <h2 className="text-xl sm:text-2xl font-bold mb-4">Revenue Trends</h2>
              <Suspense fallback={<div className="flex items-center justify-center h-[300px]">Loading chart...</div>}>
                <ChartWrapper reportType="revenue-trends" reportData={reportData} />
              </Suspense>
            </div>
          )}

          {reportType === 'top-products' && reportData?.data && (
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
              <h2 className="text-xl sm:text-2xl font-bold mb-4">Top Selling Products</h2>
              <Suspense fallback={<div className="flex items-center justify-center h-[300px]">Loading chart...</div>}>
                <ChartWrapper reportType="top-products" reportData={reportData} />
              </Suspense>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Reports;

