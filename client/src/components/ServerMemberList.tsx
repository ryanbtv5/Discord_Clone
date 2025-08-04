import { useQuery } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Crown, Shield, Users } from "lucide-react";
import type { User } from "@shared/schema";

interface ServerMemberListProps {
  serverId: string;
  onUserClick: (user: User) => void;
}

interface ServerMember extends User {
  isOwner: boolean;
}

export default function ServerMemberList({ serverId, onUserClick }: ServerMemberListProps) {
  const { data: members, isLoading } = useQuery<ServerMember[]>({
    queryKey: ["/api/servers", serverId, "members"],
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="w-60 bg-discord-darker flex-shrink-0 flex flex-col">
        <div className="p-4 border-b border-discord-dark">
          <h3 className="text-sm font-semibold text-discord-text-muted uppercase tracking-wide">
            Members
          </h3>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-discord-text-muted text-sm">Loading members...</div>
        </div>
      </div>
    );
  }

  if (!members || members.length === 0) {
    return (
      <div className="w-60 bg-discord-darker flex-shrink-0 flex flex-col">
        <div className="p-4 border-b border-discord-dark">
          <h3 className="text-sm font-semibold text-discord-text-muted uppercase tracking-wide">
            Members
          </h3>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-discord-text-muted text-sm">No members found</div>
        </div>
      </div>
    );
  }

  // Separate owners and regular members
  const owners = members.filter(member => member.isOwner);
  const regularMembers = members.filter(member => !member.isOwner);

  return (
    <div className="w-60 bg-discord-darker flex-shrink-0 flex flex-col">
      <div className="p-4 border-b border-discord-dark">
        <h3 className="text-sm font-semibold text-discord-text-muted uppercase tracking-wide flex items-center">
          <Users className="w-4 h-4 mr-2" />
          Members — {members.length}
        </h3>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {/* Server Owners */}
          {owners.length > 0 && (
            <div className="mb-4">
              <div className="text-xs font-semibold text-discord-text-muted uppercase tracking-wide mb-2 px-2">
                Server Owner — {owners.length}
              </div>
              {owners.map((member) => (
                <MemberItem 
                  key={member.id} 
                  member={member} 
                  onUserClick={onUserClick}
                  role="owner"
                />
              ))}
            </div>
          )}

          {/* Regular Members */}
          {regularMembers.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-discord-text-muted uppercase tracking-wide mb-2 px-2">
                Members — {regularMembers.length}
              </div>
              {regularMembers.map((member) => (
                <MemberItem 
                  key={member.id} 
                  member={member} 
                  onUserClick={onUserClick}
                  role="member"
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

interface MemberItemProps {
  member: ServerMember;
  onUserClick: (user: User) => void;
  role: 'owner' | 'member';
}

function MemberItem({ member, onUserClick, role }: MemberItemProps) {
  const displayName = member.firstName ? `${member.firstName} ${member.lastName || ''}`.trim() : member.email?.split('@')[0] || 'User';
  
  return (
    <Button
      variant="ghost"
      className="w-full justify-start p-2 h-auto hover:bg-discord-dark transition-colors duration-150"
      onClick={() => onUserClick(member)}
    >
      <div className="flex items-center space-x-3 w-full">
        <div className="relative">
          <img 
            src={member.profileImageUrl || `https://ui-avatars.com/api/?name=${displayName}&background=5865f2&color=fff`}
            alt="Member avatar" 
            className="w-8 h-8 rounded-full object-cover" 
          />
          {role === 'owner' && (
            <div className="absolute -top-1 -right-1 bg-discord-yellow rounded-full p-0.5">
              <Crown className="w-3 h-3 text-white" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <div className="text-sm font-medium text-white truncate">
            {displayName}
          </div>
          {member.email && (
            <div className="text-xs text-discord-text-muted truncate">
              {member.email}
            </div>
          )}
        </div>
      </div>
    </Button>
  );
}