import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { X, Copy, Plus, Link } from "lucide-react";
import type { ServerInvite } from "@shared/schema";

interface ServerInviteModalProps {
  open: boolean;
  onClose: () => void;
  serverId: string;
  serverName: string;
}

export default function ServerInviteModal({ open, onClose, serverId, serverName }: ServerInviteModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [maxUses, setMaxUses] = useState("");
  const [expirationDays, setExpirationDays] = useState("");

  // Fetch existing invites
  const { data: invites, isLoading } = useQuery<ServerInvite[]>({
    queryKey: ["/api/servers", serverId, "invites"],
    enabled: open,
    retry: false,
  });

  // Create new invite
  const createInviteMutation = useMutation({
    mutationFn: async (data: { maxUses?: string; expiresAt?: string }) => {
      return await apiRequest("POST", `/api/servers/${serverId}/invites`, data);
    },
    onSuccess: () => {
      toast({
        title: "Invite created",
        description: "Your server invite has been created successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/servers", serverId, "invites"] });
      setShowCreateForm(false);
      setMaxUses("");
      setExpirationDays("");
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create invite",
        variant: "destructive",
      });
    },
  });

  const handleCreateInvite = (e: React.FormEvent) => {
    e.preventDefault();
    
    const data: { maxUses?: string; expiresAt?: string } = {};
    
    if (maxUses && parseInt(maxUses) > 0) {
      data.maxUses = maxUses;
    }
    
    if (expirationDays && parseInt(expirationDays) > 0) {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + parseInt(expirationDays));
      data.expiresAt = expirationDate.toISOString();
    }
    
    createInviteMutation.mutate(data);
  };

  const copyInviteLink = (code: string) => {
    const inviteUrl = `${window.location.origin}/invite/${code}`;
    navigator.clipboard.writeText(inviteUrl).then(() => {
      toast({
        title: "Copied!",
        description: "Invite link copied to clipboard",
      });
    });
  };

  const handleClose = () => {
    setShowCreateForm(false);
    setMaxUses("");
    setExpirationDays("");
    onClose();
  };

  const formatDate = (date: string | null) => {
    if (!date) return "Never";
    return new Date(date).toLocaleDateString();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-discord-dark border-discord-darker max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold text-white">
              Invite People to {serverName}
            </DialogTitle>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleClose}
              className="text-discord-text-muted hover:text-white"
            >
              <X className="w-6 h-6" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="space-y-4">
          {!showCreateForm ? (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-white">Server Invites</h3>
                <Button
                  onClick={() => setShowCreateForm(true)}
                  className="bg-discord-blue hover:bg-discord-blue/90 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Invite
                </Button>
              </div>
              
              {isLoading ? (
                <div className="text-discord-text-muted p-4">Loading invites...</div>
              ) : invites && invites.length > 0 ? (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {invites.map((invite) => (
                    <div key={invite.id} className="bg-discord-darker p-3 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Link className="w-4 h-4 text-discord-blue" />
                          <code className="text-sm text-discord-text bg-discord-darkest px-2 py-1 rounded">
                            {invite.code}
                          </code>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyInviteLink(invite.code)}
                          className="text-discord-blue hover:text-white"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="text-xs text-discord-text-muted space-y-1">
                        <div>Uses: {invite.usedCount}{invite.maxUses ? ` / ${invite.maxUses}` : ' / ∞'}</div>
                        <div>Expires: {formatDate(invite.expiresAt)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-discord-text-muted py-8">
                  <Link className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <div className="text-sm">No invites yet</div>
                  <div className="text-xs mt-1">Create your first invite!</div>
                </div>
              )}
            </>
          ) : (
            <form onSubmit={handleCreateInvite} className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-white">Create Invite</h3>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowCreateForm(false)}
                  className="text-discord-text-muted hover:text-white"
                >
                  Cancel
                </Button>
              </div>
              
              <div>
                <Label htmlFor="maxUses" className="text-sm font-medium text-discord-text">
                  Max Uses (Optional)
                </Label>
                <Input
                  id="maxUses"
                  type="number"
                  placeholder="Unlimited"
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                  className="mt-2 bg-discord-darkest border-discord-darker text-discord-text placeholder-discord-text-muted focus:border-discord-blue"
                  min="1"
                  disabled={createInviteMutation.isPending}
                />
              </div>
              
              <div>
                <Label htmlFor="expirationDays" className="text-sm font-medium text-discord-text">
                  Expires After (Days) (Optional)
                </Label>
                <Input
                  id="expirationDays"
                  type="number"
                  placeholder="Never expires"
                  value={expirationDays}
                  onChange={(e) => setExpirationDays(e.target.value)}
                  className="mt-2 bg-discord-darkest border-discord-darker text-discord-text placeholder-discord-text-muted focus:border-discord-blue"
                  min="1"
                  disabled={createInviteMutation.isPending}
                />
              </div>
              
              <div className="flex space-x-3 pt-4">
                <Button 
                  type="button" 
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setShowCreateForm(false)}
                  disabled={createInviteMutation.isPending}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1 bg-discord-blue hover:bg-discord-blue/90 text-white"
                  disabled={createInviteMutation.isPending}
                >
                  {createInviteMutation.isPending ? "Creating..." : "Create Invite"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}