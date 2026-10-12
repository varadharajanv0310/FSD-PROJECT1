import { ArrowUpRight, Clock, History as HistoryIcon, Play, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { DIFFICULTIES, INTERVIEW_TYPE_INFO, LEVEL_INFO, ROLES, getRole, type SessionSummary } from "@poise/shared";
import { Button, ButtonLink, IconButton } from "@/components/ui/Button";
import { Segmented, Select } from "@/components/ui/form";
import { Modal } from "@/components/ui/Modal";
import { Card, Chip, EmptyState, Skeleton } from "@/components/ui/primitives";
import { BandLabel, ScoreRing } from "@/components/ui/ScoreRing";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { formatDate, formatMinutes } from "@/lib/format";
import { useDeleteSession, useSessions } from "@/lib/queries";
import { RoleIcon, ROLE_GRADIENTS } from "@/lib/roles";

type StatusFilter = "all" | "completed" | "in_progress";

function HistoryRow({ session, onDelete }: { session: SessionSummary; onDelete: () => void }) {
  const role = getRole(session.role);
  const inProgress = session.status === "in_progress";
  const to = inProgress ? `/app/interview/${session.id}` : `/app/report/${session.id}`;
  const capitalised = DIFFICULTIES.includes(session.difficulty) ? session.difficulty.charAt(0).toUpperCase() + session.difficulty.slice(1) : session.difficulty;

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}>
      <Card className="group flex flex-col gap-5 p-5 transition-shadow hover:shadow-[0_20px_40px_-28px_rgb(0_0_0/0.3)] sm:flex-row sm:items-center">
        <Link to={to} className="flex min-w-0 flex-1 items-center gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl text-white" style={{ background: ROLE_GRADIENTS[session.role] }}>
            <RoleIcon role={session.role} className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[16px] font-semibold">{role?.label}</p>
            <p className="mt-0.5 truncate text-[13.5px] text-muted">
              {INTERVIEW_TYPE_INFO[session.type].label} · {LEVEL_INFO[session.level].label} · {capitalised}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Chip tone="outline">{formatDate(session.startedAt, { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })}</Chip>
              <Chip tone="outline">
                <Clock className="size-3" /> {formatMinutes(session.totalDurationSec)}
              </Chip>
              <Chip tone="outline">
                {session.answeredCount}/{session.questionCount} answered
              </Chip>
            </div>
          </div>
        </Link>
        <div className="flex items-center justify-between gap-4 sm:justify-end">
          {inProgress ? (
            <ButtonLink to={to} variant="soft" size="sm">
              <Play className="size-3.5" /> Resume
            </ButtonLink>
          ) : session.overall !== null ? (
            <div className="flex items-center gap-3">
              <ScoreRing score={session.overall} size={56} stroke={5} showBand={false} />
              <BandLabel score={session.overall} className="hidden md:inline-flex" />
            </div>
          ) : (
            <Chip>Analysing…</Chip>
          )}
          <div className="flex items-center gap-1">
            <IconButton label="Delete interview" onClick={onDelete} className="text-muted hover:text-critical">
              <Trash2 className="size-4" />
            </IconButton>
            <Link to={to} className="inline-flex size-10 items-center justify-center rounded-full hover:bg-mist" aria-label="Open">
              <ArrowUpRight className="size-4" />
            </Link>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

export default function History() {
  useDocumentTitle("History");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const { data: sessions, isLoading } = useSessions({ role: role || undefined, status: status === "all" ? undefined : status });
  const deleteSession = useDeleteSession();
  const [pendingDelete, setPendingDelete] = useState<SessionSummary | null>(null);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteSession.mutateAsync(pendingDelete.id);
      toast.success("Interview deleted.");
    } catch {
      toast.error("Couldn't delete that interview.");
    }
    setPendingDelete(null);
  };

  return (
    <div>
      <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="serif-accent text-[21px] text-muted">Every rep, on record.</p>
          <h1 className="font-display text-[40px] font-semibold leading-[1.04] sm:text-[48px]">Interview history</h1>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Select value={role} onChange={(e) => setRole(e.target.value)} aria-label="Filter by role" className="sm:w-56">
            <option value="">All roles</option>
            {ROLES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </Select>
          <Segmented<StatusFilter>
            ariaLabel="Filter by status"
            value={status}
            onChange={setStatus}
            options={[
              { value: "all", label: "All" },
              { value: "completed", label: "Completed" },
              { value: "in_progress", label: "In progress" },
            ]}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : !sessions?.length ? (
        <Card>
          <EmptyState
            icon={<HistoryIcon className="size-6" />}
            title={role || status !== "all" ? "No interviews match these filters" : "No interviews yet"}
            body={role || status !== "all" ? "Try a different role or status." : "Your completed interviews and their debriefs will live here."}
            action={
              role || status !== "all" ? (
                <Button variant="soft" onClick={() => { setRole(""); setStatus("all"); }}>
                  Clear filters
                </Button>
              ) : (
                <ButtonLink to="/app/new" arrow>
                  Start your first interview
                </ButtonLink>
              )
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {sessions.map((session) => (
              <HistoryRow key={session.id} session={session} onDelete={() => setPendingDelete(session)} />
            ))}
          </AnimatePresence>
        </div>
      )}

      <Modal
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        title="Delete this interview?"
        description="Its answers and feedback will be permanently removed, and your stats will update."
      >
        <div className="flex gap-3">
          <Button variant="soft" block onClick={() => setPendingDelete(null)}>
            Cancel
          </Button>
          <Button variant="danger" block onClick={confirmDelete} loading={deleteSession.isPending}>
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
