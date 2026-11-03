"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, Link2, Plus } from "lucide-react";
import type { Shipment } from "@/lib/sim/types";
import { useSim } from "@/lib/store";
import { Modal } from "./Modal";
import { Avatar, Button, Toggle } from "./ui";

export function ShareModal({ s, open, onClose }: { s: Shipment; open: boolean; onClose: () => void }) {
  const { t, engine, notify } = useSim();
  const url = `${typeof window !== "undefined" ? window.location.origin : ""}/t/${s.id.toLowerCase()}`;
  const link = url.replace(/^https?:\/\//, "");
  const [copied, setCopied] = useState(false);
  const [to, setTo] = useState<Record<string, boolean>>({ main: true, ap: false });
  const [vis, setVis] = useState({ map: true, temp: s.setpointC !== undefined, driver: false });
  const [exp, setExp] = useState("24");
  const recipients = [
    { id: "main", name: s.contact.name, role: s.contact.role, email: s.contact.email },
    { id: "ap", name: s.client, role: t("share.recipientRole"), email: `service@${s.contact.email.split("@")[1]}` },
  ];
  const chosen = recipients.filter((r) => to[r.id]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* presse-papiers indisponible */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const send = () => {
    const names = chosen.map((r) => r.name).join(", ");
    engine.shareTracking(s.id, names, { temp: vis.temp, driver: vis.driver });
    notify(t("share.sent", { to: names }));
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} width={460} label={t("share.title")}>
      <h3 className="pr-8 text-lg font-semibold">{t("share.title")}</h3>
      <p className="mt-1 text-sm text-muted">{t("share.desc", { client: s.client, id: s.id })}</p>

      <p className="mt-4 text-xs font-medium text-muted">{t("share.link")}</p>
      <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-line bg-[#fafafc] p-1.5 pl-3">
        <Link2 className="size-4 shrink-0 text-faint" />
        <span className="min-w-0 flex-1 truncate font-mono text-xs">{link}</span>
        <Button size="sm" variant={copied ? "accent" : "outline"} onClick={copy}>
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />} {copied ? t("share.copied") : t("share.copy")}
        </Button>
      </div>

      <p className="mt-4 text-xs font-medium text-muted">{t("share.sendTo")}</p>
      <div className="mt-1.5 divide-y divide-line rounded-xl border border-line">
        {recipients.map((r) => (
          <label key={r.id} className="flex cursor-pointer items-center gap-3 p-2.5">
            <input type="checkbox" checked={!!to[r.id]} onChange={(e) => setTo({ ...to, [r.id]: e.target.checked })} className="size-4 accent-[var(--accent)]" />
            <Avatar name={r.name} size={28} />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">{r.name}</span>
              <span className="block truncate text-[11px] text-muted">{r.role} · {r.email}</span>
            </span>
          </label>
        ))}
        <button className="flex w-full items-center gap-2 p-2.5 text-xs font-medium text-accent" onClick={() => notify(t("share.addRecipient"))}>
          <Plus className="size-3.5" /> {t("share.addRecipient")}
        </button>
      </div>

      <p className="mt-4 text-xs font-medium text-muted">{t("share.visible")}</p>
      <div className="mt-1.5 divide-y divide-line rounded-xl border border-line">
        {(
          [
            ["map", t("share.mapEta"), t("share.mapEtaSub")],
            ...(s.setpointC !== undefined ? [["temp", t("share.temp"), t("share.tempSub")]] : []),
            ["driver", t("share.driver"), t("share.driverSub")],
          ] as [keyof typeof vis, string, string][]
        ).map(([k, a, b]) => (
          <div key={k} className="flex items-center gap-3 p-2.5">
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">{a}</span>
              <span className="block text-[11px] text-muted">{b}</span>
            </span>
            <Toggle on={vis[k]} onChange={(v) => setVis({ ...vis, [k]: v })} label={a} />
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs font-medium text-muted">{t("share.expires")}</p>
      <select value={exp} onChange={(e) => setExp(e.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-line bg-white px-3 text-sm outline-none">
        <option value="24">{t("share.exp24")}</option>
        <option value="72">{t("share.exp72")}</option>
        <option value="0">{t("share.expNever")}</option>
      </select>

      <a href={`/t/${s.id.toLowerCase()}`} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:underline">
        <ExternalLink className="size-3.5" /> {t("share.openPage")}
      </a>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-[11px] text-faint">{t("share.revoke")}</p>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose}>{t("common.cancel")}</Button>
          <Button variant="accent" disabled={!chosen.length} onClick={send}>{t("share.send")}</Button>
        </div>
      </div>
    </Modal>
  );
}
