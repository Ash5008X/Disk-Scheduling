/* ============================================================
   Disk Scheduling Simulator — script.js
   Algorithms: FCFS, SSTF, SCAN, C-SCAN
   ============================================================ */

// ─── State ────────────────────────────────────────────────────
let selectedAlgo = 'FCFS';
let lastResult   = null;

// ─── Algorithm Info ───────────────────────────────────────────
const ALGO_META = {
  FCFS: {
    full:       'First Come First Served',
    color:      '#6c63ff',
    desc:       'Processes disk requests in the exact order they arrive. Simple to implement but may cause high total seek time due to wild head movement.',
    complexity: 'O(n)',
    starve:     'No',
    best:       'Fairness / simplicity'
  },
  SSTF: {
    full:       'Shortest Seek Time First',
    color:      '#3ecf8e',
    desc:       'Always picks the closest pending request to minimize immediate seek time. Efficient but can cause starvation of faraway requests.',
    complexity: 'O(n²)',
    starve:     'Yes',
    best:       'Low avg seek time'
  },
  SCAN: {
    full:       'Elevator Algorithm',
    color:      '#f59e0b',
    desc:       'Head moves in one direction, services requests along the way, then reverses. Works like an elevator — balanced and fair.',
    complexity: 'O(n log n)',
    starve:     'No',
    best:       'General purpose'
  },
  CSCAN: {
    full:       'Circular SCAN',
    color:      '#f87171',
    desc:       'Head moves in one direction only. When it reaches the end, it jumps back to the beginning without servicing. Provides uniform wait time.',
    complexity: 'O(n log n)',
    starve:     'No',
    best:       'Uniform wait time'
  }
};

// ─── Example Datasets ─────────────────────────────────────────
const EXAMPLES = {
  classic:   { reqs: [98, 183, 37, 122, 14, 124, 65, 67],      head: 53,  disk: 200 },
  scattered: { reqs: [55, 58, 60, 70, 18, 90, 150, 160, 184],  head: 100, disk: 200 },
  clustered: { reqs: [10, 15, 20, 170, 175, 180, 185, 95, 100], head: 50, disk: 200 }
};

// ─── DOM Ready ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setupAlgoBtns();
  updateInfoCard('FCFS');
  runSimulation();
});

// ─── Setup Algorithm Buttons ──────────────────────────────────
function setupAlgoBtns() {
  document.querySelectorAll('.algo-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.algo-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedAlgo = btn.dataset.algo;
      updateInfoCard(selectedAlgo);
    });
  });
}

// ─── Load Quick Example ───────────────────────────────────────
function loadExample(key) {
  const ex = EXAMPLES[key];
  if (!ex) return;
  document.getElementById('reqInput').value  = ex.reqs.join(', ');
  document.getElementById('headInput').value = ex.head;
  document.getElementById('diskSize').value  = ex.disk;
  runSimulation();
}

// ─── Update Algorithm Info Card ───────────────────────────────
function updateInfoCard(algo) {
  const m = ALGO_META[algo];
  document.getElementById('infoTitle').textContent     = `${algo} — ${m.full}`;
  document.getElementById('infoBody').textContent      = m.desc;
  document.getElementById('infoComplexity').textContent = m.complexity;
  document.getElementById('infoStarve').textContent    = m.starve;
  document.getElementById('infoBest').textContent      = m.best;
  document.querySelector('.info-card').style.borderLeftColor = m.color;
}

// ─── Parse Input ──────────────────────────────────────────────
function parseInput() {
  const raw  = document.getElementById('reqInput').value;
  const reqs = raw.split(/[\s,;]+/).map(Number).filter(n => !isNaN(n) && n >= 0);
  const head = parseInt(document.getElementById('headInput').value) || 0;
  const disk = parseInt(document.getElementById('diskSize').value)  || 200;
  const dir  = document.getElementById('dirInput').value;
  return { reqs, head, disk, dir };
}

// ─── Main Simulation Runner ───────────────────────────────────
function runSimulation() {
  const { reqs, head, disk, dir } = parseInput();

  if (reqs.length === 0) {
    alert('Please enter at least one disk request!');
    return;
  }

  // Clamp head
  const clampedHead = Math.max(0, Math.min(head, disk - 1));

  // Run selected algorithm
  const result = runAlgorithm(selectedAlgo, reqs, clampedHead, disk, dir);
  lastResult = result;

  // Update UI
  updateMetrics(result, reqs.length);
  drawCanvas(result.sequence, selectedAlgo, disk);
  renderSequence(result.sequence, result.wrapPoints || []);
  renderStepTable(result.sequence);
  renderComparison(reqs, clampedHead, disk, dir);
  updateChartBadge(selectedAlgo);
}

