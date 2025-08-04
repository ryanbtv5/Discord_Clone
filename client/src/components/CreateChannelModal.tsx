import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { X, Hash, Volume2 } from "lucide-react";

interface CreateChannelModalProps {
  open: boolean;
  onClose: () => void;
  serverId: string;
}

export default function CreateChannelModal({ open, onClose, serverId }: CreateChannelModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [channelName, setChannelName] = useState("");
  const [channelType, setChannelType] = useState("text");
  const [description, setDescription] = useState("");

  const createChannelMutation = useMutation({
    mutationFn: async (data: { name: string; type: string; description?: string; serverId: string }) => {
      return await apiRequest("POST", "/api/channels", data);
    },
    onSuccess: () => {
      toast({
        title: "Channel created",
        description: "Your new channel has been created successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/servers", serverId] });
      setChannelName("");
      setDescription("");
      setChannelType("text");
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
        description: "Failed to create channel",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelName.trim()) return;
    
    createChannelMutation.mutate({
      name: channelName.trim(),
      type: channelType,
      description: description.trim() || undefined,
      serverId,
    });
  };

  const handleClose = () => {
    setChannelName("");
    setDescription("");
    setChannelType("text");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-discord-dark border-discord-darker max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold text-white">
              Create Channel
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
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-discord-text uppercase tracking-wide">
              Channel Type
            </Label>
            <RadioGroup value={channelType} onValueChange={setChannelType} className="mt-2">
              <div className="flex items-center space-x-3 p-2 rounded hover:bg-discord-darker">
                <RadioGroupItem value="text" id="text" />
                <Hash className="w-6 h-6 text-discord-text-muted" />
                <div className="flex-1">
                  <Label htmlFor="text" className="text-discord-text font-medium cursor-pointer">
                    Text
                  </Label>
                  <p className="text-sm text-discord-text-muted">
                    Send messages, images, GIFs, emoji, opinions, and puns
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-2 rounded hover:bg-discord-darker">
                <RadioGroupItem value="voice" id="voice" />
                <Volume2 className="w-6 h-6 text-discord-text-muted" />
                <div className="flex-1">
                  <Label htmlFor="voice" className="text-discord-text font-medium cursor-pointer">
                    Voice
                  </Label>
                  <p className="text-sm text-discord-text-muted">
                    Hang out together with voice, video, and screen share
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>
          
          <div>
            <Label htmlFor="channelName" className="text-sm font-medium text-discord-text uppercase tracking-wide">
              Channel Name
            </Label>
            <Input
              id="channelName"
              type="text"
              placeholder="new-channel"
              value={channelName}
              onChange={(e) => setChannelName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
              className="mt-2 bg-discord-darkest border-discord-darker text-discord-text placeholder-discord-text-muted focus:border-discord-blue"
              required
              disabled={createChannelMutation.isPending}
            />
          </div>

          {channelType === "text" && (
            <div>
              <Label htmlFor="description" className="text-sm font-medium text-discord-text uppercase tracking-wide">
                Channel Description (Optional)
              </Label>
              <Input
                id="description"
                type="text"
                placeholder="What's this channel about?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-2 bg-discord-darkest border-discord-darker text-discord-text placeholder-discord-text-muted focus:border-discord-blue"
                disabled={createChannelMutation.isPending}
              />
            </div>
          )}
          
          <div className="flex space-x-3 pt-4">
            <Button 
              type="button" 
              variant="secondary"
              className="flex-1"
              onClick={handleClose}
              disabled={createChannelMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1 bg-discord-blue hover:bg-discord-blue/90 text-white"
              disabled={createChannelMutation.isPending || !channelName.trim()}
            >
              {createChannelMutation.isPending ? "Creating..." : "Create Channel"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
