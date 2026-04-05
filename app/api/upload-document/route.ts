import { createClient, SupabaseClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

function getSupabaseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!url || !key) {
    throw new Error("Supabase not configured")
  }
  
  return createClient(url, key)
}

export async function POST(request: NextRequest) {
  try {
    // Basic auth check: require a role header set by the app
    const authRole = request.headers.get("x-nitia-role")
    if (!authRole) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 })
    }

    const supabase = getSupabaseClient()
    const formData = await request.formData()
    const file = formData.get("file") as File
    const projectId = formData.get("projectId") as string
    const category = formData.get("category") as string
    const folder = formData.get("folder") as string || ""

    if (!file) {
      return NextResponse.json(
        { message: "No file provided" },
        { status: 400 }
      )
    }

    if (!projectId) {
      return NextResponse.json(
        { message: "No project ID provided" },
        { status: 400 }
      )
    }

    // Validate file type (expanded list)
    const validTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ]
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { message: "Tipo de archivo no permitido. Solo PDF, imágenes o documentos Office." },
        { status: 400 }
      )
    }

    // Validate size (max 25MB)
    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json(
        { message: "El archivo no puede exceder 25MB" },
        { status: 400 }
      )
    }

    // Generate unique filename with optional folder
    const timestamp = Date.now()
    const sanitizedFolder = folder ? folder.replace(/[^a-zA-Z0-9-_]/g, "_") + "/" : ""
    const fileName = `${projectId}/${category}/${sanitizedFolder}${timestamp}_${file.name}`

    // Convert File to Buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from("project-documents")
      .upload(fileName, buffer, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false,
      })

    if (error) {
      console.error("Supabase upload error:", error)
      return NextResponse.json(
        { message: error.message || "Error al subir archivo" },
        { status: 500 }
      )
    }

    // Get signed URL (expires in 1 hour)
    const { data: urlData } = await supabase.storage
      .from("project-documents")
      .createSignedUrl(data.path, 3600)

    // Save metadata to project_documents table (only for valid UUIDs)
    // Provider documents use "provider-{id}" format which isn't a valid UUID
    const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectId)
    
    if (isValidUUID) {
      const { error: dbError } = await supabase.from("project_documents").insert({
        project_id: projectId,
        file_name: file.name,
        file_path: data.path,
        file_size: file.size,
        document_type: category === "contrato" ? "contract" : category === "presupuesto" ? "budget" : "other",
      })

      if (dbError) {
        console.error("Database insert error:", dbError)
        // Continue anyway, file was uploaded
      }
    }

    return NextResponse.json({
      success: true,
      url: urlData?.signedUrl || "",
      path: data.path,
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json(
      { message: "Error al procesar el archivo" },
      { status: 500 }
    )
  }
}