// ─── Algorithm Dispatcher ─────────────────────────────────────
function runAlgorithm(algo, reqs, head, disk, dir) {
  switch (algo) {
    case 'FCFS':  return fcfs(reqs, head);
    case 'SSTF':  return sstf(reqs, head);
    case 'SCAN':  return scan(reqs, head, disk, dir);
    case 'CSCAN': return cscan(reqs, head, disk, dir);
    default:      return fcfs(reqs, head);
  }
}

// ─── FCFS ─────────────────────────────────────────────────────
/*
   First Come First Served:
   - Go through the requests in the order they arrived
   - No sorting, no optimization
   - Total distance = sum of absolute differences between consecutive positions
*/
function fcfs(reqs, head) {
  const sequence = [head, ...reqs];
  let totalDistance = 0;

  for (let i = 1; i < sequence.length; i++) {
    totalDistance += Math.abs(sequence[i] - sequence[i - 1]);
  }

  return { sequence, totalDistance, wrapPoints: [] };
}

// ─── SSTF ─────────────────────────────────────────────────────
/*
   Shortest Seek Time First (Greedy):
   - At each step, find the request closest to the current head position
   - Remove it from pending list, move head there
   - Repeat until all requests are served
   - Issue: requests far from head may never get served (starvation)
*/
function sstf(reqs, head) {
  const remaining   = [...reqs];
  const sequence    = [head];
  let currentPos    = head;
  let totalDistance = 0;

  while (remaining.length > 0) {
    // Find index of the closest request
    let closestIdx  = 0;
    let closestDist = Math.abs(remaining[0] - currentPos);

    for (let i = 1; i < remaining.length; i++) {
      const d = Math.abs(remaining[i] - currentPos);
      if (d < closestDist) {
        closestDist = d;
        closestIdx  = i;
      }
    }

    // Move to closest request
    totalDistance += closestDist;
    currentPos     = remaining[closestIdx];
    sequence.push(currentPos);
    remaining.splice(closestIdx, 1);
  }

  return { sequence, totalDistance, wrapPoints: [] };
}

// ─── SCAN (Elevator) ──────────────────────────────────────────
/*
   SCAN Algorithm:
   - Head moves in one direction (right or left)
   - Services all requests in that direction
   - When it reaches the end of disk, reverses direction
   - Services requests on the way back
   - Like an elevator going up then down
*/
function scan(reqs, head, disk, dir) {
  const sorted = [...reqs].sort((a, b) => a - b);

  // Split into left (below head) and right (above head)
  const left  = sorted.filter(r => r < head).reverse(); // descending (move left)
  const right = sorted.filter(r => r >= head);          // ascending  (move right)

  const sequence    = [head];
  let totalDistance = 0;
  let prev          = head;

  function addStep(pos) {
    totalDistance += Math.abs(pos - prev);
    prev = pos;
    sequence.push(pos);
  }

  if (dir === 'right') {
    // Go right first, then reverse
    right.forEach(r => addStep(r));

    // Reverse at the disk end (only if there are left requests)
    if (left.length > 0) {
      const endPos = disk - 1;
      if (prev !== endPos) addStep(endPos);
      left.forEach(r => addStep(r));
    }
  } else {
    // Go left first, then reverse
    left.forEach(r => addStep(r));

    // Reverse at cylinder 0
    if (right.length > 0) {
      if (prev !== 0) addStep(0);
      right.forEach(r => addStep(r));
    }
  }

  return { sequence, totalDistance, wrapPoints: [] };
}

// ─── C-SCAN (Circular SCAN) ───────────────────────────────────
/*
   C-SCAN Algorithm:
   - Head moves in ONE direction only (typically right)
   - Services requests as it goes
   - When it reaches the end, it jumps back to cylinder 0
   - Does NOT service requests on the return trip
   - Provides more uniform wait time than SCAN
   - The "wrap" points (0 and disk-1) are marked in visualization
*/
function cscan(reqs, head, disk, dir) {
  const sorted = [...reqs].sort((a, b) => a - b);

  const right = sorted.filter(r => r >= head);
  const left  = sorted.filter(r => r < head);

  const sequence    = [head];
  const wrapPoints  = [];
  let totalDistance = 0;
  let prev          = head;

  function addStep(pos, isWrap = false) {
    totalDistance += Math.abs(pos - prev);
    prev = pos;
    sequence.push(pos);
    if (isWrap) wrapPoints.push(sequence.length - 1);
  }

  if (dir === 'right') {
    // Service right side
    right.forEach(r => addStep(r));

    if (left.length > 0) {
      // Jump to end of disk, then wrap to 0
      const endPos = disk - 1;
      if (prev !== endPos) addStep(endPos, true);   // mark end as wrap point
      addStep(0, true);                              // mark 0 as wrap point
      // Service left side (now going right from 0)
      left.forEach(r => addStep(r));
    }
  } else {
    // Going left
    [...left].reverse().forEach(r => addStep(r));

    if (right.length > 0) {
      if (prev !== 0) addStep(0, true);
      addStep(disk - 1, true);
      [...right].reverse().forEach(r => addStep(r));
    }
  }

  return { sequence, totalDistance, wrapPoints };
}

