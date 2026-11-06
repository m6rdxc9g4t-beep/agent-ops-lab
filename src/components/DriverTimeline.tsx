"use client";

import Link from "next/link";
import { useSim, sortByUrgency } from "@/lib/store";
import { Avatar, HEALTH_COLOR, HEALTH_FILL, SectionTitle } from "./ui";

export function DriverTimeline({ limit = 8 }: { limit?: number }) {
  const { state, engine, t, time } = useSim();
  const rows = sortByUrgency(
    engine,
    state.shipments.filter((s) => s.phase !== "delivered"),
  ).slice(0, limit);
  if (!rows.length) return null;

  const now = state.now;
  const start = Math.floor(Math.min(now - 120, ...rows.map((s) => s.departAt)) / 60) * 60;
  const end = Math.ceil(Math.max(now + 240, ...rows.map((s) => Math.max(engine.eta(s), s.windowEnd))) / 60) * 60;
  const span = end - start;
  const pct = (m: number) => `${((Math.min(end, Math.max(start, m)) - start) / span) * 100}%`;
  const hours: number[] = [];
  const stepH = span > 16 * 60 ? 3 : span > 9 * 60 ? 2 : 1;
  for (let h = start; h <= end; h += 60 * stepH) hours.push(h);

  return (
    <div className="card p-4">
      <SectionTitle title={t("timeline.title")} sub={t("timeline.sub")} />
      <div className="scroll-thin overflow-x-auto">
        <div className="min-w-[620px]">
          <div className="relative ml-[150px] h-5 text-2xs text-faint">
            {hours.map((h) => (
              <span key={h} className="tnum absolute -translate-x-1/2" style={{ left: pct(h) }}>
                {time(h)}
              </span>
            ))}
          </div>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-[150px] right-0">
              {hours.map((h) => (
                <span key={h} className="absolute inset-y-0 w-px bg-line" style={{ left: pct(h) }} />
              ))}
              <span className="absolute inset-y-0 z-10 w-px bg-accent" style={{ left: pct(now) }}>
                <span className="tnum absolute -top-0.5 left-1/2 -translate-x-1/2 -translate-y-full rounded-sm bg-accent px-1 py-px text-[10px] font-semibold leading-none text-accent-ink">{time(now)}</span>
              </span>
            </div>
            {rows.map((s) => {
              const eta = engine.eta(s);
              const h = engine.health(s);
              return (
                <Link key={s.id} href={`/expeditions/${s.id}`} className="-mx-2 flex h-10 items-center rounded-lg px-2 transition-colors hover:bg-hover">
                  <div className="flex w-[150px] shrink-0 items-center gap-2 pr-2">
                    <Avatar name={s.driver.name} size={22} />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium">{s.driver.name}</p>
                      <p className="truncate text-2xs text-muted">{s.id}</p>
                    </div>
                  </div>
                  <div className="relative h-full flex-1">
                    {/* créneau de livraison */}
                    <span
                      className="absolute top-2 bottom-2 rounded-md border border-dashed"
                      style={{ left: pct(s.windowStart), width: `calc(${pct(s.windowEnd)} - ${pct(s.windowStart)})`, borderColor: h === "ontime" ? "var(--line-strong)" : HEALTH_FILL[h], background: "var(--card)" }}
                    />
                    {/* trajet */}
                    <span
                      className="absolute top-[15px] h-2.5 rounded-sm"
                      style={{ left: pct(s.departAt), width: `calc(${pct(eta)} - ${pct(s.departAt)})`, background: `color-mix(in oklab, ${HEALTH_FILL[h]} 22%, transparent)` }}
                    />
                    <span
                      className="absolute top-[15px] h-2.5 rounded-sm"
                      style={{ left: pct(s.departAt), width: `calc(${pct(Math.min(now, eta))} - ${pct(s.departAt)})`, background: HEALTH_FILL[h] }}
                    />
                    <span className="tnum absolute top-[13px] text-2xs font-medium" style={{ left: `calc(${pct(eta)} + 4px)`, color: h === "ontime" ? "var(--muted)" : HEALTH_COLOR[h] }}>
                      {time(eta)}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
