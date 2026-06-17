export type OllamaTask = "vision" | "ticket" | "report";

const DEFAULT_OLLAMA_BASE_URL = "http://localhost:11434";
const DEFAULT_VISION_WORKER_BASE_URL = "http://localhost:11435";

function normalizeBaseUrl(value?: string) {
  return (value || DEFAULT_OLLAMA_BASE_URL).replace(/\/+$/, "");
}

export function getOllamaBaseUrl(task: OllamaTask = "vision") {
  if (task === "vision") {
    return normalizeBaseUrl(
      process.env.STRATA_VISION_OLLAMA_BASE_URL ||
        process.env.STRATA_OLLAMA_BASE_URL ||
        DEFAULT_VISION_WORKER_BASE_URL
    );
  }

  if (task === "ticket") {
    return normalizeBaseUrl(
      process.env.STRATA_TICKET_OLLAMA_BASE_URL ||
        process.env.STRATA_OLLAMA_BASE_URL
    );
  }

  return normalizeBaseUrl(
    process.env.STRATA_REPORT_OLLAMA_BASE_URL ||
      process.env.STRATA_TICKET_OLLAMA_BASE_URL ||
      process.env.STRATA_OLLAMA_BASE_URL
  );
}

export function getOllamaBackendInfo(task: OllamaTask = "vision") {
  const baseUrl = getOllamaBaseUrl(task);
  const isLocal =
    baseUrl.includes("localhost") ||
    baseUrl.includes("127.0.0.1") ||
    baseUrl.includes("::1");
  const isDocker = baseUrl.includes("host.docker.internal");
  const isWorker =
    baseUrl.includes("localhost:11435") ||
    baseUrl.includes("127.0.0.1:11435");

  return {
    task,
    baseUrl,
    mode: isDocker ? "docker" : isWorker ? "worker" : isLocal ? "local" : "remote",
  };
}

export async function ollamaFetch(
  task: OllamaTask,
  path: string,
  init?: RequestInit
) {
  const baseUrl = getOllamaBaseUrl(task);
  const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  return fetch(url, init);
}
