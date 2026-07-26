import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { apiBaseUrl } from "../../config/api";
import { toast } from 'sonner@2.0.3';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Users, Calendar, CheckCircle, DollarSign, TrendingUp, Award } from 'lucide-react';
import { AdminPagination, getPaginationRange } from './AdminPagination';

interface Analytics {
  overview: {
    totalUsers: number;
    studentCount: number;
    interviewerCount: number;
    totalInterviews: number;
    scheduledInterviews: number;
    completedInterviews: number;
    activeSubscriptions: number;
    totalRevenue: number;
  };
  interviewsByDesignation: Record<string, number>;
  interviewsByMonth: Record<string, number>;
  interviewerStats: Array<{
    name: string;
    completed: number;
    avgRating: number;
  }>;
}

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];
const INTERVIEWER_STATS_PAGE_SIZE = 10;

export function AdminAnalytics() {
  const { accessToken } = useAuth();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [interviewerStatsPage, setInterviewerStatsPage] = useState(1);

  useEffect(() => {
    fetchAnalytics();
  }, [accessToken]);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(
        `/admin/analytics`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const data = await response.json();
      setAnalytics(data);
    } catch (error: any) {
      console.error('Error fetching analytics:', error);
      toast.error(error.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-gray-500">
          No analytics data available
        </CardContent>
      </Card>
    );
  }

  const { overview } = analytics;

  // Prepare data for charts
  const designationData = Object.entries(analytics.interviewsByDesignation).map(([name, value]) => ({
    name: name.split(':')[1] || name,
    value,
  }));

  const monthlyData = Object.entries(analytics.interviewsByMonth).map(([month, count]) => ({
    month,
    interviews: count,
  }));
  const interviewerStatsRange = getPaginationRange(
    interviewerStatsPage,
    analytics.interviewerStats.length,
    INTERVIEWER_STATS_PAGE_SIZE
  );
  const paginatedInterviewerStats = analytics.interviewerStats.slice(
    (interviewerStatsRange.currentPage - 1) * INTERVIEWER_STATS_PAGE_SIZE,
    interviewerStatsRange.currentPage * INTERVIEWER_STATS_PAGE_SIZE
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl mb-2">Analytics Dashboard</h2>
        <p className="text-gray-600">Overview of platform performance and statistics</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{overview.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {overview.studentCount} candidates, {overview.interviewerCount} interviewers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Total Interviews</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{overview.totalInterviews}</div>
            <p className="text-xs text-muted-foreground">
              {overview.scheduledInterviews} scheduled, {overview.completedInterviews} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Active Subscriptions</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{overview.activeSubscriptions}</div>
            <p className="text-xs text-muted-foreground">
              Currently active plans
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">₹{overview.totalRevenue}</div>
            <p className="text-xs text-muted-foreground">
              From subscriptions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Interviews Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Interview Trends
            </CardTitle>
            <CardDescription>Interviews scheduled over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="interviews" 
                  stroke="#4F46E5" 
                  strokeWidth={2}
                  name="Interviews"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Interviews by Designation */}
        <Card>
          <CardHeader>
            <CardTitle>Interviews by Designation</CardTitle>
            <CardDescription>Distribution of interviews across roles</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={designationData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {designationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Interviewer Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Interviewer Performance
          </CardTitle>
          <CardDescription>Top performing interviewers by completed interviews and ratings</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.interviewerStats.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis yAxisId="left" orientation="left" stroke="#4F46E5" />
              <YAxis yAxisId="right" orientation="right" stroke="#10B981" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="completed" fill="#4F46E5" name="Completed Interviews" />
              <Bar yAxisId="right" dataKey="avgRating" fill="#10B981" name="Average Rating" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Interviewer Stats Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Interviewer Statistics</CardTitle>
          <CardDescription>Complete breakdown of interviewer performance metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Interviewer</th>
                  <th className="text-right p-2">Completed</th>
                  <th className="text-right p-2">Avg Rating</th>
                </tr>
              </thead>
              <tbody>
                {paginatedInterviewerStats.map((stat, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="p-2">{stat.name}</td>
                    <td className="text-right p-2">{stat.completed}</td>
                    <td className="text-right p-2">
                      <span className="inline-flex items-center gap-1">
                        {stat.avgRating}
                        {Number(stat.avgRating) >= 8 && <span className="text-green-600">⭐</span>}
                      </span>
                    </td>
                  </tr>
                ))}
                {analytics.interviewerStats.length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-center p-4 text-gray-500">
                      No interviewer data available yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <AdminPagination
            page={interviewerStatsPage}
            pageSize={INTERVIEWER_STATS_PAGE_SIZE}
            totalItems={analytics.interviewerStats.length}
            onPageChange={setInterviewerStatsPage}
          />
        </CardContent>
      </Card>
    </div>
  );
}
