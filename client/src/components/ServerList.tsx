import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, MessageCircle } from "lucide-react";
import type { Server } from "@shared/schema";

interface ServerListProps {
  servers: Server[];
  selectedServerId: string | null;
  onServerSelect: (serverId: string) => void;
  onCreateServer: () => void;
  onDirectMessagesClick: () => void;
  isDmMode: boolean;
}

export default function ServerList({ servers, selectedServerId, onServerSelect, onCreateServer, onDirectMessagesClick, isDmMode }: ServerListProps) {
  return (
    <div className="w-18 bg-discord-darkest flex flex-col items-center py-3 space-y-2 border-r border-discord-darker">
      {/* Direct Messages Button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative group">
            <div 
              className={`w-12 h-12 rounded-2xl flex items-center justify-center cursor-pointer hover:rounded-xl transition-all duration-200 hover:bg-opacity-90 ${
                isDmMode ? 'bg-discord-blue rounded-xl' : 'bg-discord-blue'
              }`}
              onClick={onDirectMessagesClick}
            >
              <MessageCircle className="w-7 h-7 text-white" />
            </div>
            {isDmMode && (
              <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-white rounded-r-lg"></div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>Direct Messages</p>
        </TooltipContent>
      </Tooltip>
      
      {/* Server Separator */}
      <div className="w-8 h-0.5 bg-discord-text-light opacity-50 rounded-full"></div>
      
      {/* Server Icons */}
      {servers.map((server) => (
        <Tooltip key={server.id}>
          <TooltipTrigger asChild>
            <div className="relative group">
              <div 
                className={`w-12 h-12 rounded-full flex items-center justify-center cursor-pointer hover:rounded-xl transition-all duration-200 text-white font-bold text-lg ${
                  selectedServerId === server.id 
                    ? 'rounded-xl bg-discord-blue' 
                    : 'rounded-full bg-gradient-to-br from-purple-500 to-pink-500 hover:rounded-xl'
                }`}
                onClick={() => onServerSelect(server.id)}
              >
                {server.imageUrl ? (
                  <img src={server.imageUrl} alt={server.name} className="w-full h-full rounded-inherit object-cover" />
                ) : (
                  server.name.substring(0, 2).toUpperCase()
                )}
              </div>
              {selectedServerId === server.id && (
                <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-white rounded-r-lg"></div>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>{server.name}</p>
          </TooltipContent>
        </Tooltip>
      ))}
      
      {/* Add Server Button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative group">
            <Button
              variant="ghost"
              size="icon"
              className="w-12 h-12 bg-discord-darker border-2 border-dashed border-discord-text-light rounded-full hover:border-discord-green hover:bg-discord-green hover:rounded-xl transition-all duration-200"
              onClick={onCreateServer}
            >
              <Plus className="w-6 h-6 text-discord-green group-hover:text-white transition-colors duration-200" />
            </Button>
          </div>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>Add a Server</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
