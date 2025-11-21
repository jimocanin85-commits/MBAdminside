import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { 
  Search, 
  Bell, 
  Plus, 
  Heart, 
  MessageCircle, 
  Share2, 
  Instagram, 
  Twitter, 
  Music, 
  Linkedin, 
  Facebook, 
  Youtube,
  Filter,
  BarChart3
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SocialHubNavigation } from "@/components/dashboard/SocialHubNavigation";
import type { PostWithInteraction, Platform } from "@/types/socialhub";

const platformIcons = {
  Instagram: Instagram,
  X: Twitter,
  TikTok: Music,
  LinkedIn: Linkedin,
  Facebook: Facebook,
  YouTube: Youtube,
};

const platformColors = {
  Instagram: 'bg-gradient-to-r from-purple-500 to-pink-500',
  X: 'bg-black',
  TikTok: 'bg-black',
  LinkedIn: 'bg-blue-600',
  Facebook: 'bg-blue-500',
  YouTube: 'bg-red-600',
};

const Home = () => {
  const [posts, setPosts] = useState<PostWithInteraction[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<PostWithInteraction[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [contentTypeFilter, setContentTypeFilter] = useState<string>("all");
  const navigate = useNavigate();

  useEffect(() => {
    loadPosts();
  }, []);

  useEffect(() => {
    filterPosts();
  }, [posts, searchQuery, platformFilter, contentTypeFilter]);

  const loadPosts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      // Load posts with interactions and social accounts
      const { data: postsData, error: postsError } = await supabase
        .from("posts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (postsError) throw postsError;

      // Load interactions for each post
      const postsWithInteractions = await Promise.all(
        (postsData || []).map(async (post) => {
          const { data: interaction } = await supabase
            .from("interactions")
            .select("*")
            .eq("post_id", post.id)
            .single();

          const { data: socialAccount } = await supabase
            .from("social_accounts")
            .select("*")
            .eq("user_id", user.id)
            .eq("platform", post.platform)
            .single();

          return {
            ...post,
            interaction: interaction || undefined,
            social_account: socialAccount || undefined,
          };
        })
      );

      setPosts(postsWithInteractions);
    } catch (error: any) {
      console.error("Error loading posts:", error);
      toast.error("Failed to load posts");
    }
  };

  const filterPosts = () => {
    let filtered = [...posts];

    // Platform filter
    if (platformFilter !== "all") {
      filtered = filtered.filter(post => post.platform === platformFilter);
    }

    // Content type filter
    if (contentTypeFilter !== "all") {
      filtered = filtered.filter(post => post.content_type === contentTypeFilter);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(post =>
        post.text?.toLowerCase().includes(query) ||
        post.platform.toLowerCase().includes(query)
      );
    }

    setFilteredPosts(filtered);
  };

  const PlatformIcon = ({ platform }: { platform: Platform }) => {
    const Icon = platformIcons[platform];
    return <Icon className="h-4 w-4" />;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-2xl font-bold">SocialHub</h1>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/analytics")}
                title="Analytics"
              >
                <BarChart3 className="h-5 w-5" />
              </Button>
              <ThemeToggle />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/notifications")}
                title="Notifications"
              >
                <Bell className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/account")}
                title="Account"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-6">
        {/* Search and Filters */}
        <div className="space-y-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search posts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger className="w-[140px]">
                <Filter className="h-4 w-4 mr-2" />
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

            <Select value={contentTypeFilter} onValueChange={setContentTypeFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Content Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="image">Image</SelectItem>
                <SelectItem value="video">Video</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Posts Feed */}
        <div className="space-y-4">
          {filteredPosts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground mb-4">No posts found</p>
                <Button onClick={() => navigate("/create-post")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Post
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredPosts.map((post) => {
              const Icon = platformIcons[post.platform];
              const interaction = post.interaction;
              const account = post.social_account;

              return (
                <Card key={post.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <Avatar>
                        <AvatarImage src={account?.profile_picture_url} />
                        <AvatarFallback>
                          {account?.platform_username?.[0] || post.platform[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold">
                            {account?.platform_username || `@${post.platform.toLowerCase()}`}
                          </span>
                          <Badge variant="secondary" className="gap-1">
                            <Icon className="h-3 w-3" />
                            {post.platform}
                          </Badge>
                          {post.status === 'scheduled' && (
                            <Badge variant="outline">Scheduled</Badge>
                          )}
                        </div>

                        {post.text && (
                          <p className="text-sm mb-3 whitespace-pre-wrap">{post.text}</p>
                        )}

                        {post.content_url && (
                          <div className="mb-3 rounded-lg overflow-hidden bg-muted">
                            {post.content_type === 'image' ? (
                              <img
                                src={post.content_url}
                                alt="Post content"
                                className="w-full h-auto"
                              />
                            ) : post.content_type === 'video' ? (
                              <video
                                src={post.content_url}
                                controls
                                className="w-full"
                              />
                            ) : null}
                          </div>
                        )}

                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Heart className="h-4 w-4" />
                            <span>{interaction?.likes || 0}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MessageCircle className="h-4 w-4" />
                            <span>{interaction?.comments || 0}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Share2 className="h-4 w-4" />
                            <span>{interaction?.shares || 0}</span>
                          </div>
                          <span className="ml-auto">
                            {new Date(post.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </main>

      {/* Floating Action Button - Hidden on mobile (using bottom nav) */}
      <Button
        size="lg"
        className="hidden md:flex fixed bottom-6 right-6 rounded-full h-14 w-14 shadow-lg"
        onClick={() => navigate("/create-post")}
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* Bottom Navigation - Mobile only */}
      <SocialHubNavigation />
    </div>
  );
};

export default Home;
