// ===== 3D VISUALIZER =====
// Structure-aware Three.js renderer with step animation

const Visualizer3D = (() => {

  let scene, camera, renderer;
  let animId = null;
  let isRunning = false;
  let isDragging = false;
  let prevMouse = { x: 0, y: 0 };
  let sph = { theta: 0.5, phi: 1.1, r: 18 };
  let boundCanvas = null;

  // Active highlight state
  let allMeshMap  = {};   // id → { meshes, basePos }
  let allEdgeMap  = {};   // "id1-id2" → line

  // ── Color palette ────────────────────────────────────────────────────
  const COL = {
    bg:         0x06060d,
    node:       0x7c6af7,
    edge:       0x2a2a55,
    active:     0xf5c542,
    linked:     0x3ddc84,
    tree:       0xe87bb8,
    bst:        0xa87bff,
    array:      0x5aacff,
    sorting:    0xfb8c42,
    stack:      0xf5c542,
    queue:      0x3ddc84,
    graph:      0x7c6af7,
    hashmap:    0x5aacff,
    flow:       0x7c6af7,
    null_node:  0x222235,
    text_bg:    0x0e0e1a,
  };

  // ── Event handlers (stable refs) ─────────────────────────────────────
  const _md = e => { isDragging = true; prevMouse = { x: e.clientX, y: e.clientY }; };
  const _mu = () => isDragging = false;
  const _mm = e => {
    if (!isDragging) return;
    sph.theta -= (e.clientX - prevMouse.x) * 0.006;
    sph.phi = Math.max(0.12, Math.min(Math.PI - 0.12, sph.phi + (e.clientY - prevMouse.y) * 0.006));
    prevMouse = { x: e.clientX, y: e.clientY };
    _camUpdate();
  };
  const _mw = e => { sph.r = Math.max(5, Math.min(50, sph.r + e.deltaY * 0.025)); _camUpdate(); };

  let _td = 0;
  const _ts = e => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      _td = Math.sqrt(dx * dx + dy * dy);
    } else { isDragging = true; prevMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }
  };
  const _tm = e => {
    e.preventDefault();
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const d = Math.sqrt(dx * dx + dy * dy);
      sph.r = Math.max(5, Math.min(50, sph.r + (_td - d) * 0.05)); _td = d; _camUpdate();
    } else if (isDragging) {
      sph.theta -= (e.touches[0].clientX - prevMouse.x) * 0.006;
      sph.phi = Math.max(0.12, Math.min(Math.PI - 0.12, sph.phi + (e.touches[0].clientY - prevMouse.y) * 0.006));
      prevMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      _camUpdate();
    }
  };

  function _attach(cv) {
    cv.addEventListener('mousedown', _md);
    cv.addEventListener('mousemove', _mm);
    cv.addEventListener('mouseup', _mu);
    cv.addEventListener('mouseleave', _mu);
    cv.addEventListener('wheel', _mw, { passive: true });
    cv.addEventListener('touchstart', _ts, { passive: true });
    cv.addEventListener('touchmove', _tm, { passive: false });
    cv.addEventListener('touchend', _mu);
    boundCanvas = cv;
  }

  function _detach() {
    if (!boundCanvas) return;
    boundCanvas.removeEventListener('mousedown', _md);
    boundCanvas.removeEventListener('mousemove', _mm);
    boundCanvas.removeEventListener('mouseup', _mu);
    boundCanvas.removeEventListener('mouseleave', _mu);
    boundCanvas.removeEventListener('wheel', _mw);
    boundCanvas.removeEventListener('touchstart', _ts);
    boundCanvas.removeEventListener('touchmove', _tm);
    boundCanvas.removeEventListener('touchend', _mu);
    boundCanvas = null;
  }

  function _camUpdate() {
    if (!camera) return;
    camera.position.set(
      sph.r * Math.sin(sph.phi) * Math.cos(sph.theta),
      sph.r * Math.cos(sph.phi),
      sph.r * Math.sin(sph.phi) * Math.sin(sph.theta)
    );
    camera.lookAt(0, 0, 0);
  }

  function _dispose() {
    isRunning = false;
    if (animId) { cancelAnimationFrame(animId); animId = null; }
    _detach();
    if (scene) {
      scene.traverse(o => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => {
            if (m.map) m.map.dispose();
            m.dispose();
          });
        }
      });
      scene.clear();
      scene = null;
    }
    if (renderer) { renderer.dispose(); renderer = null; }
    camera = null;
    allMeshMap = {};
    allEdgeMap = {};
  }

  // ── Canvas label sprite ───────────────────────────────────────────────
  function _sprite(text, color = '#7c6af7', bgAlpha = 0.85) {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 52;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, 256, 52);
    ctx.fillStyle = `rgba(6,6,13,${bgAlpha})`;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(2, 4, 252, 44, 8);
    else ctx.rect(2, 4, 252, 44);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text.slice(0, 20), 128, 26);
    const tex = new THREE.CanvasTexture(c);
    const sp  = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
    sp.scale.set(2.4, 0.6, 1);
    return sp;
  }

  // ── Node mesh factories ───────────────────────────────────────────────
  function _boxNode(color, size = 0.7) {
    return new THREE.Mesh(
      new THREE.BoxGeometry(size, size, size),
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.2, metalness: 0.2, roughness: 0.6 })
    );
  }
  function _sphereNode(color, r = 0.45) {
    return new THREE.Mesh(
      new THREE.SphereGeometry(r, 16, 16),
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.2, metalness: 0.1, roughness: 0.6 })
    );
  }
  function _cylNode(color, r = 0.4, h = 0.7) {
    return new THREE.Mesh(
      new THREE.CylinderGeometry(r, r, h, 14),
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.2, metalness: 0.2, roughness: 0.6 })
    );
  }
  function _diamondNode(color) {
    return new THREE.Mesh(
      new THREE.OctahedronGeometry(0.55),
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.25, metalness: 0.3, roughness: 0.5 })
    );
  }
  function _torusNode(color) {
    return new THREE.Mesh(
      new THREE.TorusGeometry(0.38, 0.13, 10, 24),
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.25 })
    );
  }

  // ── Edge line ─────────────────────────────────────────────────────────
  function _edge(a, b, color = COL.edge) {
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(...a), new THREE.Vector3(...b)
    ]);
    return new THREE.Line(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.55 }));
  }

  // ── Lights ────────────────────────────────────────────────────────────
  function _lights() {
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const d1 = new THREE.DirectionalLight(0x7c6af7, 3);
    d1.position.set(6, 10, 6); scene.add(d1);
    const d2 = new THREE.DirectionalLight(0x3ddc84, 1.5);
    d2.position.set(-6, -4, 8); scene.add(d2);
  }

  // ── Star field ────────────────────────────────────────────────────────
  function _stars() {
    const pos = new Float32Array(800 * 3);
    for (let i = 0; i < pos.length; i++) pos[i] = (Math.random() - 0.5) * 130;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0x1e1e3a, size: 0.18 })));
  }

  // ── Grid floor ────────────────────────────────────────────────────────
  function _grid(y = -4) {
    const g = new THREE.GridHelper(40, 40, 0x111128, 0x0c0c1e);
    g.position.y = y;
    scene.add(g);
  }

  // ── Register node for animation ───────────────────────────────────────
  function _reg(id, meshes, pos) {
    allMeshMap[id] = { meshes: Array.isArray(meshes) ? meshes : [meshes], basePos: [...pos] };
  }
  function _regEdge(key, line) {
    allEdgeMap[key] = line;
  }

  // ════════════════════════════════════════════════════
  // SCENE BUILDERS per vizType
  // ════════════════════════════════════════════════════

  function _buildScene(vizData) {
    _lights(); _stars(); _grid();

    const type = vizData.vizType || 'flowchart';
    switch (type) {
      case 'linked_list':
      case 'doubly_linked_list': _buildLinkedList(vizData); break;
      case 'binary_tree':
      case 'bst':                _buildTree(vizData);       break;
      case 'array':
      case 'sorting':            _buildArray(vizData);      break;
      case 'stack':              _buildStack(vizData);      break;
      case 'queue':              _buildQueue(vizData);      break;
      case 'graph':              _buildGraph(vizData);      break;
      case 'hash_map':           _buildHashMap(vizData);    break;
      default:                   _buildFlowchart(vizData);  break;
    }
  }

  // ── LINKED LIST 3D ───────────────────────────────────────────────────
  function _buildLinkedList(vizData) {
    const nodes  = vizData.nodes || [];
    const doubly = vizData.vizType === 'doubly_linked_list';
    const color  = doubly ? 0x3ddcdc : 0x3ddc84;
    const STEP   = 3.2;
    const PER_ROW = 4;

    const positions = {};
    nodes.forEach((n, i) => {
      const row = Math.floor(i / PER_ROW);
      const col = i % PER_ROW;
      const x   = (col - (Math.min(nodes.length, PER_ROW) - 1) / 2) * STEP;
      const y   = -row * 2.8;
      positions[n.id] = [x, y, 0];
    });

    nodes.forEach((n, i) => {
      const [x, y, z] = positions[n.id];

      // Node box
      const mesh = _boxNode(color);
      mesh.position.set(x, y, z);
      scene.add(mesh);

      // Value label
      const sp = _sprite(String(n.value ?? n.id), '#3ddc84');
      sp.position.set(x, y + 0.78, z);
      scene.add(sp);

      _reg(n.id, [mesh, sp], [x, y, z]);

      // Arrow to next
      if (n.next && positions[n.next]) {
        const [nx, ny, nz] = positions[n.next];
        const key = `${n.id}-${n.next}`;
        const line = _edge([x + 0.38, y, z], [nx - 0.38, ny, nz], color);
        scene.add(line);
        _regEdge(key, line);
      } else {
        // NULL cap
        const nullMesh = new THREE.Mesh(
          new THREE.BoxGeometry(0.5, 0.5, 0.5),
          new THREE.MeshStandardMaterial({ color: COL.null_node, wireframe: true })
        );
        nullMesh.position.set(x + STEP * 0.6, y, z);
        scene.add(nullMesh);
        const ns = _sprite('NULL', '#2a2a55');
        ns.position.set(x + STEP * 0.6, y + 0.65, z);
        scene.add(ns);
      }

      // Doubly: back arrow
      if (doubly && i > 0) {
        const prev    = nodes[i - 1];
        const [px, py, pz] = positions[prev.id];
        const key = `${n.id}-${prev.id}`;
        const line = _edge([x - 0.3, y - 0.2, z], [px + 0.3, py - 0.2, pz], 0x3ddcdc);
        line.material.opacity = 0.4;
        scene.add(line);
        _regEdge(key, line);
      }
    });

    sph.r = 12;
  }

  // ── BINARY TREE 3D ───────────────────────────────────────────────────
  function _buildTree(vizData) {
    const nodes  = vizData.nodes || [];
    const rootId = vizData.root || (nodes[0] && nodes[0].id);
    const color  = vizData.vizType === 'bst' ? 0xa87bff : 0xe87bb8;
    const map    = {};
    nodes.forEach(n => map[n.id] = n);

    // In-order layout
    let counter  = 0;
    const pos    = {};
    const LW     = 2.6, LH = 2.4;

    function layout(id, depth) {
      if (!id || !map[id]) return;
      layout(map[id].left, depth + 1);
      pos[id] = { x: (counter - nodes.length / 2) * LW, y: -depth * LH, z: 0 };
      counter++;
      layout(map[id].right, depth + 1);
    }
    layout(rootId, 0);

    nodes.forEach(n => {
      const p = pos[n.id];
      if (!p) return;

      const mesh = _sphereNode(color);
      mesh.position.set(p.x, p.y, p.z);
      scene.add(mesh);

      const sp = _sprite(String(n.value ?? ''), '#' + color.toString(16).padStart(6, '0'));
      sp.position.set(p.x, p.y + 0.65, p.z);
      scene.add(sp);

      _reg(n.id, [mesh, sp], [p.x, p.y, p.z]);

      ['left', 'right'].forEach(dir => {
        const cid = n[dir];
        if (!cid || !pos[cid]) return;
        const cp  = pos[cid];
        const key = `${n.id}-${cid}`;
        const line = _edge([p.x, p.y - 0.45, p.z], [cp.x, cp.y + 0.45, cp.z], color);
        scene.add(line);
        _regEdge(key, line);
      });
    });

    sph = { theta: 0.3, phi: 0.9, r: nodes.length > 6 ? 18 : 14 };
  }

  // ── ARRAY 3D ─────────────────────────────────────────────────────────
  function _buildArray(vizData) {
    const nodes = vizData.nodes || [];
    const color = vizData.vizType === 'sorting' ? 0xfb8c42 : 0x5aacff;
    const STEP  = 1.8;
    const cx    = ((nodes.length - 1) / 2) * STEP;

    nodes.forEach((n, i) => {
      const x   = i * STEP - cx;
      const val = parseFloat(n.value) || 1;
      const h   = Math.max(0.5, Math.min(4, val / 20));

      const mesh = _cylNode(color, 0.55, h);
      mesh.position.set(x, h / 2 - 1, 0);
      scene.add(mesh);

      // Index label
      const sp = _sprite(`[${n.index ?? i}] ${n.value}`, '#5aacff');
      sp.position.set(x, h + 0.2, 0);
      scene.add(sp);

      _reg(n.id, [mesh, sp], [x, h / 2 - 1, 0]);
    });

    sph = { theta: 0.1, phi: 1.0, r: 12 };
  }

  // ── STACK 3D ─────────────────────────────────────────────────────────
  function _buildStack(vizData) {
    const nodes   = vizData.nodes || [];
    const color   = 0xf5c542;
    const BH      = 0.7;
    const GAP     = 0.12;
    const reversed = [...nodes].reverse();   // bottom → top

    reversed.forEach((n, i) => {
      const y    = i * (BH + GAP) - (nodes.length * (BH + GAP)) / 2;
      const isTop = i === reversed.length - 1;

      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, BH, 1.4),
        new THREE.MeshStandardMaterial({
          color: isTop ? 0xf5c542 : 0x3a3a18,
          emissive: isTop ? 0xf5c542 : 0x0,
          emissiveIntensity: isTop ? 0.3 : 0,
          metalness: 0.2, roughness: 0.6,
          transparent: true, opacity: isTop ? 1 : 0.8
        })
      );
      mesh.position.set(0, y, 0);
      scene.add(mesh);

      const sp = _sprite((isTop ? '▶ ' : '') + String(n.value ?? ''), isTop ? '#f5c542' : '#8888aa');
      sp.position.set(0, y + BH / 2 + 0.25, 0);
      scene.add(sp);

      _reg(n.id, [mesh, sp], [0, y, 0]);
    });

    sph = { theta: 0.5, phi: 0.9, r: 10 };
  }

  // ── QUEUE 3D ─────────────────────────────────────────────────────────
  function _buildQueue(vizData) {
    const nodes = vizData.nodes || [];
    const color = 0x3ddc84;
    const STEP  = 2.2;
    const cx    = ((nodes.length - 1) / 2) * STEP;

    nodes.forEach((n, i) => {
      const x      = i * STEP - cx;
      const isFront = i === 0;
      const isRear  = i === nodes.length - 1;

      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 1.0, 1.0),
        new THREE.MeshStandardMaterial({
          color: isFront ? 0x3ddc84 : isRear ? 0x5aacff : 0x2a2a55,
          emissive: isFront ? 0x3ddc84 : isRear ? 0x5aacff : 0x0,
          emissiveIntensity: (isFront || isRear) ? 0.25 : 0,
          metalness: 0.2, roughness: 0.6
        })
      );
      mesh.position.set(x, 0, 0);
      scene.add(mesh);

      const label = (isFront ? 'FRONT ' : isRear ? 'REAR ' : '') + String(n.value ?? '');
      const sp = _sprite(label, isFront ? '#3ddc84' : isRear ? '#5aacff' : '#8888aa');
      sp.position.set(x, 0.9, 0);
      scene.add(sp);

      _reg(n.id, [mesh, sp], [x, 0, 0]);

      if (i < nodes.length - 1) {
        const nx = (i + 1) * STEP - cx;
        const key = `${n.id}-${nodes[i+1].id}`;
        const line = _edge([x + 0.85, 0, 0], [nx - 0.85, 0, 0], color);
        scene.add(line);
        _regEdge(key, line);
      }
    });

    sph = { theta: 0.1, phi: 1.0, r: nodes.length * 2 + 6 };
  }

  // ── GRAPH 3D ─────────────────────────────────────────────────────────
  function _buildGraph(vizData) {
    const nodes = vizData.nodes || [];
    const edges = vizData.edges || [];
    const color = 0x7c6af7;
    const R     = 5;

    const pos = {};
    nodes.forEach((n, i) => {
      const angle = (i / nodes.length) * Math.PI * 2;
      pos[n.id]   = [Math.cos(angle) * R, 0, Math.sin(angle) * R];
    });

    nodes.forEach(n => {
      const [x, y, z] = pos[n.id];
      const mesh = _sphereNode(color);
      mesh.position.set(x, y, z);
      scene.add(mesh);
      const sp = _sprite(String(n.label || n.value || ''), '#7c6af7');
      sp.position.set(x, y + 0.7, z);
      scene.add(sp);
      _reg(n.id, [mesh, sp], [x, y, z]);
    });

    edges.forEach(e => {
      const a = pos[e.from], b = pos[e.to];
      if (!a || !b) return;
      const key  = `${e.from}-${e.to}`;
      const line = _edge(a, b, color);
      scene.add(line);
      _regEdge(key, line);
    });

    sph = { theta: 0.4, phi: 0.7, r: 14 };
  }

  // ── HASH MAP 3D ───────────────────────────────────────────────────────
  function _buildHashMap(vizData) {
    const nodes = vizData.nodes || [];
    const color = 0x5aacff;
    const STEP  = 1.8;
    const half  = ((nodes.length - 1) / 2) * STEP;

    nodes.forEach((n, i) => {
      const y = i * STEP - half;

      // Bucket cylinder
      const mesh = _cylNode(color, 0.6, 0.7);
      mesh.position.set(-1.5, y, 0);
      scene.add(mesh);

      // Key-value sprite
      const sp = _sprite(`"${n.key}" → ${n.value}`, '#5aacff');
      sp.position.set(1.5, y + 0.1, 0);
      scene.add(sp);

      // Hash index label
      const idx = _sprite(`[${n.hash ?? i}]`, '#7c6af7');
      idx.position.set(-1.5, y + 0.65, 0);
      scene.add(idx);

      // Line from bucket to value
      const line = _edge([-1.1, y, 0], [0.2, y, 0], color);
      scene.add(line);

      _reg(n.id, [mesh, sp, idx], [-1.5, y, 0]);
    });

    sph = { theta: 0.05, phi: 0.95, r: nodes.length * 1.4 + 8 };
  }

  // ── FLOWCHART 3D ─────────────────────────────────────────────────────
  function _buildFlowchart(vizData) {
    const nodes = vizData.nodes || [];
    const edges = vizData.edges || [];

    const TYPE_COL = {
      start:    0x3ddc84,
      end:      0xf06060,
      decision: 0xf5c542,
      process:  0x7c6af7,
    };

    const pos = {};
    nodes.forEach((n, i) => {
      pos[n.id] = [0, -i * 2.6, 0];
    });

    nodes.forEach(n => {
      const [x, y, z] = pos[n.id];
      const c = TYPE_COL[n.type] || 0x7c6af7;
      let mesh;
      if (n.type === 'start' || n.type === 'end') mesh = _sphereNode(c, 0.55);
      else if (n.type === 'decision')              mesh = _diamondNode(c);
      else                                         mesh = _boxNode(c, 0.9);

      mesh.position.set(x, y, z);
      scene.add(mesh);

      const sp = _sprite(n.label || '', '#' + c.toString(16).padStart(6, '0'));
      sp.position.set(x, y + 0.8, z);
      scene.add(sp);

      _reg(n.id, [mesh, sp], [x, y, z]);
    });

    edges.forEach(e => {
      const a = pos[e.from], b = pos[e.to];
      if (!a || !b) return;
      const isBack = a[1] <= b[1];
      const key    = `${e.from}-${e.to}`;
      const ea = [...a], eb = [...b];
      if (isBack) { ea[0] += 1.5; eb[0] += 1.5; }
      const line = _edge(ea, eb, isBack ? 0xfb8c42 : COL.edge);
      scene.add(line);
      _regEdge(key, line);
    });

    sph = { theta: 0.1, phi: 0.9, r: nodes.length * 1.4 + 8 };
  }

  // ── Animation loop ────────────────────────────────────────────────────
  let _activeNodeIds = [];
  let _activeEdgeIds = [];

  function _animate() {
    if (!isRunning) return;
    animId = requestAnimationFrame(_animate);
    const t = Date.now() * 0.001;

    Object.entries(allMeshMap).forEach(([id, { meshes, basePos }]) => {
      const isActive = _activeNodeIds.includes(id);
      const bob = Math.sin(t * 0.8 + basePos[0]) * 0.06;

      meshes.forEach(m => {
        if (!m) return;
        m.position.y = basePos[1] + bob;
        if (m.isSprite) return;

        const mat = m.material;
        if (isActive) {
          mat.emissiveIntensity = 0.55 + 0.35 * Math.sin(t * 3);
          const ec = new THREE.Color(COL.active);
          mat.emissive && mat.emissive.lerp(ec, 0.15);
        } else {
          mat.emissiveIntensity = Math.max(0.15, mat.emissiveIntensity - 0.03);
        }
        m.rotation.y += 0.006;
      });
    });

    renderer.render(scene, camera);
  }

  // ── PUBLIC API ────────────────────────────────────────────────────────
  function highlight(nodeIds, edgeIds) {
    _activeNodeIds = nodeIds || [];
    _activeEdgeIds = edgeIds || [];

    // Reset edge colors
    Object.entries(allEdgeMap).forEach(([key, line]) => {
      if (!line || !line.material) return;
      line.material.color.set(_activeEdgeIds.includes(key) ? COL.active : COL.edge);
      line.material.opacity = _activeEdgeIds.includes(key) ? 1.0 : 0.4;
    });
  }

  function start(canvas, vizData) {
    _dispose();
    sph = { theta: 0.5, phi: 1.1, r: 18 };

    // FIXED: Changed viz3dContainer to viz3dWrap to match index.html
    const el = document.getElementById('viz3dWrap'); 
    const W  = el ? el.offsetWidth : 600;
    const H  = el ? el.offsetHeight : 400;

    scene    = new THREE.Scene();
    scene.background = new THREE.Color(COL.bg);
    scene.fog        = new THREE.FogExp2(COL.bg, 0.012);

    camera = new THREE.PerspectiveCamera(52, W / H, 0.1, 400);
    _camUpdate();

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    if (vizData) _buildScene(vizData);

    _attach(canvas);
    isRunning = true;
    _animate();
  }

  function stop()      { _dispose(); }
  function resetView() { sph = { theta: 0.5, phi: 1.1, r: 18 }; _camUpdate(); }

  function resize() {
    if (!renderer || !camera) return;
    
    // FIXED: Changed viz3dContainer to viz3dWrap to match index.html
    const el = document.getElementById('viz3dWrap');
    if (!el) return;
    
    const W  = el.offsetWidth  || 600;
    const H  = el.offsetHeight || 400;
    
    if (!W || !H) return;
    renderer.setSize(W, H);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
  }

  return { start, stop, resetView, resize, highlight };
})();

window.Visualizer3D = Visualizer3D;