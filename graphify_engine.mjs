import fs from 'fs'
import path from 'path'

const ROOT_DIR = process.cwd()
const SRC_DIR = path.join(ROOT_DIR, 'finance-tracker', 'src')
const MIGRATIONS_DIR = path.join(ROOT_DIR, 'finance-tracker', 'supabase', 'migrations')
const OUTPUT_DIRS = [
  path.join(ROOT_DIR, 'graphify'),
  path.join(ROOT_DIR, 'graphifyy'),
]

// Ensure output dirs exist
OUTPUT_DIRS.forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true })
})

function walkFiles(dir, exts = ['.js', '.jsx', '.sql', '.json']) {
  let files = []
  if (!fs.existsSync(dir)) return files
  const list = fs.readdirSync(dir)
  for (const item of list) {
    const full = path.join(dir, item)
    const stat = fs.statSync(full)
    if (stat.isDirectory()) {
      if (!item.includes('node_modules') && !item.includes('dist') && !item.startsWith('.')) {
        files = files.concat(walkFiles(full, exts))
      }
    } else if (exts.some(ext => item.endsWith(ext))) {
      files.push(full)
    }
  }
  return files
}

console.log('🔍 Scanning codebase for Knowledge Graph...')
const allSourceFiles = walkFiles(SRC_DIR)
const allMigrationFiles = walkFiles(MIGRATIONS_DIR, ['.sql'])

const nodes = []
const edges = []
const nodeMap = new Map()

function addNode(id, label, type, group, meta = {}) {
  if (nodeMap.has(id)) return nodeMap.get(id)
  const node = { id, label, type, group, ...meta }
  nodes.push(node)
  nodeMap.set(id, node)
  return node
}

function addEdge(source, target, relation, label = '') {
  if (!source || !target || source === target) return
  const edgeKey = `${source}->${target}:${relation}`
  if (edges.some(e => e.key === edgeKey)) return
  edges.push({ key: edgeKey, source, target, relation, label })
}

// 1. Parse Database Tables from Migrations
const DB_TABLES = ['users', 'categories', 'payment_methods', 'transactions', 'sips', 'sip_payments', 'debts', 'mutual_funds', 'goals', 'budgets', 'net_worth_custom_assets']
DB_TABLES.forEach(tbl => {
  addNode(`db:${tbl}`, `📊 DB: ${tbl}`, 'database', 'Database Tables', {
    color: '#f59e0b',
    shape: 'database',
    description: `Supabase PostgreSQL table: ${tbl}`
  })
})

// 2. Parse Source Files
allSourceFiles.forEach(filePath => {
  const relPath = path.relative(SRC_DIR, filePath).replace(/\\/g, '/')
  const content = fs.readFileSync(filePath, 'utf8')
  const ext = path.extname(filePath)
  const baseName = path.basename(filePath, ext)

  let group = 'Utils'
  let color = '#64748b'
  let shape = 'dot'

  if (relPath.startsWith('pages/')) {
    group = 'Pages & Routes'
    color = '#10b981'
    shape = 'diamond'
  } else if (relPath.startsWith('components/')) {
    group = 'UI Components'
    color = '#3b82f6'
    shape = 'dot'
  } else if (relPath.startsWith('context/')) {
    group = 'Context Providers'
    color = '#8b5cf6'
    shape = 'hexagon'
  } else if (relPath.startsWith('data/')) {
    group = 'Data & Datasets'
    color = '#ec4899'
    shape = 'triangle'
  } else if (relPath.startsWith('utils/')) {
    group = 'Core Utilities'
    color = '#06b6d4'
    shape = 'ellipse'
  } else if (relPath.startsWith('lib/')) {
    group = 'Clients & Config'
    color = '#f97316'
    shape = 'square'
  }

  const nodeId = `src:${relPath}`
  addNode(nodeId, baseName, 'code', group, {
    file: relPath,
    fullPath: filePath,
    color,
    shape,
    lineCount: content.split('\n').length,
    size: content.length,
  })

  // Extract imports
  const importRegex = /import\s+(?:(?:\*\s+as\s+\w+)|(?:{[^}]+})|(?:[A-Za-z0-9_]+))\s+from\s+['"]([^'"]+)['"]/g
  let match
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1]
    if (importPath.startsWith('.')) {
      const resolvedDir = path.dirname(filePath)
      const absTarget = path.resolve(resolvedDir, importPath)
      
      // Try extensions
      const candidates = [absTarget, `${absTarget}.js`, `${absTarget}.jsx`, `${absTarget}.json`, path.join(absTarget, 'index.js'), path.join(absTarget, 'index.jsx')]
      for (const cand of candidates) {
        if (fs.existsSync(cand) && !fs.statSync(cand).isDirectory()) {
          const targetRel = path.relative(SRC_DIR, cand).replace(/\\/g, '/')
          addEdge(nodeId, `src:${targetRel}`, 'imports', 'imports')
          break
        }
      }
    }
  }

  // Detect Supabase DB Table accesses
  DB_TABLES.forEach(tbl => {
    if (content.includes(`from('${tbl}')`) || content.includes(`from("${tbl}")`)) {
      addEdge(nodeId, `db:${tbl}`, 'queries', 'queries')
    }
  })
})

