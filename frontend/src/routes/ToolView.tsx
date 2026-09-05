import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Viewer } from "@/components/Viewer";
import { RightPanel } from "@/components/RightPanel";
import { RightsGate } from "@/components/RightsGate";
import { api, type Estimate, type ModelSpec, type Quality } from "@/lib/api";
import { useStore, jobList } from "@/state/store";
import { toolBySlug, type Params } from "@/lib/tools";

export default function ToolView() {
  const { slug = "erase" } = useParams();
  const tool = toolBySlug(slug)!;
  const upload = useStore((s) => s.upload);
  const originalUrl = useStore((s) => s.originalUrl);
  const setUpload = useStore((s) => s.setUpload);
  const upsertJob = useStore((s) => s.upsertJob);
  const jobs = useStore((s) => s.jobs);

  const [params, setParamsState] = useState<Params>(tool.defaults);
  const [quality, setQuality] = useState<Quality>("balanced");
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [missing, setMissing] = useState<ModelSpec[]>([]);
  const [downloading, setDownloading] = useState(false);
  const [running, setRunning] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);

  // reset params when the tool changes
  useEffect(() => {
    setParamsState(tool.defaults);
    setEstimate(null);
  }, [slug]); // eslint-disable-line

  const setParams = (patch: Params) => setParamsState((p) => ({ ...p, ...patch }));

  // missing models for this tool
  useEffect(() => {
    api.missingModels(slug).then(setMissing).catch(() => setMissing([]));
  }, [slug]);

  // debounced estimate
  useEffect(() => {
    if (!upload) return;
    const h = setTimeout(() => {
      api.estimate(slug, upload.upload_id, params, quality).then(setEstimate).catch(() => {});
    }, 200);
    return () => clearTimeout(h);
  }, [upload, params, quality, slug]);

  // the latest completed result for this file + tool → drives the after slider
  const result = useMemo(() => {
    if (!upload) return null;
    return jobList(jobs)
      .filter((j) => j.status === "done" && j.tool === slug && j.input_path?.endsWith(upload.upload_id))
      .sort((a, b) => (b.finished_at ?? 0) - (a.finished_at ?? 0))[0];
  }, [jobs, upload, slug]);
  const afterUrl = result?.output_path ? api.outputUrl(result.id) : null;

  async function onFile(file: File) {
    const url = URL.createObjectURL(file);
    const meta = await api.upload(file);
    setUpload(meta, url);
  }

  async function onRun() {
    if (!upload) return;
    setRunning(true);
    try {
      const job = await api.createJob(slug, upload.upload_id, params, quality);
      upsertJob(job);
    } finally {
      setRunning(false);
    }
  }

  // Cmd+Enter render
  const runRef = useRef(onRun);
  runRef.current = onRun;
  useEffect(() => {
    const h = () => runRef.current();
    window.addEventListener("cp:render", h);
    return () => window.removeEventListener("cp:render", h);
  }, []);

  async function downloadModels() {
    setDownloading(true);
    try {
      await Promise.all(missing.map((m) => api.downloadModel(m.key)));
      setMissing(await api.missingModels(slug));
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="flex-1 flex min-h-0">
      <Viewer
        upload={upload}
        beforeUrl={originalUrl}
        afterUrl={afterUrl}
        tool={slug}
        params={params}
        onFile={onFile}
        onRect={(r) => setParams({ rects: [r], auto_detect: false })}
        onSeed={(xy) => setParams({ click: xy })}
      />
      <RightPanel
        tool={tool}
        params={params}
        setParams={setParams}
        quality={quality}
        setQuality={setQuality}
        estimate={estimate}
        missing={missing}
        onRun={onRun}
        running={running}
        hasFile={!!upload}
        onDownloadModels={downloadModels}
        downloadingModels={downloading}
        hasResult={!!result}
        onExport={() => result && setExporting(result.id)}
      />
      <RightsGate
        open={!!exporting}
        context="export"
        filename={upload?.upload_id}
        onCancel={() => setExporting(null)}
        onConfirm={async () => {
          if (exporting) {
            await api.confirmRights("export", true, { job_id: exporting, filename: upload?.upload_id });
            window.open(api.outputUrl(exporting), "_blank");
          }
          setExporting(null);
        }}
      />
    </div>
  );
}
