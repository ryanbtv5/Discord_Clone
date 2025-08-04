import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Mail, User as UserIcon, X } from "lucide-react";
import type { User } from "@shared/schema";

interface UserProfileModalProps {
  open: boolean;
  onClose: () => void;
  user: User | null;
}

export default function UserProfileModal({ open, onClose, user }: UserProfileModalProps) {
  if (!user) return null;

  const displayName = user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.email?.split('@')[0] || 'User';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-discord-dark border-discord-darker max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold text-white">
              User Profile
            </DialogTitle>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={onClose}
              className="text-discord-text-muted hover:text-white"
            >
              <X className="w-6 h-6" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Profile Header */}
          <div className="flex items-center space-x-4">
            <img 
              src={user.profileImageUrl || `https://ui-avatars.com/api/?name=${displayName}&background=5865f2&color=fff`}
              alt="User avatar" 
              className="w-20 h-20 rounded-full object-cover border-4 border-discord-blue" 
            />
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-white">{displayName}</h3>
              <p className="text-discord-text-muted">#{user.id?.slice(-4) || '0000'}</p>
            </div>
          </div>

          {/* User Details */}
          <div className="space-y-4">
            {user.email && (
              <div className="flex items-center space-x-3 p-3 bg-discord-darkest rounded-lg">
                <Mail className="w-5 h-5 text-discord-text-muted" />
                <div className="flex-1">
                  <div className="text-sm text-discord-text-muted">Email</div>
                  <div className="text-white">{user.email}</div>
                </div>
              </div>
            )}

            {user.firstName && (
              <div className="flex items-center space-x-3 p-3 bg-discord-darkest rounded-lg">
                <UserIcon className="w-5 h-5 text-discord-text-muted" />
                <div className="flex-1">
                  <div className="text-sm text-discord-text-muted">Display Name</div>
                  <div className="text-white">{user.firstName} {user.lastName || ''}</div>
                </div>
              </div>
            )}

            {user.createdAt && (
              <div className="flex items-center space-x-3 p-3 bg-discord-darkest rounded-lg">
                <Calendar className="w-5 h-5 text-discord-text-muted" />
                <div className="flex-1">
                  <div className="text-sm text-discord-text-muted">Member Since</div>
                  <div className="text-white">
                    {new Date(user.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end">
            <Button 
              onClick={onClose}
              className="bg-discord-blue hover:bg-discord-blue/80 text-white"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}