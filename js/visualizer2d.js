// ===== 2D VISUALIZER =====
// Structure-aware SVG renderer for all data types

const Visualizer2D = (() => {

  const C = {
    bg:      '#06060d',
    grid:    '#0f0f1a',
    text:    '#eeeef5',
    textDim: '#5a5a80',
    accent:  '#7c6af7',
    green:   '#3ddc84',
    yellow:  '#f5c542',
    orange:  '#fb8c42',
    pink:    '#e87bb8',
    blue:    '#5aacff',
    cyan:    '#3ddcdc',
    purple:  '#a87bff',
    red:     '#f06060',
    edge:    '#2a2a55',
    nodeTypes: {
      linked_list:        '#3ddc84',
      doubly_linked_list: '#3ddcdc',
      binary_tree:        '#e87bb8',
      bst:                '#a87bff',
      array:              '#5aacff',
      sorting:            '#fb8c42',
      stack:              '#f5c542',
      queue:              '#3ddc84',
      graph:              '#7c6af7',
      hash_map:           '#5aacff',
      flowchart:          '#7c6af7',
    }
  };

  let currentVizData = null;
  let activeNodes  = [];
  let activeEdges  = [];
  let svgEl, containerEl;

  function init() {
    svgEl       = document.getElementById('svg2D');
    containerEl = document.getElementById('viz2dContainer');
  }

  // ── PUBLIC: render from vizData ──────────────────────────────────────
  function render(vizData) {
    if (!svgEl) init();
    currentVizData = vizData;
    activeNodes = [];
    activeEdges = [];
    svgEl.innerHTML = '';
    svgEl.style.display = 'block';
    document.getElementById('empty2D').style.display = 'none';

    const type = vizData.vizType || 'flowchart';

    switch (type) {
      case 'linked_list':        renderLinkedList(vizData, false); break;
      case 'doubly_linked_list': renderLinkedList(vizData, true);  break;
      case 'binary_tree':
      case 'bst':                renderTree(vizData);              break;
      case 'array':
      case 'sorting':            renderArray(vizData);             break;
      case 'stack':              renderStack(vizData);             break;
      case 'queue':              renderQueue(vizData);             break;
      case 'graph':              renderGraph(vizData);             break;
      case 'hash_map':           renderHashMap(vizData);           break;
      default:                   renderFlowchart(vizData);         break;
    }
  }

  // ── HIGHLIGHT: for animation steps ──────────────────────────────────
  function highlight(nodeIds, edgeIds) {
    activeNodes = nodeIds || [];
    activeEdges = edgeIds || [];

    // Reset all
    svgEl.querySelectorAll('.ds-node').forEach(el => {
      el.classList.remove('node-lit');
      const shape = el.querySelector('rect, circle, polygon, ellipse');
      if (shape) {
        shape.style.filter = '';
        shape.style.strokeWidth = '';
      }
    });
    svgEl.querySelectorAll('.ds-edge').forEach(el => {
      el.style.opacity = '.25';
      el.style.stroke  = C.edge;
    });

    // Light up active nodes
    activeNodes.forEach(id => {
      const el = svgEl.querySelector(`[data-id="${id}"]`);
      if (!el) return;
      const shape = el.querySelector('rect, circle, polygon, ellipse');
      if (shape) {
        const baseColor = shape.getAttribute('stroke') || C.accent;
        shape.style.filter = `drop-shadow(0 0 10px ${baseColor})`;
        shape.style.strokeWidth = '2.5';
      }
    });

    // Light up active edges
    activeEdges.forEach(edgeId => {
      const el = svgEl.querySelector(`[data-edge="${edgeId}"]`);
      if (el) {
        el.style.opacity = '1';
        el.style.stroke  = C.yellow;
      }
    });
  }

  function clear() {
    if (svgEl) svgEl.innerHTML = '';
    if (svgEl) svgEl.style.display = 'none';
    document.getElementById('empty2D').style.display = 'flex';
    currentVizData = null;
  }

  // ════════════════════════════════════════════════════
  // RENDERERS
  // ════════════════════════════════════════════════════

  // ── LINKED LIST ──────────────────────────────────────────────────────
  function renderLinkedList(vizData, doubly) {
    const nodes   = vizData.nodes || [];
    const color   = doubly ? C.cyan : C.green;
    const NW      = 90;   // node width
    const NH      = 50;   // node height
    const GAP     = 64;   // gap between nodes
    const PX      = 40;   // left padding
    const PY      = 80;   // top padding
    const PER_ROW = 4;    // nodes per row

    const rows     = Math.ceil(nodes.length / PER_ROW);
    const svgW     = PX * 2 + Math.min(nodes.length, PER_ROW) * (NW + GAP);
    const svgH     = PY + rows * (NH + 90) + 60;

    setSVGSize(svgW, svgH);
    drawGridBg(svgW, svgH);

    // Title
    appendTitle(vizData.title || 'Linked List', svgW / 2, 28, color);

    nodes.forEach((node, idx) => {
      const row   = Math.floor(idx / PER_ROW);
      const col   = idx % PER_ROW;
      const x     = PX + col * (NW + GAP);
      const y     = PY + row * (NH + 90);

      const g = mkG({ 'data-id': node.id, class: 'ds-node' });

      // HEAD label
      if (idx === 0) {
        appendTo(g, mkText('HEAD', x + NW/2, y - 22, { fill: color, 'font-size': '11', 'font-weight': '700', 'text-anchor': 'middle', 'letter-spacing': '1' }));
        appendTo(g, mkLine(x + NW/2, y - 14, x + NW/2, y, { stroke: color, 'stroke-width': '1.5', 'stroke-dasharray': '3,2' }));
      }

      // Node box
      appendTo(g, mkRect(x, y, NW, NH, {
        fill: '#0e0e1a', stroke: color, 'stroke-width': '1.5', rx: '8'
      }));

      // Value text
      appendTo(g, mkText(String(node.value ?? ''), x + NW/2, y + 20, {
        fill: C.text, 'font-size': '15', 'font-weight': '700', 'text-anchor': 'middle',
        'font-family': 'Space Mono, monospace'
      }));
      appendTo(g, mkText('data', x + NW/2, y + 33, { fill: C.textDim, 'font-size': '8', 'text-anchor': 'middle' }));

      // Divider
      appendTo(g, mkLine(x + NW - 28, y, x + NW - 28, y + NH, { stroke: color, 'stroke-width': '1', opacity: '.4' }));

      // "next" label in right cell
      appendTo(g, mkText('next', x + NW - 13, y + 20, { fill: color, 'font-size': '8', 'text-anchor': 'middle' }));
      appendTo(g, mkText('→', x + NW - 13, y + 33, { fill: color, 'font-size': '10', 'text-anchor': 'middle' }));

      svgEl.appendChild(g);

      // Arrow to next node
      const nextId = node.next;
      if (nextId) {
        const nextIdx  = nodes.findIndex(n => n.id === nextId);
        const nextRow  = Math.floor(nextIdx / PER_ROW);
        const nextCol  = nextIdx % PER_ROW;
        const nx       = PX + nextCol * (NW + GAP);
        const ny       = PY + nextRow * (NH + 90);
        const edgeId   = `${node.id}-${nextId}`;

        if (row === nextRow) {
          // Same row: horizontal arrow
          const ax = x + NW, ay = y + NH / 2;
          const bx = nx,       by = ny + NH / 2;
          const line = mkLine(ax, ay, bx, by, {
            stroke: C.edge, 'stroke-width': '1.5',
            'marker-end': 'url(#arr)', class: 'ds-edge', 'data-edge': edgeId
          });
          svgEl.appendChild(line);
        } else {
          // Row wrap: draw a U-turn arrow
          const ax = x + NW/2, ay = y + NH;
          const bx = nx + NW/2, by = ny;
          const mid = ay + 35;
          const path = mkPath(
            `M ${ax} ${ay} L ${ax} ${mid} L ${bx} ${mid} L ${bx} ${by}`,
            { stroke: C.edge, 'stroke-width': '1.5', fill: 'none',
              'marker-end': 'url(#arr)', class: 'ds-edge', 'data-edge': edgeId }
          );
          svgEl.appendChild(path);
        }
      } else {
        // NULL terminator
        const tx = x + NW + 12;
        const ty = y + NH / 2;
        if (row === Math.floor((idx - 1) / PER_ROW) || idx === 0) {
          appendTo(svgEl, mkLine(x + NW, ty, tx + 4, ty, { stroke: C.edge, 'stroke-width': '1.5' }));
          appendTo(svgEl, mkText('NULL', tx + 6, ty + 4, {
            fill: C.textDim, 'font-size': '10', 'font-family': 'Space Mono, monospace'
          }));
        }
      }

      // Doubly: prev arrow (dashed, below)
      if (doubly && idx > 0) {
        const prevIdx = idx - 1;
        const prevRow = Math.floor(prevIdx / PER_ROW);
        const prevCol = prevIdx % PER_ROW;
        const px2     = PX + prevCol * (NW + GAP);
        const py2     = PY + prevRow * (NH + 90);
        if (row === prevRow) {
          appendTo(svgEl, mkLine(x, y + NH/2 + 8, px2 + NW, py2 + NH/2 + 8, {
            stroke: C.cyan, 'stroke-width': '1', 'stroke-dasharray': '4,3', opacity: '.5',
            'marker-end': 'url(#arrCyan)', class: 'ds-edge'
          }));
        }
      }
    });

    addDefs(['arr', 'arrCyan'], [C.edge, C.cyan]);
  }

  // ── BINARY TREE ───────────────────────────────────────────────────────
  function renderTree(vizData) {
    const nodes  = vizData.nodes || [];
    const rootId = vizData.root || (nodes[0] && nodes[0].id);
    const color  = vizData.vizType === 'bst' ? C.purple : C.pink;

    if (!rootId || nodes.length === 0) { renderEmpty('No tree data'); return; }

    const map = {};
    nodes.forEach(n => map[n.id] = n);

    // Compute layout using Reingold-Tilford inspired simple layout
    const R = 28;    // node radius
    const LW = 80;   // horizontal spacing
    const LH = 90;   // vertical spacing
    const positions = {};

    function calcPos(id, depth, counter) {
      if (!id || !map[id]) return counter;
      const node = map[id];
      counter = calcPos(node.left, depth + 1, counter);
      positions[id] = { x: counter * LW + 60, y: depth * LH + 60 };
      counter++;
      counter = calcPos(node.right, depth + 1, counter);
      return counter;
    }
    calcPos(rootId, 0, 0);

    const allX = Object.values(positions).map(p => p.x);
    const allY = Object.values(positions).map(p => p.y);
    const svgW = Math.max(...allX) + 100;
    const svgH = Math.max(...allY) + 100;

    setSVGSize(svgW, svgH);
    drawGridBg(svgW, svgH);
    appendTitle(vizData.title || 'Binary Tree', svgW / 2, 22, color);

    // Draw edges first
    nodes.forEach(node => {
      const p = positions[node.id];
      if (!p) return;
      ['left', 'right'].forEach(dir => {
        const childId = node[dir];
        if (!childId || !positions[childId]) return;
        const cp = positions[childId];
        const edgeId = `${node.id}-${childId}`;
        const line = mkLine(p.x, p.y, cp.x, cp.y, {
          stroke: C.edge, 'stroke-width': '1.5',
          'marker-end': 'url(#arr)', class: 'ds-edge', 'data-edge': edgeId
        });
        svgEl.appendChild(line);
      });
    });

    // Draw nodes
    nodes.forEach(node => {
      const p = positions[node.id];
      if (!p) return;
      const g = mkG({ 'data-id': node.id, class: 'ds-node' });
      appendTo(g, mkCircle(p.x, p.y, R, { fill: '#0e0e1a', stroke: color, 'stroke-width': '1.8' }));
      appendTo(g, mkText(String(node.value ?? ''), p.x, p.y + 5, {
        fill: C.text, 'font-size': '14', 'font-weight': '700',
        'text-anchor': 'middle', 'font-family': 'Space Mono, monospace'
      }));
      // NULL leaves
      ['left','right'].forEach((dir, di) => {
        if (node[dir] === null) {
          const nx = p.x + (di === 0 ? -32 : 32);
          const ny = p.y + 55;
          appendTo(svgEl, mkText('null', nx, ny, { fill: C.textDim, 'font-size': '9', 'text-anchor': 'middle', 'font-family': 'Space Mono, monospace' }));
          appendTo(svgEl, mkLine(p.x, p.y + R, nx, ny - 10, { stroke: C.edge, 'stroke-width': '1', 'stroke-dasharray': '3,2' }));
        }
      });
      svgEl.appendChild(g);
    });

    addDefs(['arr'], [C.edge]);
  }

  // ── ARRAY ─────────────────────────────────────────────────────────────
  function renderArray(vizData) {
    const nodes = vizData.nodes || [];
    const color = vizData.vizType === 'sorting' ? C.orange : C.blue;
    const BW    = 60;   // box width
    const BH    = 50;   // box height
    const GAP   = 4;
    const PX    = 40;
    const PY    = 70;

    const svgW  = PX * 2 + nodes.length * (BW + GAP) + 10;
    const svgH  = PY + BH + 80;

    setSVGSize(svgW, svgH);
    drawGridBg(svgW, svgH);
    appendTitle(vizData.title || 'Array', svgW / 2, 26, color);

    nodes.forEach((node, i) => {
      const x  = PX + i * (BW + GAP);
      const g  = mkG({ 'data-id': node.id, class: 'ds-node' });

      appendTo(g, mkRect(x, PY, BW, BH, {
        fill: '#0e0e1a', stroke: color, 'stroke-width': '1.5', rx: '5'
      }));
      appendTo(g, mkText(String(node.value ?? ''), x + BW/2, PY + 30, {
        fill: C.text, 'font-size': '16', 'font-weight': '700',
        'text-anchor': 'middle', 'font-family': 'Space Mono, monospace'
      }));
      // Index label below
      appendTo(g, mkText(String(node.index ?? i), x + BW/2, PY + BH + 18, {
        fill: color, 'font-size': '10', 'text-anchor': 'middle', 'font-family': 'Space Mono, monospace'
      }));
      // Index bracket
      appendTo(g, mkText('[' + (node.index ?? i) + ']', x + BW/2, PY + BH + 30, {
        fill: C.textDim, 'font-size': '8', 'text-anchor': 'middle'
      }));

      svgEl.appendChild(g);
    });
  }

  // ── STACK ────────────────────────────────────────────────────────────
  function renderStack(vizData) {
    const nodes  = vizData.nodes || [];
    const color  = C.yellow;
    const BW     = 140;
    const BH     = 44;
    const GAP    = 4;
    const cx     = 160;
    const svgH   = 80 + nodes.length * (BH + GAP) + 100;

    setSVGSize(cx * 2, svgH);
    drawGridBg(cx * 2, svgH);
    appendTitle(vizData.title || 'Stack', cx, 24, color);

    // Render from top of stack (last item) at the top
    const reversed = [...nodes].reverse();
    reversed.forEach((node, i) => {
      const y  = 50 + i * (BH + GAP);
      const x  = cx - BW / 2;
      const g  = mkG({ 'data-id': node.id, class: 'ds-node' });
      const isTop = i === 0;

      appendTo(g, mkRect(x, y, BW, BH, {
        fill: isTop ? 'rgba(245,197,66,.1)' : '#0e0e1a',
        stroke: isTop ? color : C.edge,
        'stroke-width': isTop ? '2' : '1.2', rx: '5'
      }));
      appendTo(g, mkText(String(node.value ?? ''), cx, y + 26, {
        fill: isTop ? color : C.text,
        'font-size': '15', 'font-weight': '700',
        'text-anchor': 'middle', 'font-family': 'Space Mono, monospace'
      }));
      if (isTop) {
        appendTo(g, mkText('← TOP', cx + BW/2 + 6, y + 26, {
          fill: color, 'font-size': '10', 'font-weight': '700', 'font-family': 'Space Mono, monospace'
        }));
      }
      if (i === reversed.length - 1) {
        appendTo(g, mkText('← BOTTOM', cx + BW/2 + 6, y + 26, {
          fill: C.textDim, 'font-size': '10', 'font-family': 'Space Mono, monospace'
        }));
      }
      svgEl.appendChild(g);
    });

    // Push arrow
    appendTo(svgEl, mkText('PUSH ↓', cx - BW/2 - 55, 50 + BH/2 + 5, { fill: C.green, 'font-size': '11', 'font-weight': '700' }));
    appendTo(svgEl, mkText('↑ POP', cx - BW/2 - 55, 50 + BH/2 + 22, { fill: C.red, 'font-size': '11', 'font-weight': '700' }));
  }

  // ── QUEUE ─────────────────────────────────────────────────────────────
  function renderQueue(vizData) {
    const nodes = vizData.nodes || [];
    const color = C.green;
    const BW    = 80;
    const BH    = 54;
    const GAP   = 8;
    const PX    = 50;
    const PY    = 70;
    const svgW  = PX * 2 + nodes.length * (BW + GAP) + 40;
    const svgH  = PY + BH + 100;

    setSVGSize(svgW, svgH);
    drawGridBg(svgW, svgH);
    appendTitle(vizData.title || 'Queue', svgW / 2, 26, color);

    // ENQUEUE arrow
    appendTo(svgEl, mkText('ENQUEUE →', svgW - 40, PY + BH/2 + 5, {
      fill: C.blue, 'font-size': '10', 'font-weight': '700', 'text-anchor': 'end', 'font-family': 'Space Mono, monospace'
    }));
    // DEQUEUE arrow
    appendTo(svgEl, mkText('← DEQUEUE', PX - 2, PY + BH/2 + 5, {
      fill: C.red, 'font-size': '10', 'font-weight': '700', 'text-anchor': 'end', 'font-family': 'Space Mono, monospace'
    }));

    nodes.forEach((node, i) => {
      const x = PX + i * (BW + GAP);
      const g = mkG({ 'data-id': node.id, class: 'ds-node' });
      const isFront = i === 0;
      const isRear  = i === nodes.length - 1;

      appendTo(g, mkRect(x, PY, BW, BH, {
        fill: (isFront || isRear) ? 'rgba(61,220,132,.08)' : '#0e0e1a',
        stroke: isFront ? C.green : isRear ? C.blue : C.edge,
        'stroke-width': '1.5', rx: '6'
      }));
      appendTo(g, mkText(String(node.value ?? ''), x + BW/2, PY + 30, {
        fill: C.text, 'font-size': '16', 'font-weight': '700',
        'text-anchor': 'middle', 'font-family': 'Space Mono, monospace'
      }));

      if (node.label || isFront) {
        appendTo(g, mkText(node.label || 'FRONT', x + BW/2, PY + BH + 18, {
          fill: isFront ? C.green : C.blue, 'font-size': '9', 'font-weight': '800',
          'text-anchor': 'middle', 'letter-spacing': '1'
        }));
      } else if (isRear && !node.label) {
        appendTo(g, mkText('REAR', x + BW/2, PY + BH + 18, {
          fill: C.blue, 'font-size': '9', 'font-weight': '800',
          'text-anchor': 'middle', 'letter-spacing': '1'
        }));
      }

      // Arrow between nodes
      if (i < nodes.length - 1) {
        const ax = x + BW + 2, ay = PY + BH/2;
        const bx = ax + GAP - 2;
        appendTo(svgEl, mkLine(ax, ay, bx, ay, {
          stroke: color, 'stroke-width': '1.5', 'marker-end': 'url(#arr)'
        }));
      }
      svgEl.appendChild(g);
    });

    addDefs(['arr'], [color]);
  }

  // ── GRAPH ─────────────────────────────────────────────────────────────
  function renderGraph(vizData) {
    const nodes = vizData.nodes || [];
    const edges = vizData.edges || [];
    const color = C.accent;
    const R     = 30;
    const cx    = 300, cy = 220;
    const svgW  = 600, svgH = 460;

    setSVGSize(svgW, svgH);
    drawGridBg(svgW, svgH);
    appendTitle(vizData.title || 'Graph', svgW / 2, 24, color);

    // Position nodes in a circle
    const pos = {};
    nodes.forEach((n, i) => {
      const angle = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
      pos[n.id] = {
        x: cx + Math.cos(angle) * 160,
        y: cy + Math.sin(angle) * 150
      };
    });

    // Draw edges
    edges.forEach(e => {
      const a = pos[e.from], b = pos[e.to];
      if (!a || !b) return;
      const edgeId = `${e.from}-${e.to}`;
      const attrs  = {
        stroke: C.edge, 'stroke-width': '1.5',
        class: 'ds-edge', 'data-edge': edgeId
      };
      if (e.directed) attrs['marker-end'] = 'url(#arr)';
      appendTo(svgEl, mkLine(a.x, a.y, b.x, b.y, attrs));

      // Weight label
      if (e.weight) {
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        appendTo(svgEl, mkText(String(e.weight), mx, my - 6, {
          fill: C.yellow, 'font-size': '10', 'text-anchor': 'middle',
          'font-family': 'Space Mono, monospace'
        }));
      }
    });

    // Draw nodes
    nodes.forEach(n => {
      const p = pos[n.id];
      if (!p) return;
      const g = mkG({ 'data-id': n.id, class: 'ds-node' });
      appendTo(g, mkCircle(p.x, p.y, R, { fill: '#0e0e1a', stroke: color, 'stroke-width': '2' }));
      appendTo(g, mkText(String(n.label || n.value || ''), p.x, p.y + 5, {
        fill: C.text, 'font-size': '13', 'font-weight': '700',
        'text-anchor': 'middle', 'font-family': 'Space Mono, monospace'
      }));
      svgEl.appendChild(g);
    });

    addDefs(['arr'], [C.edge]);
  }

  // ── HASH MAP ─────────────────────────────────────────────────────────
  function renderHashMap(vizData) {
    const nodes = vizData.nodes || [];
    const color = C.blue;
    const BH    = 44;
    const GAP   = 4;
    const PX    = 30;
    const PY    = 60;
    const svgW  = 480;
    const svgH  = PY + nodes.length * (BH + GAP) + 60;

    setSVGSize(svgW, svgH);
    drawGridBg(svgW, svgH);
    appendTitle(vizData.title || 'Hash Map', svgW / 2, 26, color);

    // Header
    appendTo(svgEl, mkText('Index', PX + 25, PY - 10, { fill: C.textDim, 'font-size': '10', 'font-weight': '700', 'text-anchor': 'middle' }));
    appendTo(svgEl, mkText('Key', PX + 105, PY - 10, { fill: C.textDim, 'font-size': '10', 'font-weight': '700', 'text-anchor': 'middle' }));
    appendTo(svgEl, mkText('Value', PX + 270, PY - 10, { fill: C.textDim, 'font-size': '10', 'font-weight': '700', 'text-anchor': 'middle' }));

    nodes.forEach((node, i) => {
      const y = PY + i * (BH + GAP);
      const g = mkG({ 'data-id': node.id, class: 'ds-node' });

      // Index cell
      appendTo(g, mkRect(PX, y, 50, BH, { fill: '#0e0e1a', stroke: C.accent, 'stroke-width': '1.2', rx: '4' }));
      appendTo(g, mkText(String(node.hash ?? i), PX + 25, y + 26, { fill: C.accent, 'font-size': '13', 'font-weight': '700', 'text-anchor': 'middle', 'font-family': 'Space Mono, monospace' }));

      // Key cell
      appendTo(g, mkRect(PX + 58, y, 140, BH, { fill: '#0e0e1a', stroke: color, 'stroke-width': '1.5', rx: '4' }));
      appendTo(g, mkText(String(node.key ?? ''), PX + 128, y + 26, { fill: color, 'font-size': '12', 'font-weight': '700', 'text-anchor': 'middle', 'font-family': 'Space Mono, monospace' }));

      // Arrow
      appendTo(g, mkText('→', PX + 208, y + 26, { fill: C.edge, 'font-size': '16', 'text-anchor': 'middle' }));

      // Value cell
      appendTo(g, mkRect(PX + 216, y, 200, BH, { fill: '#0e0e1a', stroke: C.green, 'stroke-width': '1.5', rx: '4' }));
      appendTo(g, mkText(String(node.value ?? ''), PX + 316, y + 26, { fill: C.text, 'font-size': '12', 'text-anchor': 'middle', 'font-family': 'Space Mono, monospace' }));

      svgEl.appendChild(g);
    });
  }

  // ── FLOWCHART ────────────────────────────────────────────────────────
  function renderFlowchart(vizData) {
    const nodes  = vizData.nodes || [];
    const edges  = vizData.edges || [];
    const color  = C.accent;
    const BW     = 180;
    const BH     = 44;
    const GAP    = 60;
    const PX     = 50;
    const PY     = 50;

    const TYPE_COLORS = {
      start:    C.green,
      end:      C.red,
      decision: C.yellow,
      process:  C.accent,
    };

    // Position nodes vertically (simple top-down layout)
    const pos = {};
    let yOffset = PY;
    nodes.forEach((n, i) => {
      pos[n.id] = { x: PX, y: yOffset };
      yOffset += (n.type === 'decision' ? BH + 20 : BH) + GAP;
    });

    const svgW = BW + PX * 2 + 80;
    const svgH = yOffset + 40;

    setSVGSize(svgW, svgH);
    drawGridBg(svgW, svgH);
    appendTitle(vizData.title || 'Flow', svgW / 2, 22, color);

    const cx = svgW / 2;

    // Draw edges
    edges.forEach(e => {
      const a = pos[e.from], b = pos[e.to];
      if (!a || !b) return;
      const edgeId = `${e.from}-${e.to}`;
      const aNode  = nodes.find(n => n.id === e.from);
      const isLoop = a.y >= b.y;

      let path;
      if (isLoop) {
        // Back-edge (loop): goes right side
        path = mkPath(
          `M ${cx + BW/2} ${a.y + BH/2} L ${cx + BW/2 + 50} ${a.y + BH/2} L ${cx + BW/2 + 50} ${b.y + BH/2} L ${cx + BW/2} ${b.y + BH/2}`,
          { stroke: C.orange, 'stroke-width': '1.5', fill: 'none',
            'marker-end': 'url(#arrOrange)', 'stroke-dasharray': '5,3',
            class: 'ds-edge', 'data-edge': edgeId }
        );
      } else {
        path = mkPath(
          `M ${cx} ${a.y + BH} L ${cx} ${b.y}`,
          { stroke: C.edge, 'stroke-width': '1.5', fill: 'none',
            'marker-end': 'url(#arr)', class: 'ds-edge', 'data-edge': edgeId }
        );
      }
      svgEl.appendChild(path);

      // Edge label
      if (e.label) {
        const mx = isLoop ? cx + BW/2 + 55 : cx + 8;
        const my = (a.y + (b.y || a.y + BH)) / 2 + 5;
        appendTo(svgEl, mkText(e.label, mx, my, {
          fill: C.yellow, 'font-size': '10', 'font-weight': '700', 'font-family': 'Space Mono, monospace'
        }));
      }
    });

    // Draw nodes
    nodes.forEach(n => {
      const p = pos[n.id];
      if (!p) return;
      const nc     = TYPE_COLORS[n.type] || color;
      const x      = cx - BW / 2;
      const g      = mkG({ 'data-id': n.id, class: 'ds-node' });

      if (n.type === 'start' || n.type === 'end') {
        appendTo(g, mkEllipse(cx, p.y + BH/2, BW/2, BH/2, { fill: '#0e0e1a', stroke: nc, 'stroke-width': '2' }));
      } else if (n.type === 'decision') {
        const hw = BW/2 + 10, hh = BH/2 + 10;
        appendTo(g, mkPolygon([
          [cx, p.y], [cx + hw, p.y + hh], [cx, p.y + hh*2], [cx - hw, p.y + hh]
        ], { fill: '#0e0e1a', stroke: nc, 'stroke-width': '1.8' }));
      } else {
        appendTo(g, mkRect(x, p.y, BW, BH, { fill: '#0e0e1a', stroke: nc, 'stroke-width': '1.5', rx: '6' }));
      }

      const ty = n.type === 'decision' ? p.y + BH/2 + 12 : p.y + BH/2 + 5;
      appendTo(g, mkText(n.label || '', cx, ty, {
        fill: C.text, 'font-size': '12', 'font-weight': '600',
        'text-anchor': 'middle', 'font-family': 'Space Mono, monospace'
      }));
      svgEl.appendChild(g);
    });

    addDefs(['arr', 'arrOrange'], [C.edge, C.orange]);
  }

  // ════════════════════════════════════════════════════
  // SVG HELPERS
  // ════════════════════════════════════════════════════

  function setSVGSize(w, h) {
    svgEl.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svgEl.setAttribute('width', w);
    svgEl.setAttribute('height', h);
    svgEl.style.minWidth  = w + 'px';
    svgEl.style.minHeight = h + 'px';
  }

  function drawGridBg(w, h) {
    // Solid dark background
    appendTo(svgEl, mkRect(0, 0, w, h, { fill: '#06060d' }));
    // Dot grid
    const defs = mkEl('defs');
    const pat  = mkEl('pattern', { id: 'dotgrid', width: '24', height: '24', patternUnits: 'userSpaceOnUse' });
    appendTo(pat, mkEl('circle', { cx: '1', cy: '1', r: '.8', fill: '#111128' }));
    appendTo(defs, pat);
    appendTo(svgEl, defs);
    appendTo(svgEl, mkRect(0, 0, w, h, { fill: 'url(#dotgrid)' }));
  }

  function appendTitle(text, x, y, color) {
    appendTo(svgEl, mkText(text, x, y, {
      fill: color, 'font-size': '13', 'font-weight': '700',
      'text-anchor': 'middle', 'letter-spacing': '1.5',
      'font-family': 'Syne, sans-serif'
    }));
  }

  function addDefs(ids, colors) {
    let defs = svgEl.querySelector('defs');
    if (!defs) { defs = mkEl('defs'); svgEl.prepend(defs); }
    ids.forEach((id, i) => {
      const marker = mkEl('marker', {
        id, markerWidth: '8', markerHeight: '8', refX: '7', refY: '3', orient: 'auto'
      });
      appendTo(marker, mkEl('path', { d: 'M0,0 L0,6 L8,3 z', fill: colors[i] || colors[0] }));
      defs.appendChild(marker);
    });
  }

  function renderEmpty(msg) {
    const svgW = 400, svgH = 200;
    setSVGSize(svgW, svgH);
    drawGridBg(svgW, svgH);
    appendTo(svgEl, mkText(msg, svgW/2, svgH/2, { fill: C.textDim, 'text-anchor': 'middle', 'font-size': '13' }));
  }

  // ── Element factories ────────────────────────────────────────────────
  const NS = 'http://www.w3.org/2000/svg';
  function mkEl(tag, attrs = {}) {
    const el = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    return el;
  }
  function mkG(attrs)                  { return mkEl('g', attrs); }
  function mkRect(x,y,w,h,attrs)       { return mkEl('rect',    { x,y,width:w,height:h,...attrs }); }
  function mkCircle(cx,cy,r,attrs)     { return mkEl('circle',  { cx,cy,r,...attrs }); }
  function mkEllipse(cx,cy,rx,ry,a)   { return mkEl('ellipse', { cx,cy,rx,ry,...a }); }
  function mkLine(x1,y1,x2,y2,attrs)  { return mkEl('line',    { x1,y1,x2,y2,...attrs }); }
  function mkPath(d,attrs)             { return mkEl('path',    { d,...attrs }); }
  function mkText(t,x,y,attrs)         { const el=mkEl('text',{x,y,...attrs}); el.textContent=t; return el; }
  function mkPolygon(pts, attrs) {
    return mkEl('polygon', { points: pts.map(p=>p.join(',')).join(' '), ...attrs });
  }
  function appendTo(parent, child)     { parent.appendChild(child); return child; }

  return { render, highlight, clear };
})();

window.Visualizer2D = Visualizer2D;