// Calculate Degree Centrality
const degreeMap = {}
edges.forEach(e => {
  degreeMap[e.source] = (degreeMap[e.source] || 0) + 1
  degreeMap[e.target] = (degreeMap[e.target] || 0) + 1
})
nodes.forEach(n => {
  n.connections = degreeMap[n.id] || 0
  n.value = Math.max(10, Math.min(40, (n.connections || 1) * 3))
})

const graphData = {
  metadata: {
    generatedAt: new Date().toISOString(),
    totalNodes: nodes.length,
    totalEdges: edges.length,
    groups: [...new Set(nodes.map(n => n.group))],
  },
  nodes,
  edges,
}

// Generate Interactive HTML Visualization with Vis.js
const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Graphify - Interactive Codebase Knowledge Graph</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://unpkg.com/vis-network/standalone/umd/vis-network.min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    #network { width: 100%; height: calc(100vh - 80px); background: #0b0f19; }
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 font-sans flex flex-col h-screen overflow-hidden">
  <!-- Header -->
  <header class="bg-slate-900 border-b border-slate-800 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 z-20 shadow-md">
    <div class="flex items-center gap-3">
      <div class="bg-emerald-500 text-slate-950 p-2 rounded-xl font-bold text-sm tracking-wider">⚡ GRAPHIFY</div>
      <div>
        <h1 class="text-base font-bold text-white leading-tight">Codebase Knowledge Graph & Architecture</h1>
        <p class="text-xs text-slate-400">${nodes.length} Nodes • ${edges.length} Dependency Edges • Live Architecture</p>
      </div>
    </div>

    <!-- Controls -->
    <div class="flex items-center gap-3">
      <input
        type="text"
        id="searchBox"
        placeholder="🔍 Search files, components, tables..."
        class="bg-slate-800 border border-slate-700 text-xs text-white px-3 py-1.5 rounded-lg w-64 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
      />
      <select id="groupFilter" class="bg-slate-800 border border-slate-700 text-xs text-white px-3 py-1.5 rounded-lg focus:outline-none">
        <option value="ALL">All Groups (All Modules)</option>
        ${graphData.metadata.groups.map(g => `<option value="${g}">${g}</option>`).join('\n        ')}
      </select>
      <button id="btnPhysics" class="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs transition-colors">
        Stabilize Graph
      </button>
    </div>
  </header>

  <!-- Main Canvas & Inspector Drawer -->
  <div class="flex flex-1 relative overflow-hidden">
    <div id="network"></div>

    <!-- Sidebar Node Detail Inspector -->
    <div id="inspector" class="absolute top-4 right-4 w-80 bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-2xl p-4 shadow-2xl hidden z-30 transition-all text-xs space-y-3">
      <div class="flex items-center justify-between border-b border-slate-800 pb-2">
        <span id="nodeGroup" class="px-2 py-0.5 rounded-md font-semibold text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800"></span>
        <button id="closeInspector" class="text-slate-400 hover:text-white">✕</button>
      </div>
      <div>
        <h3 id="nodeTitle" class="text-sm font-bold text-white"></h3>
        <p id="nodeFile" class="text-slate-400 font-mono text-[11px] break-all mt-0.5"></p>
      </div>
      <div class="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
        <div class="p-2 bg-slate-800/60 rounded-lg">
          <span class="text-slate-400 block text-[10px]">Connections</span>
          <strong id="nodeConns" class="text-emerald-400 text-sm font-bold">0</strong>
        </div>
        <div class="p-2 bg-slate-800/60 rounded-lg">
          <span class="text-slate-400 block text-[10px]">Line Count</span>
          <strong id="nodeLines" class="text-blue-400 text-sm font-bold">0</strong>
        </div>
      </div>
      <div class="space-y-1.5 pt-2 border-t border-slate-800">
        <span class="font-semibold text-slate-300 block">Connected Dependencies:</span>
        <div id="nodeDeps" class="max-h-40 overflow-y-auto space-y-1 text-[11px]"></div>
      </div>
    </div>
  </div>

  <script>
    const rawData = ${JSON.stringify(graphData)};

    const visNodes = new vis.DataSet(rawData.nodes.map(n => ({
      id: n.id,
      label: n.label,
      group: n.group,
      color: {
        background: n.color,
        border: '#ffffff',
        highlight: { background: '#10b981', border: '#ffffff' }
      },
      shape: n.shape || 'dot',
      value: n.value || 15,
      font: { color: '#ffffff', size: 12, face: 'Inter, system-ui' },
      meta: n
    })));

    const visEdges = new vis.DataSet(rawData.edges.map(e => ({
      from: e.source,
      to: e.target,
      arrows: 'to',
      color: { color: '#334155', highlight: '#10b981' },
      smooth: { type: 'continuous' }
    })));

    const container = document.getElementById('network');
    const data = { nodes: visNodes, edges: visEdges };
    const options = {
      physics: {
        solver: 'forceAtlas2Based',
        forceAtlas2Based: { gravitationalConstant: -35, centralGravity: 0.005, springLength: 100, springConstant: 0.18 },
        stabilization: { iterations: 150 }
      },
      interaction: { hover: true, tooltipDelay: 200, zoomView: true, dragView: true }
    };

    const network = new vis.Network(container, data, options);

    // Inspector Drawer logic
    const inspector = document.getElementById('inspector');
    const nodeTitle = document.getElementById('nodeTitle');
    const nodeFile = document.getElementById('nodeFile');
    const nodeGroup = document.getElementById('nodeGroup');
    const nodeConns = document.getElementById('nodeConns');
    const nodeLines = document.getElementById('nodeLines');
    const nodeDeps = document.getElementById('nodeDeps');

    network.on('click', function (params) {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0];
        const n = rawData.nodes.find(x => x.id === nodeId);
        if (n) {
          inspector.classList.remove('hidden');
          nodeTitle.innerText = n.label;
          nodeFile.innerText = n.file || n.id;
          nodeGroup.innerText = n.group;
          nodeConns.innerText = n.connections || 0;
          nodeLines.innerText = n.lineCount || 'N/A';

          const relatedEdges = rawData.edges.filter(e => e.source === nodeId || e.target === nodeId);
          nodeDeps.innerHTML = relatedEdges.map(e => {
            const isOut = e.source === nodeId;
            const otherId = isOut ? e.target : e.source;
            const otherNode = rawData.nodes.find(x => x.id === otherId);
            return '<div class="flex items-center justify-between p-1.5 bg-slate-800/80 rounded">' +
              '<span class="text-slate-300 truncate">' + (otherNode ? otherNode.label : otherId) + '</span>' +
              '<span class="text-[10px] text-emerald-400 font-mono">' + (isOut ? '→ ' + e.relation : '← required by') + '</span>' +
            '</div>';
          }).join('');
        }
      } else {
        inspector.classList.add('hidden');
      }
    });

    document.getElementById('closeInspector').onclick = () => inspector.classList.add('hidden');

    // Search filter
    document.getElementById('searchBox').addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      if (!q) {
        visNodes.update(rawData.nodes.map(n => ({ id: n.id, hidden: false })));
        return;
      }
      visNodes.update(rawData.nodes.map(n => ({
        id: n.id,
        hidden: !n.label.toLowerCase().includes(q) && !(n.file || '').toLowerCase().includes(q)
      })));
    });

    // Group filter
    document.getElementById('groupFilter').addEventListener('change', (e) => {
      const g = e.target.value;
      if (g === 'ALL') {
        visNodes.update(rawData.nodes.map(n => ({ id: n.id, hidden: false })));
      } else {
        visNodes.update(rawData.nodes.map(n => ({
          id: n.id,
          hidden: n.group !== g
        })));
      }
    });

    let physicsEnabled = true;
    document.getElementById('btnPhysics').onclick = () => {
      physicsEnabled = !physicsEnabled;
      network.setOptions({ physics: { enabled: physicsEnabled } });
      document.getElementById('btnPhysics').innerText = physicsEnabled ? 'Freeze Positions' : 'Resume Physics';
    };
  </script>
