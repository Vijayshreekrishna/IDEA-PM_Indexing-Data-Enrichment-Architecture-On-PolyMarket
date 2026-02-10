import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';

const jsonReplacer = (key: string, value: any) =>
    typeof value === 'bigint' ? value.toString() : value;

let wss: WebSocketServer | null = null;

export function initWebSocket(server: Server) {
    wss = new WebSocketServer({ server, path: '/ws' });

    wss.on('connection', (ws: WebSocket) => {
        console.log('[WS] Client connected');

        ws.on('close', () => {
            console.log('[WS] Client disconnected');
        });

        ws.on('error', (error) => {
            console.error('[WS] Error:', error);
        });
    });

    console.log('[WS] WebSocket server initialized on /ws');
}

export function broadcastEvent(event: any) {
    if (!wss) return;

    const message = JSON.stringify({
        type: 'NEW_EVENT',
        data: event
    }, jsonReplacer);

    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

export function broadcastTrade(trade: any) {
    if (!wss) return;

    const message = JSON.stringify({
        type: 'NEW_TRADE',
        data: trade
    }, jsonReplacer);

    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}
