# Strata Local

Strata is a local-first industrial inspection and corrective-action register. It captures field notes, photos, camera images, live/audio transcription, image evidence, OCR text from labels/tags/nameplates, and structured report fields.

## Run the App

```bash
npm install
npm run dev -- -p 3001
```

Open http://localhost:3001.

## Local Model Mode

By default Strata uses Ollama on `http://localhost:11434`.

Recommended local models:

```bash
ollama pull qwen3-vl:32b
ollama pull qwen2.5vl:32b
ollama pull gemma3:27b
ollama pull gpt-oss:20b
```

The default photo-analysis ensemble uses the best three installed vision models.

## Docker Worker Mode

Keep a warm Ollama worker running instead of starting a new container for every photo. On this laptop, use the regular worker. On an NVIDIA GPU workstation or GPU VM, use the GPU override.

```bash
npm run model:worker
```

For a GPU host:

```bash
npm run model:gpu
```

The worker listens on `http://localhost:11435`, reuses the host `~/.ollama` model cache, and ensures these models are present:

```text
qwen3-vl:32b qwen2.5vl:32b gemma3:27b gpt-oss:20b
```

Then restart the Next.js app with:

```bash
STRATA_VISION_OLLAMA_BASE_URL=http://localhost:11435 npm run dev -- -p 3001
```

To let the app start the worker on the first photo-analysis request, restart with:

```bash
STRATA_VISION_OLLAMA_BASE_URL=http://localhost:11435 \
STRATA_AUTO_START_DOCKER_WORKER=true \
npm run dev -- -p 3001
```

This still uses a warm worker model: the first request may start Docker, but subsequent photos reuse the running container.

Useful commands:

```bash
npm run model:gpu:logs
npm run model:gpu:down
npm run model:worker:logs
npm run model:worker:down
```

Notes:

- Docker GPU mode requires a Docker host with GPU support, such as NVIDIA Container Toolkit on Linux.
- Docker Desktop on a Mac usually will not expose NVIDIA GPUs to containers.
- Claude is not a local Docker model; it is a hosted API service. Use the Ollama worker path for private/local GPU inference.

## Remote GPU Worker

If the model runs on another machine:

```bash
STRATA_VISION_OLLAMA_BASE_URL=http://gpu-worker.example.com:11434 npm run dev -- -p 3001
```

Ticket/report generation can stay local or use separate endpoints:

```bash
STRATA_TICKET_OLLAMA_BASE_URL=http://localhost:11434
STRATA_REPORT_OLLAMA_BASE_URL=http://localhost:11434
```

## Checks

```bash
npm run lint
npm run build
curl -s http://localhost:3001/api/model-status
```
