import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { X } from "lucide-react";

interface CreateServerModalProps {
  open: boolean;
  onClose: () => void;
}

export default function CreateServerModal({ open, onClose }: CreateServerModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [serverName, setServerName] = useState("");

  const createServerMutation = useMutation({
    mutationFn: async (data: { name: string }) => {
      return await apiRequest("POST", "/api/servers", data);
    },
    onSuccess: () => {
      toast({
        title: "Server created",
        description: "Your new server has been created successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/servers"] });
      setServerName("");
      onClose();
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
        description: "Failed to create server",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serverName.trim()) return;
    
    createServerMutation.mutate({ name: serverName.trim() });
  };

  const handleClose = () => {
    setServerName("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-discord-dark border-discord-darker max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold text-white">
              Create Your Server
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
          <p className="text-discord-text-muted">
            Your server is where you and your friends hang out. Make yours and start talking.
          </p>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="serverName" className="text-sm font-medium text-discord-text">
                Server Name
              </Label>
              <Input
                id="serverName"
                type="text"
                placeholder="Enter server name"
                value={serverName}
                onChange={(e) => setServerName(e.target.value)}
                className="mt-2 bg-discord-darkest border-discord-darker text-discord-text placeholder-discord-text-muted focus:border-discord-blue"
                required
                disabled={createServerMutation.isPending}
              />
            </div>
            
            <div className="flex space-x-3 pt-4">
              <Button 
                type="button" 
                variant="secondary"
                className="flex-1"
                onClick={handleClose}
                disabled={createServerMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="flex-1 bg-discord-blue hover:bg-discord-blue/90 text-white"
                disabled={createServerMutation.isPending || !serverName.trim()}
              >
                {createServerMutation.isPending ? "Creating..." : "Create Server"}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
