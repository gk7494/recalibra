"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Camera,
  HardHat,
  CheckCircle2,
  ClipboardList,
  FilePlus2,
  ImageIcon,
  Loader2,
  MapPin,
  Mic,
  Save,
  ShieldAlert,
  Tag,
  UploadCloud,
  X,
} from "lucide-react";

type UploadedFile = {
  filename: string;
  filePath: string;
  publicPath: string;
};

type VisualFinding = {
  label: string;
  observation: string;
  category: string;
  confidence: "low" | "medium" | "high";
  visibleEvidence?: string[];
  recommendedVerification?: string;
  actionHint?: string;
  verification?: "accepted" | "review" | "field_verify";
  qualityFlags?: string[];
  sourceModels?: string[];
  evidenceScore?: number;
  bbox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
};

type ImageQualityReport = {
  width: number;
  height: number;
  brightness: number;
  contrast: number;
  sharpness: number;
  status: "usable" | "review" | "retake";
  flags: string[];
};

type ImageDescription = {
  imagePath: string;
  description: string;
  model?: string;
  modelsUsed?: string[];
  analysisConfidence?: "low" | "medium" | "high";
  imageQuality?: ImageQualityReport;
  reviewNotes?: string[];
  visualFindings?: VisualFinding[];
};

type InspectionContext = {
  matchedPatterns: string[];
  similarIssues: {
    title: string;
    category: string;
    severity: string;
    location: string;
    asset_name: string;
    recommended_action: string;
    created_at: string;
  }[];
  guidance: string[];
};

type GeneratedTicket = {
  title: string;
  description: string;
  location: string;
  asset_name: string;
  category: string;
  severity: "low" | "medium" | "high" | "critical";
  recommended_action: string;
  suggested_assignee_role: string;
  due_date_priority: string;
  inspection_type: string;
  inspection_standard: string;
  observation: string;
  hazard_category: string;
  regulatory_reference: string;
  affected_area: string;
  activity_before_event: string;
  what_happened: string;
  object_or_substance: string;
  injury_or_illness: string;
  exposed_persons: string;
  likelihood: "unlikely" | "possible" | "likely";
  risk_priority: string;
  immediate_action_taken: string;
  corrective_action: string;
  responsible_party: string;
  verification_status:
    | "open"
    | "corrected_not_verified"
    | "corrected_verified"
    | "promised_to_correct";
  recordkeeping_notes: string;
  visual_findings: VisualFinding[];
};

type FieldContext = {
  company: string;
  worksite: string;
  siteArea: string;
  unit: string;
  shift: string;
  inspector: string;
  inspectionDate: string;
  assetTag: string;
  exactLocation: string;
};

const hazardTags = [
  "Electrical",
  "Machine guarding",
  "Lockout/tagout",
  "Housekeeping",
  "Slip/trip/fall",
  "Access/egress",
  "Fire protection",
  "Chemical/HazCom",
  "Compressed gas",
  "PPE",
  "Materials handling",
  "Corrosion/leak",
  "Walking-working surface",
];

const emptyFieldContext: FieldContext = {
  company: "",
  worksite: "",
  siteArea: "",
  unit: "",
  shift: "",
  inspector: "",
  inspectionDate: "",
  assetTag: "",
  exactLocation: "",
};

