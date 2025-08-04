import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Users, Clock, Hash, ArrowLeft } from "lucide-react";

interface InviteInfo {
  code: string;
  server: {
    id: string;
    name: string;
    imageUrl: string | null;
  };
  expiresAt: string | null;
  maxUses: string | null;
  usedCount: string;
}

export default function InvitePage() {
  const { code } = useParams<{ code: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [isJoining, setIsJoining] = useState(false);

  // Fetch invite information
  const { data: inviteInfo, isLoading, error } = useQuery<InviteInfo>({
    queryKey: ["/api/invites", code],
    enabled: !!code,
    retry: false,
  });

  // Join server mutation
  const joinServerMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/invites/${code}/join`);
    },
    onSuccess: (server) => {
      toast({
        title: "Welcome!",
        description: `You've successfully joined ${inviteInfo?.server.name}!`,
      });
      // Redirect to the Discord app
      setLocation("/");
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Please log in",
          description: "You need to be logged in to join servers",
          variant: "destructive",
        });
        // Redirect to login with return URL
        const returnUrl = encodeURIComponent(window.location.pathname);
        window.location.href = `/api/login?returnTo=${returnUrl}`;
        return;
      }
      
      const errorMessage = error.message.includes("already a member") 
        ? "You're already a member of this server"
        : error.message.includes("expired")
        ? "This invite has expired"
        : error.message.includes("maximum uses")
        ? "This invite has reached its usage limit"
        : "Failed to join server";
        
      toast({
        title: "Cannot join server",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleJoinServer = () => {
    if (!isAuthenticated) {
      const returnUrl = encodeURIComponent(window.location.pathname);
      window.location.href = `/api/login?returnTo=${returnUrl}`;
      return;
    }
    
    setIsJoining(true);
    joinServerMutation.mutate();
  };

  const formatExpiration = (expiresAt: string | null) => {
    if (!expiresAt) return "Never";
    const date = new Date(expiresAt);
    const now = new Date();
    
    if (date < now) return "Expired";
    
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return "Tomorrow";
    if (diffDays < 7) return `${diffDays} days`;
    return date.toLocaleDateString();
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-discord-dark flex items-center justify-center">
        <div className="text-discord-text">Loading...</div>
      </div>
    );
  }

  if (error || !inviteInfo) {
    return (
      <div className="min-h-screen bg-discord-dark flex items-center justify-center">
        <Card className="w-full max-w-md bg-discord-darker border-discord-darkest">
          <CardContent className="p-8 text-center">
            <div className="text-6xl mb-4">❌</div>
            <h1 className="text-2xl font-bold text-white mb-2">Invalid Invite</h1>
            <p className="text-discord-text-muted mb-6">
              This invite link is invalid or has expired.
            </p>
            <Button 
              onClick={() => setLocation("/")}
              className="bg-discord-blue hover:bg-discord-blue/90 text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go to Discord
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isExpired = inviteInfo.expiresAt && new Date(inviteInfo.expiresAt) < new Date();
  const isMaxUsesReached = inviteInfo.maxUses && parseInt(inviteInfo.usedCount) >= parseInt(inviteInfo.maxUses);

  return (
    <div className="min-h-screen bg-discord-dark flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-discord-darker border-discord-darkest">
        <CardHeader className="text-center pb-4">
          <div className="flex flex-col items-center space-y-4">
            {inviteInfo.server.imageUrl ? (
              <img 
                src={inviteInfo.server.imageUrl} 
                alt={inviteInfo.server.name}
                className="w-20 h-20 rounded-full object-cover"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-2xl">
                {inviteInfo.server.name.substring(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">
                Join {inviteInfo.server.name}
              </h1>
              <p className="text-discord-text-muted">
                You've been invited to join this server
              </p>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Invite Details */}
          <div className="bg-discord-darkest rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2 text-discord-text-muted">
                <Hash className="w-4 h-4" />
                <span>Invite Code</span>
              </div>
              <code className="text-discord-text bg-discord-dark px-2 py-1 rounded text-xs">
                {inviteInfo.code}
              </code>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2 text-discord-text-muted">
                <Users className="w-4 h-4" />
                <span>Uses</span>
              </div>
              <span className="text-discord-text">
                {inviteInfo.usedCount}{inviteInfo.maxUses ? ` / ${inviteInfo.maxUses}` : ' / ∞'}
              </span>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2 text-discord-text-muted">
                <Clock className="w-4 h-4" />
                <span>Expires</span>
              </div>
              <span className={`${isExpired ? 'text-red-400' : 'text-discord-text'}`}>
                {formatExpiration(inviteInfo.expiresAt)}
              </span>
            </div>
          </div>
          
          {/* Join Button */}
          <div className="space-y-3">
            {isExpired ? (
              <div className="text-center">
                <p className="text-red-400 text-sm mb-4">This invite has expired</p>
                <Button 
                  onClick={() => setLocation("/")}
                  variant="secondary"
                  className="w-full"
                >
                  Go to Discord
                </Button>
              </div>
            ) : isMaxUsesReached ? (
              <div className="text-center">
                <p className="text-red-400 text-sm mb-4">This invite has reached its usage limit</p>
                <Button 
                  onClick={() => setLocation("/")}
                  variant="secondary"
                  className="w-full"
                >
                  Go to Discord
                </Button>
              </div>
            ) : (
              <>
                <Button 
                  onClick={handleJoinServer}
                  disabled={isJoining || joinServerMutation.isPending}
                  className="w-full bg-discord-green hover:bg-discord-green/90 text-white text-lg py-3"
                >
                  {isJoining || joinServerMutation.isPending ? "Joining..." : "Join Server"}
                </Button>
                
                {!isAuthenticated && (
                  <p className="text-xs text-discord-text-muted text-center">
                    You'll be redirected to log in first
                  </p>
                )}
              </>
            )}
          </div>
          
          <div className="text-center">
            <Button 
              variant="ghost"
              onClick={() => setLocation("/")}
              className="text-discord-text-muted hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Discord
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}