import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Calendar, Download, TrendingUp, Package, ShoppingCart, DollarSign } from 'lucide-react';

type TimePeriod = 'daily' | 'weekly' | 'monthly' | 'custom';

interface OrderData {
  id: string;
  customer_id: string;
  pet_id: string;
  meal_id: string;
  quantity: number;
  total_amount: number;
  status: string;
  created_at: string;
  customer?: { full_name: string; email: string };
  pet?: { name: string; breed: string; weight: number };
  meal?: { name: string; sale_price?: number };
}

interface SalesData {
  date: string;
  revenue: number;
  orders: number;
}

interface OrderStatusData {
  status: string;
  count: number;
}

interface ProductSalesData {
  name: string;
  quantity: number;
  revenue: number;
}

const STATUS_COLORS = {
  pending: '#f59e0b',
  preparing: '#3b82f6',
  ready: '#10b981',
  out_for_delivery: '#8b5cf6',
  delivered: '#22c55e',
  cancelled: '#ef4444',
};

export function ReportsManagement() {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('weekly');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [orderStatusData, setOrderStatusData] = useState<OrderStatusData[]>([]);
  const [productSalesData, setProductSalesData] = useState<ProductSalesData[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);

  useEffect(() => {
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    setStartDate(weekAgo.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      loadReportsData();
    }
  }, [startDate, endDate]);

  const adjustDateRange = (period: TimePeriod) => {
    const today = new Date();
    let start = new Date();

    switch (period) {
      case 'daily':
        start = new Date(today);
        break;
      case 'weekly':
        start = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case 'custom':
        return;
    }

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
  };

  const handleTimePeriodChange = (period: TimePeriod) => {
    setTimePeriod(period);
    adjustDateRange(period);
  };

  const loadReportsData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(
          `
          *,
          customer:profiles!orders_customer_id_fkey(full_name, email),
          pet:pets(name, breed, weight),
          meal:meals(name, sale_price)
        `
        )
        .gte('created_at', `${startDate}T00:00:00`)
        .lte('created_at', `${endDate}T23:59:59`)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setOrders(data || []);
      processAnalytics(data || []);
    } catch (error) {
      console.error('Error loading reports data:', error);
    } finally {
      setLoading(false);
    }
  };

  const processAnalytics = (ordersData: OrderData[]) => {
    const salesByDate: { [key: string]: { revenue: number; orders: number } } = {};
    const statusCount: { [key: string]: number } = {};
    const productSales: { [key: string]: { quantity: number; revenue: number } } = {};

    let revenue = 0;

    ordersData.forEach((order) => {
      const date = new Date(order.created_at).toISOString().split('T')[0];

      if (!salesByDate[date]) {
        salesByDate[date] = { revenue: 0, orders: 0 };
      }
      salesByDate[date].revenue += order.total_amount;
      salesByDate[date].orders += 1;
      revenue += order.total_amount;

      statusCount[order.status] = (statusCount[order.status] || 0) + 1;

      const mealName = order.meal?.name || 'Unknown';
      if (!productSales[mealName]) {
        productSales[mealName] = { quantity: 0, revenue: 0 };
      }
      productSales[mealName].quantity += order.quantity;
      productSales[mealName].revenue += order.total_amount;
    });

    const salesChartData: SalesData[] = Object.entries(salesByDate).map(([date, data]) => ({
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      revenue: data.revenue,
      orders: data.orders,
    }));

    const statusChartData: OrderStatusData[] = Object.entries(statusCount).map(([status, count]) => ({
      status: status.replace(/_/g, ' '),
      count,
    }));

    const productChartData: ProductSalesData[] = Object.entries(productSales)
      .map(([name, data]) => ({
        name,
        quantity: data.quantity,
        revenue: data.revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    setSalesData(salesChartData);
    setOrderStatusData(statusChartData);
    setProductSalesData(productChartData);
    setTotalRevenue(revenue);
    setTotalOrders(ordersData.length);
  };

  const exportToCSV = (reportType: string) => {
    let csvContent = '';
    let filename = '';

    switch (reportType) {
      case 'sales':
        csvContent = 'Order ID,Customer,Pet,Product,Quantity,Sale Price,Total Amount,Date\n';
        orders.forEach((order) => {
          csvContent += `${order.id},${order.customer?.full_name || 'N/A'},${order.pet?.name || 'N/A'},${
            order.meal?.name || 'N/A'
          },${order.quantity},${order.meal?.sale_price || 0},${order.total_amount},${new Date(
            order.created_at
          ).toLocaleString()}\n`;
        });
        filename = `sales_report_${startDate}_to_${endDate}.csv`;
        break;

      case 'gst':
        csvContent = 'Invoice Number,Taxable Amount,GST %,GST Amount,Total Amount,Date\n';
        orders.forEach((order, index) => {
          const taxableAmount = order.total_amount / 1.18;
          const gstAmount = order.total_amount - taxableAmount;
          csvContent += `INV-${String(index + 1).padStart(6, '0')},${taxableAmount.toFixed(2)},18%,${gstAmount.toFixed(
            2
          )},${order.total_amount},${new Date(order.created_at).toLocaleString()}\n`;
        });
        filename = `gst_sales_report_${startDate}_to_${endDate}.csv`;
        break;

      case 'orders':
        csvContent = 'Order ID,Customer,Pet,Status,Date,Payment Method,Total\n';
        orders.forEach((order) => {
          csvContent += `${order.id},${order.customer?.full_name || 'N/A'},${order.pet?.name || 'N/A'},${
            order.status
          },${new Date(order.created_at).toLocaleString()},Wallet,${order.total_amount}\n`;
        });
        filename = `orders_report_${startDate}_to_${endDate}.csv`;
        break;

      case 'items':
        csvContent = 'Product Name,Total Quantity Sold,Total Revenue,Date Range\n';
        productSalesData.forEach((product) => {
          csvContent += `${product.name},${product.quantity},${product.revenue},${startDate} to ${endDate}\n`;
        });
        filename = `items_report_${startDate}_to_${endDate}.csv`;
        break;

      case 'pets':
        csvContent = 'Pet Name,Breed,Weight,Customer,Total Orders\n';
        const petOrders: { [key: string]: number } = {};
        orders.forEach((order) => {
          const petName = order.pet?.name || 'Unknown';
          petOrders[petName] = (petOrders[petName] || 0) + 1;
        });

        const uniquePets = Array.from(
          new Map(
            orders.map((order) => [
              order.pet_id,
              {
                name: order.pet?.name || 'N/A',
                breed: order.pet?.breed || 'N/A',
                weight: order.pet?.weight || 0,
                customer: order.customer?.full_name || 'N/A',
              },
            ])
          ).values()
        );

        uniquePets.forEach((pet) => {
          csvContent += `${pet.name},${pet.breed},${pet.weight}kg,${pet.customer},${petOrders[pet.name] || 0}\n`;
        });
        filename = `pets_report_${startDate}_to_${endDate}.csv`;
        break;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  const exportToPDF = () => {
    alert('PDF export functionality requires a PDF library. For now, please use CSV export.');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <h2 className="text-2xl font-bold text-gray-900">Reports & Analytics</h2>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <button
            onClick={() => handleTimePeriodChange('daily')}
            className={`px-4 py-3 rounded-lg font-medium transition-colors ${
              timePeriod === 'daily'
                ? 'bg-orange-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Daily
          </button>
          <button
            onClick={() => handleTimePeriodChange('weekly')}
            className={`px-4 py-3 rounded-lg font-medium transition-colors ${
              timePeriod === 'weekly'
                ? 'bg-orange-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Weekly
          </button>
          <button
            onClick={() => handleTimePeriodChange('monthly')}
            className={`px-4 py-3 rounded-lg font-medium transition-colors ${
              timePeriod === 'monthly'
                ? 'bg-orange-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => handleTimePeriodChange('custom')}
            className={`px-4 py-3 rounded-lg font-medium transition-colors ${
              timePeriod === 'custom'
                ? 'bg-orange-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Custom Range
          </button>
        </div>

        {timePeriod === 'custom' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
        )}

        <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Calendar className="w-4 h-4" />
            <span>
              {new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}
            </span>
          </div>
          <button
            onClick={loadReportsData}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            Refresh Data
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="p-3 bg-green-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
          <p className="text-2xl font-bold text-gray-900">₹{totalRevenue.toFixed(2)}</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="p-3 bg-blue-100 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-1">Total Orders</p>
          <p className="text-2xl font-bold text-gray-900">{totalOrders}</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="p-3 bg-orange-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-1">Average Order Value</p>
          <p className="text-2xl font-bold text-gray-900">
            ₹{totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : '0.00'}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Package className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-1">Products Sold</p>
          <p className="text-2xl font-bold text-gray-900">{productSalesData.length}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Revenue Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={salesData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={2} name="Revenue (₹)" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Order Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={orderStatusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.status}: ${entry.count}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {orderStatusData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={STATUS_COLORS[entry.status.replace(/ /g, '_') as keyof typeof STATUS_COLORS] || '#94a3b8'}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Top Selling Products</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={productSalesData.slice(0, 5)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="revenue" fill="#f97316" name="Revenue (₹)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Downloadable Reports</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 border border-gray-200 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Sales Report</h4>
            <p className="text-sm text-gray-600 mb-3">
              Complete sales details with customer, product, and pricing information
            </p>
            <div className="flex space-x-2">
              <button
                onClick={() => exportToCSV('sales')}
                className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm"
              >
                <Download className="w-4 h-4" />
                <span>CSV</span>
              </button>
              <button
                onClick={exportToPDF}
                className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm"
              >
                <Download className="w-4 h-4" />
                <span>PDF</span>
              </button>
            </div>
          </div>

          <div className="p-4 border border-gray-200 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">GST Sales Report</h4>
            <p className="text-sm text-gray-600 mb-3">Invoice-wise GST breakdown with tax calculations</p>
            <div className="flex space-x-2">
              <button
                onClick={() => exportToCSV('gst')}
                className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm"
              >
                <Download className="w-4 h-4" />
                <span>CSV</span>
              </button>
              <button
                onClick={exportToPDF}
                className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm"
              >
                <Download className="w-4 h-4" />
                <span>PDF</span>
              </button>
            </div>
          </div>

          <div className="p-4 border border-gray-200 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Order Report</h4>
            <p className="text-sm text-gray-600 mb-3">Order status and payment details by date</p>
            <div className="flex space-x-2">
              <button
                onClick={() => exportToCSV('orders')}
                className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm"
              >
                <Download className="w-4 h-4" />
                <span>CSV</span>
              </button>
              <button
                onClick={exportToPDF}
                className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm"
              >
                <Download className="w-4 h-4" />
                <span>PDF</span>
              </button>
            </div>
          </div>

          <div className="p-4 border border-gray-200 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Item-wise Report</h4>
            <p className="text-sm text-gray-600 mb-3">Product performance with quantity and revenue</p>
            <div className="flex space-x-2">
              <button
                onClick={() => exportToCSV('items')}
                className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm"
              >
                <Download className="w-4 h-4" />
                <span>CSV</span>
              </button>
              <button
                onClick={exportToPDF}
                className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm"
              >
                <Download className="w-4 h-4" />
                <span>PDF</span>
              </button>
            </div>
          </div>

          <div className="p-4 border border-gray-200 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Pet Report</h4>
            <p className="text-sm text-gray-600 mb-3">Pet details with associated orders and customers</p>
            <div className="flex space-x-2">
              <button
                onClick={() => exportToCSV('pets')}
                className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm"
              >
                <Download className="w-4 h-4" />
                <span>CSV</span>
              </button>
              <button
                onClick={exportToPDF}
                className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm"
              >
                <Download className="w-4 h-4" />
                <span>PDF</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