export default function NewIssuePage() {
  const router = useRouter();

  const [fieldContext, setFieldContext] =
    useState<FieldContext>(emptyFieldContext);
  const [quickTags, setQuickTags] = useState<string[]>([]);
  const [rawNote, setRawNote] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [capturedFiles, setCapturedFiles] = useState<File[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [imageDescriptions, setImageDescriptions] = useState<ImageDescription[]>(
    []
  );
  const [inspectionContext, setInspectionContext] =
    useState<InspectionContext | null>(null);
  const [ticket, setTicket] = useState<GeneratedTicket | null>(null);

  const [uploading, setUploading] = useState(false);
  const [analyzingImages, setAnalyzingImages] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [liveListening, setLiveListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [liveTranscriptStatus, setLiveTranscriptStatus] = useState("");
  const [liveChunkPending, setLiveChunkPending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const liveRecorderRef = useRef<MediaRecorder | null>(null);
  const liveAudioStreamRef = useRef<MediaStream | null>(null);
  const liveChunkCountRef = useRef(0);

  const allVisualFindings = useMemo(
    () =>
      imageDescriptions.flatMap(
        (description) => description.visualFindings || []
      ),
    [imageDescriptions]
  );

  const contextFieldCount = Object.values(fieldContext).filter(Boolean).length;
  const photoQualitySummary = getPhotoQualitySummary(imageDescriptions);

  const composedRawNote = useMemo(
    () => buildFieldPacket(fieldContext, quickTags, rawNote),
    [fieldContext, quickTags, rawNote]
  );

  function resetDraftArtifacts() {
    setImageDescriptions([]);
    setInspectionContext(null);
    setTicket(null);
  }

  function updateFieldContext<K extends keyof FieldContext>(
    field: K,
    value: FieldContext[K]
  ) {
    setFieldContext({
      ...fieldContext,
      [field]: value,
    });
    resetDraftArtifacts();
  }

  function toggleQuickTag(tag: string) {
    setQuickTags((current) =>
      current.includes(tag)
        ? current.filter((item) => item !== tag)
        : [...current, tag]
    );
      resetDraftArtifacts();
  }

  function resetPhotoArtifacts() {
    setUploadedFiles([]);
    setImageDescriptions([]);
    setInspectionContext(null);
    setTicket(null);
  }

  function appendDictation(text: string) {
    const cleanText = text.trim();
    if (!cleanText) return;

    setRawNote((current) =>
      [current.trim(), cleanText].filter(Boolean).join(current.trim() ? " " : "")
    );
    resetDraftArtifacts();
  }

  function stopLiveTranscription() {
    liveRecorderRef.current?.stop();
    liveRecorderRef.current = null;
    liveAudioStreamRef.current?.getTracks().forEach((track) => track.stop());
    liveAudioStreamRef.current = null;
    setLiveListening(false);
    setLiveTranscript("");
    setLiveTranscriptStatus("Live transcription stopped");
  }

  async function transcribeLiveChunk(blob: Blob) {
    if (blob.size < 1024) return;

    const chunkNumber = liveChunkCountRef.current + 1;
    liveChunkCountRef.current = chunkNumber;
    const extension = blob.type.includes("mp4")
      ? "m4a"
      : blob.type.includes("ogg")
      ? "ogg"
      : "webm";
    const file = new File([blob], `live-note-${Date.now()}-${chunkNumber}.${extension}`, {
      type: blob.type || "audio/webm",
    });
    const formData = new FormData();
    formData.append("audio", file);

    try {
      setLiveChunkPending(true);
      setLiveTranscriptStatus("Transcribing recent audio locally");

      const res = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Live transcription failed.");
      }

      const transcript = String(data.transcript || "").trim();
      if (transcript) {
        appendDictation(transcript);
        setLiveTranscript(transcript);
      }

      if (liveRecorderRef.current?.state === "recording") {
        setLiveTranscriptStatus("Listening");
      }
    } catch (err: unknown) {
      setLiveTranscriptStatus(
        err instanceof Error
          ? err.message
          : "Live transcription failed. Use the audio file fallback."
      );
    } finally {
      setLiveChunkPending(false);
    }
  }

  async function startLiveTranscription() {
    try {
      liveRecorderRef.current?.stop();
      liveRecorderRef.current = null;
      liveAudioStreamRef.current?.getTracks().forEach((track) => track.stop());
      liveAudioStreamRef.current = null;
      setLiveTranscript("");
      setLiveTranscriptStatus("Requesting microphone access");

      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
        setLiveTranscriptStatus(
          "Live transcription is not available in this browser. Use the audio file transcription fallback."
        );
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
      const mimeType = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
      ].find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined
      );

      liveAudioStreamRef.current = stream;
      liveRecorderRef.current = recorder;
      liveChunkCountRef.current = 0;

      recorder.onstart = () => {
        setLiveListening(true);
        setLiveTranscriptStatus("Listening");
      };

      recorder.onstop = () => {
        liveAudioStreamRef.current?.getTracks().forEach((track) => track.stop());
        liveAudioStreamRef.current = null;
        liveRecorderRef.current = null;
        setLiveListening(false);
      };

      recorder.onerror = () => {
        setLiveTranscriptStatus(
          "Microphone recording stopped. Use the audio file fallback if this repeats."
        );
      };

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          void transcribeLiveChunk(event.data);
        }
      };

      recorder.start(8000);
    } catch (err: unknown) {
      setLiveListening(false);
      liveAudioStreamRef.current?.getTracks().forEach((track) => track.stop());
      liveAudioStreamRef.current = null;
      const message = err instanceof Error ? err.message : "";
      const name = err instanceof Error ? err.name : "";
      setLiveTranscriptStatus(
        name === "NotAllowedError" ||
          message.toLowerCase().includes("permission denied")
          ? "Microphone permission was denied. Allow microphone access for Codex or this browser in macOS Settings and for localhost in site settings, then press Start live transcription again."
          : message || "Unable to start live transcription."
      );
    }
  }

  async function startCamera() {
    try {
      setCameraError("");
      setCameraReady(false);

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera capture is not available in this browser.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      cameraStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraReady(true);
    } catch (err: unknown) {
      setCameraReady(false);
      setCameraError(
        err instanceof Error
          ? err.message
          : "Camera permission was denied or the camera is unavailable."
      );
    }
  }

  function stopCamera() {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    setCameraReady(false);

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  function closeCamera() {
    stopCamera();
    setCameraOpen(false);
  }

  function openCamera() {
    setCameraOpen(true);
    window.setTimeout(() => {
      void startCamera();
    }, 0);
  }

  useEffect(() => {
    return () => {
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
      liveRecorderRef.current?.stop();
      liveRecorderRef.current = null;
      liveAudioStreamRef.current?.getTracks().forEach((track) => track.stop());
      liveAudioStreamRef.current = null;
    };
  }, []);

  async function captureCameraPhoto() {
    const video = videoRef.current;
    if (!video || !cameraReady || video.videoWidth === 0 || video.videoHeight === 0) {
      setCameraError("Camera is not ready yet.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");

    if (!context) {
      setCameraError("Unable to capture from the camera.");
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.92)
    );

    if (!blob) {
      setCameraError("Unable to save the captured photo.");
      return;
    }

    const filename = `field-camera-${Date.now()}.jpg`;
    const file = new File([blob], filename, { type: "image/jpeg" });
    setCapturedFiles((current) => [...current, file]);
    resetPhotoArtifacts();
  }

  async function handleTranscribeAudio() {
    if (!audioFile) return;

    try {
      setTranscribing(true);
      setError("");

      const formData = new FormData();
      formData.append("audio", audioFile);

      const res = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to transcribe audio.");
      }

      const transcript = String(data.transcript || "").trim();
      setRawNote((current) => [current.trim(), transcript].filter(Boolean).join("\n"));
      resetDraftArtifacts();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setTranscribing(false);
    }
  }

  async function uploadImages(): Promise<UploadedFile[]> {
    const photos = [...files, ...capturedFiles];
    if (photos.length === 0) return uploadedFiles;
    if (uploadedFiles.length > 0) return uploadedFiles;

    setUploading(true);
    setError("");

    const formData = new FormData();

    for (const file of photos) {
      formData.append("files", file);
    }

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    setUploading(false);

    if (!res.ok) {
      throw new Error(data.error || "Failed to upload photos.");
    }

    setUploadedFiles(data.files || []);
    return data.files || [];
  }

  async function analyzeImages(filesToAnalyze: UploadedFile[]) {
    if (!filesToAnalyze.length) return [];
    if (imageDescriptions.length > 0) return imageDescriptions;

    setAnalyzingImages(true);
    setError("");

    const res = await fetch("/api/analyze-image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        imagePaths: filesToAnalyze.map((file) => file.filePath),
        rawNote: composedRawNote,
      }),
    });

    const data = await res.json();
    setAnalyzingImages(false);

    if (!res.ok) {
      throw new Error(data.error || "Failed to process photos.");
    }

    setImageDescriptions(data.descriptions || []);
    return data.descriptions || [];
  }

  async function handleGenerateTicket() {
    try {
      setGenerating(true);
      setError("");

      const uploaded = await uploadImages();
      const descriptions = await analyzeImages(uploaded);

      const res = await fetch("/api/generate-ticket", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rawNote: composedRawNote,
          imageDescriptions: descriptions.map(
            (description: ImageDescription) => description.description
          ),
          visualFindings: descriptions.flatMap(
            (description: ImageDescription) =>
              description.visualFindings || []
          ),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to prepare inspection record.");
      }

      setTicket(data.ticket);
      setInspectionContext(data.inspectionContext || null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setGenerating(false);
      setUploading(false);
      setAnalyzingImages(false);
    }
  }

  async function handleSaveIssue() {
    if (!ticket) return;

    try {
      setSaving(true);
      setError("");

      const res = await fetch("/api/issues", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...ticket,
          raw_note: composedRawNote,
          status: "open",
          image_paths: uploadedFiles.map((file) => file.filePath),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save issue.");
      }

      router.push("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  function updateTicketField<K extends keyof GeneratedTicket>(
    field: K,
    value: GeneratedTicket[K]
  ) {
    if (!ticket) return;
    setTicket({
      ...ticket,
      [field]: value,
    });
  }

  const selectedFileCount =
    files.length + capturedFiles.length || uploadedFiles.length;
  const busy = uploading || analyzingImages || generating || transcribing;
  const buttonText = uploading
    ? "Uploading photos"
    : analyzingImages
    ? "Processing photos"
    : generating
    ? "Preparing record"
    : transcribing
    ? "Transcribing note"
    : "Prepare record";

  return (
    <main className="min-h-screen bg-[#edf1ef] text-zinc-950">
      <div className="mx-auto max-w-7xl px-3 py-3 sm:px-5 lg:px-6">
        <header className="mb-4 overflow-hidden rounded-lg border border-zinc-200 bg-[#f8faf8] shadow-sm">
          <div className="flex flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between sm:px-5">
            <div className="min-w-0">
              <Link
                href="/"
                className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-950"
              >
                <ArrowLeft size={16} />
                Corrective action log
              </Link>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-semibold uppercase text-zinc-500">
                  Strata
                </p>
                <span className="rounded-md border border-zinc-300 bg-white px-2 py-0.5 text-xs font-medium text-zinc-700">
                  Field record
                </span>
              </div>
              <h1 className="mt-1 text-2xl font-semibold tracking-normal">
                New inspection record
              </h1>
            </div>

            <button
              onClick={handleGenerateTicket}
              disabled={busy}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#172018] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#25312b] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? (
                <Loader2 className="animate-spin" size={17} />
              ) : (
                <ClipboardList size={17} />
              )}
              {buttonText}
            </button>
          </div>

          <div className="grid gap-0 divide-y divide-zinc-200 border-t border-zinc-200 text-sm sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <HeaderStat
              label="Inspection header"
              value={`${contextFieldCount}/9 fields`}
            />
            <HeaderStat label="Evidence" value={`${selectedFileCount} photos`} />
            <HeaderStat
              label="Record"
              value={ticket ? "Ready for review" : "Not prepared"}
            />
          </div>
        </header>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 shrink-0" size={16} />
            <span>{error}</span>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="space-y-4">
            <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
              <PanelHeader
                icon={<MapPin size={18} />}
                title="Inspection header"
                meta={`${contextFieldCount}/9 fields`}
              />

              <div className="space-y-4 p-4">
                <FieldGrid>
                  <ContextInput
                    label="Company / facility"
                    value={fieldContext.company}
                    placeholder="Strata Metals Plant 4"
                    onChange={(value) => updateFieldContext("company", value)}
                  />
                  <ContextInput
                    label="Worksite"
                    value={fieldContext.worksite}
                    placeholder="Main production building"
                    onChange={(value) => updateFieldContext("worksite", value)}
                  />
                  <ContextInput
                    label="Specific worksite area"
                    value={fieldContext.siteArea}
                    placeholder="North process unit"
                    onChange={(value) => updateFieldContext("siteArea", value)}
                  />
                  <ContextInput
                    label="Unit / Line"
                    value={fieldContext.unit}
                    placeholder="Line 2 / Pump bay"
                    onChange={(value) => updateFieldContext("unit", value)}
                  />
                  <ContextInput
                    label="Inspected by"
                    value={fieldContext.inspector}
                    placeholder="Name or badge"
                    onChange={(value) => updateFieldContext("inspector", value)}
                  />
                  <ContextInput
                    label="Inspection date"
                    type="date"
                    value={fieldContext.inspectionDate}
                    placeholder="YYYY-MM-DD"
                    onChange={(value) =>
                      updateFieldContext("inspectionDate", value)
                    }
                  />
                  <ContextInput
                    label="Asset tag"
                    value={fieldContext.assetTag}
                    placeholder="P-204A, MCC-3"
                    onChange={(value) => updateFieldContext("assetTag", value)}
                  />
                </FieldGrid>

                <div className="grid gap-3 md:grid-cols-[240px_minmax(0,1fr)]">
                  <div>
                    <p className="mb-2 text-xs font-medium text-slate-600">
                      Shift
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {["Days", "Swing", "Nights"].map((shift) => (
                        <button
                          key={shift}
                          type="button"
                          onClick={() => updateFieldContext("shift", shift)}
                          className={`h-10 rounded-lg border text-sm font-medium ${
                            fieldContext.shift === shift
                              ? "border-slate-950 bg-slate-950 text-white"
                              : "border-slate-300 bg-white text-slate-700 hover:border-emerald-600 hover:text-emerald-700"
                          }`}
                        >
                          {shift}
                        </button>
                      ))}
                    </div>
                  </div>

                  <ContextInput
                    label="Exact location"
                    value={fieldContext.exactLocation}
                    placeholder="East side of compressor skid"
                    onChange={(value) =>
                      updateFieldContext("exactLocation", value)
                    }
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-600">
                    <Tag size={14} />
                    Checklist category / observed condition
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {hazardTags.map((tag) => {
                      const selected = quickTags.includes(tag);

                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleQuickTag(tag)}
                          className={`inline-flex h-9 items-center rounded-lg border px-3 text-sm font-medium ${
                            selected
                              ? "border-amber-600 bg-amber-50 text-amber-900"
                              : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
              <PanelHeader
                icon={<ClipboardList size={18} />}
                title="Field capture"
                meta={`${selectedFileCount} photos`}
              />

              <div className="grid gap-4 p-4 lg:grid-cols-[280px_minmax(0,1fr)]">
                <div className="space-y-3">
                  <label
                    htmlFor="field-photos"
                    className="flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 text-center hover:border-emerald-500 hover:bg-emerald-50"
                  >
                    <UploadCloud className="mb-3 text-slate-500" size={26} />
                    <span className="text-sm font-medium text-slate-900">
                      Add field photos
                    </span>
                    <span className="mt-1 text-xs text-slate-500">
                      JPG, PNG, WebP
                    </span>
                  </label>
                  <input
                    id="field-photos"
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(event) => {
                      setFiles(Array.from(event.target.files || []));
                      resetPhotoArtifacts();
                    }}
                    className="sr-only"
                  />

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
                        <Camera size={16} />
                        Camera capture
                      </div>
                    {capturedFiles.length > 0 && (
                        <span className="rounded-md bg-white px-2 py-1 text-xs font-medium text-slate-600">
                          {capturedFiles.length} captured
                        </span>
                      )}
                    </div>

                    {!cameraOpen ? (
                      <button
                        type="button"
                        onClick={openCamera}
                        className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:border-emerald-600 hover:text-emerald-700"
                      >
                        <Camera size={16} />
                        Open camera
                      </button>
                    ) : (
                      <div className="space-y-3">
                        <div className="overflow-hidden rounded-lg border border-slate-300 bg-black">
                          <video
                            ref={videoRef}
                            muted
                            playsInline
                            autoPlay
                            className="aspect-video w-full object-cover"
                          />
                        </div>

                        {cameraError && (
                          <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs leading-5 text-amber-900">
                            <p>{cameraError}</p>
                            <p className="mt-1">
                              If live preview is blocked, use the camera picker
                              below or enable camera access for localhost in the
                              browser site settings.
                            </p>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={captureCameraPhoto}
                            disabled={!cameraReady}
                            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <Camera size={16} />
                            Capture
                          </button>
                          <button
                            type="button"
                            onClick={closeCamera}
                            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:border-slate-400"
                          >
                            <X size={16} />
                            Close
                          </button>
                        </div>
                      </div>
                    )}

                    <label
                      htmlFor="camera-picker"
                      className="mt-3 inline-flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:border-emerald-600 hover:text-emerald-700"
                    >
                      <Camera size={16} />
                      Use camera picker
                    </label>
                    <input
                      id="camera-picker"
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        setCapturedFiles((current) => [...current, file]);
                        resetPhotoArtifacts();
                        event.target.value = "";
                      }}
                      className="sr-only"
                    />
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <label
                      htmlFor="field-audio"
                      className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-800"
                    >
                      <Mic size={16} />
                      Voice note
                    </label>
                    <input
                      id="field-audio"
                      type="file"
                      accept="audio/*"
                      onChange={(event) =>
                        setAudioFile(event.target.files?.[0] || null)
                      }
                      className="block w-full text-xs text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-white file:px-2 file:py-1.5 file:text-xs file:font-medium file:text-slate-700"
                    />
                    <button
                      type="button"
                      onClick={handleTranscribeAudio}
                      disabled={!audioFile || transcribing}
                      className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:border-emerald-600 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {transcribing ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : (
                        <Mic size={16} />
                      )}
                      {transcribing ? "Transcribing" : "Transcribe"}
                    </button>
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <label className="block text-sm font-medium text-slate-700">
                      Field note
                    </label>
                    <button
                      type="button"
                      onClick={
                        liveListening
                          ? stopLiveTranscription
                          : startLiveTranscription
                      }
                      className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium ${
                        liveListening
                          ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                          : "border-slate-300 bg-white text-slate-700 hover:border-emerald-600 hover:text-emerald-700"
                      }`}
                    >
                      <Mic size={16} />
                      {liveListening ? "Stop live transcription" : "Start live transcription"}
                    </button>
                  </div>
                  <textarea
                    value={rawNote}
                    onChange={(event) => {
                      setRawNote(event.target.value);
                      resetDraftArtifacts();
                    }}
                    placeholder="What did you see, who is exposed, and what was done immediately?"
                    className="min-h-40 w-full resize-y rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15"
                  />
                  {(liveTranscriptStatus || liveTranscript) && (
                    <div
                      className={`mt-3 rounded-lg border p-3 text-xs leading-5 ${
                        liveListening
                          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                          : liveTranscriptStatus.toLowerCase().includes("denied")
                          ? "border-amber-200 bg-amber-50 text-amber-900"
                          : "border-slate-200 bg-slate-50 text-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-2 font-medium">
                        <Mic size={14} />
                        {liveChunkPending
                          ? "Transcribing recent audio locally"
                          : liveTranscriptStatus || "Listening"}
                      </div>
                      {liveTranscript && (
                        <p className="mt-1 text-slate-700">
                          {liveTranscript}
                        </p>
                      )}
                    </div>
                  )}
                  <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="mb-2 flex items-center gap-2 text-xs font-medium uppercase text-slate-500">
                      <HardHat size={14} />
                      Recorded packet
                    </p>
                    <p className="line-clamp-5 whitespace-pre-wrap text-xs leading-5 text-slate-600">
                      {composedRawNote || "Header fields and field notes will appear here."}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {(uploadedFiles.length > 0 || imageDescriptions.length > 0) && (
              <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
                <PanelHeader
                  icon={<ImageIcon size={18} />}
                  title="Photo log"
                  meta={`${allVisualFindings.length} photo findings`}
                />

                <div className="grid gap-4 p-4 md:grid-cols-2">
                  {uploadedFiles.map((file) => {
                    const analysis = imageDescriptions.find(
                      (item) => item.imagePath === file.filePath
                    );

                    return (
                      <ImagePreview
                        key={file.filename}
                        file={file}
                        quality={analysis?.imageQuality}
                        findings={analysis?.visualFindings || []}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {imageDescriptions.length > 0 && (
              <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
                <PanelHeader
                  icon={<ImageIcon size={18} />}
                  title="Photo assessment"
                  meta={`${imageDescriptions.length} photo${
                    imageDescriptions.length === 1 ? "" : "s"
                  } processed`}
                />

                <div className="divide-y divide-slate-100">
                  {imageDescriptions.map((item, index) => {
                    const notes = visiblePhotoNotes(item.reviewNotes);

                    return (
                      <div key={item.imagePath} className="p-4">
                        <p className="mb-2 text-sm font-medium">
                          Evidence photo {index + 1}
                        </p>
                        <p className="text-sm leading-6 text-slate-700">
                          {item.description}
                        </p>

                        {item.imageQuality && (
                          <div className="mt-3">
                            <PhotoQualityPanel quality={item.imageQuality} />
                          </div>
                        )}

                        {!!item.visualFindings?.length && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {item.visualFindings.map((finding) => (
                              <FindingChip
                                key={`${finding.label}-${finding.observation}`}
                                finding={finding}
                              />
                            ))}
                          </div>
                        )}

                        {notes.length > 0 && (
                          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                            <ul className="space-y-1 text-xs leading-5 text-amber-900">
                              {notes.slice(0, 3).map((note) => (
                                <li key={note}>{note}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {ticket && (
              <ReviewForm
                ticket={ticket}
                saving={saving}
                onSave={handleSaveIssue}
                onUpdate={updateTicketField}
              />
            )}
          </section>

          <aside className="space-y-4 lg:sticky lg:top-5 lg:self-start">
            <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase text-slate-500">
                Inspection status
              </p>
              <div className="mt-4 space-y-3">
                <StateRow
                  label="Header"
                  active={contextFieldCount >= 5}
                  value={`${contextFieldCount}/9`}
                />
                <StateRow
                  label="Voice"
                  active={!!audioFile || liveListening}
                  value={
                    liveListening
                      ? "live"
                      : audioFile?.name || "optional"
                  }
                />
                <StateRow label="Photos" active={selectedFileCount > 0} value={String(selectedFileCount)} />
                <StateRow
                  label="Photo assessment"
                  active={imageDescriptions.length > 0}
                  value={imageDescriptions.length ? "complete" : "pending"}
                />
                <StateRow
                  label="Evidence quality"
                  active={photoQualitySummary.status !== "pending"}
                  value={photoQualitySummary.label}
                />
                <StateRow label="Record" active={!!ticket} value={ticket ? "prepared" : "pending"} />
              </div>
            </div>

            {inspectionContext && (
              <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
                <PanelHeader
                  icon={<ShieldAlert size={18} />}
                  title="Inspection context"
                  meta={`${inspectionContext.similarIssues.length} matches`}
                />

                <div className="space-y-4 p-4 text-sm">
                  {inspectionContext.matchedPatterns.length > 0 && (
                    <ContextGroup title="Patterns">
                      <div className="flex flex-wrap gap-2">
                        {inspectionContext.matchedPatterns.map((pattern) => (
                          <span
                            key={pattern}
                            className="rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800"
                          >
                            {pattern}
                          </span>
                        ))}
                      </div>
                    </ContextGroup>
                  )}

                  {inspectionContext.guidance.length > 0 && (
                    <ContextGroup title="Guidance">
                      <ul className="space-y-2 text-slate-700">
                        {inspectionContext.guidance.slice(0, 4).map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </ContextGroup>
                  )}

                  {inspectionContext.similarIssues.length > 0 && (
                    <ContextGroup title="Similar prior records">
                      <ul className="space-y-2 text-slate-700">
                        {inspectionContext.similarIssues.map((issue) => (
                          <li key={`${issue.title}-${issue.created_at}`}>
                            <span className="font-medium text-slate-950">
                              {issue.title}
                            </span>{" "}
                            <span className="text-slate-500">
                              {issue.category}, {issue.severity}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </ContextGroup>
                  )}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}

function buildFieldPacket(
  context: FieldContext,
  tags: string[],
  note: string
) {
  return [
    formatPacketLine("Company / facility", context.company),
    formatPacketLine("Worksite", context.worksite),
    formatPacketLine("Specific worksite area", context.siteArea),
    formatPacketLine("Unit / Line", context.unit),
    formatPacketLine("Shift", context.shift),
    formatPacketLine("Inspected by", context.inspector),
    formatPacketLine("Inspection date", context.inspectionDate),
    formatPacketLine("Asset tag", context.assetTag),
    formatPacketLine("Exact location", context.exactLocation),
    tags.length ? `Checklist categories / observed conditions: ${tags.join(", ")}` : "",
    note.trim() ? `Field note: ${note.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function formatPacketLine(label: string, value: string) {
  return value.trim() ? `${label}: ${value.trim()}` : "";
}

function visiblePhotoNotes(notes?: string[]) {
  return (notes || []).filter(
    (note) => {
      const normalized = note.toLowerCase();
      return (
        !normalized.startsWith("skipped model errors") &&
        !normalized.includes("model") &&
        !normalized.includes("photo assessment check") &&
        !normalized.includes("localized condition") &&
        !normalized.startsWith("photo quality")
      );
    }
  );
}

function getPhotoQualitySummary(descriptions: ImageDescription[]) {
  if (!descriptions.length) return { status: "pending", label: "pending" };

  const statuses = descriptions
    .map((description) => description.imageQuality?.status)
    .filter(Boolean);

  if (statuses.includes("retake")) return { status: "retake", label: "retake" };
  if (statuses.includes("review")) return { status: "review", label: "review" };
  if (statuses.includes("usable")) return { status: "usable", label: "usable" };
  return { status: "pending", label: "pending" };
}

function ContextInput({
  label,
  value,
  placeholder,
  type = "text",
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  type?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-slate-600">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15"
      />
    </label>
  );
}

function ReviewForm({
  ticket,
  saving,
  onSave,
  onUpdate,
}: {
  ticket: GeneratedTicket;
  saving: boolean;
  onSave: () => void;
  onUpdate: <K extends keyof GeneratedTicket>(
    field: K,
    value: GeneratedTicket[K]
  ) => void;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <FilePlus2 size={18} className="text-emerald-700" />
          <h2 className="text-sm font-semibold">Inspection record</h2>
        </div>
        <button
          onClick={onSave}
          disabled={saving}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
          {saving ? "Saving" : "Save"}
        </button>
      </div>

      <div className="space-y-5 p-4">
        <FormSection title="Finding summary">
          <FieldGrid>
            <TicketInput
              label="Title"
              value={ticket.title}
              onChange={(value) => onUpdate("title", value)}
            />
            <TicketInput
              label="Inspection Type"
              value={ticket.inspection_type}
              onChange={(value) => onUpdate("inspection_type", value)}
            />
          </FieldGrid>
          <TicketTextarea
            label="Inspection Observation"
            value={ticket.observation}
            onChange={(value) => onUpdate("observation", value)}
          />
          <TicketTextarea
            label="Description"
            value={ticket.description}
            onChange={(value) => onUpdate("description", value)}
          />
        </FormSection>

        <FormSection title="Classification">
          <FieldGrid>
            <TicketInput
              label="Inspection Standard"
              value={ticket.inspection_standard}
              onChange={(value) => onUpdate("inspection_standard", value)}
            />
            <TicketInput
              label="Regulatory Reference"
              value={ticket.regulatory_reference}
              onChange={(value) => onUpdate("regulatory_reference", value)}
            />
            <TicketInput
              label="Issue Category"
              value={ticket.category}
              onChange={(value) => onUpdate("category", value)}
            />
            <TicketInput
              label="Hazard Category"
              value={ticket.hazard_category}
              onChange={(value) => onUpdate("hazard_category", value)}
            />
          </FieldGrid>
        </FormSection>

        <FormSection title="Location and risk">
          <FieldGrid>
            <TicketInput
              label="Location"
              value={ticket.location}
              onChange={(value) => onUpdate("location", value)}
            />
            <TicketInput
              label="Affected Area"
              value={ticket.affected_area}
              onChange={(value) => onUpdate("affected_area", value)}
            />
            <TicketInput
              label="Asset"
              value={ticket.asset_name}
              onChange={(value) => onUpdate("asset_name", value)}
            />
            <TicketInput
              label="Exposed Persons"
              value={ticket.exposed_persons}
              onChange={(value) => onUpdate("exposed_persons", value)}
            />
            <TicketSelect
              label="Likelihood"
              value={ticket.likelihood}
              options={["unlikely", "possible", "likely"]}
              onChange={(value) =>
                onUpdate("likelihood", value as GeneratedTicket["likelihood"])
              }
            />
            <TicketSelect
              label="Severity"
              value={ticket.severity}
              options={["low", "medium", "high", "critical"]}
              onChange={(value) =>
                onUpdate("severity", value as GeneratedTicket["severity"])
              }
            />
            <TicketInput
              label="Risk Priority"
              value={ticket.risk_priority}
              onChange={(value) => onUpdate("risk_priority", value)}
            />
            <TicketInput
              label="Due Date Priority"
              value={ticket.due_date_priority}
              onChange={(value) => onUpdate("due_date_priority", value)}
            />
          </FieldGrid>
        </FormSection>

        <FormSection title="Incident detail">
          <TicketTextarea
            label="Activity Before Event"
            value={ticket.activity_before_event}
            onChange={(value) => onUpdate("activity_before_event", value)}
          />
          <TicketTextarea
            label="What Happened"
            value={ticket.what_happened}
            onChange={(value) => onUpdate("what_happened", value)}
          />
          <FieldGrid>
            <TicketInput
              label="Object/Substance"
              value={ticket.object_or_substance}
              onChange={(value) => onUpdate("object_or_substance", value)}
            />
            <TicketInput
              label="Injury/Illness"
              value={ticket.injury_or_illness}
              onChange={(value) => onUpdate("injury_or_illness", value)}
            />
          </FieldGrid>
        </FormSection>

        <FormSection title="Corrective action">
          <TicketTextarea
            label="Immediate Action Taken"
            value={ticket.immediate_action_taken}
            onChange={(value) => onUpdate("immediate_action_taken", value)}
          />
          <TicketTextarea
            label="Recommended Action"
            value={ticket.recommended_action}
            onChange={(value) => onUpdate("recommended_action", value)}
          />
          <TicketTextarea
            label="Corrective Action"
            value={ticket.corrective_action}
            onChange={(value) => onUpdate("corrective_action", value)}
          />
          <FieldGrid>
            <TicketInput
              label="Suggested Assignee Role"
              value={ticket.suggested_assignee_role}
              onChange={(value) => onUpdate("suggested_assignee_role", value)}
            />
            <TicketInput
              label="Responsible Party"
              value={ticket.responsible_party}
              onChange={(value) => onUpdate("responsible_party", value)}
            />
            <TicketSelect
              label="Verification Status"
              value={ticket.verification_status}
              options={[
                "open",
                "promised_to_correct",
                "corrected_not_verified",
                "corrected_verified",
              ]}
              onChange={(value) =>
                onUpdate(
                  "verification_status",
                  value as GeneratedTicket["verification_status"]
                )
              }
            />
          </FieldGrid>
          <TicketTextarea
            label="Recordkeeping Notes"
            value={ticket.recordkeeping_notes}
            onChange={(value) => onUpdate("recordkeeping_notes", value)}
          />
        </FormSection>
      </div>
    </div>
  );
}

function ImagePreview({
  file,
  quality,
  findings,
}: {
  file: UploadedFile;
  quality?: ImageQualityReport;
  findings: VisualFinding[];
}) {
  const boxedFindings = findings.filter((finding) => finding.bbox);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
      <div className="relative aspect-video">
        <Image
          src={file.publicPath}
          alt="Inspection photo"
          fill
          unoptimized
          sizes="(min-width: 768px) 50vw, 100vw"
          className="object-cover"
        />

        {quality && (
          <div className="absolute right-2 top-2">
            <PhotoQualityBadge status={quality.status} />
          </div>
        )}

        {boxedFindings.map((finding) => {
          const bbox = finding.bbox;
          if (!bbox) return null;

          return (
            <div
              key={`${finding.label}-${bbox.x}-${bbox.y}`}
              className="absolute border-2 border-red-500 bg-red-500/10"
              style={{
                left: `${bbox.x * 100}%`,
                top: `${bbox.y * 100}%`,
                width: `${bbox.width * 100}%`,
                height: `${bbox.height * 100}%`,
              }}
              title={`${finding.label}: ${finding.observation}`}
            >
              <span className="absolute left-0 top-0 max-w-full truncate bg-red-600 px-1 py-0.5 text-[10px] font-medium text-white">
                {finding.label}
              </span>
            </div>
          );
        })}
      </div>

      {findings.length > 0 && (
        <div className="space-y-2 border-t border-slate-200 p-3">
          {findings.slice(0, 3).map((finding) => (
            <FindingChip key={`${finding.label}-${finding.observation}`} finding={finding} />
          ))}
        </div>
      )}
    </div>
  );
}

function PanelHeader({
  icon,
  title,
  meta,
}: {
  icon: React.ReactNode;
  title: string;
  meta?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-zinc-200 bg-[#fbfcfb] px-4 py-3">
      <div className="flex min-w-0 items-center gap-2">
        <span className="text-emerald-700">{icon}</span>
        <h2 className="truncate text-sm font-semibold">{title}</h2>
      </div>
      {meta && (
        <span className="shrink-0 rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-600">
          {meta}
        </span>
      )}
    </div>
  );
}

function HeaderStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-3 sm:px-5">
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-zinc-950">
        {value}
      </p>
    </div>
  );
}

function StateRow({
  label,
  active,
  value,
}: {
  label: string;
  active: boolean;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <div className="flex items-center gap-2">
        {active ? (
          <CheckCircle2 size={16} className="text-emerald-700" />
        ) : (
          <span className="size-4 rounded-full border border-slate-300" />
        )}
        <span className="text-slate-700">{label}</span>
      </div>
      <span className="max-w-36 truncate font-medium text-slate-950">{value}</span>
    </div>
  );
}

function FindingChip({ finding }: { finding: VisualFinding }) {
  const score = Math.round((finding.evidenceScore || 0) * 100);

  return (
    <span className="inline-flex max-w-full items-center gap-2 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
      <span className="truncate">{finding.label}</span>
      <span className="shrink-0 rounded bg-white px-1.5 py-0.5 text-slate-500">
        {finding.category.replaceAll("_", " ")}
      </span>
      <span
        className={`shrink-0 rounded px-1.5 py-0.5 ${
          finding.verification === "accepted"
            ? "bg-emerald-100 text-emerald-800"
            : finding.verification === "field_verify"
            ? "bg-amber-100 text-amber-900"
            : "bg-blue-100 text-blue-800"
        }`}
      >
        {finding.verification === "accepted"
          ? "accepted"
          : finding.verification === "field_verify"
          ? "verify"
          : "review"}
      </span>
      {!!score && (
        <span className="shrink-0 rounded bg-white px-1.5 py-0.5 text-slate-500">
          {score}%
        </span>
      )}
    </span>
  );
}

function PhotoQualityBadge({
  status,
}: {
  status: ImageQualityReport["status"];
}) {
  const label =
    status === "usable"
      ? "Usable"
      : status === "review"
      ? "Review"
      : "Retake";
  const classes =
    status === "usable"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : status === "review"
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : "border-red-200 bg-red-50 text-red-700";

  return (
    <span
      className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${classes}`}
    >
      {label}
    </span>
  );
}

function PhotoQualityPanel({ quality }: { quality: ImageQualityReport }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase text-slate-500">
          Evidence quality
        </p>
        <PhotoQualityBadge status={quality.status} />
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 sm:grid-cols-4">
        <Metric label="Resolution" value={`${quality.width}x${quality.height}`} />
        <Metric label="Sharpness" value={String(quality.sharpness)} />
        <Metric label="Contrast" value={String(quality.contrast)} />
        <Metric label="Exposure" value={String(quality.brightness)} />
      </div>
      {quality.flags.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs leading-5 text-amber-900">
          {quality.flags.slice(0, 3).map((flag) => (
            <li key={flag}>{flag}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-slate-500">{label}</p>
      <p className="mt-0.5 font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function ContextGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase text-slate-500">
        {title}
      </p>
      {children}
    </div>
  );
}

function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-slate-200 pt-4 first:border-t-0 first:pt-0">
      <h3 className="mb-3 text-sm font-semibold text-slate-950">{title}</h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 md:grid-cols-2">{children}</div>;
}

function TicketInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-slate-600">
        {label}
      </label>
      <input
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15"
      />
    </div>
  );
}

function TicketTextarea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-slate-600">
        {label}
      </label>
      <textarea
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-24 w-full resize-y rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15"
      />
    </div>
  );
}

function TicketSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-slate-600">
        {label}
      </label>
      <select
        value={value || options[0]}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option.replaceAll("_", " ")}
          </option>
        ))}
      </select>
    </div>
  );
}
