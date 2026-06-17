import { OllamaTask, getOllamaBaseUrl, ollamaFetch } from "./inference-backend";

type OllamaTag = {
  name?: string;
  model?: string;
  size?: number;
  details?: {
    parameter_size?: string;
    family?: string;
    families?: string[];
    quantization_level?: string;
  };
};

export type LocalModelInfo = {
  name: string;
  size?: number;
  parameterSize?: string;
  family?: string;
  quantization?: string;
};

export type ModelCandidate = {
  name: string;
  label: string;
  task: "vision" | "ticket";
  tier: "best" | "balanced" | "fallback";
  defaultEnabled?: boolean;
};

export const VISION_MODEL_CANDIDATES: ModelCandidate[] = [
  {
    name: "qwen3-vl:32b",
    label: "Qwen3-VL 32B",
    task: "vision",
    tier: "best",
  },
  {
    name: "qwen3-vl:30b",
    label: "Qwen3-VL 30B",
    task: "vision",
    tier: "best",
  },
  {
    name: "qwen3-vl:8b",
    label: "Qwen3-VL 8B",
    task: "vision",
    tier: "balanced",
  },
  {
    name: "qwen3-vl:4b",
    label: "Qwen3-VL 4B",
    task: "vision",
    tier: "balanced",
  },
  {
    name: "qwen2.5vl:32b",
    label: "Qwen2.5-VL 32B",
    task: "vision",
    tier: "best",
  },
  {
    name: "gemma3:27b",
    label: "Gemma 3 27B",
    task: "vision",
    tier: "best",
  },
  {
    name: "qwen2.5vl:7b",
    label: "Qwen2.5-VL 7B",
    task: "vision",
    tier: "balanced",
  },
  {
    name: "gemma3:12b",
    label: "Gemma 3 12B",
    task: "vision",
    tier: "balanced",
  },
  {
    name: "llama3.2-vision:11b",
    label: "Llama 3.2 Vision 11B",
    task: "vision",
    tier: "balanced",
  },
  {
    name: "llama3.2-vision:latest",
    label: "Llama 3.2 Vision",
    task: "vision",
    tier: "balanced",
  },
  {
    name: "gemma3:4b",
    label: "Gemma 3 4B",
    task: "vision",
    tier: "fallback",
  },
  {
    name: "llava:7b",
    label: "LLaVA 7B",
    task: "vision",
    tier: "fallback",
  },
];

export const TICKET_MODEL_CANDIDATES: ModelCandidate[] = [
  {
    name: "gpt-oss:20b",
    label: "GPT OSS 20B",
    task: "ticket",
    tier: "best",
  },
  {
    name: "gemma3:12b",
    label: "Gemma 3 12B",
    task: "ticket",
    tier: "balanced",
  },
  {
    name: "llama3.2:3b",
    label: "Llama 3.2 3B",
    task: "ticket",
    tier: "fallback",
  },
];

const installedModelCache = new Map<
  string,
  {
    expiresAt: number;
    models: LocalModelInfo[];
  }
>();

function normalizeModelName(value: string) {
  return value.trim().toLowerCase();
}

function modelMatches(installedName: string, candidateName: string) {
  const installed = normalizeModelName(installedName);
  const candidate = normalizeModelName(candidateName);

  if (installed === candidate) return true;

  const [base, tag] = candidate.split(":");
  if (tag === "latest" && installed === base) return true;
  if (!candidate.includes(":") && installed.startsWith(`${candidate}:`)) {
    return true;
  }

  return false;
}

export async function getInstalledOllamaModels(
  task: OllamaTask = "vision"
): Promise<LocalModelInfo[]> {
  const cacheKey = `${task}:${getOllamaBaseUrl(task)}`;
  const cached = installedModelCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.models;
  }

  const response = await ollamaFetch(task, "/api/tags", {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error("Unable to read local Ollama model registry.");
  }

  const data = (await response.json()) as { models?: OllamaTag[] };
  const models = (data.models || [])
    .map((model) => ({
      name: model.name || model.model || "",
      size: model.size,
      parameterSize: model.details?.parameter_size,
      family: model.details?.family,
      quantization: model.details?.quantization_level,
    }))
    .filter((model) => model.name);

  installedModelCache.set(cacheKey, {
    expiresAt: Date.now() + 30_000,
    models,
  });

  return models;
}

export function pickInstalledCandidates(
  installed: LocalModelInfo[],
  candidates: ModelCandidate[]
) {
  return candidates
    .map((candidate) => {
      const installedModel = installed.find((model) =>
        modelMatches(model.name, candidate.name)
      );

      if (!installedModel) return null;

      return {
        ...candidate,
        installedName: installedModel.name,
        size: installedModel.size,
        parameterSize: installedModel.parameterSize,
        quantization: installedModel.quantization,
      };
    })
    .filter(Boolean) as Array<
    ModelCandidate & {
      installedName: string;
      size?: number;
      parameterSize?: string;
      quantization?: string;
    }
  >;
}

export function getDefaultVisionCandidates() {
  const includeExperimental =
    process.env.STRATA_ENABLE_EXPERIMENTAL_VISION_MODELS === "true";

  return VISION_MODEL_CANDIDATES.filter(
    (candidate) => includeExperimental || candidate.defaultEnabled !== false
  );
}

export function getDefaultVisionModelLimit() {
  const requestedLimit = Number(process.env.STRATA_VISION_ENSEMBLE || "3");
  return Number.isFinite(requestedLimit) ? Math.max(1, requestedLimit) : 3;
}

export async function resolveVisionModels(limit = getDefaultVisionModelLimit()) {
  const installed = await getInstalledOllamaModels("vision");
  return pickInstalledCandidates(installed, getDefaultVisionCandidates()).slice(
    0,
    limit
  );
}

export async function resolveTicketModels() {
  const installed = await getInstalledOllamaModels("ticket");
  return pickInstalledCandidates(installed, TICKET_MODEL_CANDIDATES);
}
