#!/usr/bin/env python3
"""
Quick test to verify FastAPI is working
"""

from fastapi import FastAPI
import uvicorn

app = FastAPI()

@app.get("/")
def root():
    return {"message": "FastAPI is working!", "status": "ok"}

@app.get("/test")
def test():
    return {"test": "success", "fastapi": "working"}

if __name__ == "__main__":
    print("🚀 Starting FastAPI test server...")
    print("📍 Test server: http://localhost:8001")
    print("📍 Test endpoint: http://localhost:8001/test")
    print("Press Ctrl+C to stop")
    uvicorn.run(app, host="0.0.0.0", port=8001)