// ─── Update Metrics Display ───────────────────────────────────
function updateMetrics(result, numRequests) {
  const { totalDistance } = result;
  const avg   = numRequests > 0 ? (totalDistance / numRequests).toFixed(1) : 0;
  const thru  = totalDistance > 0 ? (numRequests / totalDistance * 100).toFixed(1) : 0;

  animateValue('mTotal', 0, totalDistance, 600);
  document.getElementById('mAvg').textContent   = avg;
  document.getElementById('mCount').textContent  = numRequests;
  document.getElementById('mThru').textContent   = thru;
}

// Animate number counting up
function animateValue(id, start, end, duration) {
  const el = document.getElementById(id);
  const range = end - start;
  const startTime = performance.now();

  function update(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    el.textContent = Math.round(start + range * eased);
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

// ─── Canvas Drawing ───────────────────────────────────────────
function drawCanvas(sequence, algo, disk) {
  const canvas = document.getElementById('seekCanvas');
  const dpr    = window.devicePixelRatio || 1;
  const W      = canvas.parentElement.offsetWidth - 32; // account for padding
  const H      = 280;

  canvas.width  = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width  = W + 'px';
  canvas.style.height = H + 'px';

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);

  const PAD   = { top: 20, bottom: 36, left: 52, right: 20 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;
  const steps  = sequence.length;
  const color  = ALGO_META[algo].color;

  // Mapping functions
  const xPos = i => PAD.left + (i / (steps - 1 || 1)) * chartW;
  const yPos = v => PAD.top  + (1 - (v / (disk - 1))) * chartH;

  // ── Grid Lines ──
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth   = 0.5;

  const gridSteps = 5;
  for (let g = 0; g <= gridSteps; g++) {
    const frac = g / gridSteps;
    const y    = PAD.top + frac * chartH;
    ctx.beginPath();
    ctx.moveTo(PAD.left, y);
    ctx.lineTo(W - PAD.right, y);
    ctx.stroke();

    // Y-axis labels
    const label = Math.round((1 - frac) * (disk - 1));
    ctx.fillStyle    = 'rgba(255,255,255,0.25)';
    ctx.font         = '10px system-ui';
    ctx.textAlign    = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, PAD.left - 8, y);
  }

  // X-axis step markers
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.font      = '10px system-ui';
  ctx.textAlign = 'center';
  const stepInterval = Math.max(1, Math.floor(steps / 8));
  for (let i = 0; i < steps; i += stepInterval) {
    ctx.fillText(i + 1, xPos(i), H - 8);
  }
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fillText('Steps →', W - PAD.right, H - 8);

  // ── Area fill under the line ──
  ctx.beginPath();
  ctx.moveTo(xPos(0), yPos(sequence[0]));
  for (let i = 1; i < steps; i++) {
    ctx.lineTo(xPos(i), yPos(sequence[i]));
  }
  ctx.lineTo(xPos(steps - 1), PAD.top + chartH);
  ctx.lineTo(xPos(0), PAD.top + chartH);
  ctx.closePath();

  const grad = ctx.createLinearGradient(0, PAD.top, 0, PAD.top + chartH);
  grad.addColorStop(0, color + '30');
  grad.addColorStop(1, color + '05');
  ctx.fillStyle = grad;
  ctx.fill();

  // ── Main Line ──
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth   = 2.5;
  ctx.lineJoin    = 'round';
  ctx.lineCap     = 'round';
  ctx.moveTo(xPos(0), yPos(sequence[0]));
  for (let i = 1; i < steps; i++) {
    ctx.lineTo(xPos(i), yPos(sequence[i]));
  }
  ctx.stroke();

  // ── Dots ──
  for (let i = 0; i < steps; i++) {
    const x = xPos(i);
    const y = yPos(sequence[i]);

    ctx.beginPath();
    if (i === 0) {
      // Head start — larger green dot
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fillStyle   = '#3ecf8e';
      ctx.fill();
      ctx.strokeStyle = '#0f0f13';
      ctx.lineWidth   = 2;
      ctx.stroke();
    } else {
      ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle   = color;
      ctx.fill();
      ctx.strokeStyle = '#17171e';
      ctx.lineWidth   = 1.5;
      ctx.stroke();
    }
  }

  // ── Head start label ──
  ctx.fillStyle    = '#3ecf8e';
  ctx.font         = 'bold 11px system-ui';
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillText('HEAD', xPos(0) + 8, yPos(sequence[0]) - 4);
}

// ─── Render Service Sequence Badges ───────────────────────────
function renderSequence(sequence, wrapPoints) {
  const container = document.getElementById('seqBadges');
  const countEl   = document.getElementById('seqCount');
  container.innerHTML = '';

  sequence.forEach((val, i) => {
    if (i > 0) {
      const arrow = document.createElement('span');
      arrow.className = 'seq-arrow';
      arrow.textContent = '→';
      container.appendChild(arrow);
    }

    const badge = document.createElement('span');
    const isWrap = wrapPoints.includes(i);

    if (i === 0) {
      badge.className = 'seq-badge head-pos';
      badge.textContent = `▶ ${val}`;
      badge.title = 'Initial head position';
    } else if (isWrap) {
      badge.className = 'seq-badge wrap';
      badge.textContent = val;
      badge.title = 'Wrap-around point (C-SCAN)';
    } else {
      badge.className = 'seq-badge';
      badge.textContent = val;
    }

    container.appendChild(badge);
  });

  countEl.textContent = `${sequence.length - 1} requests`;
}

// ─── Render Step-by-Step Table ────────────────────────────────
function renderStepTable(sequence) {
  const tbody = document.getElementById('stepBody');
  tbody.innerHTML = '';

  let cumulative = 0;

  for (let i = 1; i < sequence.length; i++) {
    const from = sequence[i - 1];
    const to   = sequence[i];
    const dist = Math.abs(to - from);
    cumulative += dist;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${i}</td>
      <td>${from}</td>
      <td>${to}</td>
      <td>${dist}</td>
      <td>${cumulative}</td>
    `;
    tbody.appendChild(tr);
  }
}

// ─── Render All-Algorithm Comparison ──────────────────────────
function renderComparison(reqs, head, disk, dir) {
  const grid = document.getElementById('compareGrid');
  grid.innerHTML = '';

  const results = {};
  ['FCFS', 'SSTF', 'SCAN', 'CSCAN'].forEach(algo => {
    results[algo] = runAlgorithm(algo, reqs, head, disk, dir).totalDistance;
  });

  const maxDist = Math.max(...Object.values(results));
  const minDist = Math.min(...Object.values(results));

  Object.entries(results).forEach(([algo, dist]) => {
    const meta    = ALGO_META[algo];
    const pct     = maxDist > 0 ? Math.round((dist / maxDist) * 100) : 0;
    const isBest  = dist === minDist;
    const isCurr  = algo === selectedAlgo;

    const card = document.createElement('div');
    card.className = 'cmp-card' + (isBest ? ' best' : '') + (isCurr ? ' current-algo' : '');

    card.innerHTML = `
      <div class="cmp-algo-name">
        ${algo} — ${meta.full}
        ${isBest ? '<span class="badge-best">Best</span>' : ''}
        ${isCurr ? '<span class="badge-current">Selected</span>' : ''}
      </div>
      <div class="cmp-value">${dist}<span class="unit">cylinders</span></div>
      <div class="cmp-bar-wrap">
        <div class="cmp-bar" style="width:${pct}%; background:${meta.color}"></div>
      </div>
      <div class="cmp-desc">${meta.desc.split('.')[0]}.</div>
    `;

    grid.appendChild(card);
  });
}

// ─── Update Chart Badge ───────────────────────────────────────
function updateChartBadge(algo) {
  const meta = ALGO_META[algo];
  document.getElementById('chartBadge').textContent  = `${algo} — ${meta.full}`;
  document.getElementById('chartTitle').textContent  = `Head Movement — ${algo}`;
}

// ─── Window resize — redraw canvas ───────────────────────────
window.addEventListener('resize', () => {
  if (lastResult) {
    const { reqs, head, disk } = parseInput();
    drawCanvas(lastResult.sequence, selectedAlgo, parseInt(document.getElementById('diskSize').value));
  }
});
