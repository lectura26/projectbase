import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Indstillinger",
};

export default function IndstillingerPage() {
  return (
    <div className="rounded-xl bg-surface-container-lowest p-8 shadow-sm">
      <p className="font-body text-sm text-on-surface-variant/80">
        Pladsholder for Indstillinger.
      </p>
    </div>
  );
}
