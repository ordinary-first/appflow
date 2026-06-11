import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { GoogleSignIn } from "@/components/GoogleSignIn";
import { SubmitForm } from "@/components/SubmitForm";

export const dynamic = "force-dynamic";

export default async function SubmitPage() {
  const user = await getSessionUser();

  return (
    <main className="mx-auto max-w-xl px-5 py-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Glim
      </Link>

      <h1 className="mt-5 text-2xl font-bold">Submit your app</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        A 15-second demo and one sentence. That&apos;s the whole pitch.
      </p>

      {user ? (
        <SubmitForm defaultMakerName={user.name} />
      ) : (
        <div className="mt-8 rounded-2xl border border-border bg-muted p-6 text-center">
          <p className="font-medium">Sign in to submit your app.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Submitting is the one place we ask for an account — browsing never
            needs one.
          </p>
          <div className="mx-auto mt-4 max-w-xs">
            <GoogleSignIn callbackURL="/submit" />
          </div>
        </div>
      )}
    </main>
  );
}
