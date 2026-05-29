"use client";

import { formatDateTime } from "@/lib/format";
import type { AuditRow } from "@/app/actions/users";

export default function AuditLogPanel({ logs }: { logs: AuditRow[] }) {
  return (
    <div className="pony-card p-4">
      {logs.length === 0 ? (
        <p className="text-sm text-slate-400">暂无操作记录</p>
      ) : (
        <ul className="space-y-2">
          {logs.map((l) => (
            <li
              key={l.id}
              className="flex flex-wrap items-center gap-x-2 gap-y-0.5 border-b border-dashed border-slate-100 pb-2 text-sm last:border-0 last:pb-0"
            >
              <span className="pony-badge bg-pony-purple/15 text-pony-purpleDeep">
                {l.action}
              </span>
              {l.summary && <span className="text-slate-600">{l.summary}</span>}
              <span className="ml-auto text-xs text-slate-400">
                {l.operator} · {formatDateTime(l.createdAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
