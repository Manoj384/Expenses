import fs from 'fs'

const learningsContent = fs.readFileSync('src/components/emc/ElectronicsLearnings.jsx', 'utf8')
const matches = [...learningsContent.matchAll(/sourcePdf:\s*['"]([^'"]+)['"]/g)].map(m => m[1])

const standardsContent = fs.readFileSync('src/pages/EmcStandards.jsx', 'utf8')
const stdMatches = [...standardsContent.matchAll(/pdfUrl:\s*['"]([^'"]+)['"]/g)].map(m => m[1])

const detailContent = fs.readFileSync('src/components/emc/EmcDetailModal.jsx', 'utf8')
const detailMatches = [...detailContent.matchAll(/['"](iso\/[^'"]+|\/pdfs\/[^'"]+)['"]/g)].map(m => m[1])

const allPaths = Array.from(new Set([...matches, ...stdMatches, ...detailMatches]))
console.log('Total unique PDF paths to verify:', allPaths.length)

function resolvePdfUrl(filePathOrName) {
  if (!filePathOrName) return ''
  if (filePathOrName.startsWith('http://') || filePathOrName.startsWith('https://')) {
    return filePathOrName
  }
  
  let cleanPath = filePathOrName.trim().replace(/^\/?(pdfs\/)?/, '')
  cleanPath = cleanPath.replace(/\s*\([^)]*\)$/, '')

  const THEORY_FILES = [
    '02 - Current, Voltage and Power.pdf',
    '03 - DC and AC - Two Good Friends.pdf',
    '04 - Resistance - Join the resistance !.pdf',
    '05 - Capacitance - Storing electrical energy.pdf',
    '06 - Inductance - The magical magnetic field.pdf',
    '07 - Semi-Conductors.pdf',
    '08 - Basic Laws of Electric Circuits.pdf',
  ]
  const MICROWAVE_FILES = [
    'Microwave+Introduction.pdf',
    'Transmission+Lines.pdf',
    'Scaterring+Parameters.pdf',
    'Smith+Chart.pdf',
    'Waveguides.pdf',
    'Microwave+Diodes.pdf',
    'Microwave+Sources.pdf',
    'Microwave+Measurement.pdf',
  ]
  const ISO_PREFIXES = ['ISO-', 'ISO_', 'ISO-FDIS']

  if (!cleanPath.includes('/')) {
    if (THEORY_FILES.includes(cleanPath)) {
      cleanPath = `theory/${cleanPath}`
    } else if (MICROWAVE_FILES.includes(cleanPath)) {
      cleanPath = `microwave/${cleanPath}`
    } else if (ISO_PREFIXES.some(p => cleanPath.startsWith(p))) {
      cleanPath = `iso/${cleanPath}`
    }
  }

  const encodedPath = cleanPath.split('/').map(seg => encodeURIComponent(seg)).join('/')
  const supabaseUrl = 'https://ngizgizqlfufgfslszij.supabase.co'
  return `${supabaseUrl}/storage/v1/object/public/emc-documents/${encodedPath}`
}

async function checkAll() {
  const missing = []
  for (const p of allPaths) {
    const url = resolvePdfUrl(p)
    try {
      const res = await fetch(url, { method: 'HEAD' })
      if (res.status !== 200) {
        missing.push({ path: p, url, status: res.status })
        console.log(`❌ ${res.status} NOT FOUND: "${p}" --> ${url}`)
      } else {
        console.log(`✅ OK (200): "${p}" --> ${url}`)
      }
    } catch (e) {
      missing.push({ path: p, error: e.message })
    }
  }

  console.log('\n========================================')
  console.log(`TOTAL: ${allPaths.length} | PASSED: ${allPaths.length - missing.length} | MISSING: ${missing.length}`)
  console.log('========================================')
  if (missing.length > 0) {
    console.log('MISSING DETAILS:', JSON.stringify(missing, null, 2))
  }
}

checkAll()
