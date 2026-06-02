import { useState, useEffect, useRef } from "react";
import { socket, ChatMessage } from "@/lib/socket";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SendHorizontal, Loader2, StopCircle, RefreshCw } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

type ChatState = "idle" | "waiting" | "connected" | "partner_left";

export function RandomChat({ onBrowseRooms }: { onBrowseRooms: () => void }) {
  const [state, setState] = useState<ChatState>("idle");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleWaiting = (data: { message: string }) => {
      setState("waiting");
      setStatusMessage(data.message);
      setMessages([]);
    };

    const handleChatStart = (data: { message: string }) => {
      setState("connected");
      setStatusMessage(data.message);
      setMessages([]);
      toast({
        title: "Connected",
        description: "You're now chatting with a stranger.",
      });
    };

    const handleReceiveMessage = (data: { text: string; from: "me" | "stranger" }) => {
      setMessages((prev) => [
        ...prev,
        { id: Math.random().toString(), text: data.text, from: data.from, timestamp: Date.now() },
      ]);
      if (data.from === "stranger") {
        setPartnerTyping(false);
      }
    };

    const handlePartnerLeft = (data: { message: string }) => {
      setState("partner_left");
      setStatusMessage(data.message);
      setPartnerTyping(false);
    };

    const handleStrangerTyping = () => setPartnerTyping(true);
    const handleStrangerStopTyping = () => setPartnerTyping(false);

    socket.on("waiting", handleWaiting);
    socket.on("chat_start", handleChatStart);
    socket.on("receive_message", handleReceiveMessage);
    socket.on("partner_left", handlePartnerLeft);
    socket.on("stranger_typing", handleStrangerTyping);
    socket.on("stranger_stop_typing", handleStrangerStopTyping);

    return () => {
      socket.off("waiting", handleWaiting);
      socket.off("chat_start", handleChatStart);
      socket.off("receive_message", handleReceiveMessage);
      socket.off("partner_left", handlePartnerLeft);
      socket.off("stranger_typing", handleStrangerTyping);
      socket.off("stranger_stop_typing", handleStrangerStopTyping);
    };
  }, [toast]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, partnerTyping]);

  const startSearching = () => {
    socket.emit("find_stranger");
    setState("waiting");
    setMessages([]);
  };

  const nextStranger = () => {
    socket.emit("next_stranger");
    setState("waiting");
    setMessages([]);
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || state !== "connected") return;

    socket.emit("send_message", { text: inputValue });
    setInputValue("");
    socket.emit("stop_typing");
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    if (state === "connected") {
      socket.emit("typing");
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("stop_typing");
      }, 1500);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background rounded-lg border overflow-hidden relative">
      {state === "idle" ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-foreground">Meet someone new</h2>
            <p className="text-muted-foreground max-w-md">
              Connect with a random stranger for an anonymous 1-on-1 chat.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center w-full sm:w-auto">
            <Button size="lg" onClick={startSearching} className="w-full sm:w-auto h-14 px-8 text-lg font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all hover:shadow-[0_0_30px_rgba(99,102,241,0.6)]">
              Chat with Stranger
            </Button>
            <Button size="lg" variant="outline" onClick={onBrowseRooms} className="w-full sm:w-auto h-14 px-8 text-lg font-semibold">
              Browse Rooms
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex-none p-4 border-b bg-card flex items-center justify-between">
            <div className="flex items-center gap-3">
              {state === "waiting" && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
              <span className="font-medium text-sm text-muted-foreground">{statusMessage}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={nextStranger} disabled={state === "waiting"} className="bg-secondary hover:bg-secondary/80 border-secondary-border">
                <RefreshCw className="h-4 w-4 mr-2" />
                Next
              </Button>
              <Button variant="destructive" size="sm" onClick={() => { socket.emit("stop_chat"); setState("idle"); }}>
                <StopCircle className="h-4 w-4 mr-2" />
                Stop
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.from === "me" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${msg.from === "me" ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted text-foreground rounded-tl-sm"}`}>
                  <p className="text-sm leading-relaxed">{msg.text}</p>
                </div>
              </div>
            ))}
            {partnerTyping && (
              <div className="flex justify-start animate-in fade-in zoom-in slide-in-from-bottom-2 duration-300">
                <div className="bg-muted text-muted-foreground rounded-2xl rounded-tl-sm px-4 py-2 flex items-center gap-1.5 h-10">
                  <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
          </div>

          <div className="flex-none p-4 bg-card border-t">
            <form onSubmit={sendMessage} className="flex gap-2">
              <Input
                value={inputValue}
                onChange={handleInputChange}
                disabled={state !== "connected"}
                placeholder={state === "connected" ? "Type a message..." : "Waiting for partner..."}
                className="bg-background border-input focus-visible:ring-primary h-12"
              />
              <Button type="submit" disabled={!inputValue.trim() || state !== "connected"} className="h-12 w-12 p-0 bg-primary hover:bg-primary/90">
                <SendHorizontal className="h-5 w-5 text-primary-foreground" />
              </Button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
