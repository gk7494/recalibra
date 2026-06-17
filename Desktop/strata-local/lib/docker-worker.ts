import { execFile } from "child_process";
import { promisify } from "util";
import { getOllamaBackendInfo } from "./inference-backend";

const execFileAsync = promisify(execFile);

let startAttempt: Promise<void> | null = null;

async function canReachWorker(baseUrl: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1200);

  try {
    const response = await fetch(`${baseUrl}/api/tags`, {
      method: "GET",
      signal: controller.signal,
    });

    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export async function ensureDockerVisionWorkerStarted() {
  if (process.env.STRATA_AUTO_START_DOCKER_WORKER !== "true") return;

  const backend = getOllamaBackendInfo("vision");
  const isLocalDockerPort =
    backend.baseUrl === "http://localhost:11435" ||
    backend.baseUrl === "http://127.0.0.1:11435";

  if (!isLocalDockerPort || (await canReachWorker(backend.baseUrl))) return;

  startAttempt ||= execFileAsync(
    "docker",
    ["compose", "-f", "docker-compose.inference.yml", "up", "-d"],
    {
      cwd: process.cwd(),
      timeout: 120_000,
    }
  )
    .then(() => undefined)
    .finally(() => {
      startAttempt = null;
    });

  await startAttempt;
}
