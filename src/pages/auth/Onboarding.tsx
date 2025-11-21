import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Check, X, Instagram, Twitter, Music, Linkedin, Facebook, Youtube } from "lucide-react";
import type { Platform, SocialAccount } from "@/types/socialhub";

const PLATFORMS: Platform[] = ['Instagram', 'X', 'TikTok', 'LinkedIn', 'Facebook', 'YouTube'];

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

const Onboarding = () => {
  const [connectedAccounts, setConnectedAccounts] = useState<SocialAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadConnectedAccounts();
  }, []);

  const loadConnectedAccounts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      const { data, error } = await supabase
        .from("social_accounts")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;
      setConnectedAccounts(data || []);
    } catch (error: any) {
      console.error("Error loading accounts:", error);
    }
  };

  const handleConnect = async (platform: Platform) => {
    setIsLoading(true);
    try {
      // In a real app, this would initiate OAuth flow
      // For now, we'll simulate it with a mock token
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please login first");
        return;
      }

      // Check if already connected
      const existing = connectedAccounts.find(acc => acc.platform === platform);
      if (existing) {
        toast.info(`${platform} is already connected`);
        return;
      }

      // Mock OAuth flow - in production, redirect to platform OAuth
      toast.info(`Redirecting to ${platform} authorization...`);
      
      // Simulate OAuth callback with mock data
      const mockAccount: Partial<SocialAccount> = {
        user_id: user.id,
        platform,
        access_token: `mock_token_${platform.toLowerCase()}_${Date.now()}`,
        platform_username: `user_${platform.toLowerCase()}`,
      };

      const { error } = await supabase
        .from("social_accounts")
        .insert(mockAccount);

      if (error) throw error;

      toast.success(`${platform} connected successfully!`);
      await loadConnectedAccounts();
    } catch (error: any) {
      toast.error(`Failed to connect ${platform}: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async (platform: Platform) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("social_accounts")
        .delete()
        .eq("user_id", user.id)
        .eq("platform", platform);

      if (error) throw error;

      toast.success(`${platform} disconnected`);
      await loadConnectedAccounts();
    } catch (error: any) {
      toast.error(`Failed to disconnect ${platform}`);
    }
  };

  const handleContinue = () => {
    if (connectedAccounts.length === 0) {
      toast.error("Please connect at least one social media account");
      return;
    }
    navigate("/home");
  };

  const isConnected = (platform: Platform) => {
    return connectedAccounts.some(acc => acc.platform === platform);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-muted p-4">
      <div className="max-w-2xl mx-auto pt-8">
        <Card className="shadow-lg border-2">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">Connect Your Social Accounts</CardTitle>
            <CardDescription className="text-lg mt-2">
              Link your social media accounts to get started
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PLATFORMS.map((platform) => {
                const Icon = platformIcons[platform];
                const connected = isConnected(platform);
                const account = connectedAccounts.find(acc => acc.platform === platform);

                return (
                  <Card key={platform} className="relative">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-3 rounded-lg ${platformColors[platform]} text-white`}>
                            <Icon className="h-6 w-6" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{platform}</h3>
                            {account?.platform_username && (
                              <p className="text-sm text-muted-foreground">@{account.platform_username}</p>
                            )}
                          </div>
                        </div>
                        {connected ? (
                          <Badge variant="default" className="bg-green-500">
                            <Check className="h-4 w-4 mr-1" />
                            Connected
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <X className="h-4 w-4 mr-1" />
                            Not Connected
                          </Badge>
                        )}
                      </div>
                      {connected ? (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => handleDisconnect(platform)}
                          disabled={isLoading}
                        >
                          Disconnect
                        </Button>
                      ) : (
                        <Button
                          className="w-full"
                          onClick={() => handleConnect(platform)}
                          disabled={isLoading}
                        >
                          Connect
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="pt-6 border-t">
              <Button
                size="lg"
                className="w-full"
                onClick={handleContinue}
                disabled={connectedAccounts.length === 0}
              >
                Continue to SocialHub
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Onboarding;
