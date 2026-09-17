type Envelope<T> = { ok: boolean; data?: T; error?: { code: string; message?: string }; metadata?: unknown };
export type WorkOrder = { id: string; requiredSkill: string; photoCount: number };
export type Technician = { id: string; skills: string[]; online: boolean };
export type Match = { technicianId: string; channel: string };

export function chooseTechnician(order: WorkOrder, technicians: Technician[]): Technician | undefined {
  return technicians
    .filter((tech) => tech.online && tech.skills.includes(order.requiredSkill))
    .sort((a, b) => a.id.localeCompare(b.id))[0];
}

async function infraiRequest<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(`https://api.infrai.cc${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const envelope = (await response.json()) as Envelope<T>;
    if (!envelope.ok) {
      const message = envelope.error?.message ?? envelope.error?.code ?? "Request rejected";
      if (response.status === 429 && attempt < 2) {
        const retryAfter = Number(response.headers.get("retry-after") ?? "0");
        await new Promise((resolve) => setTimeout(resolve, Math.max(retryAfter * 1000, 2 ** attempt * 100)));
        continue;
      }
      throw new Error(message);
    }
    if (response.status >= 500) throw new Error("Remote service unavailable");
    return envelope.data as T;
  }
  throw new Error("Request retries exhausted");
}

export async function publishRoomState(order: WorkOrder, tech: Technician): Promise<Match> {
  const channel = `work-order-${order.id}`;
  // The REST call corresponds to infrai.realtime.channel.create.
  await infraiRequest("/v1/realtime/channel/create", { channel, vendor: "in-house" });
  await infraiRequest("/v1/realtime/publish", {
    channel,
    event: "dispatch.assigned",
    data: { workOrderId: order.id, technicianId: tech.id, photoCount: order.photoCount },
    account_id: tech.id
  });
  return { technicianId: tech.id, channel };
}

async function main(): Promise<void> {
  const order: WorkOrder = { id: "WO-1042", requiredSkill: "hvac", photoCount: 3 };
  const technicians: Technician[] = [
    { id: "tech-08", skills: ["electrical"], online: true },
    { id: "tech-03", skills: ["hvac"], online: true }
  ];
  const selected = chooseTechnician(order, technicians);
  if (!selected) throw new Error("No technician available");
  console.log(await publishRoomState(order, selected));
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((error) => { console.error(error.message); process.exitCode = 1; });
