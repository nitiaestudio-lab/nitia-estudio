import { createClient } from "@/lib/supabase/client"

const supabase = createClient()

export async function uploadProjectDocument(
  projectId: string,
  file: File,
  documentType: "contract" | "budget" | "other"
) {
  try {
    if (!file) {
      return { success: false, error: "No file selected" }
    }

    // Validar tipo de archivo (solo PDF)
    if (file.type !== "application/pdf") {
      return { success: false, error: "Solo se permiten archivos PDF" }
    }

    // Validar tamaño (máx 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return { success: false, error: "El archivo no puede exceder 10MB" }
    }

    const fileName = `${projectId}/${documentType}/${Date.now()}_${file.name}`

    const { data, error } = await supabase.storage
      .from("project-documents")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      })

    if (error) {
      console.error("Upload error:", error)
      return { success: false, error: "Error al subir archivo" }
    }

    // Use signed URL (1 hour expiry) instead of public URL
    const { data: signedData } = await supabase.storage.from("project-documents").createSignedUrl(data.path, 3600)
    return {
      success: true,
      path: data.path,
      url: signedData?.signedUrl || "",
    }
  } catch (error) {
    console.error("Upload error:", error)
    return { success: false, error: "Error al procesar solicitud" }
  }
}

export async function deleteProjectDocument(filePath: string) {
  try {
    const { error } = await supabase.storage
      .from("project-documents")
      .remove([filePath])

    if (error) {
      console.error("Delete error:", error)
      return { success: false, error: "Error al eliminar archivo" }
    }

    return { success: true }
  } catch (error) {
    console.error("Delete error:", error)
    return { success: false, error: "Error al procesar solicitud" }
  }
}

export async function listProjectDocuments(projectId: string) {
  try {
    const { data, error } = await supabase.storage
      .from("project-documents")
      .list(projectId, {
        limit: 100,
        offset: 0,
        sortBy: { column: "created_at", order: "desc" },
      })

    if (error) {
      console.error("List error:", error)
      return { success: false, documents: [] }
    }

    return {
      success: true,
      documents: data || [],
    }
  } catch (error) {
    console.error("List error:", error)
    return { success: false, documents: [] }
  }
}
