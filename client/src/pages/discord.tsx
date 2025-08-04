import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import ServerList from "@/components/ServerList";
import ChannelSidebar from "@/components/ChannelSidebar";
import ChatArea from "@/components/ChatArea";
import CreateServerModal from "@/components/CreateServerModal";
import CreateChannelModal from "@/components/CreateChannelModal";
import type { Server, ServerWithChannels, Channel } from "@shared/schema";

export default function Discord() {
  const { toast } = useToast();
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [showCreateServerModal, setShowCreateServerModal] = useState(false);
  const [showCreateChannelModal, setShowCreateChannelModal] = useState(false);

  // Fetch user's servers
  const { data: servers, isLoading: serversLoading, error: serversError } = useQuery<Server[]>({
    queryKey: ["/api/servers"],
    retry: false,
  });

  // Fetch selected server with channels
  const { data: selectedServer, isLoading: serverLoading, error: serverError } = useQuery<ServerWithChannels>({
    queryKey: ["/api/servers", selectedServerId],
    enabled: !!selectedServerId,
    retry: false,
  });

  // Handle unauthorized errors
  useEffect(() => {
    const handleUnauthorizedError = (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return true;
      }
      return false;
    };

    if (serversError && handleUnauthorizedError(serversError)) return;
    if (serverError && handleUnauthorizedError(serverError)) return;
  }, [serversError, serverError, toast]);

  // Auto-select first server and channel
  useEffect(() => {
    if (servers && servers.length > 0 && !selectedServerId) {
      setSelectedServerId(servers[0].id);
    }
  }, [servers, selectedServerId]);

  useEffect(() => {
    if (selectedServer && selectedServer.channels.length > 0 && !selectedChannelId) {
      setSelectedChannelId(selectedServer.channels[0].id);
    }
  }, [selectedServer, selectedChannelId]);

  const handleServerSelect = (serverId: string) => {
    setSelectedServerId(serverId);
    setSelectedChannelId(null); // Reset channel selection
  };

  const handleChannelSelect = (channelId: string) => {
    setSelectedChannelId(channelId);
  };

  const selectedChannel = selectedServer?.channels.find(c => c.id === selectedChannelId);

  if (serversLoading) {
    return (
      <div className="h-screen bg-discord-darkest flex items-center justify-center">
        <div className="text-discord-text">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-discord-darkest text-discord-text overflow-hidden">
      <ServerList
        servers={servers || []}
        selectedServerId={selectedServerId}
        onServerSelect={handleServerSelect}
        onCreateServer={() => setShowCreateServerModal(true)}
      />
      
      {selectedServer && (
        <ChannelSidebar
          server={selectedServer}
          selectedChannelId={selectedChannelId}
          onChannelSelect={handleChannelSelect}
          onCreateChannel={() => setShowCreateChannelModal(true)}
        />
      )}
      
      {selectedChannel && (
        <ChatArea
          channel={selectedChannel}
          server={selectedServer!}
        />
      )}

      <CreateServerModal
        open={showCreateServerModal}
        onClose={() => setShowCreateServerModal(false)}
      />

      {selectedServer && (
        <CreateChannelModal
          open={showCreateChannelModal}
          onClose={() => setShowCreateChannelModal(false)}
          serverId={selectedServer.id}
        />
      )}
    </div>
  );
}
