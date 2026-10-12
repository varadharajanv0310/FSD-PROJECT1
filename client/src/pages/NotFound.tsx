import { Orb } from "@/components/brand/Orb";
import { ButtonLink } from "@/components/ui/Button";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function NotFound() {
  useDocumentTitle("Page not found");
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <Orb size={120} state="thinking" />
      <p className="serif-accent mt-10 text-[21px] text-muted">Hmm, that's not a question we prepared for.</p>
      <h1 className="mt-2 font-display text-[44px] font-semibold leading-tight">Page not found</h1>
      <p className="mt-3 max-w-sm text-muted">The page you're looking for doesn't exist or has moved.</p>
      <ButtonLink to="/" variant="outline" caps arrow className="mt-8">
        Back to home
      </ButtonLink>
    </main>
  );
}
