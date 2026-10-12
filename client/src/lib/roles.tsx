import {
  BarChart3,
  BrainCircuit,
  Cloud,
  Code2,
  Compass,
  Layers,
  LayoutTemplate,
  PenTool,
  Server,
  Smartphone,
  type LucideIcon,
} from "lucide-react";
import type { RoleId } from "@poise/shared";

export const ROLE_ICONS: Record<RoleId, LucideIcon> = {
  "software-engineer": Code2,
  frontend: LayoutTemplate,
  backend: Server,
  fullstack: Layers,
  "data-scientist": BrainCircuit,
  "data-analyst": BarChart3,
  devops: Cloud,
  mobile: Smartphone,
  "product-manager": Compass,
  "ui-ux": PenTool,
};

/** A warm gradient per role, used for avatars and cards. */
export const ROLE_GRADIENTS: Record<RoleId, string> = {
  "software-engineer": "linear-gradient(135deg,#ff9a3d,#e8336f)",
  frontend: "linear-gradient(135deg,#ff6a88,#a21caf)",
  backend: "linear-gradient(135deg,#7c3aed,#2f5bff)",
  fullstack: "linear-gradient(135deg,#f97316,#c026d3)",
  "data-scientist": "linear-gradient(135deg,#2f5bff,#06b6d4)",
  "data-analyst": "linear-gradient(135deg,#0ea5e9,#6366f1)",
  devops: "linear-gradient(135deg,#14b8a6,#2563eb)",
  mobile: "linear-gradient(135deg,#ec4899,#f59e0b)",
  "product-manager": "linear-gradient(135deg,#ffb020,#ff5468)",
  "ui-ux": "linear-gradient(135deg,#d946ef,#6d28d9)",
};

export function RoleIcon({ role, className }: { role: RoleId; className?: string }) {
  const Icon = ROLE_ICONS[role];
  return <Icon className={className} aria-hidden="true" />;
}
