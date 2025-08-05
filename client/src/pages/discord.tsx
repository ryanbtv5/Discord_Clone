import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import ServerList from "@/components/ServerList";
import ChannelSidebar from "@/components/ChannelSidebar";
import ChatArea from "@/components/ChatArea";
import DirectMessagesList from "@/components/DirectMessagesList";
import DirectMessageArea from "@/components/DirectMessageArea";
import StartDmModal from "@/components/StartDmModal";
import ServerInviteModal from "@/components/ServerInviteModal";
import CreateServerModal from "@/components/CreateServerModal";
import CreateChannelModal from "@/components/CreateChannelModal";
import UserProfileModal from "@/components/UserProfileModal";
import SearchModal from "@/components/SearchModal";
import ServerMemberList from "@/components/ServerMemberList";
import type { Server, ServerWithChannels, Channel, User } from "@shared/schema";

export default function Discord() {
  const { toast } = useToast();
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [isDmMode, setIsDmMode] = useState(false);
  const [selectedDmUserId, setSelectedDmUserId] = useState<string | null>(null);  
  const [selectedDmUser, setSelectedDmUser] = useState<User | null>(null);
  const [showCreateServerModal, setShowCreateServerModal] = useState(false);
  const [showCreateChannelModal, setShowCreateChannelModal] = useState(false);
  const [showStartDmModal, setShowStartDmModal] = useState(false);
  const [showServerInviteModal, setShowServerInviteModal] = useState(false);
  const [showUserProfileModal, setShowUserProfileModal] = useState(false);
  const [selectedUserForProfile, setSelectedUserForProfile] = useState<User | null>(null);
  const [showMembersList, setShowMembersList] = useState(true);
  const [showSearchModal, setShowSearchModal] = useState(false);

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

  // Fetch user for DM
  const { data: dmUser } = useQuery<User>({
    queryKey: ["/api/users", selectedDmUserId],
    enabled: !!selectedDmUserId,
    retry: false,
  });

  // Auto-select first server and channel (only if not in DM mode)
  useEffect(() => {
    if (!isDmMode && servers && servers.length > 0 && !selectedServerId) {
      setSelectedServerId(servers[0].id);
    }
  }, [servers, selectedServerId, isDmMode]);

  useEffect(() => {
    if (!isDmMode && selectedServer && selectedServer.channels.length > 0 && !selectedChannelId) {
      setSelectedChannelId(selectedServer.channels[0].id);
    }
  }, [selectedServer, selectedChannelId, isDmMode]);

  // Update selected DM user when data is fetched
  useEffect(() => {
    if (dmUser) {
      setSelectedDmUser(dmUser);
    }
  }, [dmUser]);

  const handleServerSelect = (serverId: string) => {
    setIsDmMode(false);
    setSelectedServerId(serverId);
    setSelectedChannelId(null);
    setSelectedDmUserId(null);
    setSelectedDmUser(null);
  };

  const handleChannelSelect = (channelId: string) => {
    setSelectedChannelId(channelId);
  };

  const handleDirectMessagesClick = () => {
    setIsDmMode(true);
    setSelectedServerId(null);
    setSelectedChannelId(null);
  };

  const handleDmUserSelect = async (userId: string) => {
    setSelectedDmUserId(userId);
    // Fetch user data
    try {
      const response = await fetch(`/api/users/${userId}`, {
        credentials: 'include',
      });
      if (response.ok) {
        const user = await response.json();
        setSelectedDmUser(user);
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
    }
  };

  const handleStartNewDm = () => {
    setShowStartDmModal(true);
  };

  const handleUserClick = (user: User) => {
    setSelectedUserForProfile(user);
    setShowUserProfileModal(true);
  };

  const handleOpenServerInvite = () => {
    setShowServerInviteModal(true);
  };

  const handleToggleMembers = () => {
    setShowMembersList(!showMembersList);
  };

  const handleOpenSearch = () => {
    console.log('Opening search modal');
    setShowSearchModal(true);
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
        onDirectMessagesClick={handleDirectMessagesClick}
        isDmMode={isDmMode}
      />
      
      {isDmMode ? (
        <>
          <DirectMessagesList
            selectedUserId={selectedDmUserId}
            onUserSelect={handleDmUserSelect}
            onStartNewDm={handleStartNewDm}
          />
          
          {selectedDmUser ? (
            <DirectMessageArea otherUser={selectedDmUser} onUserClick={handleUserClick} />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-discord-dark">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-white mb-4">Direct Messages</h2>
                <p className="text-discord-text">Start a conversation with someone!</p>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {selectedServer && (
            <ChannelSidebar
              server={selectedServer}
              selectedChannelId={selectedChannelId}
              onChannelSelect={handleChannelSelect}
              onCreateChannel={() => setShowCreateChannelModal(true)}
              onInvite={handleOpenServerInvite}
            />
          )}
          
          {selectedChannel && (
            <ChatArea
              channel={selectedChannel}
              server={selectedServer!}
              onUserClick={handleUserClick}
              onToggleMembers={handleToggleMembers}
              onOpenSearch={handleOpenSearch}
            />
          )}
          
          {selectedServer && showMembersList && (
            <ServerMemberList
              serverId={selectedServer.id}
              onUserClick={handleUserClick}
            />
          )}
          
          {!selectedServer && (
            <div className="flex-1 flex items-center justify-center bg-discord-dark">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-white mb-4">Welcome to Discord Clone!</h2>
                <p className="text-discord-text">Create a server or join one to get started</p>
              </div>
            </div>
          )}
        </>
      )}

      <CreateServerModal
        open={showCreateServerModal}
        onClose={() => setShowCreateServerModal(false)}
      />

      <StartDmModal
        open={showStartDmModal}
        onClose={() => setShowStartDmModal(false)}
        onUserSelect={handleDmUserSelect}
      />

      {selectedServer && (
        <CreateChannelModal
          open={showCreateChannelModal}
          onClose={() => setShowCreateChannelModal(false)}
          serverId={selectedServer.id}
        />
      )}

      {selectedServer && (
        <ServerInviteModal
          open={showServerInviteModal}
          onClose={() => setShowServerInviteModal(false)}
          serverId={selectedServer.id}
          serverName={selectedServer.name}
        />
      )}

      <UserProfileModal
        open={showUserProfileModal}
        onClose={() => setShowUserProfileModal(false)}
        user={selectedUserForProfile}
      />
      
      {selectedChannel && selectedServer && (
        <SearchModal
          open={showSearchModal}
          onClose={() => setShowSearchModal(false)}
          channelId={selectedChannel.id}
          serverId={selectedServer.id}
        />
      )}
    </div>
  );
}
