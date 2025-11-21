import { Home, Plus, BarChart3, Bell, User } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function SocialHubNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadUnreadCount();
    const channel = supabase
      .channel("notifications-count")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
        },
        () => {
          loadUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadUnreadCount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("read_status", false);

      setUnreadCount(count || 0);
    } catch (error) {
      console.error("Error loading unread count:", error);
    }
  };

  const navItems = [
    { icon: Home, label: "Home", path: "/home" },
    { icon: Plus, label: "Create", path: "/create-post" },
    { icon: BarChart3, label: "Analytics", path: "/analytics" },
    {
      icon: Bell,
      label: "Notifications",
      path: "/notifications",
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
    { icon: User, label: "Account", path: "/account" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t md:hidden">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Button
              key={item.path}
              variant="ghost"
              size="icon"
              className={`relative ${isActive ? "text-primary" : ""}`}
              onClick={() => navigate(item.path)}
              title={item.label}
            >
              <Icon className="h-5 w-5" />
              {item.badge && (
                <Badge
                  variant="default"
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                >
                  {item.badge > 9 ? "9+" : item.badge}
                </Badge>
              )}
            </Button>
          );
        })}
      </div>
    </nav>
  );
}
