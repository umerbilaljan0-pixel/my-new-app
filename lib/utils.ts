import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * cn — merge conditional class names and de-duplicate conflicting Tailwind
 * utilities (last one wins). Used by every component in components/ui.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
