import type { ComponentProps } from "react";
import Link from "next/link";

/** Styling for MDX blog content, mapped to the design system. */
export const mdxComponents = {
  h2: (p: ComponentProps<"h2">) => (
    <h2 className="mt-10 font-display text-xl font-bold tracking-tight text-ink" {...p} />
  ),
  h3: (p: ComponentProps<"h3">) => (
    <h3 className="mt-8 font-display text-lg font-semibold text-ink" {...p} />
  ),
  p: (p: ComponentProps<"p">) => (
    <p className="mt-4 text-base leading-relaxed text-ink-mid" {...p} />
  ),
  ul: (p: ComponentProps<"ul">) => (
    <ul className="mt-4 flex list-disc flex-col gap-2 pl-5 text-base text-ink-mid marker:text-ink-low" {...p} />
  ),
  ol: (p: ComponentProps<"ol">) => (
    <ol className="mt-4 flex list-decimal flex-col gap-2 pl-5 text-base text-ink-mid marker:text-ink-low" {...p} />
  ),
  li: (p: ComponentProps<"li">) => <li className="leading-relaxed" {...p} />,
  strong: (p: ComponentProps<"strong">) => <strong className="font-semibold text-ink" {...p} />,
  a: ({ href = "#", ...rest }: ComponentProps<"a">) => {
    const internal = href.startsWith("/");
    if (internal) {
      return <Link href={href} className="font-medium text-amber-press underline underline-offset-2" {...rest} />;
    }
    return <a href={href} className="font-medium text-amber-press underline underline-offset-2" rel="noopener noreferrer" {...rest} />;
  },
};
