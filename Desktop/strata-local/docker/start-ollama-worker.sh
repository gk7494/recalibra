#!/bin/sh
set -eu

models="${STRATA_PULL_MODELS:-qwen3-vl:32b qwen2.5vl:32b gemma3:27b gpt-oss:20b}"

ollama serve &
server_pid="$!"

until ollama list >/dev/null 2>&1; do
  sleep 1
done

for model in $models; do
  echo "Ensuring Ollama model is available: $model"
  ollama pull "$model"
done

wait "$server_pid"