</body>
</html>
`

// Generate Markdown Knowledge Graph Report
const mdReport = `# ⚡ Graphify Codebase Knowledge Graph & Architecture Report

> **Repository:** Personal Finance & Wealth Tracker (Version 1.1)  
> **Generated:** ${new Date().toLocaleString()}  
> **Total Nodes:** ${nodes.length}  
> **Total Dependency Edges:** ${edges.length}

---

## 🏛️ High-Level Architecture Overview

\`\`\`mermaid
flowchart TD
  subgraph ClientApp ["Frontend (React 18 + Vite)"]
    App["App.jsx (Router)"]
    Dashboard["Dashboard.jsx"]
    MF["MutualFunds.jsx (AMFI + Groww)"]
    NetWorth["NetWorth.jsx"]
    Goals["Goals.jsx"]
    Budgets["Budgets.jsx"]
    Txns["Transactions.jsx"]
    SIPs["SIPs.jsx"]
    Past["PastExpenses.jsx"]
    Reports["Reports.jsx"]
  end

  subgraph StateAndUtils ["Context & Intelligence Engines"]
    AuthContext["AuthContext.jsx"]
    AdminContext["AdminContext.jsx"]
    MFApi["mfApi.js (Live AMFI NAVs)"]
    GrowwParser["growwParser.js"]
    StatementParser["statementParser.js"]
  end

  subgraph SupabaseDB ["Supabase Cloud Database (PostgreSQL)"]
    tbl_users[("auth.users")]
    tbl_txns[("transactions")]
    tbl_mfs[("mutual_funds")]
    tbl_sips[("sips")]
    tbl_debts[("debts")]
    tbl_goals[("goals")]
    tbl_budgets[("budgets")]
    tbl_assets[("net_worth_custom_assets")]
    tbl_cats[("categories")]
    tbl_pms[("payment_methods")]
  end

  App --> Dashboard & MF & NetWorth & Goals & Budgets & Txns & SIPs & Past & Reports
  Dashboard --> MFApi & tbl_txns & tbl_mfs & tbl_debts
  MF --> MFApi & GrowwParser & tbl_mfs
  NetWorth --> tbl_mfs & tbl_assets & tbl_debts
  Goals --> tbl_goals & tbl_sips
  Budgets --> tbl_budgets & tbl_txns & tbl_cats
  Txns --> StatementParser & tbl_txns & tbl_cats & tbl_pms
\`\`\`

---

## 📊 Modules & Node Breakdown

| Group | Node Count | Key Modules / Tables |
|---|---|---|
| **Pages & Routes** | ${nodes.filter(n => n.group === 'Pages & Routes').length} | \`Dashboard\`, \`MutualFunds\`, \`NetWorth\`, \`Goals\`, \`Budgets\`, \`Transactions\`, \`SIPs\`, \`PastExpenses\`, \`Reports\` |
| **UI Components** | ${nodes.filter(n => n.group === 'UI Components').length} | \`GrowwPortfolioGrowthChart\`, \`PortfolioHealthModal\`, \`StatementImportModal\`, \`Layout\`, \`Sidebar\`, \`TransactionForm\` |
| **Context Providers** | ${nodes.filter(n => n.group === 'Context Providers').length} | \`AuthContext\`, \`AdminContext\` |
| **Core Utilities** | ${nodes.filter(n => n.group === 'Core Utilities').length} | \`mfApi.js\` (AMFI), \`growwParser.js\`, \`statementParser.js\`, \`formatCurrency.js\`, \`dateUtils.js\` |
| **Database Tables** | ${nodes.filter(n => n.group === 'Database Tables').length} | \`mutual_funds\`, \`transactions\`, \`sips\`, \`debts\`, \`goals\`, \`budgets\`, \`net_worth_custom_assets\` |

---

## 🎯 Top Centrality Hubs (Highest Impact / Connections)

${nodes.sort((a, b) => (b.connections || 0) - (a.connections || 0)).slice(0, 10).map((n, i) => `${i + 1}. **${n.label}** (${n.group}) — \`${n.connections} direct connections\``).join('\n')}

---

## 📂 Output Files Generated in \`graphify/\` and \`graphifyy/\`:
- **\`graph.html\`**: Interactive drag-and-drop 2D physics graph visualization.
- **\`graph.json\`**: Raw parsed graph AST & relation graph dataset.
- **\`CODEBASE_GRAPH.md\`**: Architecture index and Mermaid diagram.
`

// Write to both graphify and graphifyy directories
OUTPUT_DIRS.forEach(outDir => {
  fs.writeFileSync(path.join(outDir, 'graph.json'), JSON.stringify(graphData, null, 2))
  fs.writeFileSync(path.join(outDir, 'index.html'), htmlContent)
  fs.writeFileSync(path.join(outDir, 'graph.html'), htmlContent)
  fs.writeFileSync(path.join(outDir, 'CODEBASE_GRAPH.md'), mdReport)
  console.log(`✅ Generated Graphify artifacts in: ${outDir}`)
})

console.log('🎉 Graphify Knowledge Graph generation complete!')
