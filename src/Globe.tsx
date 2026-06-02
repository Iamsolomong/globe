import { useEffect, useRef } from "react";
import * as THREE from "three";

const GREEN = 0x89e32b;
const GLOBE_R = 1.6;

const CITIES = [
  { name: "Sydney",       lat: -33.87, lon: 151.21, label: "Major Hub",    size: 1.4 },
  { name: "Melbourne",    lat: -37.81, lon: 144.96, label: "Major Hub",    size: 1.4 },
  { name: "Brisbane",     lat: -27.47, lon: 153.03, label: "Warehouse",    size: 1.2 },
  { name: "Perth",        lat: -31.95, lon: 115.86, label: "Warehouse",    size: 1.2 },
  { name: "Adelaide",     lat: -34.93, lon: 138.60, label: "Warehouse",    size: 1.1 },
  { name: "Darwin",       lat: -12.46, lon: 130.85, label: "Depot",        size: 1.0 },
  { name: "Cairns",       lat: -16.92, lon: 145.78, label: "Depot",        size: 0.9 },
  { name: "Hobart",       lat: -42.88, lon: 147.33, label: "Depot",        size: 0.9 },
  { name: "Canberra",     lat: -35.28, lon: 149.13, label: "Major Hub",    size: 1.0 },
  { name: "Gold Coast",   lat: -28.02, lon: 153.40, label: "Warehouse",    size: 1.0 },
  { name: "Newcastle",    lat: -32.93, lon: 151.78, label: "Depot",        size: 0.85 },
  { name: "Wollongong",   lat: -34.43, lon: 150.89, label: "Depot",        size: 0.8 },
  { name: "Geelong",      lat: -38.15, lon: 144.35, label: "Depot",        size: 0.8 },
  { name: "Townsville",   lat: -19.26, lon: 146.82, label: "Depot",        size: 0.85 },
  { name: "Mackay",       lat: -21.15, lon: 149.17, label: "Depot",        size: 0.75 },
  { name: "Rockhampton",  lat: -23.38, lon: 150.51, label: "Depot",        size: 0.75 },
  { name: "Bundaberg",    lat: -24.87, lon: 152.35, label: "Depot",        size: 0.7 },
  { name: "Sunshine Cst", lat: -26.65, lon: 153.07, label: "Depot",        size: 0.7 },
  { name: "Toowoomba",    lat: -27.56, lon: 151.95, label: "Depot",        size: 0.75 },
  { name: "Albury",       lat: -36.07, lon: 146.91, label: "Depot",        size: 0.7 },
  { name: "Bendigo",      lat: -36.76, lon: 144.28, label: "Depot",        size: 0.7 },
  { name: "Ballarat",     lat: -37.56, lon: 143.86, label: "Depot",        size: 0.7 },
  { name: "Launceston",   lat: -41.44, lon: 147.14, label: "Depot",        size: 0.7 },
  { name: "Alice Springs",lat: -23.70, lon: 133.87, label: "Depot",        size: 0.75 },
  { name: "Kalgoorlie",   lat: -30.75, lon: 121.47, label: "Depot",        size: 0.7 },
  { name: "Port Hedland", lat: -20.31, lon: 118.57, label: "Depot",        size: 0.7 },
  { name: "Broome",       lat: -17.96, lon: 122.24, label: "Depot",        size: 0.65 },
];

const ARCS: [number, number][] = [
  [0,1],[0,2],[0,3],[0,4],[0,8],[0,9],[0,10],
  [1,2],[1,3],[1,4],[1,7],[1,8],[1,11],[1,12],
  [2,5],[2,6],[2,9],[2,13],[2,14],[2,15],[2,16],
  [3,4],[3,5],[3,24],[3,25],[3,26],
  [4,7],[4,20],[4,21],[4,23],
  [5,6],[5,26],[5,25],
  [6,13],[6,14],
  [7,22],[7,12],
  [8,9],[8,10],[8,11],
  [9,10],[9,16],[9,17],[9,18],
  [10,11],[11,19],[12,21],[12,20],
  [13,14],[14,15],[15,16],[16,17],[17,18],[18,19],
  [20,19],[21,22],[23,24],[24,25],[25,26],
  [0,5],[0,6],[0,23],[1,5],[1,23],[3,6],[2,23],[4,5],
  [0,13],[1,6],[2,3],[0,4],[3,7],[5,23],
];

