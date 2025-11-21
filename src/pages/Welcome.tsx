import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Share2 } from "lucide-react";

const Welcome = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-muted p-4">
      <Card className="w-full max-w-md shadow-lg border-2">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center">
            <div className="rounded-full bg-primary/10 p-4">
              <Share2 className="h-12 w-12 text-primary" />
            </div>
          </div>
          <div>
            <CardTitle className="text-3xl font-bold">SocialHub</CardTitle>
            <CardDescription className="text-lg mt-2">
              Connect all your social media accounts in one place
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-muted-foreground">
            View feeds, post, schedule posts, and track analytics across multiple platforms
          </p>
          <div className="flex flex-col gap-3">
            <Button asChild size="lg" className="w-full">
              <Link to="/signup">Sign Up</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full">
              <Link to="/login">Login</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Welcome;
