import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { formatLocalDate } from '../utils/utils';

const Dashboard = () => {
  const { isSupplier, isStaff, loading: authLoading } = useAuth();
  const [stats, setStats] = useState({
    totalProducts: 0,
    lowStockProducts: 0,
    totalSales: 0,
    totalRevenue: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Wait for auth to load before fetching dashboard data
    if (!authLoading) {
      fetchDashboardData();
    }
  }, [authLoading, isSupplier]);

  const fetchDashboardData = async () => {
    try {
      // Calculate date range for past 30 days (using local time)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 30);
      
      const startDateStr = formatLocalDate(startDate);
      const endDateStr = formatLocalDate(endDate);

      console.log('Fetching dashboard data for period:', { startDateStr, endDateStr });

      // Only fetch sales data if user is not a supplier
      const promises = [
        axios.get('/products'),
        axios.get('/inventory/alerts')
      ];

      if (!isSupplier) {
        promises.push(axios.get(`/sales?startDate=${startDateStr}&endDate=${endDateStr}`));
      }

      const results = await Promise.all(promises);
      const [productsRes, inventoryRes, salesRes] = results;

      let totalSales = 0;
      let totalRevenue = 0;

      if (!isSupplier && salesRes) {
        console.log('Sales API response:', salesRes.data);

        // Filter out voided sales for calculations only
        const allSales = salesRes.data.data || [];
        const validSales = allSales.filter(sale => !sale.isVoid);
        
        console.log('All sales:', allSales.length, 'Valid sales (non-voided):', validSales.length);
        if (allSales.length > 0) {
          console.log('Sample sale:', allSales[0]);
        }

        totalRevenue = validSales.reduce((sum, sale) => {
          const saleTotal = sale.total || 0;
          return sum + saleTotal;
        }, 0);
        totalSales = validSales.length;
      }

      setStats({
        totalProducts: productsRes.data.count || 0,
        lowStockProducts: inventoryRes.data.count || 0,
        totalSales,
        totalRevenue
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      console.error('Error details:', error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading || authLoading) {
    return <div className="text-center">Loading...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">Dashboard</h1>

      <div className={`grid grid-cols-1 sm:grid-cols-2 ${isSupplier ? 'lg:grid-cols-2' : 'lg:grid-cols-4'} gap-4 sm:gap-6 mb-6 sm:mb-8`}>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Products</p>
              <p className="text-3xl font-bold mt-2">{stats.totalProducts}</p>
            </div>
            <span className="text-4xl">📦</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Low Stock Alerts</p>
              <p className="text-3xl font-bold mt-2 text-orange-600">{stats.lowStockProducts}</p>
            </div>
            <span className="text-4xl">⚠️</span>
          </div>
        </div>

        {!isSupplier && (
          <>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Total Sales (30d)</p>
                  <p className="text-3xl font-bold mt-2">{stats.totalSales}</p>
                </div>
                <span className="text-4xl">💰</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Revenue (30d)</p>
                  <p className="text-3xl font-bold mt-2">₱{stats.totalRevenue.toFixed(2)}</p>
                </div>
                <span className="text-4xl">📈</span>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <ul className="space-y-2">
            {!isStaff && (
              <li>
                <Link to="/products" className="flex items-center space-x-2 hover:text-blue-600 transition-colors">
                  <span>📦</span>
                  <span>Manage Products</span>
                </Link>
              </li>
            )}
            {!isSupplier && (
              <li>
                <Link to="/sales" className="flex items-center space-x-2 hover:text-blue-600 transition-colors">
                  <span>💰</span>
                  <span>Process Sale</span>
                </Link>
              </li>
            )}
            <li>
              <Link to="/inventory" className="flex items-center space-x-2 hover:text-blue-600 transition-colors">
                <span>📋</span>
                <span>Check Inventory</span>
              </Link>
            </li>
          </ul>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">System Status</h2>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span>Database</span>
              <span className="text-green-600">● Connected</span>
            </div>
            <div className="flex items-center justify-between">
              <span>API</span>
              <span className="text-green-600">● Running</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

