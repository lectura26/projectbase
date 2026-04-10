import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Indstillinger",
};

export default function IndstillingerPage() {
  return (
    <div className="rounded-xl bg-surface-container-lowest p-8 shadow-sm ring-1 ring-black/5">
      <p className="font-body text-sm text-on-surface-variant">
        Pladsholder for Indstillinger.
      </p>
    </div>
  );
}
