"use client";

import type { AppRole, NotifyPreference } from "@prisma/client";
import Image from "next/image";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  deleteProjectTemplate,
  deleteUserAccount,
  inviteTeamMember,
  removeTeamMember,
  updateMemberRole,
  updateMyAccount,
} from "@/app/(dashboard)/indstillinger/actions";
import { displayName, initialsFromUser } from "@/lib/projekter/display";

type UserRow = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  appRole: AppRole;
  notifyPreference: NotifyPreference;
  aiMatchSensitivity: "LOW" | "MEDIUM" | "HIGH";
};

type MemberRow = { id: string; name: string | null; email: string; appRole: AppRole };
type TemplateRow = { id: string; name: string };
type PendingRow = { id: string; email: string; name: string | null; appRole: AppRole };

const notifyLabels: Record<NotifyPreference, string> = {
  EMAIL_DAILY: "E-mail dagligt",
  PUSH: "Push",
  NONE: "Ingen",
};

function ToggleChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-3 py-2 text-xs font-medium transition-colors ${
        active
          ? "border-primary bg-primary text-on-primary"
          : "border-outline-variant/40 bg-surface-container-lowest text-on-surface hover:bg-surface-container-low"
      }`}
    >
      {label}
    </button>
  );
}

export default function IndstillingerPageClient({
  user,
  isAdmin,
  members,
  templates,
  pendingInvites,
}: {
  user: UserRow;
  isAdmin: boolean;
  members: MemberRow[];
  templates: TemplateRow[];
  pendingInvites: PendingRow[];
}) {
  const [name, setName] = useState(user.name ?? "");
  const [pref, setPref] = useState<NotifyPreference>(user.notifyPreference);
  const [saving, startSave] = useTransition();
  const [nameError, setNameError] = useState("");

  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<AppRole>("MEMBER");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteErrors, setInviteErrors] = useState<{ name?: string; email?: string }>({});
  const [inviting, startInvite] = useTransition();

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, startDelete] = useTransition();

  function saveAccount() {
    setNameError("");
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError("Navn er påkrævet.");
      return;
    }
    startSave(async () => {
      try {
        await updateMyAccount({ name: trimmed, notifyPreference: pref });
        toast.success("Indstillinger gemt");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Kunne ikke gemme");
      }
    });
  }

  function changeRole(memberId: string, appRole: AppRole) {
    startSave(async () => {
      try {
        await updateMemberRole(memberId, appRole);
        toast.success("Rolle opdateret");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Fejl");
      }
    });
  }

  function removeMember(memberId: string) {
    startSave(async () => {
      try {
        await removeTeamMember(memberId);
        toast.success("Bruger fjernet");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Fejl");
      }
    });
  }

  function submitInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteErrors({});
    const er: { name?: string; email?: string } = {};
    if (!inviteName.trim()) er.name = "Navn er påkrævet.";
    const em = inviteEmail.trim();
    if (!em) er.email = "E-mail er påkrævet.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) er.email = "Ugyldig e-mail.";
    if (Object.keys(er).length) {
      setInviteErrors(er);
      return;
    }
    startInvite(async () => {
      try {
        const r = await inviteTeamMember({
          name: inviteName.trim(),
          email: inviteEmail.trim(),
          appRole: inviteRole,
        });
        toast.success(
          r.mode === "pending"
            ? "Invitation registreret — brugeren får rollen ved første login."
            : "Eksisterende bruger opdateret.",
        );
        setInviteName("");
        setInviteEmail("");
        setInviteRole("MEMBER");
        setInviteOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Fejl");
      }
    });
  }

  function deleteTemplate(id: string) {
    startSave(async () => {
      try {
        await deleteProjectTemplate(id);
        toast.success("Skabelon slettet");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Fejl");
      }
    });
  }

  const labelClass =
    "block text-[11px] font-bold uppercase tracking-widest text-on-surface-variant mb-2";

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-12 font-body min-w-0">
      <h1 className="text-[20px] font-bold tracking-tight text-primary">Indstillinger</h1>

      {/* MIN KONTO */}
      <section className="rounded-xl bg-surface-container-lowest p-6 shadow-sm ring-1 ring-black/5">
        <h2 className={labelClass}>Min konto</h2>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="flex flex-col items-center gap-2 sm:items-start">
            {user.image ? (
              <Image
                src={user.image}
                alt=""
                width={56}
                height={56}
                unoptimized
                className="h-14 w-14 rounded-full object-cover ring-2 ring-surface-container-high"
              />
            ) : (
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-container text-base font-bold text-on-primary">
                {initialsFromUser({ name: user.name, email: user.email })}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-4">
            <div>
              <label htmlFor="settings-name" className={labelClass}>
                Navn
              </label>
              <input
                id="settings-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setNameError("");
                }}
                className="w-full rounded-md border border-outline-variant bg-surface-container-low px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
              />
              {nameError ? <p className="mt-1 text-xs text-error">{nameError}</p> : null}
            </div>
            <div>
              <span className={labelClass}>E-mail (fra din konto / Microsoft)</span>
              <input
                readOnly
                value={user.email}
                className="w-full cursor-not-allowed rounded-md border border-outline-variant bg-surface-container-high px-3 py-2 text-sm text-on-surface-variant"
              />
            </div>
            <div>
              <span className={labelClass}>Notifikationer</span>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(notifyLabels) as NotifyPreference[]).map((k) => (
                  <ToggleChip
                    key={k}
                    active={pref === k}
                    label={notifyLabels[k]}
                    onClick={() => setPref(k)}
                  />
                ))}
              </div>
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={saveAccount}
              className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-on-primary hover:opacity-90 disabled:opacity-50"
            >
              Gem ændringer
            </button>
          </div>
        </div>
      </section>

      {/* MICROSOFT */}
      <section className="rounded-xl bg-surface-container-lowest p-6 shadow-sm ring-1 ring-black/5">
        <h2 className={labelClass}>Microsoft integration</h2>
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-outline-variant/20 bg-surface-container-low px-3 py-2 text-sm text-on-surface-variant">
          <span className="h-2 w-2 shrink-0 rounded-full bg-slate-400" aria-hidden />
          Microsoft integration er ikke konfigureret endnu
        </div>
        <p className="text-sm leading-relaxed text-on-surface-variant">
          Tilslut Microsoft 365 for automatisk at hente mails, møder og noter til dine projekter.
        </p>
        <button
          type="button"
          disabled
          className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-on-primary opacity-50"
        >
          Tilslut Microsoft 365
        </button>
        <div className="mt-8 border-t border-outline-variant/15 pt-6">
          <span className={labelClass}>AI matching sensitivity</span>
          <div className="flex flex-wrap gap-2">
            {(["Lav", "Medium", "Høj"] as const).map((l) => (
              <button
                key={l}
                type="button"
                disabled
                className="rounded-md bg-primary px-4 py-2 text-xs font-medium text-on-primary opacity-50"
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* TEAM */}
      {isAdmin ? (
        <section className="rounded-xl bg-surface-container-lowest p-6 shadow-sm ring-1 ring-black/5">
          <h2 className={labelClass}>Team og adgang</h2>

          <div className="mb-6 overflow-x-auto rounded-lg border border-outline-variant/15">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-outline-variant/15 bg-surface-container-low">
                  <th className="px-3 py-2 font-semibold text-on-surface-variant">Navn</th>
                  <th className="px-3 py-2 font-semibold text-on-surface-variant">E-mail</th>
                  <th className="px-3 py-2 font-semibold text-on-surface-variant">Rolle</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {members.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-on-surface-variant">
                      Ingen teammedlemmer endnu.
                    </td>
                  </tr>
                ) : (
                  members.map((m) => (
                    <tr key={m.id} className="border-b border-outline-variant/10">
                      <td className="px-3 py-2 font-medium text-on-surface">
                        {displayName({ name: m.name, email: m.email })}
                      </td>
                      <td className="px-3 py-2 text-on-surface-variant">{m.email}</td>
                      <td className="px-3 py-2">
                        <select
                          value={m.appRole}
                          disabled={m.id === user.id}
                          onChange={(e) =>
                            changeRole(m.id, e.target.value as AppRole)
                          }
                          className="rounded-md border border-outline-variant bg-white px-2 py-1 text-xs disabled:opacity-50"
                        >
                          <option value="ADMIN">Admin</option>
                          <option value="MEMBER">Medlem</option>
                        </select>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          disabled={m.id === user.id}
                          onClick={() => removeMember(m.id)}
                          className="text-xs font-medium text-error hover:underline disabled:opacity-40"
                        >
                          Fjern
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {pendingInvites.length > 0 ? (
            <div className="mb-6">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
                Afventer login
              </p>
              <ul className="space-y-1 text-sm text-on-surface-variant">
                {pendingInvites.map((p) => (
                  <li key={p.id}>
                    {p.name || p.email} ({p.email}) — {p.appRole === "ADMIN" ? "Admin" : "Medlem"}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => setInviteOpen((v) => !v)}
            className="rounded-md border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-surface-container-low"
          >
            Tilføj teammedlem
          </button>

          {inviteOpen ? (
            <form onSubmit={submitInvite} className="mt-4 space-y-3 rounded-lg border border-outline-variant/20 bg-surface-container-low p-4">
              <div>
                <label className="text-xs font-medium text-on-surface-variant">Navn</label>
                <input
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="mt-1 w-full rounded-md border border-outline-variant bg-white px-3 py-2 text-sm"
                />
                {inviteErrors.name ? (
                  <p className="mt-1 text-xs text-error">{inviteErrors.name}</p>
                ) : null}
              </div>
              <div>
                <label className="text-xs font-medium text-on-surface-variant">E-mail</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="mt-1 w-full rounded-md border border-outline-variant bg-white px-3 py-2 text-sm"
                />
                {inviteErrors.email ? (
                  <p className="mt-1 text-xs text-error">{inviteErrors.email}</p>
                ) : null}
              </div>
              <div>
                <label className="text-xs font-medium text-on-surface-variant">Rolle</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as AppRole)}
                  className="mt-1 w-full rounded-md border border-outline-variant bg-white px-3 py-2 text-sm"
                >
                  <option value="MEMBER">Medlem</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={inviting}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-on-primary disabled:opacity-50"
              >
                Tilføj
              </button>
            </form>
          ) : null}

          <div className="mt-10 border-t border-outline-variant/15 pt-6">
            <h3 className={labelClass}>Projektskabeloner</h3>
            {templates.length === 0 ? (
              <p className="text-sm text-on-surface-variant">Ingen gemte skabeloner endnu.</p>
            ) : (
              <ul className="divide-y divide-outline-variant/10 rounded-lg border border-outline-variant/15">
                {templates.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                  >
                    <span className="font-medium text-on-surface">{t.name}</span>
                    <button
                      type="button"
                      onClick={() => deleteTemplate(t.id)}
                      className="shrink-0 text-xs font-medium text-error hover:underline"
                    >
                      Slet
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      ) : null}

      {/* SLET KONTO */}
      <section className="rounded-xl border border-[#fecaca] bg-white p-6 shadow-sm">
        <h2 className="text-[20px] font-bold text-[#dc2626]">Slet konto</h2>
        <p className="mt-2 text-sm leading-relaxed text-[#6b7280]">
          Sletning af din konto er permanent og kan ikke fortrydes. Alle dine projekter, opgaver, kommentarer, filer og
          data slettes øjeblikkeligt.
        </p>
        {!deleteOpen ? (
          <button
            type="button"
            onClick={() => {
              setDeleteOpen(true);
              setDeleteConfirm("");
            }}
            className="mt-4 rounded-md border border-solid border-[#dc2626] bg-white px-4 py-2 text-sm font-medium text-[#dc2626] hover:bg-red-50"
          >
            Slet min konto
          </button>
        ) : (
          <div className="mt-4 space-y-4 rounded-lg border border-outline-variant/20 bg-surface-container-low p-4">
            <div>
              <label htmlFor="delete-confirm" className="text-xs font-medium text-on-surface-variant">
                Skriv SLET for at bekræfte
              </label>
              <input
                id="delete-confirm"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                autoComplete="off"
                className="mt-1 w-full rounded-md border border-outline-variant bg-white px-3 py-2 text-sm"
                placeholder="SLET"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={deleting || deleteConfirm !== "SLET"}
                onClick={() => {
                  startDelete(async () => {
                    try {
                      await deleteUserAccount(user.id);
                      window.location.href = "/login";
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "Kunne ikke slette kontoen");
                    }
                  });
                }}
                className="rounded-md bg-[#dc2626] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Bekræft sletning
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => {
                  setDeleteOpen(false);
                  setDeleteConfirm("");
                }}
                className="rounded-md border border-outline-variant bg-white px-4 py-2 text-sm font-medium text-on-surface hover:bg-surface-container-low"
              >
                Annuller
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
