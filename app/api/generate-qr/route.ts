import { NextRequest, NextResponse } from "next/server"
import QRCode from "qrcode"

export async function POST(request: NextRequest) {
  try {
    const { data } = await request.json()
    
    if (!data) {
      return NextResponse.json(
        { error: "No data provided" },
        { status: 400 }
      )
    }

    // Generate QR code as data URL
    const qrDataUrl = await QRCode.toDataURL(data, {
      width: 200,
      margin: 2,
      color: {
        dark: "#1C1A12",
        light: "#FFFFFF",
      },
    })

    return NextResponse.json({ qrCode: qrDataUrl })
  } catch (error) {
    console.error("QR generation error:", error)
    return NextResponse.json(
      { error: "Error generating QR code" },
      { status: 500 }
    )
  }
}
