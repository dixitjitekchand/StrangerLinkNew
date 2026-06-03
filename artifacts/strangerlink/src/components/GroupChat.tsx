import { useState, useEffect, useRef } from "react";
import { socket, RoomMessage } from "@/lib/socket";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SendHorizontal, Users, Hash, LogOut, ArrowRight } from "lucide-react";
import { useListRooms } from "@workspace/api-client-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export function GroupChat() {
  const [joinedRoom, setJoinedRoom] = useState<string | null>(null);
  const [nickname, setNickname] = useState("");
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [roomToJoin, setRoomToJoin] = useState<string | null>(null);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [roomCounts, setRoomCounts] = useState<Record<string, number>>({});
  
  const { data: rooms } = useListRooms();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (rooms) {
      const initialCounts: Record<string, number> = {};
      rooms.forEach(r => { initialCounts[r.id] = r.userCount; });
      setRoomCounts(initialCounts);
    }
  }, [rooms]);

  useEffect(() => {
    const handleRoomMessage = (data: Omit<RoomMessage, "id" | "timestamp">) => {
      if (data.room === joinedRoom) {
        setMessages((prev) => [
          ...prev,
          { ...data, id: Math.random().toString(), timestamp: Date.now() },
        ]);
      }
    };

    const handleRoomCount = (data: { room: string; count: number }) => {
      setRoomCounts(prev => ({ ...prev, [data.room]: data.count }));
    };

    socket.on("room_message", handleRoomMessage);
    socket.on("room_count", handleRoomCount);

    return () => {
      socket.off("room_message", handleRoomMessage);
      socket.off("room_count", handleRoomCount);
    };
  }, [joinedRoom]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const initiateJoin = (roomId: string) => {
    setRoomToJoin(roomId);
    setShowNicknameModal(true);
  };

  const confirmJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim() || !roomToJoin) return;
    
    if (joinedRoom) {
      socket.emit("leave_room");
    }
    
    socket.emit("join_room", { room: roomToJoin, nickname: nickname.trim() });
    setJoinedRoom(roomToJoin);
    setMessages([]);
    setShowNicknameModal(false);
  };

  const leaveRoom = () => {
    socket.emit("leave_room");
    setJoinedRoom(null);
    setMessages([]);
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !joinedRoom) return;

    socket.emit("room_message", { text: inputValue });
    setInputValue("");
  };

  const activeRoomData = rooms?.find(r => r.id === joinedRoom);

  return (
    <div className="flex h-full border rounded-lg overflow-hidden bg-background">
      <div className={`w-full md:w-72 flex-col border-r bg-card ${joinedRoom ? "hidden md:flex" : "flex"}`}>
        <div className="p-4 border-b">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Hash className="h-5 w-5 text-primary" />
            Active Rooms
          </h3>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {rooms?.map((room) => (
              <button
                key={room.id}
                onClick={() => initiateJoin(room.id)}
                className={`w-full text-left p-3 rounded-md transition-colors flex items-center gap-3 ${joinedRoom === room.id ? "bg-primary/10 border border-primary/20" : "hover:bg-muted"}`}
              >
                <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-xl flex-none">
                  {room.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{room.name}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Users className="h-3 w-3" />
                    {roomCounts[room.id] || 0} online
                  </div>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      <div className={`flex-1 flex-col relative ${!joinedRoom ? "hidden md:flex" : "flex"}`}>
        {joinedRoom && activeRoomData ? (
          <>
            <div className="flex-none p-4 border-b bg-card flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-2xl">{activeRoomData.emoji}</div>
                <div>
                  <h2 className="font-semibold">{activeRoomData.name}</h2>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {roomCounts[joinedRoom] || 0} members
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={leaveRoom} className="text-muted-foreground hover:text-foreground">
                <LogOut className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Leave</span>
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
              {messages.map((msg) => {
                if (msg.system) {
                  return (
                    <div key={msg.id} className="flex justify-center my-2">
                      <span className="text-xs bg-muted/50 text-muted-foreground px-3 py-1 rounded-full">
                        {msg.text}
                      </span>
                    </div>
                  );
                }

                const isMe = msg.nickname === nickname.trim();

                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                    {!isMe && (
                      <span className="text-xs text-muted-foreground mb-1 ml-1 font-medium">
                        {msg.nickname}
                      </span>
                    )}
                    <div className={`max-w-[85%] rounded-2xl px-4 py-2 ${isMe ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted text-foreground rounded-tl-sm"}`}>
                      <p className="text-sm leading-relaxed">{msg.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex-none p-4 bg-card border-t">
              <form onSubmit={sendMessage} className="flex gap-2">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={`Message ${activeRoomData.name}...`}
                  className="bg-background border-input focus-visible:ring-primary h-12"
                />
                <Button type="submit" disabled={!inputValue.trim()} className="h-12 w-12 p-0 bg-primary hover:bg-primary/90">
                  <SendHorizontal className="h-5 w-5 text-primary-foreground" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-6 text-center text-muted-foreground">
            <div className="space-y-4">
              <Hash className="h-12 w-12 mx-auto text-muted" />
              <p>Select a room from the sidebar to join the conversation.</p>
            </div>
          </div>
        )}
      </div>

      <Dialog open={showNicknameModal} onOpenChange={setShowNicknameModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Choose a nickname</DialogTitle>
            <DialogDescription>
              How should others in the room identify you?
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={confirmJoin} className="space-y-4 mt-4">
            <Input
              placeholder="e.g. MidnightSurfer"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              autoFocus
              className="h-12"
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setShowNicknameModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!nickname.trim()} className="px-6">
                Join Room <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
