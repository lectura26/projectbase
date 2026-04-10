import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-6">
      <p className="font-headline text-2xl font-semibold text-primary">Siden findes ikke</p>
      <p className="mt-2 text-center text-sm text-on-surface-variant">
        Siden findes ikke eller er flyttet.
      </p>
      <Link
        href="/projekter"
        className="mt-8 rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-on-primary hover:opacity-90"
      >
        Til projekter
      </Link>
    </div>
  );
}
