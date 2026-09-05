import type { Metadata } from "next";
import { GalleryClient } from "./GalleryClient";

export const metadata: Metadata = {
  title: "Component gallery",
  description:
    "The CLEANPLATE UI component library — every primitive in each of its states.",
};

export default function GalleryPage() {
  return <GalleryClient />;
}
