import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, TrendingUp, Users, MessageSquare, Share2, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SocialHubNavigation } from "@/components/dashboard/SocialHubNavigation";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { Platform } from "@/types/socialhub";

const Analytics = () => {
  const [metrics, setMetrics] = useState({
    totalFollowers: 0,
    totalPosts: 0,
    totalEngagements: 0,
    totalViews: 0,
  });
  const [engagementData, setEngagementData] = useState<any[]>([]);
  const [platformData, setPlatformData] = useState<any[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("30");
  const navigate = useNavigate();

  useEffect(() => {
    loadAnalytics();
  }, [selectedPlatform, dateRange]);

  const loadAnalytics = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      // Calculate date range
      const days = parseInt(dateRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Load posts
      let postsQuery = supabase
        .from("posts")
        .select("*, interactions(*)")
        .eq("user_id", user.id)
        .gte("created_at", startDate.toISOString());

      if (selectedPlatform !== "all") {
        postsQuery = postsQuery.eq("platform", selectedPlatform);
      }

      const { data: posts, error: postsError } = await postsQuery;

      if (postsError) throw postsError;

      // Calculate metrics
      const totalPosts = posts?.length || 0;
      let totalEngagements = 0;
      let totalViews = 0;

      const platformStats: Record<string, { posts: number; engagements: number; views: number }> = {};

      posts?.forEach((post: any) => {
        const interaction = post.interactions?.[0];
        const likes = interaction?.likes || 0;
        const comments = interaction?.comments || 0;
        const shares = interaction?.shares || 0;
        const views = interaction?.views || 0;

        totalEngagements += likes + comments + shares;
        totalViews += views;

        if (!platformStats[post.platform]) {
          platformStats[post.platform] = { posts: 0, engagements: 0, views: 0 };
        }
        platformStats[post.platform].posts += 1;
        platformStats[post.platform].engagements += likes + comments + shares;
        platformStats[post.platform].views += views;
      });

      setMetrics({
        totalFollowers: 0, // Would need to fetch from platforms
        totalPosts,
        totalEngagements,
        totalViews,
      });

      // Prepare platform comparison data
      setPlatformData(
        Object.entries(platformStats).map(([platform, stats]) => ({
          platform,
          posts: stats.posts,
          engagements: stats.engagements,
          views: stats.views,
        }))
      );

      // Prepare engagement over time data (grouped by day)
      const engagementByDate: Record<string, number> = {};
      posts?.forEach((post: any) => {
        const date = new Date(post.created_at).toLocaleDateString();
        const interaction = post.interactions?.[0];
        const engagements = (interaction?.likes || 0) + (interaction?.comments || 0) + (interaction?.shares || 0);
        engagementByDate[date] = (engagementByDate[date] || 0) + engagements;
      });

      setEngagementData(
        Object.entries(engagementByDate)
          .map(([date, engagements]) => ({ date, engagements }))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      );
    } catch (error: any) {
      console.error("Error loading analytics:", error);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/home")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">Analytics</h1>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-6">
        <div className="space-y-6">
          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Platforms</SelectItem>
                <SelectItem value="Instagram">Instagram</SelectItem>
                <SelectItem value="X">X</SelectItem>
                <SelectItem value="TikTok">TikTok</SelectItem>
                <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                <SelectItem value="Facebook">Facebook</SelectItem>
                <SelectItem value="YouTube">YouTube</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Followers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.totalFollowers.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Across all platforms</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.totalPosts}</div>
                <p className="text-xs text-muted-foreground">In selected period</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Engagements</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.totalEngagements.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Likes + Comments + Shares</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Views</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.totalViews.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Across all posts</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Engagement Over Time</CardTitle>
                <CardDescription>Total engagements per day</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={engagementData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="engagements" stroke="#8884d8" name="Engagements" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Platform Comparison</CardTitle>
                <CardDescription>Engagements by platform</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={platformData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="platform" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="engagements" fill="#8884d8" name="Engagements" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Bottom Navigation - Mobile only */}
      <SocialHubNavigation />
    </div>
  );
};

export default Analytics;
