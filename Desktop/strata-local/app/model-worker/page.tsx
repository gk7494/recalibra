import Link from "next/link";
import { ArrowLeft, CheckCircle2, Cpu, Server, TriangleAlert } from "lucide-react";
import {
  getDefaultVisionCandidates,
  getDefaultVisionModelLimit,
  getInstalledOllamaModels,
  pickInstalledCandidates,
  TICKET_MODEL_CANDIDATES,
} from "@/lib/model-registry";
import { getOllamaBackendInfo } from "@/lib/inference-backend";

export const dynamic = "force-dynamic";

async function loadWorkerStatus() {
  try {
    const [visionInstalled, ticketInstalled] = await Promise.all([
      getInstalledOllamaModels("vision"),
      getInstalledOllamaModels("ticket"),
    ]);
    const visionModels = pickInstalledCandidates(
      visionInstalled,
      getDefaultVisionCandidates()
    ).slice(0, getDefaultVisionModelLimit());
    const ticketModels = pickInstalledCandidates(
      ticketInstalled,
      TICKET_MODEL_CANDIDATES
    ).slice(0, 1);

    return {
      ok: true,
      error: "",
      backend: {
        vision: getOllamaBackendInfo("vision"),
        ticket: getOllamaBackendInfo("ticket"),
      },
      installed: {
        vision: visionInstalled,
        ticket: ticketInstalled,
      },
      selected: {
        vision: visionModels,
        ticket: ticketModels,
      },
    };
  } catch (error: unknown) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to reach the model worker.",
      backend: {
        vision: getOllamaBackendInfo("vision"),
        ticket: getOllamaBackendInfo("ticket"),
      },
      installed: {
        vision: [],
        ticket: [],
      },
      selected: {
        vision: [],
        ticket: [],
      },
    };
  }
}

function formatBytes(value?: number) {
  if (!value) return "Unknown size";
  const gb = value / 1024 / 1024 / 1024;
  return `${gb.toFixed(gb >= 10 ? 0 : 1)} GB`;
}

function formatMode(mode: string) {
  if (mode === "worker") return "Managed worker";
  if (mode === "docker") return "Docker worker";
  if (mode === "remote") return "Remote GPU worker";
  return "Local Ollama";
}

export default async function ModelWorkerPage() {
  const status = await loadWorkerStatus();
  const selectedVision = status.selected.vision;

  return (
    <main className="min-h-screen bg-[#edf1ef] text-zinc-950">
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
        <header className="mb-4 overflow-hidden rounded-lg border border-zinc-200 bg-[#f8faf8] shadow-sm">
          <div className="flex flex-col gap-4 px-4 py-4 sm:px-5 md:flex-row md:items-center md:justify-between">
            <div>
              <Link
                href="/"
                className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-950"
              >
                <ArrowLeft size={16} />
                Inspection register
              </Link>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-semibold uppercase text-zinc-500">
                  Strata
                </p>
                <span className="rounded-md border border-zinc-300 bg-white px-2 py-0.5 text-xs font-medium text-zinc-700">
                  Model worker
                </span>
              </div>
              <h1 className="mt-1 text-2xl font-semibold tracking-normal">
                Local inference status
              </h1>
            </div>
            <span
              className={`inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-semibold ${
                status.ok
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {status.ok ? <CheckCircle2 size={17} /> : <TriangleAlert size={17} />}
              {status.ok ? "Online" : "Offline"}
            </span>
          </div>
        </header>

        {!status.ok && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {status.error}
          </div>
        )}

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-zinc-200 bg-[#fbfcfb] px-4 py-3">
              <div className="flex items-center gap-2">
                <Cpu size={18} className="text-emerald-700" />
                <h2 className="text-sm font-semibold">Vision analysis worker</h2>
              </div>
              <span className="rounded bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-600">
                {formatMode(status.backend.vision.mode)}
              </span>
            </div>
            <div className="space-y-4 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <InfoBlock label="Endpoint" value={status.backend.vision.baseUrl} />
                <InfoBlock
                  label="Consensus models"
                  value={`${selectedVision.length}/${getDefaultVisionModelLimit()}`}
                />
              </div>

              <div className="overflow-hidden rounded-lg border border-zinc-200">
                <div className="grid grid-cols-[minmax(0,1fr)_120px_100px] gap-3 bg-zinc-50 px-3 py-2 text-xs font-semibold uppercase text-zinc-500">
                  <span>Model</span>
                  <span>Parameters</span>
                  <span>Size</span>
                </div>
                <div className="divide-y divide-zinc-100">
                  {selectedVision.map((model) => (
                    <div
                      key={model.installedName}
                      className="grid grid-cols-[minmax(0,1fr)_120px_100px] gap-3 px-3 py-3 text-sm"
                    >
                      <span className="truncate font-medium text-zinc-950">
                        {model.label}
                      </span>
                      <span className="text-zinc-600">
                        {model.parameterSize || "Unknown"}
                      </span>
                      <span className="text-zinc-600">
                        {formatBytes(model.size)}
                      </span>
                    </div>
                  ))}
                  {selectedVision.length === 0 && (
                    <div className="px-3 py-6 text-sm text-zinc-600">
                      No selected vision models were found on this worker.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-zinc-200 bg-[#fbfcfb] px-4 py-3">
                <Server size={18} className="text-emerald-700" />
                <h2 className="text-sm font-semibold">Ticket model</h2>
              </div>
              <div className="space-y-3 p-4">
                <InfoBlock label="Endpoint" value={status.backend.ticket.baseUrl} />
                <InfoBlock
                  label="Selected"
                  value={
                    status.selected.ticket[0]?.label ||
                    "No ticket model available"
                  }
                />
                <InfoBlock
                  label="Installed models"
                  value={`${status.installed.vision.length} vision / ${status.installed.ticket.length} ticket`}
                />
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
      <p className="text-xs font-semibold uppercase text-zinc-500">{label}</p>
      <p className="mt-1 break-words text-sm font-medium text-zinc-950">
        {value}
      </p>
    </div>
  );
}
