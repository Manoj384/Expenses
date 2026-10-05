import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ngizgizqlfufgfslszij.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_8FY1WsPZAYZK4usOmTOk1A_5ZHW9Vi7'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
const PDF_DIR = path.resolve(__dirname, '../public/pdfs')

function getFilesRecursively(dir) {
  let results = []
  if (!fs.existsSync(dir)) return results
  const list = fs.readdirSync(dir)
  for (const file of list) {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)
    if (stat && stat.isDirectory()) {
      results = results.concat(getFilesRecursively(filePath))
    } else if (file.toLowerCase().endsWith('.pdf')) {
      results.push(filePath)
    }
  }
  return results
}

async function uploadPdf(filePath) {
  const relativePath = path.relative(PDF_DIR, filePath).replace(/\\/g, '/')
  const fileName = path.basename(filePath)
  const fileBuffer = fs.readFileSync(filePath)
  const fileSize = fs.statSync(filePath).size

  console.log(`\n📤 Uploading ${relativePath} (${(fileSize / (1024 * 1024)).toFixed(2)} MB)...`)

  // Storage path in bucket
  const storagePath = relativePath

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('emc-documents')
    .upload(storagePath, fileBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    })

  if (uploadError) {
    console.error(`❌ Upload failed for ${relativePath}:`, uploadError.message)
    return false
  }

  const { data: publicUrlData } = supabase.storage
    .from('emc-documents')
    .getPublicUrl(storagePath)

  const publicUrl = publicUrlData?.publicUrl || `${SUPABASE_URL}/storage/v1/object/public/emc-documents/${storagePath}`

  // Insert/Upsert into emc_documents table
  const docId = relativePath.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
  const title = fileName.replace(/\.pdf$/i, '').replace(/[-_+]/g, ' ')

  const { error: dbError } = await supabase.from('emc_documents').upsert({
    id: docId,
    filename: fileName,
    title: title,
    category: relativePath.includes('/') ? relativePath.split('/')[0] : 'general',
    file_size_bytes: fileSize,
    storage_url: publicUrl,
    extracted_key_points: [
      `Automotive & Electronics Technical Reference: ${title}`,
      `Hosted on Supabase Cloud Storage: ${storagePath}`
    ],
  })

  if (dbError) {
    console.warn(`⚠️ DB record upsert warning for ${fileName}:`, dbError.message)
  } else {
    console.log(`✅ Synced to Supabase Storage & Database: ${publicUrl}`)
  }

  return true
}

async function main() {
  console.log('🚀 Starting Supabase PDF Document Synchronization...')
  const pdfFiles = getFilesRecursively(PDF_DIR)
  console.log(`Found ${pdfFiles.length} PDF files to synchronize.`)

  let success = 0
  let failed = 0

  for (const file of pdfFiles) {
    const ok = await uploadPdf(file)
    if (ok) success++
    else failed++
  }

  console.log(`\n🎉 Completed! Success: ${success}, Failed: ${failed}`)
}

main().catch(console.error)
