import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const INFOBAE_API_URL = "https://storage.googleapis.com/dolar-data/dolar-data.json"
const DOLAR_API_FALLBACK_URL = "https://dolarapi.com/v1/dolares/blue"

/** Fetch dólar blue rates. Primary: Infobae GCS feed. Fallback: dolarapi.com */
async function fetchDolarBlue(): Promise<{ buy: number; sell: number; source: string }> {
  // --- Primary: Infobae GCS feed ---
  try {
    const res = await fetch(INFOBAE_API_URL, { next: { revalidate: 0 } })
    if (res.ok) {
      const json = await res.json()
      const blueEntry = json?.data?.find(
        (d: { ric?: string }) => d.ric === "ARSB="
      )
      if (blueEntry && typeof blueEntry.sellValue === "number" && blueEntry.sellValue > 0) {
        const sell: number = blueEntry.sellValue
        // Infobae only publishes the sell value; derive buy with the standard ~$10 ARS spread
        const buy: number = blueEntry.buyValue ?? sell - 10
        return { buy, sell, source: "infobae" }
      }
    }
  } catch {
    // fall through to backup
  }

  // --- Fallback: dolarapi.com ---
  const res = await fetch(DOLAR_API_FALLBACK_URL, { next: { revalidate: 0 } })
  if (!res.ok) throw new Error("API dolarapi.com no disponible")
  const api = await res.json()
  return {
    buy: api.compra ?? 0,
    sell: api.venta ?? 0,
    source: "dolarapi",
  }
}

export async function GET() {
  try {
    const sb = await createClient()
    const { data } = await sb.from("app_settings").select("value, updated_at").eq("key", "dollar_blue").single()
    return NextResponse.json({ ok: true, data: data?.value ?? null, updated_at: data?.updated_at })
  } catch (err) {
    return NextResponse.json({ ok: false, error: "Error fetching setting" }, { status: 500 })
  }
}

// POST: fetch from API or set manual override
export async function POST(req: Request) {
  try {
    // Auth check for mutations
    const authRole = req.headers.get("x-nitia-role")
    if (!authRole) {
      return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 })
    }

    const body = await req.json()
    const sb = await createClient()

    if (body.action === "fetch") {
      const { buy, sell, source } = await fetchDolarBlue()
      const value = {
        buy,
        sell,
        source,
        last_api_fetch: new Date().toISOString(),
        manual_override: null,
      }
      await sb.from("app_settings").upsert({ key: "dollar_blue", value, updated_at: new Date().toISOString() })
      return NextResponse.json({ ok: true, data: value })
    }

    if (body.action === "manual") {
      // Manual override
      const { data: current } = await sb.from("app_settings").select("value").eq("key", "dollar_blue").single()
      const prev = current?.value ?? {}
      const value = {
        ...prev,
        sell: body.sell ?? prev.sell ?? 0,
        buy: body.buy ?? prev.buy ?? 0,
        source: "manual",
        manual_override: new Date().toISOString(),
      }
      await sb.from("app_settings").upsert({ key: "dollar_blue", value, updated_at: new Date().toISOString() })
      return NextResponse.json({ ok: true, data: value })
    }

    if (body.action === "clear_override") {
      // Clear manual override, re-fetch from API
      const { buy, sell, source } = await fetchDolarBlue()
      const value = {
        buy,
        sell,
        source,
        last_api_fetch: new Date().toISOString(),
        manual_override: null,
      }
      await sb.from("app_settings").upsert({ key: "dollar_blue", value, updated_at: new Date().toISOString() })
      return NextResponse.json({ ok: true, data: value })
    }

    return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 })
  } catch (err) {
    console.error("Dollar rate error:", err)
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 })
  }
}
