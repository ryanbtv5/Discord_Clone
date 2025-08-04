import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Search } from "lucide-react";
import type { User } from "@shared/schema";

interface StartDmModalProps {
  open: boolean;
  onClose: () => void;
  onUserSelect: (userId: string) => void;
}

export default function StartDmModal({ open, onClose, onUserSelect }: StartDmModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  
  // Search users with debouncing
  const { data: searchResults, isLoading } = useQuery<User[]>({
    queryKey: ["/api/users/search", searchQuery],
    enabled: searchQuery.length >= 2,
    retry: false,
  });

  const handleUserSelect = (userId: string) => {
    onUserSelect(userId);
    handleClose();
  };

  const handleClose = () => {
    setSearchQuery("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-discord-dark border-discord-darker max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold text-white">
              Start a Conversation
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
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-discord-text-muted" />
            <Input
              type="text"
              placeholder="Search for users by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-discord-darkest border-discord-darker text-discord-text placeholder-discord-text-muted focus:border-discord-blue"
            />
          </div>
          
          <ScrollArea className="h-64">
            {searchQuery.length < 2 ? (
              <div className="text-center text-discord-text-muted py-8">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <div className="text-sm">Type at least 2 characters to search</div>
              </div>
            ) : isLoading ? (
              <div className="text-center text-discord-text-muted py-8">
                <div className="text-sm">Searching...</div>
              </div>
            ) : searchResults && searchResults.length > 0 ? (
              <div className="space-y-1">
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center space-x-3 p-3 rounded hover:bg-discord-darker cursor-pointer transition-colors duration-150"
                    onClick={() => handleUserSelect(user.id)}
                  >
                    <img 
                      src={user.profileImageUrl || `https://ui-avatars.com/api/?name=${user.firstName || 'U'}&background=5865f2&color=fff`}
                      alt="User avatar" 
                      className="w-10 h-10 rounded-full object-cover" 
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white">
                        {user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.email?.split('@')[0] || 'User'}
                      </div>
                      <div className="text-xs text-discord-text-muted truncate">
                        {user.email}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-discord-text-muted py-8">
                <div className="text-sm">No users found</div>
                <div className="text-xs mt-1">Try a different search term</div>
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}