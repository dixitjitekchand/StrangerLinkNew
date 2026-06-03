import { Server, type Socket } from "socket.io";
import { type Server as HttpServer } from "http";
import { logger } from "./logger";

const waitingPool: Socket[] = [];
const pairs = new Map<string, string>();
const rooms = new Map<string, Set<string>>();
let userCount = 0;

export const ROOMS_CONFIG = [
  { id: "general", name: "General", emoji: "🌍", description: "Talk about anything" },
  { id: "gaming", name: "Gaming", emoji: "🎮", description: "Games & esports" },
  { id: "music", name: "Music", emoji: "🎵", description: "All genres welcome" },
  { id: "tech", name: "Tech", emoji: "💻", description: "Dev, AI & gadgets" },
  { id: "movies", name: "Movies & TV", emoji: "🎬", description: "Films & series" },
  { id: "sports", name: "Sports", emoji: "⚽", description: "Sports & fitness" },
];

export function getStats() {
  return {
    onlineUsers: userCount,
    activePairs: Math.floor(pairs.size / 2),
    waitingUsers: waitingPool.length,
    activeRooms: ROOMS_CONFIG.filter((r) => (rooms.get(r.id)?.size ?? 0) > 0).length,
  };
}

export function getRooms() {
  return ROOMS_CONFIG.map((r) => ({
    ...r,
    userCount: rooms.get(r.id)?.size ?? 0,
  }));
}

function broadcastUserCount(io: Server) {
  io.emit("user_count", userCount);
}

function pairUsers(s1: Socket, s2: Socket) {
  pairs.set(s1.id, s2.id);
  pairs.set(s2.id, s1.id);
  s1.emit("chat_start", { message: "You are now connected to a stranger! Say hi 👋" });
  s2.emit("chat_start", { message: "You are now connected to a stranger! Say hi 👋" });
}

function disconnectPair(socketId: string, io: Server) {
  const partnerId = pairs.get(socketId);
  if (partnerId) {
    const partnerSocket = io.sockets.sockets.get(partnerId);
    if (partnerSocket) {
      partnerSocket.emit("partner_left", { message: "Stranger has disconnected." });
    }
    pairs.delete(partnerId);
    pairs.delete(socketId);
  }
  const idx = waitingPool.findIndex((s) => s.id === socketId);
  if (idx !== -1) waitingPool.splice(idx, 1);
}

function leaveRoom(sock: Socket, io: Server) {
  const room = sock.data.room as string | undefined;
  if (room && rooms.has(room)) {
    rooms.get(room)!.delete(sock.id);
    io.to(room).emit("room_message", {
      text: `${(sock.data.nickname as string) || "Someone"} left the room`,
      system: true,
      room,
    });
    io.to(room).emit("room_count", {
      room,
      count: rooms.get(room)!.size,
    });
    void sock.leave(room);
    sock.data.room = null;
  }
}

export function attachSocketIO(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: { origin: "*" },
    path: "/socket.io",
  });

  io.on("connection", (socket) => {
    userCount++;
    broadcastUserCount(io);
    logger.info({ socketId: socket.id, total: userCount }, "Socket connected");

    socket.on("find_stranger", () => {
      if (pairs.has(socket.id)) return;
      if (waitingPool.length > 0) {
        const partner = waitingPool.shift()!;
        pairUsers(socket, partner);
      } else {
        waitingPool.push(socket);
        socket.emit("waiting", { message: "Looking for a stranger... ⏳" });
      }
    });

    socket.on("send_message", ({ text }: { text: string }) => {
      if (!text || typeof text !== "string") return;
      const clean = text.trim().slice(0, 500);
      if (!clean) return;
      const partnerId = pairs.get(socket.id);
      if (partnerId) {
        io.to(partnerId).emit("receive_message", { text: clean, from: "stranger" });
        socket.emit("receive_message", { text: clean, from: "me" });
      }
    });

    socket.on("typing", () => {
      const partnerId = pairs.get(socket.id);
      if (partnerId) io.to(partnerId).emit("stranger_typing");
    });

    socket.on("stop_typing", () => {
      const partnerId = pairs.get(socket.id);
      if (partnerId) io.to(partnerId).emit("stranger_stop_typing");
    });

    socket.on("next_stranger", () => {
      disconnectPair(socket.id, io);
      waitingPool.push(socket);
      socket.emit("waiting", { message: "Finding a new stranger... ⏳" });
      if (waitingPool.length >= 2) {
        const s1 = waitingPool.shift()!;
        const s2 = waitingPool.shift()!;
        pairUsers(s1, s2);
      }
    });

    socket.on("stop_chat", () => {
      disconnectPair(socket.id, io);
    });

    socket.on("join_room", ({ room, nickname }: { room: string; nickname?: string }) => {
      void socket.join(room);
      socket.data.room = room;
      socket.data.nickname = nickname || "Anonymous";

      if (!rooms.has(room)) rooms.set(room, new Set());
      rooms.get(room)!.add(socket.id);

      io.to(room).emit("room_message", {
        text: `${socket.data.nickname as string} joined the room`,
        system: true,
        room,
      });
      io.to(room).emit("room_count", { room, count: rooms.get(room)!.size });
    });

    socket.on("room_message", ({ text }: { text: string }) => {
      if (!text || typeof text !== "string") return;
      const clean = text.trim().slice(0, 500);
      const room = socket.data.room as string | undefined;
      if (!clean || !room) return;
      io.to(room).emit("room_message", {
        text: clean,
        nickname: (socket.data.nickname as string) || "Anonymous",
        from: socket.id,
        room,
        system: false,
      });
    });

    socket.on("leave_room", () => {
      leaveRoom(socket, io);
    });

    socket.on("disconnect", () => {
      userCount = Math.max(0, userCount - 1);
      broadcastUserCount(io);
      disconnectPair(socket.id, io);
      leaveRoom(socket, io);
      logger.info({ socketId: socket.id, total: userCount }, "Socket disconnected");
    });
  });

  return io;
}
