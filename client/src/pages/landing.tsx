import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Landing() {
  return (
    <div className="min-h-screen bg-discord-darkest flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-discord-dark border-discord-darker">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-white">
            Welcome to Discord Clone
          </CardTitle>
          <CardDescription className="text-discord-text-muted">
            Connect with friends and communities
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <Button 
              onClick={() => window.location.href = '/api/login'}
              className="w-full bg-discord-blue hover:bg-discord-blue/90 text-white"
            >
              Sign In
            </Button>
          </div>
          <div className="text-center text-sm text-discord-text-muted">
            Join servers, chat with friends, and stay connected
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
