import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Instagram, Twitter, Music, Linkedin, Facebook, Youtube, Upload } from "lucide-react";
import { SocialHubNavigation } from "@/components/dashboard/SocialHubNavigation";
import type { Platform, ContentType, PostStatus } from "@/types/socialhub";

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

const CreatePost = () => {
  const [text, setText] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([]);
  const [contentType, setContentType] = useState<ContentType>("text");
  const [contentUrl, setContentUrl] = useState("");
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [availablePlatforms, setAvailablePlatforms] = useState<Platform[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadAvailablePlatforms();
  }, []);

  const loadAvailablePlatforms = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      const { data, error } = await supabase
        .from("social_accounts")
        .select("platform")
        .eq("user_id", user.id);

      if (error) throw error;
      setAvailablePlatforms((data || []).map((acc: any) => acc.platform));
    } catch (error: any) {
      console.error("Error loading platforms:", error);
    }
  };

  const handlePlatformToggle = (platform: Platform) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Determine content type
    if (file.type.startsWith("image/")) {
      setContentType("image");
    } else if (file.type.startsWith("video/")) {
      setContentType("video");
    }

    try {
      // Upload to Supabase Storage
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("post-media")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("post-media")
        .getPublicUrl(fileName);

      setContentUrl(publicUrl);
      toast.success("File uploaded successfully");
    } catch (error: any) {
      toast.error(`Failed to upload file: ${error.message}`);
    }
  };

  const handleSubmit = async () => {
    if (selectedPlatforms.length === 0) {
      toast.error("Please select at least one platform");
      return;
    }

    if (!text.trim() && !contentUrl) {
      toast.error("Please add text or media content");
      return;
    }

    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      const status: PostStatus = isScheduled ? "scheduled" : "draft";
      const scheduledDate = isScheduled && scheduledAt ? new Date(scheduledAt).toISOString() : null;

      // Create posts for each selected platform
      const posts = await Promise.all(
        selectedPlatforms.map(async (platform) => {
          const { data: postData, error: postError } = await supabase
            .from("posts")
            .insert({
              user_id: user.id,
              platform,
              content_type: contentType,
              content_url: contentUrl || null,
              text: text || null,
              status,
              scheduled_at: scheduledDate,
            })
            .select()
            .single();

          if (postError) throw postError;

          // Create interaction record
          await supabase
            .from("interactions")
            .insert({
              post_id: postData.id,
              likes: 0,
              comments: 0,
              shares: 0,
              views: 0,
            });

          return postData;
        })
      );

      if (status === "scheduled") {
        toast.success(`Post scheduled for ${selectedPlatforms.length} platform(s)`);
      } else {
        // In production, this would call the actual platform APIs
        toast.success(`Post created for ${selectedPlatforms.length} platform(s)`);
      }

      navigate("/home");
    } catch (error: any) {
      toast.error(`Failed to create post: ${error.message}`);
    } finally {
      setIsLoading(false);
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
            <h1 className="text-2xl font-bold">Create Post</h1>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-6 max-w-3xl">
        <div className="space-y-6">
          {/* Content Input */}
          <Card>
            <CardHeader>
              <CardTitle>Content</CardTitle>
              <CardDescription>Write your post content</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="text">Caption / Text</Label>
                <Textarea
                  id="text"
                  placeholder="What's on your mind?"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="media">Media (Image/Video)</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="media"
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileUpload}
                    className="flex-1"
                  />
                  {contentUrl && (
                    <Badge variant="secondary">
                      <Upload className="h-4 w-4 mr-1" />
                      Uploaded
                    </Badge>
                  )}
                </div>
                {contentUrl && (
                  <div className="mt-2 rounded-lg overflow-hidden">
                    {contentType === "image" ? (
                      <img src={contentUrl} alt="Preview" className="max-w-full h-auto max-h-64" />
                    ) : (
                      <video src={contentUrl} controls className="max-w-full max-h-64" />
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Platform Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Platforms</CardTitle>
              <CardDescription>Choose where to post</CardDescription>
            </CardHeader>
            <CardContent>
              {availablePlatforms.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No platforms connected</p>
                  <Button variant="outline" onClick={() => navigate("/account")}>
                    Connect Platforms
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {availablePlatforms.map((platform) => {
                    const Icon = platformIcons[platform];
                    const isSelected = selectedPlatforms.includes(platform);

                    return (
                      <Card
                        key={platform}
                        className={`cursor-pointer transition-all ${
                          isSelected ? "ring-2 ring-primary" : ""
                        }`}
                        onClick={() => handlePlatformToggle(platform)}
                      >
                        <CardContent className="p-4 flex flex-col items-center gap-2">
                          <div className={`p-3 rounded-lg ${platformColors[platform]} text-white`}>
                            <Icon className="h-6 w-6" />
                          </div>
                          <span className="text-sm font-medium">{platform}</span>
                          {isSelected && (
                            <Badge variant="default" className="text-xs">
                              Selected
                            </Badge>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Scheduling */}
          <Card>
            <CardHeader>
              <CardTitle>Schedule</CardTitle>
              <CardDescription>Post now or schedule for later</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="schedule"
                  checked={isScheduled}
                  onCheckedChange={(checked) => setIsScheduled(checked as boolean)}
                />
                <Label htmlFor="schedule" className="cursor-pointer">
                  Schedule post
                </Label>
              </div>

              {isScheduled && (
                <div className="space-y-2">
                  <Label htmlFor="scheduledAt">Date & Time</Label>
                  <Input
                    id="scheduledAt"
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-4">
            <Button variant="outline" className="flex-1" onClick={() => navigate("/home")}>
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={isLoading || selectedPlatforms.length === 0}
            >
              {isLoading
                ? "Creating..."
                : isScheduled
                ? "Schedule Post"
                : "Post Now"}
            </Button>
          </div>
        </div>
      </main>

      {/* Bottom Navigation - Mobile only */}
      <SocialHubNavigation />
    </div>
  );
};

export default CreatePost;
