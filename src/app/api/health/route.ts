// Sonde de vie, utilisée par le portail de la suite Atelier (voyant « En ligne »).
export function GET() {
  return Response.json({ status: "ok", app: "agent-ops-lab" }, { headers: { "Cache-Control": "no-store" } });
}
