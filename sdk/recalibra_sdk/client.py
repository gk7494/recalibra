"""Async client for the Recalibra API."""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import Any, AsyncIterator

import httpx


class RecalibraClient:
    """Wrapper around HTTP endpoints exposed by the Recalibra API."""

    def __init__(self, base_url: str, api_token: str | None = None, timeout: float = 30.0) -> None:
        headers = {"Authorization": f"Bearer {api_token}"} if api_token else None
        self._client = httpx.AsyncClient(base_url=base_url, headers=headers, timeout=timeout)

    async def close(self) -> None:
        await self._client.aclose()

    @asynccontextmanager
    async def session(self) -> AsyncIterator["RecalibraClient"]:
        try:
            yield self
        finally:
            await self.close()

    async def health(self) -> dict[str, Any]:
        response = await self._client.get("/health")
        response.raise_for_status()
        return response.json()

    async def ingest(self) -> dict[str, Any]:
        response = await self._client.post("/ingest/run")
        response.raise_for_status()
        return response.json()

    async def metrics(self) -> dict[str, Any]:
        response = await self._client.get("/metrics/latest")
        response.raise_for_status()
        return response.json()

    async def recalibrate(self) -> dict[str, Any]:
        response = await self._client.post("/recalibrate")
        response.raise_for_status()
        return response.json()


__all__ = ["RecalibraClient"]

