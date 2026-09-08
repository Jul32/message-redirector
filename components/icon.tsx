import type { CSSProperties } from "react";
export default function Icon({
  name,
  size = 20,
  style,
}: {
  name: string;
  size?: number;
  style?: CSSProperties;
}) {
  const paths: Record<string, React.ReactNode> = {
    inbox: (
      <>
        <path d="m4 4-2 10v6h20v-6L20 4Z" />
        <path d="M2 14h6l2 3h4l2-3h6" />
      </>
    ),
    open: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    check: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12 3 3 5-6" />
      </>
    ),
    tag: (
      <>
        <path d="M20 13 11 22 2 13V3h10l8 8Z" />
        <circle cx="7" cy="8" r="1" />
      </>
    ),
    building: (
      <>
        <rect x="4" y="3" width="16" height="19" rx="2" />
        <path d="M8 7h1m6 0h1M8 11h1m6 0h1M8 15h1m6 0h1M10 22v-4h4v4" />
      </>
    ),
    rules: (
      <>
        <path d="M5 3v12a4 4 0 0 0 4 4h9M5 7h13m-3-3 3 3-3 3m0 6 3 3-3 3" />
        <circle cx="5" cy="3" r="1" />
      </>
    ),
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 5 5" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    mail: (
      <>
        <rect x="2" y="4" width="20" height="16" rx="3" />
        <path d="m3 6 9 7 9-7" />
      </>
    ),
    chat: <path d="M21 11a9 9 0 0 1-9 9H3l2-4a9 9 0 1 1 16-5Z" />,
    arrow: <path d="m9 5 7 7-7 7" />,
    down: <path d="m6 9 6 6 6-6" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
    help: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 5m0 3h.01" />
      </>
    ),
    trash: (
      <>
        <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7" />
      </>
    ),
    leaf: (
      <>
        <path d="M19 3C6 2 2 9 7 15s14 1 12-12Z" />
        <path d="M5 21 15 9" />
      </>
    ),
    logout: (
      <>
        <path d="M9 3H3v18h6m6-15 6 6-6 6m-7-6h13" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
    >
      {paths[name] || paths.chat}
    </svg>
  );
}
