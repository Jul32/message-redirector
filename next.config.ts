import type { NextConfig } from "next";

// Permit this workspace's forwarded preview to load the client-side dev assets.
const previewHost =
  process.env.CODESPACE_NAME &&
  process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN
    ? `${process.env.CODESPACE_NAME}-3000.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}`
    : undefined;
const config: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", ...(previewHost ? [previewHost] : [])],
};
export default config;
