"use client";

import { useState, type ReactNode } from "react";
import { Search, Trash2, Download, Plus, Coins, ImageOff } from "lucide-react";
import {
  Badge,
  Button,
  Checkbox,
  Dropdown,
  EmptyState,
  ErrorState,
  IconButton,
  Input,
  Modal,
  Pill,
  Progress,
  RadioGroup,
  Select,
  Skeleton,
  Slider,
  Spinner,
  Tabs,
  Textarea,
  Toggle,
  Tooltip,
  useToast,
  type ToastType,
} from "@/components/ui";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-t border-line py-10">
      <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
      {children}
    </section>
  );
}

function Row({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-3">{children}</div>;
}

export function GalleryClient() {
  const { toast } = useToast();
  const [toggle1, setToggle1] = useState(true);
  const [toggle2, setToggle2] = useState(false);
  const [brush, setBrush] = useState(24);
  const [quality, setQuality] = useState("balanced");
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fireToast = (type: ToastType) =>
    toast({
      type,
      title:
        type === "success"
          ? "Background removed"
          : type === "error"
            ? "Something went wrong on our side"
            : type === "warn"
              ? "Larger images take longer"
              : "Job queued",
      description:
        type === "error"
          ? "We didn't charge you. Try again?"
          : "3840 × 2160 · PNG · 4.2 MB",
    });

  return (
    <div className="container-page py-12">
      <header className="flex flex-col gap-2 pb-6">
        <span className="label-eyebrow">Phase 1 · Foundation</span>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink">
          Component gallery
        </h1>
        <p className="prose-measure text-sm text-ink-mid">
          Every primitive in the CLEANPLATE UI library, in each of its states.
          All colours resolve from a single token file; try the theme toggle in
          the header to see both palettes.
        </p>
      </header>

      <Section title="Buttons — variants">
        <Row>
          <Button variant="primary">Erase</Button>
          <Button variant="secondary">Cut Out</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger" leadingIcon={<Trash2 size={16} />}>
            Delete
          </Button>
        </Row>
        <Row>
          <Button variant="primary" trailingIcon={<Download size={16} />}>
            Download HD
          </Button>
          <Button variant="primary" disabled>
            Disabled
          </Button>
          <Button variant="primary" loading>
            Loading
          </Button>
          <Button
            variant="primary"
            loading={loading}
            onClick={() => {
              setLoading(true);
              setTimeout(() => setLoading(false), 1600);
            }}
          >
            Click to load
          </Button>
          <Button variant="secondary" size="sm">
            Small (in-app)
          </Button>
        </Row>
        <Row>
          <IconButton aria-label="Add" icon={<Plus size={18} />} />
          <IconButton aria-label="Download" icon={<Download size={18} />} variant="secondary" />
          <IconButton aria-label="Loading" icon={<Plus size={18} />} loading />
          <IconButton aria-label="Disabled" icon={<Plus size={18} />} disabled />
        </Row>
      </Section>

      <Section title="Inputs">
        <div className="grid max-w-xl gap-4 sm:grid-cols-2">
          <Input label="Email" placeholder="you@example.com" leadingIcon={<Search size={15} />} />
          <Input label="Hex colour" placeholder="#FF9500" hint="Applied to the background" />
          <Input label="With error" defaultValue="not-an-email" error="Enter a valid email address." />
          <Input label="Disabled" placeholder="Locked" disabled />
          <Select
            label="Output format"
            options={[
              { value: "png", label: "PNG" },
              { value: "jpg", label: "JPEG 95" },
            ]}
          />
          <Textarea label="Notes" placeholder="Anything to add?" />
        </div>
      </Section>

      <Section title="Selection controls">
        <div className="flex flex-col gap-6">
          <Row>
            <Checkbox label="I own this image or have the right to modify it." defaultChecked />
            <Checkbox label="Unchecked" />
            <Checkbox label="With error" error="Required" />
            <Checkbox label="Disabled" disabled />
          </Row>
          <Row>
            <Toggle checked={toggle1} onCheckedChange={setToggle1} label="Generative fill" />
            <Toggle checked={toggle2} onCheckedChange={setToggle2} label="Enhance faces" />
            <Toggle checked={false} onCheckedChange={() => {}} label="Disabled" disabled />
          </Row>
          <div className="max-w-md">
            <RadioGroup
              label="Quality"
              value={quality}
              onValueChange={setQuality}
              options={[
                { value: "fast", label: "Fast", description: "~4s · lower fidelity" },
                { value: "balanced", label: "Balanced", description: "~8s · recommended" },
                { value: "best", label: "Best", description: "~18s · slowest, sharpest" },
              ]}
            />
          </div>
          <div className="max-w-md">
            <RadioGroup
              variant="inline"
              value={quality}
              onValueChange={setQuality}
              options={[
                { value: "fast", label: "Fast" },
                { value: "balanced", label: "Balanced" },
                { value: "best", label: "Best" },
              ]}
            />
          </div>
          <div className="max-w-md">
            <Slider
              label="Brush size"
              value={brush}
              onValueChange={setBrush}
              min={4}
              max={200}
              format={(v) => `${v}px`}
            />
          </div>
        </div>
      </Section>

      <Section title="Status & feedback">
        <Row>
          <Badge tone="amber">Most popular</Badge>
          <Badge tone="cyan">Beta</Badge>
          <Badge tone="ok">Done</Badge>
          <Badge tone="danger">Failed</Badge>
          <Badge tone="warn">Queued</Badge>
          <Badge tone="neutral">Neutral</Badge>
          <Pill tone="amber" icon={<Coins size={13} />}>
            <span className="tabular">20</span>
          </Pill>
          <Pill>Free tier</Pill>
        </Row>
        <div className="flex max-w-md flex-col gap-4">
          <Progress value={64} label="Upload progress" />
          <Progress label="Processing (indeterminate)" />
        </div>
        <Row>
          <Spinner size={20} label="Loading" />
          <Tooltip content="Removes colour fringing from the old background.">
            <span className="cursor-help border-b border-dashed border-line-strong text-sm text-ink-mid">
              Decontaminate edges
            </span>
          </Tooltip>
        </Row>
        <Row>
          <Button variant="secondary" onClick={() => fireToast("success")}>
            Success toast
          </Button>
          <Button variant="secondary" onClick={() => fireToast("error")}>
            Error toast
          </Button>
          <Button variant="secondary" onClick={() => fireToast("info")}>
            Info toast
          </Button>
          <Button variant="secondary" onClick={() => fireToast("warn")}>
            Warn toast
          </Button>
        </Row>
      </Section>

      <Section title="Skeletons">
        <div className="grid max-w-xl gap-3">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </Section>

      <Section title="Overlays & navigation">
        <Row>
          <Button variant="secondary" onClick={() => setModalOpen(true)}>
            Open modal
          </Button>
          <Dropdown
            trigger={<Button variant="secondary">Open menu</Button>}
            items={[
              { label: "Download free", icon: <Download size={15} /> },
              { label: "Download HD", icon: <Download size={15} /> },
              { label: "Delete", icon: <Trash2 size={15} />, onSelect: () => fireToast("info") },
            ]}
          />
        </Row>
        <div className="max-w-xl">
          <Tabs
            items={[
              { value: "transparent", label: "Transparent", content: <p className="text-sm text-ink-mid">Rendered on a checkerboard.</p> },
              { value: "colour", label: "Solid colour", content: <p className="text-sm text-ink-mid">Pick from 12 presets or enter a hex.</p> },
              { value: "blur", label: "Blur original", content: <p className="text-sm text-ink-mid">Radius 0–40.</p> },
            ]}
          />
        </div>
      </Section>

      <Section title="Empty & error states">
        <div className="grid gap-4 md:grid-cols-2">
          <EmptyState
            icon={<ImageOff size={28} />}
            title="No jobs yet"
            description="Your processed images will show up here for 30 days."
            action={<Button variant="primary" size="sm">Try a tool</Button>}
          />
          <ErrorState
            title="This one took too long"
            message="We stopped it and didn't charge you."
            hint="INFERENCE_TIMEOUT"
            action={<Button variant="secondary" size="sm">Try again</Button>}
          />
        </div>
      </Section>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Get credits"
        description="20 full-resolution images for $2. One time, no subscription."
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Not now
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setModalOpen(false);
                fireToast("success");
              }}
            >
              Get 20 credits
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-mid">
          Credits never expire. Failed jobs are never charged. This modal traps
          focus and closes on Escape.
        </p>
      </Modal>
    </div>
  );
}
