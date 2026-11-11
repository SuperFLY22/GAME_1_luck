/**
 * Cloudflare Workers WebSocket 호스트 설정
 * 로컬: localhost:8787
 * 배포 후: cham-game-server.<subdomain>.workers.dev
 */
export const WS_HOST = import.meta.env.VITE_WS_HOST || 'localhost:8787';

export function getWebSocketUrl(roomId: string): string {
  const isSecure =
    window.location.protocol === 'https:' || !WS_HOST.includes('localhost');
  const protocol = isSecure ? 'wss:' : 'ws:';
  // WS_HOST에 이미 프로토콜(http:// 또는 ws://)이 붙어있는 경우 처리
  const cleanHost = WS_HOST.replace(/^https?:\/\//, '').replace(/^wss?:\/\//, '');
  return `${protocol}//${cleanHost}/room/${encodeURIComponent(roomId)}`;
}

