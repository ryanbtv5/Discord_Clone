import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus } from "lucide-react";
import type { Server } from "@shared/schema";

interface ServerListProps {
  servers: Server[];
  selectedServerId: string | null;
  onServerSelect: (serverId: string) => void;
  onCreateServer: () => void;
}

export default function ServerList({ servers, selectedServerId, onServerSelect, onCreateServer }: ServerListProps) {
  return (
    <div className="w-18 bg-discord-darkest flex flex-col items-center py-3 space-y-2 border-r border-discord-darker">
      {/* Home Server */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative group">
            <div className="w-12 h-12 bg-discord-blue rounded-2xl flex items-center justify-center cursor-pointer hover:rounded-xl transition-all duration-200 hover:bg-opacity-90">
              <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.196.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
              </svg>
            </div>
            <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-2 bg-white rounded-r-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
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
