import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { MessageWithUser } from "@shared/schema";

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
  channelId: string;
  serverId: string;
}

export default function SearchModal({ open, onClose, channelId, serverId }: SearchModalProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: searchResults, isLoading } = useQuery<MessageWithUser[]>({
    queryKey: ["/api/channels", channelId, "search", searchQuery],
    queryFn: async () => {
      if (searchQuery.length < 3) return [];
      const response = await fetch(`/api/channels/${channelId}/search/${encodeURIComponent(searchQuery)}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Search failed');
      return response.json();
    },
    enabled: searchQuery.length > 2 && open,
    retry: false,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Search is handled by the query above
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-discord-darker border-discord-darkest">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center">
            <Search className="w-5 h-5 mr-2" />
            Search Messages
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="relative">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search messages..."
              className="bg-discord-darkest border-discord-dark text-white pr-10"
            />
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-discord-text-muted" />
          </div>
        </form>

        <ScrollArea className="max-h-96">
          {isLoading && searchQuery.length > 2 ? (
            <div className="text-center text-discord-text-muted py-8">
              Searching...
            </div>
          ) : searchResults && searchResults.length > 0 ? (
            <div className="space-y-2">
              {searchResults.map((message) => (
                <div key={message.id} className="p-3 bg-discord-darkest rounded-lg hover:bg-discord-dark transition-colors">
                  <div className="flex items-start space-x-3">
                    <img 
                      src={message.user.profileImageUrl || `https://ui-avatars.com/api/?name=${message.user.firstName || 'U'}&background=5865f2&color=fff`}
                      alt="User avatar" 
                      className="w-8 h-8 rounded-full object-cover" 
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium text-white text-sm">
                          {message.user.firstName || message.user.email?.split('@')[0] || 'User'}
                        </span>
                        <span className="text-xs text-discord-text-muted">
                          {new Date(message.createdAt!).toLocaleDateString()}
                        </span>
                      </div>
                      {message.content && (
                        <div className="text-discord-text text-sm">
                          {message.content}
                        </div>
                      )}
                      {message.imageUrl && (
                        <div className="mt-2">
                          <img 
                            src={message.imageUrl} 
                            alt="Message image" 
                            className="rounded max-w-xs cursor-pointer"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : searchQuery.length > 2 ? (
            <div className="text-center text-discord-text-muted py-8">
              No messages found
            </div>
          ) : (
            <div className="text-center text-discord-text-muted py-8">
              Type at least 3 characters to search
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}