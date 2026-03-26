import { WebSocketServer } from "ws";
import jwt from "jsonwebtoken";

/**
 * Minimal WebRTC signaling server over WebSocket.
 * Rooms are identified by a string `room`.
 * Messages are relayed to all other peers in the same room.
 *
 * Client must connect with query params:
 * - token: JWT
 * - room: room id
 */
export function attachSignalingServer(httpServer) {
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  const rooms = new Map(); // room -> Set(ws)

  function safeSend(ws, payload) {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  }

  wss.on("connection", (ws, req) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const token = url.searchParams.get("token");
      const room = url.searchParams.get("room");
      const listenOnly = url.searchParams.get("listen") === "1";
      if (!token || !room) {
        safeSend(ws, { type: "error", message: "Missing token or room" });
        ws.close();
        return;
      }

      // Verify token (auth)
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      ws.userId = decoded.id;
      ws.room = room;
      ws.listenOnly = listenOnly;

      if (!rooms.has(room)) rooms.set(room, new Set());
      const peers = rooms.get(room);
      // Snapshot current peer userIds before adding this ws (used for role/negotiation)
      const existingUserIds = Array.from(peers)
        .filter((p) => !p.listenOnly)
        .map((p) => p.userId)
        .filter(Boolean);
      peers.add(ws);

      console.info(
        `[ws] joined room=${room} user=${ws.userId} listenOnly=${listenOnly} connected=${peers.size}`,
      );

      // Send join ack + existing peers so client can decide who should create offer.
      safeSend(ws, { type: "joined", room, userId: ws.userId, peers: existingUserIds });

      // Notify existing peers someone joined (helps to trigger offer without glare)
      if (!ws.listenOnly) {
        for (const peer of peers) {
          if (peer === ws) continue;
          if (peer.listenOnly) continue;
          safeSend(peer, { type: "peer_joined", userId: ws.userId });
        }
      }

      ws.on("message", (data) => {
        let msg;
        try {
          msg = JSON.parse(data.toString());
        } catch {
          return;
        }

        // Relay to other peers in the room
        const peers = rooms.get(room);
        if (!peers) return;
        for (const peer of peers) {
          if (peer === ws) continue;
          // Prevent listen-only sockets from interfering with WebRTC negotiation.
          if (
            peer.listenOnly &&
            (msg.type === "offer" || msg.type === "answer" || msg.type === "ice")
          ) {
            continue;
          }
          safeSend(peer, {
            ...msg,
            from: ws.userId,
          });
        }
      });

      ws.on("close", () => {
        const peers = rooms.get(room);
        if (peers) {
          peers.delete(ws);
          // Notify remaining peers that this user left
          if (!ws.listenOnly) {
            for (const peer of peers) {
              if (peer.listenOnly) continue;
              safeSend(peer, { type: "peer_left", userId: ws.userId });
            }
          }
          if (peers.size === 0) rooms.delete(room);
          console.info(
            `[ws] left room=${room} user=${ws.userId} listenOnly=${ws.listenOnly} connected=${peers.size}`,
          );
        } else {
          console.info(
            `[ws] left room=${room} user=${ws.userId} listenOnly=${ws.listenOnly} connected=0`,
          );
        }
      });
    } catch (e) {
      console.warn(`[ws] connection rejected: ${e.message}`);
      try {
        ws.send(JSON.stringify({ type: "error", message: e.message }));
      } catch (_) {}
      ws.close();
    }
  });

  return wss;
}

