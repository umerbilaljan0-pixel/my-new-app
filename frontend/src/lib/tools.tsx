import type { ComponentType, SVGProps } from "react";
import type { ToolSlug } from "@/lib/api";
import {
  IClarify, IErase, IExtend, IIsolate, IRevive, ISmooth, IStack, IUplift,
} from "@/components/icons";
import { Divider, Field, Range, Segmented, Select, Toggle } from "@/components/Fields";

export type Params = Record<string, any>;
type SetParams = (patch: Params) => void;

export interface ToolDef {
  slug: ToolSlug;
  name: string;
  verb: string;
  tagline: string;
  hotkey: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  defaults: Params;
  Settings: ComponentType<{ params: Params; set: SetParams }>;
}

const hexToRgb = (hex: string): [number, number, number] => {
  const m = hex.replace("#", "");
  return [parseInt(m.slice(0, 2), 16), parseInt(m.slice(2, 4), 16), parseInt(m.slice(4, 6), 16)];
};
const rgbToHex = (rgb?: [number, number, number]) =>
  rgb ? "#" + rgb.map((c) => c.toString(16).padStart(2, "0")).join("") : "#c89a6c";

export const TOOLS: ToolDef[] = [
  {
    slug: "erase",
    name: "Erase",
    verb: "Erase",
    tagline: "Watermark, logo and object removal.",
    hotkey: "1",
    icon: IErase,
    defaults: { auto_detect: true, dilate_px: 6, feather_px: 3, generative_fill: false, rects: [] },
    Settings: ({ params, set }) => (
      <>
        <Field label="Mask source" hint="Draw a rect on the viewer (R), or auto-detect static overlays.">
          <Segmented
            value={params.auto_detect ? "auto" : "manual"}
            onChange={(v) => set({ auto_detect: v === "auto" })}
            options={[{ value: "auto", label: "Auto-detect" }, { value: "manual", label: "Manual" }]}
          />
        </Field>
        <Field label="Dilate" hint="Grow the mask before fill.">
          <Range value={params.dilate_px} min={4} max={12} suffix="px" onChange={(n) => set({ dilate_px: n })} />
        </Field>
        <Field label="Feather">
          <Range value={params.feather_px} min={0} max={12} suffix="px" onChange={(n) => set({ feather_px: n })} />
        </Field>
        <Divider />
        <Toggle checked={params.generative_fill} onChange={(b) => set({ generative_fill: b })}
          label="Generative fill (SD-inpaint)" />
        <div className="mt-1 text-[11px] text-text-low">For large textured regions. Only masked pixels change; audio is copied untouched.</div>
      </>
    ),
  },
  {
    slug: "uplift",
    name: "Uplift",
    verb: "Render",
    tagline: "Upscale to a target resolution.",
    hotkey: "2",
    icon: IUplift,
    defaults: { target: "4K", content: "auto", face_restore: false },
    Settings: ({ params, set }) => (
      <>
        <Field label="Target resolution">
          <Segmented value={params.target} onChange={(v) => set({ target: v })}
            options={[{ value: "1080p", label: "1080p" }, { value: "2K", label: "2K" }, { value: "4K", label: "4K" }]} />
        </Field>
        <Field label="Model routing" hint="Real-ESRGAN, auto-routed by content.">
          <Select value={params.content} onChange={(v) => set({ content: v })}
            options={[{ value: "auto", label: "Auto" }, { value: "live", label: "Live-action" }, { value: "anime", label: "Animation" }]} />
        </Field>
        <Toggle checked={params.face_restore} onChange={(b) => set({ face_restore: b })} label="Face-restore pass (GFPGAN)" />
      </>
    ),
  },
  {
    slug: "revive",
    name: "Revive",
    verb: "Render",
    tagline: "Archival repair.",
    hotkey: "3",
    icon: IRevive,
    defaults: { denoise: true, deblur: true, face_restore: true, colourise: false, hue_override: null },
    Settings: ({ params, set }) => (
      <>
        <Toggle checked={params.denoise} onChange={(b) => set({ denoise: b })} label="Scratch / dust / denoise (SCUNet)" />
        <Toggle checked={params.deblur} onChange={(b) => set({ deblur: b })} label="Deblur" />
        <Toggle checked={params.face_restore} onChange={(b) => set({ face_restore: b })} label="Face restoration (CodeFormer)" />
        <Divider label="Colour" />
        <Toggle checked={params.colourise} onChange={(b) => set({ colourise: b })} label="B&W colourisation (DDColor)" />
        {params.colourise && (
          <Field label="Per-region hue override" hint="Force a colour instead of the model's guess.">
            <div className="flex items-center gap-3">
              <input type="color" value={rgbToHex(params.hue_override)}
                onChange={(e) => set({ hue_override: hexToRgb(e.target.value) })}
                className="h-8 w-12 rounded-input border border-border bg-transparent" />
              <button className="btn h-8 text-[12px]" onClick={() => set({ hue_override: null })}>Clear</button>
            </div>
          </Field>
        )}
      </>
    ),
  },
  {
    slug: "isolate",
    name: "Isolate",
    verb: "Export",
    tagline: "Subject cutout and matting.",
    hotkey: "4",
    icon: IIsolate,
    defaults: { format: "png", matte_pass: true, click: null },
    Settings: ({ params, set }) => (
      <>
        <Field label="Select" hint="Click the subject in the viewer (SAM). Alpha matting handles hair edges.">
          <div className="text-[12px] text-text-mid">
            {params.click ? `seed ${(params.click[0] * 100) | 0}%, ${(params.click[1] * 100) | 0}%` : "no seed — using border key"}
          </div>
        </Field>
        <Field label="Export format">
          <Select value={params.format} onChange={(v) => set({ format: v })}
            options={[{ value: "png", label: "PNG (alpha)" }, { value: "prores", label: "ProRes 4444" }, { value: "webm", label: "WebM (alpha)" }]} />
        </Field>
        <Toggle checked={params.matte_pass} onChange={(b) => set({ matte_pass: b })} label="Separate matte pass" />
      </>
    ),
  },
  {
    slug: "extend",
    name: "Extend",
    verb: "Render",
    tagline: "Reframe and outpaint.",
    hotkey: "5",
    icon: IExtend,
    defaults: { preset: "shorts", safe_center: [0.5, 0.5] },
    Settings: ({ params, set }) => (
      <>
        <Field label="Aspect preset" hint="Generates the missing plate instead of cropping.">
          <Select value={params.preset} onChange={(v) => set({ preset: v })}
            options={[
              { value: "youtube", label: "YouTube 16:9" }, { value: "shorts", label: "Shorts 9:16" },
              { value: "reels", label: "Reels 9:16" }, { value: "tiktok", label: "TikTok 9:16" },
              { value: "4:5", label: "4:5" }, { value: "1:1", label: "Square 1:1" }, { value: "21:9", label: "21:9" },
            ]} />
        </Field>
        <Field label="Safe area" hint="Subject-tracked so the face never drifts out of frame.">
          <div className="grid grid-cols-2 gap-2">
            <Range value={Math.round(params.safe_center[0] * 100)} min={0} max={100} suffix="%x"
              onChange={(n) => set({ safe_center: [n / 100, params.safe_center[1]] })} />
            <Range value={Math.round(params.safe_center[1] * 100)} min={0} max={100} suffix="%y"
              onChange={(n) => set({ safe_center: [params.safe_center[0], n / 100] })} />
          </div>
        </Field>
      </>
    ),
  },
  {
    slug: "smooth",
    name: "Smooth",
    verb: "Render",
    tagline: "Motion — interpolation and stabilisation.",
    hotkey: "6",
    icon: ISmooth,
    defaults: { target_fps: 60, slow_factor: 1, stabilise: false, fill: false, rolling_shutter: false },
    Settings: ({ params, set }) => (
      <>
        <Field label="Frame rate (RIFE)">
          <Segmented value={String(params.target_fps)} onChange={(v) => set({ target_fps: Number(v) })}
            options={[{ value: "48", label: "48" }, { value: "60", label: "60" }, { value: "120", label: "120" }]} />
        </Field>
        <Field label="Retime" hint="1× keeps runtime; higher = slow motion.">
          <Range value={params.slow_factor} min={1} max={8} suffix="×" onChange={(n) => set({ slow_factor: n })} />
        </Field>
        <Divider label="Stabilise" />
        <Toggle checked={params.stabilise} onChange={(b) => set({ stabilise: b })} label="Optical-flow stabilisation" />
        {params.stabilise && (
          <Field label="Border">
            <Segmented value={params.fill ? "fill" : "crop"} onChange={(v) => set({ fill: v === "fill" })}
              options={[{ value: "crop", label: "Crop" }, { value: "fill", label: "Fill" }]} />
          </Field>
        )}
        <Toggle checked={params.rolling_shutter} onChange={(b) => set({ rolling_shutter: b })} label="Rolling-shutter fix" />
      </>
    ),
  },
  {
    slug: "clarify",
    name: "Clarify",
    verb: "Render",
    tagline: "Compression repair.",
    hotkey: "7",
    icon: IClarify,
    defaults: {},
    Settings: () => (
      <div className="text-[13px] text-text-mid leading-relaxed">
        De-blocks and de-bands re-uploaded or heavily compressed footage. Strength maps to the
        <span className="text-text-hi"> Quality</span> selector. Clarify is also available as an optional
        pre-pass on every other tool (toggle it inside a Stack).
      </div>
    ),
  },
  {
    slug: "stack",
    name: "Stack",
    verb: "Render",
    tagline: "The pipeline builder.",
    hotkey: "8",
    icon: IStack,
    defaults: { stages: [], clarify_prepass: false },
    Settings: () => (
      <div className="text-[13px] text-text-mid leading-relaxed">
        Build a pipeline in the Stack view — drag tools into an order, save it as a named preset,
        apply it to a whole folder. Presets export as JSON so a team shares one recipe.
      </div>
    ),
  },
];

export const toolBySlug = (slug: string): ToolDef | undefined => TOOLS.find((t) => t.slug === slug);
