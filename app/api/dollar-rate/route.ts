import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const DOLAR_API_URL = "https://dolarapi.com/v1/dolares/blue"

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
    const body = await req.json()
    const sb = await createClient()

    if (body.action === "fetch") {
      // Fetch from dolarapi.com
      const res = await fetch(DOLAR_API_URL, { next: { revalidate: 0 } })
      if (!res.ok) return NextResponse.json({ ok: false, error: "API dolarapi.com no disponible" }, { status: 502 })
      const api = await res.json()
      const value = {
        buy: api.compra ?? 0,
        sell: api.venta ?? 0,
        source: "api",
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
      const res = await fetch(DOLAR_API_URL, { next: { revalidate: 0 } })
      if (!res.ok) return NextResponse.json({ ok: false, error: "API no disponible" }, { status: 502 })
      const api = await res.json()
      const value = {
        buy: api.compra ?? 0,
        sell: api.venta ?? 0,
        source: "api",
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
