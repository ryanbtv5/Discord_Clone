import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";
import { MessageCircle, Smile, Plus, ImageIcon } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import type { MessageWithUser, User } from "@shared/schema";

interface DirectMessageAreaProps {
  otherUser: User;
  onUserClick?: (user: User) => void;
}

export default function DirectMessageArea({ otherUser, onUserClick }: DirectMessageAreaProps) {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [messageText, setMessageText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch messages
  const { data: messages, isLoading, error } = useQuery<MessageWithUser[]>({
    queryKey: ["/api/dm", otherUser.id, "messages"],
    retry: false,
  });

  // Set up Server-Sent Events for real-time messages
  useEffect(() => {
    const eventSource = new EventSource(`/api/dm/${otherUser.id}/events`);
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'message') {
        queryClient.setQueryData(["/api/dm", otherUser.id, "messages"], (oldMessages: MessageWithUser[] | undefined) => {
          if (!oldMessages) return [data.data];
          return [data.data, ...oldMessages];
        });
      }
    };

    eventSource.onerror = (error) => {
      console.error('DM SSE error:', error);
    };

    return () => {
      eventSource.close();
    };
  }, [otherUser.id, queryClient]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { content?: string; image?: File }) => {
      const formData = new FormData();
      if (data.content) {
        formData.append('content', data.content);
      }
      if (data.image) {
        formData.append('image', data.image);
      }
      
      const response = await fetch(`/api/dm/${otherUser.id}/messages`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`${response.status}: ${text}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      setMessageText("");
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
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
        description: "Failed to send message",
        variant: "destructive",
      });
    },
  });

  // Handle unauthorized errors
  useEffect(() => {
    if (error && isUnauthorizedError(error)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [error, toast]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() && !selectedFile) return;
    
    sendMessageMutation.mutate({
      content: messageText.trim() || undefined,
      image: selectedFile || undefined,
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select a file smaller than 5MB",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const formatMessageDate = (date: Date) => {
    if (isToday(date)) {
      return `Today at ${format(date, 'h:mm a')}`;
    }
    if (isYesterday(date)) {
      return `Yesterday at ${format(date, 'h:mm a')}`;
    }
    return format(date, 'MM/dd/yyyy');
  };

  const groupMessagesByDate = (messages: MessageWithUser[]) => {
    const groups: { [key: string]: MessageWithUser[] } = {};
    
    messages?.forEach(message => {
      const date = new Date(message.createdAt!);
      const dateKey = format(date, 'yyyy-MM-dd');
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(message);
    });
    
    return groups;
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-discord-dark">
        <div className="text-discord-text">Loading messages...</div>
      </div>
    );
  }

  const messageGroups = groupMessagesByDate(messages || []);

  return (
    <div className="flex-1 flex flex-col bg-discord-dark">
      {/* Chat Header */}
      <div className="h-16 border-b border-discord-darkest flex items-center justify-between px-4">
        <div className="flex items-center space-x-3">
          <img 
            src={otherUser.profileImageUrl || `https://ui-avatars.com/api/?name=${otherUser.firstName || 'U'}&background=5865f2&color=fff`}
            alt="User avatar" 
            className="w-8 h-8 rounded-full object-cover" 
          />
          <div>
            <h2 className="text-white font-semibold">
              {otherUser.firstName ? `${otherUser.firstName} ${otherUser.lastName || ''}`.trim() : otherUser.email?.split('@')[0] || 'User'}
            </h2>
            <div className="text-xs text-discord-text-muted">
              {otherUser.email}
            </div>
          </div>
        </div>
      </div>
      
      {/* Messages Container */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {Object.entries(messageGroups).length === 0 ? (
            <div className="text-center text-discord-text-muted py-8">
              <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <div className="text-lg font-medium mb-2">This is the beginning of your conversation</div>
              <div className="text-sm">
                Say hello to {otherUser.firstName || otherUser.email?.split('@')[0] || 'this user'}!
              </div>
            </div>
          ) : (
            Object.entries(messageGroups).map(([dateKey, dateMessages]) => {
              const date = new Date(dateKey);
              return (
                <div key={dateKey}>
                  {/* Date Separator */}
                  <div className="flex items-center justify-center my-6">
                    <div className="flex items-center">
                      <div className="h-px bg-discord-text-light flex-1"></div>
                      <span className="px-4 text-xs text-discord-text-light font-medium">
                        {isToday(date) ? 'Today' : isYesterday(date) ? 'Yesterday' : format(date, 'MMMM d, yyyy')}
                      </span>
                      <div className="h-px bg-discord-text-light flex-1"></div>
                    </div>
                  </div>
                  
                  {/* Messages for this date */}
                  {dateMessages.reverse().map((message, index) => {
                    const showAvatar = index === 0 || dateMessages[index - 1]?.userId !== message.userId;
                    
                    return (
                      <div key={message.id} className="group hover:bg-discord-darker hover:bg-opacity-30 -mx-4 px-4 py-1 rounded transition-colors duration-150">
                        <div className="flex items-start space-x-3">
                          {showAvatar ? (
                            <img 
                              src={message.user.profileImageUrl || `https://ui-avatars.com/api/?name=${message.user.firstName || 'U'}&background=5865f2&color=fff`}
                              alt="User avatar" 
                              className="w-10 h-10 rounded-full object-cover mt-0.5" 
                            />
                          ) : (
                            <div className="w-10 flex-shrink-0 flex justify-center">
                              <span className="text-xs text-discord-text-light opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                                {format(new Date(message.createdAt!), 'h:mm a')}
                              </span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            {showAvatar && (
                              <div className="flex items-center space-x-2 mb-1">
                                <span 
                                  className="font-medium text-white hover:underline cursor-pointer"
                                  onClick={() => onUserClick?.(message.user)}
                                >
                                  {message.user.firstName || message.user.email?.split('@')[0] || 'User'}
                                </span>
                                <span className="text-xs text-discord-text-light">
                                  {formatMessageDate(new Date(message.createdAt!))}
                                </span>
                              </div>
                            )}
                            {message.content && (
                              <div className="text-discord-text leading-relaxed">
                                {message.content}
                              </div>
                            )}
                            {message.imageUrl && (
                              <div className="mt-2">
                                <img 
                                  src={message.imageUrl} 
                                  alt="Uploaded image" 
                                  className="rounded-lg max-w-md cursor-pointer hover:opacity-90 transition-opacity duration-150"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      
      {/* Message Input */}
      <div className="p-4">
        <form onSubmit={handleSendMessage} className="bg-discord-darkest rounded-lg">
          {selectedFile && (
            <div className="p-3 border-b border-discord-darker">
              <div className="flex items-center space-x-2">
                <ImageIcon className="w-4 h-4 text-discord-text-muted" />
                <span className="text-sm text-discord-text">{selectedFile.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedFile(null)}
                  className="text-discord-text-muted hover:text-white"
                >
                  ×
                </Button>
              </div>
            </div>
          )}
          <div className="flex items-end space-x-3 p-4">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*"
              className="hidden"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="p-2 hover:bg-discord-darker rounded-full"
              onClick={() => fileInputRef.current?.click()}
            >
              <Plus className="w-6 h-6 text-discord-text-muted hover:text-white" />
            </Button>
            <div className="flex-1">
              <Input
                type="text"
                placeholder={`Message ${otherUser.firstName || otherUser.email?.split('@')[0] || 'User'}`}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className="w-full bg-transparent text-discord-text placeholder-discord-text-muted border-none outline-none focus:ring-0"
                disabled={sendMessageMutation.isPending}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="icon" className="p-2 hover:bg-discord-darker rounded-full">
                <Smile className="w-6 h-6 text-discord-text-muted hover:text-white" />
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}