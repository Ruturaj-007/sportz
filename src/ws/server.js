import { WebSocket, WebSocketServer } from "ws"; 

function sendJson(socket, payload) {
    if (socket.readyState !== WebSocket.OPEN) {
        return;
    }
    socket.send(JSON.stringify(payload))
}

// Send same message to all connected clients
function broadcast(wss, payload) {
    for (const client of wss.clients) {
        if (client.readyState !== WebSocket.OPEN) {
            continue;
        }
        client.send(JSON.stringify(payload));
    }
}

// uses ws server, browser connects to ws://localhost:8000/ws & max 1 MB msg size allowed
export function attachWebSocketServer(server) {
    const wss = new WebSocketServer({
        server, 
        path: '/ws',
        maxPayload: 1024 * 1024 
    });

    wss.on('connection', (socket) => {
        sendJson(socket, { type: 'welcome' });
        socket.on('error', (err) => {
            console.error('Websocket Error', err)
        })
    });

// Whenever new match is created notify all connected users     
    function broadcastMatchCreated(match) {
        broadcast(wss, {
            type: 'match_created',
            data: match
        });
    }

    return { broadcastMatchCreated }
}

