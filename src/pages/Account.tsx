import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Instagram, Twitter, Music, Linkedin, Facebook, Youtube, LogOut, Settings, Trash2 } from "lucide-react";
import { SocialHubNavigation } from "@/components/dashboard/SocialHubNavigation";
import type { SocialAccount, Platform } from "@/types/socialhub";

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

const Account = () => {
  const [user, setUser] = useState<any>(null);
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
  const [pushNotifications, setPushNotifications] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        navigate("/login");
        return;
      }

      setUser(authUser);

      // Load user profile
      const { data: profile } = await supabase
        .from("users")
        .select("*")
        .eq("id", authUser.id)
        .single();

      if (profile) {
        setUser({ ...authUser, ...profile });
      }

      // Load social accounts
      const { data: accounts, error } = await supabase
        .from("social_accounts")
        .select("*")
        .eq("user_id", authUser.id);

      if (error) throw error;
      setSocialAccounts(accounts || []);
    } catch (error: any) {
      console.error("Error loading user data:", error);
    }
  };

  const handleDisconnect = async (platform: Platform) => {
    try {
      const { error } = await supabase
        .from("social_accounts")
        .delete()
        .eq("user_id", user.id)
        .eq("platform", platform);

      if (error) throw error;

      toast.success(`${platform} disconnected`);
      await loadUserData();
    } catch (error: any) {
      toast.error(`Failed to disconnect ${platform}`);
    }
  };

  const handleReconnect = async (platform: Platform) => {
    toast.info(`Redirecting to ${platform} authorization...`);
    // In production, this would initiate OAuth flow
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Logged out successfully");
      navigate("/login");
    } catch (error: any) {
      toast.error("Failed to logout");
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
            <h1 className="text-2xl font-bold">Account & Settings</h1>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-6 max-w-3xl">
        <div className="space-y-6">
          {/* Profile Section */}
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Your account information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="text-lg">
                    {user?.email?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-lg">{user?.username || "User"}</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Connected Accounts */}
          <Card>
            <CardHeader>
              <CardTitle>Connected Accounts</CardTitle>
              <CardDescription>Manage your social media connections</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {socialAccounts.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No accounts connected</p>
                  <Button onClick={() => navigate("/onboarding")}>
                    Connect Accounts
                  </Button>
                </div>
              ) : (
                socialAccounts.map((account) => {
                  const Icon = platformIcons[account.platform];
                  const isExpired = account.expires_at && new Date(account.expires_at) < new Date();

                  return (
                    <div
                      key={account.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-lg ${platformColors[account.platform]} text-white`}>
                          <Icon className="h-6 w-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">{account.platform}</p>
                            {isExpired && (
                              <Badge variant="destructive">Expired</Badge>
                            )}
                          </div>
                          {account.platform_username && (
                            <p className="text-sm text-muted-foreground">
                              @{account.platform_username}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {isExpired && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReconnect(account.platform)}
                          >
                            Reconnect
                          </Button>
                        )}
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDisconnect(account.platform)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate("/onboarding")}
              >
                Add Account
              </Button>
            </CardContent>
          </Card>

          {/* Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Settings</CardTitle>
              <CardDescription>Manage your preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="notifications">Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications for likes, comments, and mentions
                  </p>
                </div>
                <Switch
                  id="notifications"
                  checked={pushNotifications}
                  onCheckedChange={setPushNotifications}
                />
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>Irreversible actions</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" onClick={handleLogout} className="w-full">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Bottom Navigation - Mobile only */}
      <SocialHubNavigation />
    </div>
  );
};

export default Account;
