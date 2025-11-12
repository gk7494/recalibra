"""
WebSocket manager for real-time updates
"""

from typing import List, Dict, Set
from fastapi import WebSocket, WebSocketDisconnect
import json
from datetime import datetime


class ConnectionManager:
    """Manages WebSocket connections for real-time updates"""
    
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.subscriptions: Dict[WebSocket, Set[str]] = {}  # WebSocket -> set of topics
    
    async def connect(self, websocket: WebSocket):
        """Accept a new WebSocket connection"""
        await websocket.accept()
        self.active_connections.append(websocket)
        self.subscriptions[websocket] = set()
        print(f"✅ WebSocket connected. Total connections: {len(self.active_connections)}")
    
    def disconnect(self, websocket: WebSocket):
        """Remove a WebSocket connection"""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        if websocket in self.subscriptions:
            del self.subscriptions[websocket]
        print(f"✅ WebSocket disconnected. Total connections: {len(self.active_connections)}")
    
    def subscribe(self, websocket: WebSocket, topic: str):
        """Subscribe a connection to a topic"""
        if websocket in self.subscriptions:
            self.subscriptions[websocket].add(topic)
    
    def unsubscribe(self, websocket: WebSocket, topic: str):
        """Unsubscribe a connection from a topic"""
        if websocket in self.subscriptions:
            self.subscriptions[websocket].discard(topic)
    
    async def send_personal_message(self, message: str, websocket: WebSocket):
        """Send a message to a specific connection"""
        try:
            await websocket.send_text(message)
        except Exception as e:
            print(f"❌ Error sending message: {e}")
            self.disconnect(websocket)
    
    async def broadcast(self, message: Dict, topic: str = None):
        """Broadcast a message to all connections (optionally filtered by topic)"""
        message_json = json.dumps(message)
        disconnected = []
        
        for connection in self.active_connections:
            # If topic specified, only send to subscribers
            if topic:
                if connection in self.subscriptions and topic in self.subscriptions[connection]:
                    try:
                        await connection.send_text(message_json)
                    except Exception as e:
                        print(f"❌ Error broadcasting to connection: {e}")
                        disconnected.append(connection)
            else:
                # Broadcast to all
                try:
                    await connection.send_text(message_json)
                except Exception as e:
                    print(f"❌ Error broadcasting to connection: {e}")
                    disconnected.append(connection)
        
        # Clean up disconnected connections
        for conn in disconnected:
            self.disconnect(conn)
    
    async def broadcast_drift_check(self, model_id: str, drift_detected: bool, metrics: Dict):
        """Broadcast a drift check result"""
        await self.broadcast({
            "type": "drift_check",
            "model_id": model_id,
            "drift_detected": drift_detected,
            "metrics": metrics,
            "timestamp": datetime.utcnow().isoformat() + 'Z'
        }, topic=f"drift:{model_id}")
    
    async def broadcast_sync(self, source: str, count: int, entity_type: str):
        """Broadcast a sync event"""
        await self.broadcast({
            "type": "sync",
            "source": source,
            "count": count,
            "entity_type": entity_type,
            "timestamp": datetime.utcnow().isoformat() + 'Z'
        }, topic="sync")
    
    async def broadcast_retrain(self, model_id: str, metrics: Dict):
        """Broadcast a model retraining event"""
        await self.broadcast({
            "type": "retrain",
            "model_id": model_id,
            "metrics": metrics,
            "timestamp": datetime.utcnow().isoformat() + 'Z'
        }, topic=f"retrain:{model_id}")


# Global instance
manager = ConnectionManager()