function latLon(lat: number, lon: number, r: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
     r * Math.cos(phi),
     r * Math.sin(phi) * Math.sin(theta)
  );
}

function quadBezier(
  start: THREE.Vector3, mid: THREE.Vector3, end: THREE.Vector3, t: number
): THREE.Vector3 {
  const mt = 1 - t;
  return new THREE.Vector3(
    mt*mt*start.x + 2*mt*t*mid.x + t*t*end.x,
    mt*mt*start.y + 2*mt*t*mid.y + t*t*end.y,
    mt*mt*start.z + 2*mt*t*mid.z + t*t*end.z,
  );
}

function animCounter(el: HTMLElement, target: number, suffix: string, dur: number) {
  const t0 = performance.now();
  function step(now: number) {
    const p = Math.min((now - t0) / dur, 1);
    const e = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.floor(e * target).toLocaleString() + suffix;
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

export default function Globe() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const tipCityRef = useRef<HTMLSpanElement>(null);
  const tipLabelRef = useRef<HTMLSpanElement>(null);
  const whRef = useRef<HTMLSpanElement>(null);
  const ordRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const tooltip = tooltipRef.current!;
    const tipCity = tipCityRef.current!;
    const tipLabel = tipLabelRef.current!;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 5.5);
    camera.lookAt(0, 0, 0);

    // Lights
    scene.add(new THREE.AmbientLight(0x223366, 0.9));
    const sun = new THREE.DirectionalLight(0xffeedd, 1.8);
    sun.position.set(5, 3, 5);
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0x89e32b, 0.12);
    fill.position.set(-4, -2, -3);
    scene.add(fill);

    // Globe pivot — Australia centre
    const INIT_X = THREE.MathUtils.degToRad(-27);
    const INIT_Y = THREE.MathUtils.degToRad(137);
    const X_MIN  = THREE.MathUtils.degToRad(-55);
    const X_MAX  = THREE.MathUtils.degToRad(5);
    const Y_RANGE = THREE.MathUtils.degToRad(85);

    const pivot = new THREE.Group();
    pivot.rotation.x = INIT_X;
    pivot.rotation.y = INIT_Y;
    scene.add(pivot);

    // Earth sphere
    const earthGeo = new THREE.SphereGeometry(GLOBE_R, 72, 72);
    const earthMat = new THREE.MeshPhongMaterial({ color: 0x1a3a5c, shininess: 12, specular: new THREE.Color(0x224488) });
    pivot.add(new THREE.Mesh(earthGeo, earthMat));
    new THREE.TextureLoader().load(
      "https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-blue-marble.jpg",
      (tex) => { earthMat.map = tex; earthMat.color.set(0xffffff); earthMat.needsUpdate = true; }
    );

    // Atmosphere glow
    const atmGeo = new THREE.SphereGeometry(GLOBE_R * 1.06, 64, 64);
    const atmMat = new THREE.ShaderMaterial({
      uniforms: {
        glowColor: { value: new THREE.Color(0x0a2a6a) },
        viewVector: { value: camera.position },
      },
      vertexShader: `
        uniform vec3 viewVector;
        varying float intensity;
        void main() {
          vec3 vNormal = normalize(normalMatrix * normal);
          vec3 vView   = normalize(normalMatrix * viewVector);
          intensity = pow(0.62 - dot(vNormal, vView), 3.0);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        uniform vec3 glowColor;
        varying float intensity;
        void main() { gl_FragColor = vec4(glowColor * intensity, intensity * 0.95); }`,
      side: THREE.FrontSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    });
    scene.add(new THREE.Mesh(atmGeo, atmMat));

    // Grid dots
    const dotPositions: number[] = [];
    for (let lat = -90; lat <= 90; lat += 5)
      for (let lon = -180; lon <= 180; lon += 5) {
        const v = latLon(lat, lon, GLOBE_R + 0.004);
        dotPositions.push(v.x, v.y, v.z);
      }
    const dotGeo = new THREE.BufferGeometry();
    dotGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(dotPositions), 3));
    pivot.add(new THREE.Points(dotGeo, new THREE.PointsMaterial({ color: 0x3366aa, size: 0.014, sizeAttenuation: true, transparent: true, opacity: 0.3 })));

    // Stars
    const starPos = new Float32Array(2500 * 3);
    for (let i = 0; i < 2500; i++) {
      const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1), r = 30 + Math.random() * 20;
      starPos[i*3] = r*Math.sin(ph)*Math.cos(th); starPos[i*3+1] = r*Math.sin(ph)*Math.sin(th); starPos[i*3+2] = r*Math.cos(ph);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.06, sizeAttenuation: true })));

    // City markers
    const markerGroup = new THREE.Group();
    pivot.add(markerGroup);
    const cityMeshes: THREE.Mesh[] = [];

    CITIES.forEach((city, i) => {
      const pos = latLon(city.lat, city.lon, GLOBE_R + 0.012);
      const s = city.size * 0.022;

      const core = new THREE.Mesh(
        new THREE.SphereGeometry(s, 12, 12),
        new THREE.MeshBasicMaterial({ color: GREEN })
      );
      core.position.copy(pos);
      core.userData = { cityIndex: i };
      markerGroup.add(core);
      cityMeshes.push(core);

      const halo = new THREE.Mesh(
        new THREE.SphereGeometry(s * 3.5, 12, 12),
        new THREE.MeshBasicMaterial({ color: GREEN, transparent: true, opacity: 0.08 })
      );
      halo.position.copy(pos);
      markerGroup.add(halo);

      for (let r = 0; r < 2; r++) {
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(s * (1.8 + r * 2), s * (2.4 + r * 2), 28),
          new THREE.MeshBasicMaterial({ color: GREEN, transparent: true, opacity: 0.5 - r * 0.15, side: THREE.DoubleSide })
        );
        ring.position.copy(pos);
        ring.lookAt(new THREE.Vector3().sub(pos).negate().add(pos));
        ring.userData = { isPulse: true, phase: Math.random() * Math.PI * 2 + r * Math.PI, speed: 1.5 + r * 0.5, baseOpacity: 0.5 - r * 0.15 };
        markerGroup.add(ring);
      }

      const spGeo = new THREE.BufferGeometry().setFromPoints([pos.clone(), pos.clone().multiplyScalar(1.05)]);
      markerGroup.add(new THREE.Line(spGeo, new THREE.LineBasicMaterial({ color: GREEN, transparent: true, opacity: 0.6 })));
    });

    // Arc data
    const arcGroup = new THREE.Group();
    pivot.add(arcGroup);
    const PARTICLES_PER_ARC = 4;

    const arcData: {
      lineMat: THREE.LineBasicMaterial;
      pts: THREE.Vector3[];
      particles: { dot: THREE.Mesh; glow: THREE.Mesh; phase: number }[];
      speed: number;
      arcPhase: number;
    }[] = [];

    ARCS.forEach(([a, b]) => {
      const cityA = CITIES[a], cityB = CITIES[b];
      const start = latLon(cityA.lat, cityA.lon, GLOBE_R);
      const end   = latLon(cityB.lat, cityB.lon, GLOBE_R);
      const mid   = start.clone().add(end).multiplyScalar(0.5);
      const dist  = start.distanceTo(end);
      mid.normalize().multiplyScalar(GLOBE_R + dist * 0.6 + 0.1);

      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 80; i++) pts.push(quadBezier(start, mid, end, i / 80));

      const lineMat = new THREE.LineBasicMaterial({ color: GREEN, transparent: true, opacity: 0 });
      arcGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat));

      const particles: { dot: THREE.Mesh; glow: THREE.Mesh; phase: number }[] = [];
      for (let p = 0; p < PARTICLES_PER_ARC; p++) {
        const dot = new THREE.Mesh(
          new THREE.SphereGeometry(0.016, 8, 8),
          new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 })
        );
        arcGroup.add(dot);
        const glow = new THREE.Mesh(
          new THREE.SphereGeometry(0.036, 8, 8),
          new THREE.MeshBasicMaterial({ color: GREEN, transparent: true, opacity: 0 })
        );
        arcGroup.add(glow);
        particles.push({ dot, glow, phase: p / PARTICLES_PER_ARC });
      }

      arcData.push({ lineMat, pts, particles, speed: 0.18 + Math.random() * 0.22, arcPhase: Math.random() * Math.PI * 2 });
    });

    // Raycaster
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    function onMouseMove(e: MouseEvent) {
      mouse.x =  (e.clientX / window.innerWidth)  * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(cityMeshes);
      if (hits.length) {
        const c = CITIES[hits[0].object.userData.cityIndex as number];
        tipCity.textContent  = c.name;
        tipLabel.textContent = c.label;
        tooltip.style.display = "block";
        tooltip.style.left = (e.clientX + 14) + "px";
        tooltip.style.top  = (e.clientY - 10) + "px";
        document.body.style.cursor = "pointer";
      } else {
        tooltip.style.display = "none";
        document.body.style.cursor = "default";
      }
    }
    window.addEventListener("mousemove", onMouseMove);

    // Drag
    let isDragging = false, autoRotate = true, autoResumeT = 0;
    let prevMouse = { x: 0, y: 0 };
    let velX = 0, velY = 0;

    function clamp() {
      pivot.rotation.x = Math.max(X_MIN, Math.min(X_MAX, pivot.rotation.x));
      pivot.rotation.y = Math.max(INIT_Y - Y_RANGE, Math.min(INIT_Y + Y_RANGE, pivot.rotation.y));
    }

    function onMouseDown(e: MouseEvent) { isDragging = true; autoRotate = false; velX = velY = 0; prevMouse = { x: e.clientX, y: e.clientY }; }
    function onMouseUp()  { isDragging = false; autoResumeT = Date.now() + 2500; }
    function onDrag(e: MouseEvent) {
      if (!isDragging) return;
      const dx = e.clientX - prevMouse.x, dy = e.clientY - prevMouse.y;
      pivot.rotation.y += dx * 0.005; pivot.rotation.x += dy * 0.005; clamp();
      velX = dx * 0.005; velY = dy * 0.005; prevMouse = { x: e.clientX, y: e.clientY };
    }
    canvas.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup",   onMouseUp);
    window.addEventListener("mousemove", onDrag);

    // Touch
    let lastTouch: Touch | null = null;
    function onTouchStart(e: TouchEvent) { isDragging = true; autoRotate = false; lastTouch = e.touches[0]; velX = velY = 0; }
    function onTouchEnd()  { isDragging = false; autoResumeT = Date.now() + 2500; }
    function onTouchMove(e: TouchEvent) {
      if (!isDragging || !lastTouch) return;
      const dx = e.touches[0].clientX - lastTouch.clientX, dy = e.touches[0].clientY - lastTouch.clientY;
      pivot.rotation.y += dx * 0.005; pivot.rotation.x += dy * 0.005; clamp();
      velX = dx * 0.005; velY = dy * 0.005; lastTouch = e.touches[0];
    }
    canvas.addEventListener("touchstart", onTouchStart, { passive: true });
    canvas.addEventListener("touchend",   onTouchEnd);
    canvas.addEventListener("touchmove",  onTouchMove, { passive: true });

    // Resize
    function onResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
    window.addEventListener("resize", onResize);

    // Counters
    setTimeout(() => {
      if (whRef.current)  animCounter(whRef.current,  6,     "",  1800);
      if (ordRef.current) animCounter(ordRef.current, 1000000, "+", 2400);
    }, 500);

    // Animate
    const clock = new THREE.Clock();
    let animId: number;

    function animate() {
      animId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      if (!isDragging && !autoRotate && Date.now() > autoResumeT) autoRotate = true;
      if (autoRotate) {
        pivot.rotation.y += 0.0007; clamp();
      } else if (!isDragging) {
        pivot.rotation.y += velX; pivot.rotation.x += velY; clamp();
        velX *= 0.90; velY *= 0.90;
      }

      markerGroup.children.forEach((child) => {
        if (!child.userData.isPulse) return;
        const { phase, speed, baseOpacity } = child.userData as { phase: number; speed: number; baseOpacity: number };
        const s = 1 + 0.7 * Math.abs(Math.sin(t * speed + phase));
        (child as THREE.Mesh).scale.setScalar(s);
        ((child as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = baseOpacity * (1 - Math.abs(Math.sin(t * speed + phase)) * 0.9);
      });

      arcData.forEach((arc) => {
        arc.lineMat.opacity = 0.12 + 0.12 * Math.sin(t * 0.4 + arc.arcPhase);
        arc.particles.forEach((p) => {
          const progress = ((t * arc.speed + p.phase) % 1.0 + 1.0) % 1.0;
          const idx = Math.min(Math.floor(progress * (arc.pts.length - 1)), arc.pts.length - 2);
          const localT = progress * (arc.pts.length - 1) - idx;
          const pos = arc.pts[idx].clone().lerp(arc.pts[idx + 1], localT);
          p.dot.position.copy(pos);
          const brightness = Math.sin(progress * Math.PI);
          (p.dot.material as THREE.MeshBasicMaterial).opacity = brightness * 0.95;

          const gp = Math.max(0, progress - 0.015);
          const gi = Math.min(Math.floor(gp * (arc.pts.length - 1)), arc.pts.length - 2);
          const gl = gp * (arc.pts.length - 1) - gi;
          p.glow.position.copy(arc.pts[gi].clone().lerp(arc.pts[gi + 1], gl));
          (p.glow.material as THREE.MeshBasicMaterial).opacity = brightness * 0.45;
        });
      });

      atmMat.uniforms.viewVector.value.copy(camera.position);
      renderer.render(scene, camera);
    }
    animate();

    return () => {
      cancelAnimationFrame(animId);
      renderer.dispose();
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mousemove", onDrag);
      window.removeEventListener("mouseup",   onMouseUp);
      window.removeEventListener("resize",    onResize);
    };
  }, []);

  return (
    <div style={{ position: "relative", width: "100%", height: "100vh", background: "#020d1f", overflow: "hidden", fontFamily: "'Rubik', sans-serif" }}>
      <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />

      {/* Heading */}
      <div style={{ position: "absolute", top: 36, left: "50%", transform: "translateX(-50%)", textAlign: "center", pointerEvents: "none", whiteSpace: "nowrap", zIndex: 10 }}>
        <h1 style={{ fontSize: "clamp(20px, 3.2vw, 46px)", fontWeight: 700, color: "#fff", lineHeight: 1.1, margin: 0 }}>
          Delivering Safety{" "}
          <span style={{ color: "#89E32B" }}>Across Australia</span>
        </h1>
        <p style={{ marginTop: 8, fontSize: "clamp(12px, 1.3vw, 16px)", color: "rgba(255,255,255,0.55)", fontWeight: 400 }}>
          From coast to coast, our team has you covered.
        </p>
      </div>

      {/* Stats */}
      <div style={{ position: "absolute", bottom: 36, left: "50%", transform: "translateX(-50%)", display: "flex", gap: "clamp(12px, 2.5vw, 40px)", zIndex: 10, pointerEvents: "none" }}>
        {[
          { ref: whRef,  label: "Warehouses\nAcross Australia", target: 6 },
          { ref: ordRef, label: "Orders\nand Counting" },
          { ref: null,   label: "Safety Delivered\nto Australians", fixed: "Every 3 min" },
        ].map((stat, i) => (
          <div key={i} style={{ textAlign: "center", background: "rgba(2,44,106,0.4)", border: "1px solid rgba(137,227,43,0.3)", borderRadius: 12, padding: "12px 20px", backdropFilter: "blur(14px)", minWidth: 110 }}>
            <div style={{ fontSize: "clamp(18px,2.2vw,30px)", fontWeight: 700, color: "#89E32B", lineHeight: 1 }}>
              {stat.fixed ? stat.fixed : <span ref={stat.ref}>0</span>}
            </div>
            <div style={{ fontSize: "clamp(9px,0.9vw,12px)", color: "rgba(255,255,255,0.55)", marginTop: 5, textTransform: "uppercase", letterSpacing: "0.5px", lineHeight: 1.3, whiteSpace: "pre-line" }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Hint */}
      <div style={{ position: "absolute", bottom: 118, right: 22, fontSize: 11, color: "rgba(255,255,255,0.3)", pointerEvents: "none", zIndex: 10 }}>
        Drag to explore
      </div>

      {/* Tooltip */}
      <div ref={tooltipRef} style={{ position: "absolute", background: "rgba(2,44,106,0.9)", border: "1px solid rgba(137,227,43,0.5)", borderRadius: 8, padding: "7px 13px", fontSize: 13, pointerEvents: "none", display: "none", backdropFilter: "blur(8px)", zIndex: 20, whiteSpace: "nowrap", color: "#fff" }}>
        <div><span ref={tipCityRef}  style={{ fontWeight: 600, color: "#89E32B" }} /></div>
        <div><span ref={tipLabelRef} style={{ color: "rgba(255,255,255,0.65)", fontSize: 11 }} /></div>
      </div>
    </div>
  );
}
