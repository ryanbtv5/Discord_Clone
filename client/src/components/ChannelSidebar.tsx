import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Hash, Plus, ChevronDown, Settings, UserPlus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { ServerWithChannels, Channel } from "@shared/schema";

interface ChannelSidebarProps {
  server: ServerWithChannels;
  selectedChannelId: string | null;
  onChannelSelect: (channelId: string) => void;
  onCreateChannel: () => void;
  onInvite: () => void;
}

export default function ChannelSidebar({ server, selectedChannelId, onChannelSelect, onCreateChannel, onInvite }: ChannelSidebarProps) {
  const { user } = useAuth();
  
  const textChannels = server.channels.filter(c => c.type === 'text');

  const handleLogout = () => {
    window.location.href = '/api/logout';
  };

  return (
    <div className="w-60 bg-discord-darker flex flex-col">
      {/* Server Header */}
      <div className="h-16 border-b border-discord-darkest flex items-center justify-between px-4 hover:bg-discord-dark cursor-pointer transition-colors duration-150 group">
        <h1 className="text-white font-semibold truncate">{server.name}</h1>
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="icon"
            className="w-5 h-5 text-discord-text-muted hover:text-white opacity-0 group-hover:opacity-100 transition-all duration-150"
            onClick={onInvite}
          >
            <UserPlus className="w-4 h-4" />
          </Button>
          <ChevronDown className="w-5 h-5 text-discord-text-muted hover:text-white transition-colors duration-150" />
        </div>
      </div>
      
      {/* Channel List */}
      <ScrollArea className="flex-1">
        {/* Text Channels */}
        <div className="px-2 py-4">
          <div className="flex items-center justify-between px-2 pb-1">
            <div className="flex items-center">
              <ChevronDown className="w-3 h-3 text-discord-text-muted mr-1" />
              <span className="text-discord-text-muted text-xs font-semibold uppercase tracking-wide">Text Channels</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="w-4 h-4 text-discord-text-muted hover:text-white"
              onClick={onCreateChannel}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          
          {textChannels.map((channel) => (
            <div
              key={channel.id}
              className={`px-2 py-1 rounded hover:bg-discord-dark cursor-pointer transition-colors duration-150 group flex items-center relative ${
                selectedChannelId === channel.id ? 'bg-discord-dark' : ''
              }`}
              onClick={() => onChannelSelect(channel.id)}
            >
              <Hash className={`w-5 h-5 mr-2 ${
                selectedChannelId === channel.id 
                  ? 'text-discord-text' 
                  : 'text-discord-text-muted group-hover:text-discord-text'
              }`} />
              <span className={`text-sm ${
                selectedChannelId === channel.id 
                  ? 'text-white' 
                  : 'text-discord-text-muted group-hover:text-white'
              }`}>
                {channel.name}
              </span>
              {selectedChannelId === channel.id && (
                <div className="absolute left-0 w-1 h-6 bg-white rounded-r-lg"></div>
              )}
            </div>
          ))}
        </div>
        

      </ScrollArea>
      
      {/* User Panel */}
      <div className="h-14 bg-discord-darkest flex items-center px-2 space-x-2">
        {user && (
          <>
            <img 
              src={user.profileImageUrl || `https://ui-avatars.com/api/?name=${user.firstName || 'U'}&background=5865f2&color=fff`} 
              alt="User avatar" 
              className="w-8 h-8 rounded-full object-cover" 
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">
                {user.firstName || user.email?.split('@')[0] || 'User'}
              </div>
              <div className="text-xs text-discord-text-muted truncate">
                #{user.id?.slice(-4) || '0000'}
              </div>
            </div>
          </>
        )}

        <Button 
          variant="ghost" 
          size="icon" 
          className="p-1 rounded hover:bg-discord-darker"
          onClick={handleLogout}
        >
          <Settings className="w-5 h-5 text-discord-text-muted hover:text-white" />
        </Button>
      </div>
    </div>
  );
}
