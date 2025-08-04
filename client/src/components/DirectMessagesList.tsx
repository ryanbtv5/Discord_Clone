import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, MessageCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { DmConversationWithUser } from "@shared/schema";

interface DirectMessagesListProps {
  selectedUserId: string | null;
  onUserSelect: (userId: string) => void;
  onStartNewDm: () => void;
}

export default function DirectMessagesList({ selectedUserId, onUserSelect, onStartNewDm }: DirectMessagesListProps) {
  const { user } = useAuth();
  
  const { data: conversations, isLoading } = useQuery<DmConversationWithUser[]>({
    queryKey: ["/api/dm/conversations"],
    retry: false,
  });

  if (!user) return null;

  return (
    <div className="w-60 bg-discord-darker flex flex-col">
      {/* Header */}
      <div className="h-16 border-b border-discord-darkest flex items-center justify-between px-4">
        <h1 className="text-white font-semibold">Direct Messages</h1>
        <Button
          variant="ghost"
          size="icon"
          className="w-6 h-6 text-discord-text-muted hover:text-white"
          onClick={onStartNewDm}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      
      {/* Conversations List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-0.5">
          {isLoading ? (
            <div className="text-discord-text-muted text-sm p-4">Loading conversations...</div>
          ) : conversations && conversations.length > 0 ? (
            conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`flex items-center space-x-3 p-2 rounded hover:bg-discord-dark cursor-pointer transition-colors duration-150 ${
                  selectedUserId === conversation.otherUser.id ? 'bg-discord-dark' : ''
                }`}
                onClick={() => onUserSelect(conversation.otherUser.id)}
              >
                <img 
                  src={conversation.otherUser.profileImageUrl || `https://ui-avatars.com/api/?name=${conversation.otherUser.firstName || 'U'}&background=5865f2&color=fff`}
                  alt="User avatar" 
                  className="w-8 h-8 rounded-full object-cover" 
                />
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium truncate ${
                    selectedUserId === conversation.otherUser.id ? 'text-white' : 'text-discord-text'
                  }`}>
                    {conversation.otherUser.firstName || conversation.otherUser.email?.split('@')[0] || 'User'}
                  </div>
                  {conversation.lastMessage && (
                    <div className="text-xs text-discord-text-muted truncate">
                      {conversation.lastMessage.content || 'Image'}
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-discord-text-muted text-sm p-4 text-center">
              <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <div>No conversations yet</div>
              <div className="text-xs mt-1">Start a new conversation!</div>
            </div>
          )}
        </div>
      </ScrollArea>
      
      {/* User Panel */}
      <div className="h-14 bg-discord-darkest flex items-center px-2 space-x-2">
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
        <Button 
          variant="ghost" 
          size="icon" 
          className="p-1 rounded hover:bg-discord-darker"
          onClick={() => window.location.href = '/api/logout'}
        >
          <svg className="w-5 h-5 text-discord-text-muted hover:text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
          </svg>
        </Button>
      </div>
    </div>
  );
}