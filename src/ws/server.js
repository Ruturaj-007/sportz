import { WebSocket, WebSocketServer } from "ws"; 
import { wsArcjet } from "../arcjet.js";
import { desc } from "drizzle-orm";

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
            continue; //  SKIP this one client, keep going with the next
        }
        client.send(JSON.stringify(payload));
    }
}

// uses ws server, browser connects to ws://localhost:8000/ws & max 1 MB msg size allowed
export function attachWebSocketServer(server) {
    const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 1024 * 1024 });

    // When someone connects (wss.on('connection')):
    wss.on('connection', async (socket, req) => {
    if (wsArcjet) {
       try {
            const decision = await wsArcjet.protect(req);

            if (decision.isDenied()) {
                if (decision.reason.isRateLimit()) {
                    console.log("RATE LIMIT HIT");
                    socket.write('HTTP/1.1 429 Too Many Requests\r\n\r\n');
                } 
                else {
                    socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
                    error: "Forbidden"
                }
                socket.destroy();
                return;
            }
       } catch (error) {
            console.error('WS upgrade protection error', error);
            socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
            socket.destroy();
            return;
       } 
    }

       socket.isAlive = true;
       socket.on('pong', () => {
            socket.isAlive = true;
       });

       sendJson(socket, {type: 'welcome'});
       
       socket.on('error', console.error)
    });

    const interval = setInterval(() => {
        wss.clients.forEach((ws) => {
            if (ws.isAlive===false) {
                return ws.terminate();
            }

            ws.isAlive = false;
            ws.ping();
        })}, 3000);

        wss.on('close', () => clearInterval(interval));

// Whenever new match is created notify all connected users every fan will see the new match instantly     
    function broadcastMatchCreated(match) {
        broadcast(wss, {
            type: 'match_created',
            data: match
        });
    }

    return { broadcastMatchCreated }
}

