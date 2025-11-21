import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Heart, MessageCircle, AtSign, UserPlus, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SocialHubNavigation } from "@/components/dashboard/SocialHubNavigation";
import { toast } from "sonner";
import type { Notification, NotificationType } from "@/types/socialhub";

const notificationIcons = {
  Like: Heart,
  Comment: MessageCircle,
  Mention: AtSign,
  Follow: UserPlus,
  Message: Mail,
};

const notificationColors = {
  Like: "text-red-500",
  Comment: "text-blue-500",
  Mention: "text-purple-500",
  Follow: "text-green-500",
  Message: "text-orange-500",
};

const Notifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const navigate = useNavigate();

  useEffect(() => {
    loadNotifications();
    subscribeToNotifications();
  }, []);

  useEffect(() => {
    filterNotifications();
  }, [notifications, typeFilter]);

  const loadNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error: any) {
      console.error("Error loading notifications:", error);
    }
  };

  const subscribeToNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev]);
          toast.info("New notification received");
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const filterNotifications = () => {
    let filtered = [...notifications];

    if (typeFilter !== "all") {
      filtered = filtered.filter((notif) => notif.type === typeFilter);
    }

    setFilteredNotifications(filtered);
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ read_status: true })
        .eq("id", notificationId);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === notificationId ? { ...notif, read_status: true } : notif
        )
      );
    } catch (error: any) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("notifications")
        .update({ read_status: true })
        .eq("user_id", user.id)
        .eq("read_status", false);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, read_status: true }))
      );
      toast.success("All notifications marked as read");
    } catch (error: any) {
      toast.error("Failed to mark all as read");
    }
  };

  const unreadCount = notifications.filter((n) => !n.read_status).length;

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/home")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-2xl font-bold">Notifications</h1>
              {unreadCount > 0 && (
                <Badge variant="default">{unreadCount} unread</Badge>
              )}
            </div>
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={markAllAsRead}>
                Mark all as read
              </Button>
            )}
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-6 max-w-3xl">
        <div className="space-y-4">
          {/* Filter */}
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="Like">Likes</SelectItem>
              <SelectItem value="Comment">Comments</SelectItem>
              <SelectItem value="Mention">Mentions</SelectItem>
              <SelectItem value="Follow">Follows</SelectItem>
              <SelectItem value="Message">Messages</SelectItem>
            </SelectContent>
          </Select>

          {/* Notifications List */}
          {filteredNotifications.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No notifications</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredNotifications.map((notification) => {
                const Icon = notificationIcons[notification.type];
                const iconColor = notificationColors[notification.type];

                return (
                  <Card
                    key={notification.id}
                    className={`cursor-pointer transition-all ${
                      !notification.read_status ? "bg-muted/50 border-primary/20" : ""
                    }`}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className={`p-2 rounded-full bg-muted ${iconColor}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold">{notification.type}</p>
                            {notification.platform && (
                              <Badge variant="secondary" className="text-xs">
                                {notification.platform}
                              </Badge>
                            )}
                            {!notification.read_status && (
                              <Badge variant="default" className="h-2 w-2 p-0 rounded-full" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(notification.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Bottom Navigation - Mobile only */}
      <SocialHubNavigation />
    </div>
  );
};

export default Notifications;
