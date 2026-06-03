import { useState, useEffect } from "react";
import { socket } from "@/lib/socket";
import { useGetStats } from "@workspace/api-client-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RandomChat } from "@/components/RandomChat";
import { GroupChat } from "@/components/GroupChat";
import { Radio, Users, Activity } from "lucide-react";

export default function Chat() {
  const { data: stats } = useGetStats();
  const [onlineCount, setOnlineCount] = useState<number>(0);
  const [activeTab, setActiveTab] = useState("random");

  useEffect(() => {
    if (stats) {
      setOnlineCount(stats.onlineUsers);
    }
  }, [stats]);

  useEffect(() => {
    const handleUserCount = (count: number) => {
      setOnlineCount(count);
    };

    socket.on("user_count", handleUserCount);

    return () => {
      socket.off("user_count", handleUserCount);
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="flex-none border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/20 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary">
            <Activity className="h-6 w-6" />
            <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-500">
              StrangerLink
            </h1>
          </div>
          
          <div className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full bg-secondary/50 border">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-foreground">{onlineCount.toLocaleString()}</span>
            <span className="text-muted-foreground hidden sm:inline">online now</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-5xl mx-auto p-4 flex flex-col min-h-[calc(100vh-4rem)]">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col h-full">
          <div className="flex justify-center mb-6">
            <TabsList className="grid w-full max-w-md grid-cols-2 h-12 items-center rounded-full bg-secondary p-1">
              <TabsTrigger 
                value="random" 
                className="rounded-full h-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
              >
                <div className="flex items-center gap-2">
                  <Radio className="h-4 w-4" />
                  Random
                </div>
              </TabsTrigger>
              <TabsTrigger 
                value="groups" 
                className="rounded-full h-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
              >
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Groups
                </div>
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 relative min-h-0">
            <TabsContent value="random" className="absolute inset-0 m-0 border-none outline-none">
              <RandomChat onBrowseRooms={() => setActiveTab("groups")} />
            </TabsContent>
            
            <TabsContent value="groups" className="absolute inset-0 m-0 border-none outline-none">
              <GroupChat />
            </TabsContent>
          </div>
        </Tabs>
      </main>
    </div>
  );
}
