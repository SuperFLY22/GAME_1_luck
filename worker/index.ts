import { DurableObject } from 'cloudflare:workers';

export interface Env {
  GAME_ROOM: DurableObjectNamespace;
}

interface LobbyPlayer {
  id: string;
  name: string;
  joinedAt: number;
}

export class GameRoom extends DurableObject {
  private roomId: string = '';
  private lobbyPlayers: Map<WebSocket, LobbyPlayer> = new Map();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    this.roomId = url.searchParams.get('roomId') || 'lobby';

    const upgradeHeader = request.headers.get('Upgrade');
    if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
      return new Response('Expected Upgrade: websocket', { status: 426 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    this.ctx.acceptWebSocket(server);

    if (this.roomId === 'lobby') {
      this.sendQueueUpdateTo(server);
    }

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    try {
      const text = typeof message === 'string' ? message : new TextDecoder().decode(message);
      const data = JSON.parse(text);

      if (this.roomId === 'lobby') {
        this.handleLobbyMessage(ws, data);
        return;
      }

      // 대전 룸: 참가자 전원에게 메시지 브로드캐스트 (발신자 포함)
      const sockets = this.ctx.getWebSockets();
      for (const socket of sockets) {
        socket.send(text);
      }
    } catch (err) {
      console.error('[GameRoom] Message parse error:', err);
    }
  }

  async webSocketClose(ws: WebSocket, _code: number, _reason: string, _wasClean: boolean) {
    if (this.roomId === 'lobby') {
      if (this.lobbyPlayers.has(ws)) {
        this.lobbyPlayers.delete(ws);
        this.broadcastQueueUpdate();
      }
      return;
    }

    // 대전 방에서 한 명이 나간 경우 잔여 인원에게 알림
    const sockets = this.ctx.getWebSockets();
    const leftMsg = JSON.stringify({
      event: 'PLAYER_LEFT',
      payload: {},
    });
    for (const socket of sockets) {
      if (socket !== ws) {
        socket.send(leftMsg);
      }
    }
  }

  async webSocketError(ws: WebSocket, error: unknown) {
    console.error('[GameRoom] WebSocket error:', error);
    ws.close(1011, 'Internal Error');
  }

  // --- 로비 로직 ---
  private handleLobbyMessage(ws: WebSocket, data: { type: string; id?: string; name?: string }) {
    if (data.type === 'JOIN_QUEUE' && data.id && data.name) {
      this.lobbyPlayers.set(ws, {
        id: data.id,
        name: data.name,
        joinedAt: Date.now(),
      });
      this.broadcastQueueUpdate();
      this.tryMatchmaking();
    } else if (data.type === 'LEAVE_QUEUE') {
      this.lobbyPlayers.delete(ws);
      this.broadcastQueueUpdate();
    }
  }

  private broadcastQueueUpdate() {
    const players = Array.from(this.lobbyPlayers.values());
    const payload = JSON.stringify({
      type: 'QUEUE_UPDATE',
      count: players.length,
      names: players.map((p) => p.name),
    });

    const sockets = this.ctx.getWebSockets();
    for (const socket of sockets) {
      socket.send(payload);
    }
  }

  private sendQueueUpdateTo(ws: WebSocket) {
    const players = Array.from(this.lobbyPlayers.values());
    const payload = JSON.stringify({
      type: 'QUEUE_UPDATE',
      count: players.length,
      names: players.map((p) => p.name),
    });
    try {
      ws.send(payload);
    } catch {
      // 소켓 초기 연결 중일 수 있음
    }
  }

  private tryMatchmaking() {
    const entries = Array.from(this.lobbyPlayers.entries());
    if (entries.length < 2) return;

    // FIFO 정렬
    entries.sort((a, b) => a[1].joinedAt - b[1].joinedAt);
    const [p1Ws, p1Data] = entries[0];
    const candidates = entries.slice(1);
    const randomIndex = Math.floor(Math.random() * candidates.length);
    const [p2Ws, p2Data] = candidates[randomIndex];

    // 대기열에서 즉시 제거
    this.lobbyPlayers.delete(p1Ws);
    this.lobbyPlayers.delete(p2Ws);
    this.broadcastQueueUpdate();

    const roomId = `room_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    try {
      p1Ws.send(
        JSON.stringify({
          type: 'MATCH_FOUND',
          roomId,
          myRole: 'p1',
          opponentId: p2Data.id,
          opponentName: p2Data.name,
        })
      );
    } catch (e) {
      console.error('Failed to notify p1:', e);
    }

    try {
      p2Ws.send(
        JSON.stringify({
          type: 'MATCH_FOUND',
          roomId,
          myRole: 'p2',
          opponentId: p1Data.id,
          opponentName: p1Data.name,
        })
      );
    } catch (e) {
      console.error('Failed to notify p2:', e);
    }
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // /room/:roomId 패턴 파싱
    const match = url.pathname.match(/^\/room\/([^/]+)/);
    const roomId = match ? match[1] : 'lobby';

    url.searchParams.set('roomId', roomId);

    const id = env.GAME_ROOM.idFromName(roomId);
    const stub = env.GAME_ROOM.get(id);

    return stub.fetch(new Request(url.toString(), request));
  },
};

