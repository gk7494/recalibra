## Recalibra SDK (Python)

Lightweight async client for integrating with the Recalibra API.

### Usage

```python
import asyncio
from recalibra_sdk import RecalibraClient


async def main():
    async with RecalibraClient("http://localhost:8000").session() as client:
        health = await client.health()
        print("status:", health)
        ingest_result = await client.ingest()
        print("ingested:", ingest_result["ingested"])


asyncio.run(main())
```

### TODO

- Provide sync wrapper for simple scripts.
- Add CLI commands via Typer.
- Package and publish to PyPI.

