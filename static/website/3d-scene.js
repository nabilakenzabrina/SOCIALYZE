/*
 * SOCIALYZE custom real-time 3D hero.
 * Three.js is loaded from jsDelivr; if WebGL/CDN is unavailable, the CSS art remains visible.
 * Scene is deliberately limited on mobile and respects reduced-motion preferences.
 */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';

const host = document.querySelector('.hero-art');
const canvas = document.getElementById('hero3DCanvas');
if (host && canvas) {
  try {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const renderer = new THREE.WebGLRenderer({
      canvas, alpha: true, antialias: window.devicePixelRatio < 2,
      powerPreference: 'high-performance'
    });
    const isMobile = window.matchMedia('(max-width: 650px)').matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.25 : 1.7));
    renderer.setSize(host.clientWidth, host.clientHeight, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, host.clientWidth / host.clientHeight, 0.1, 100);
    camera.position.set(0, 0.15, 8.7);

    const maroon = new THREE.MeshPhysicalMaterial({
      color: 0x6b0b0d, roughness: 0.26, metalness: 0.18,
      clearcoat: 0.9, clearcoatRoughness: 0.2
    });
    const darkMaroon = new THREE.MeshStandardMaterial({
      color: 0x430709, roughness: 0.34, metalness: 0.22
    });
    const lime = new THREE.MeshPhysicalMaterial({
      color: 0xd5de85, roughness: 0.19, metalness: 0.08,
      clearcoat: 1, clearcoatRoughness: 0.12
    });
    const cream = new THREE.MeshPhysicalMaterial({
      color: 0xfff8ca, roughness: 0.28, metalness: 0.1,
      clearcoat: 0.7, clearcoatRoughness: 0.25
    });
    const paper = new THREE.MeshStandardMaterial({
      color: 0xf7f0d2, roughness: 0.82, metalness: 0
    });

    scene.add(new THREE.HemisphereLight(0xfff8ca, 0x430709, 2.0));
    const key = new THREE.DirectionalLight(0xfff0c4, 4.3);
    key.position.set(-3.5, 5, 6); scene.add(key);
    const rim = new THREE.PointLight(0xd5de85, 24, 18, 2);
    rim.position.set(3.5, 1.8, -1); scene.add(rim);
    const warm = new THREE.PointLight(0xfff8ca, 15, 15, 2);
    warm.position.set(-4, -2, 3); scene.add(warm);

    const sculpture = new THREE.Group();
    scene.add(sculpture);

    // Layered architectural plinths create scale and a tangible studio set.
    const plinth1 = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.34, 1.15), darkMaroon);
    plinth1.position.set(0.1, -1.72, -0.55);
    plinth1.rotation.z = -0.12; sculpture.add(plinth1);
    const plinth2 = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.16, 0.9), cream);
    plinth2.position.set(0.15, -1.47, -0.32);
    plinth2.rotation.z = -0.12; sculpture.add(plinth2);

    // A sculptural interlocking ribbon, glossy resin knot, and dimensional rings.
    const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(0.92, 0.24, 180, 24, 2, 5), lime);
    knot.position.set(0.18, 0.18, 0.1);
    knot.rotation.set(0.48, 0.25, -0.25);
    sculpture.add(knot);

    const outerRing = new THREE.Mesh(new THREE.TorusGeometry(1.68, 0.055, 16, 140), cream);
    outerRing.position.set(0.1, 0.12, -0.65);
    outerRing.rotation.set(0.88, 0.25, -0.35);
    sculpture.add(outerRing);

    const innerRing = new THREE.Mesh(new THREE.TorusGeometry(1.32, 0.035, 12, 120), maroon);
    innerRing.position.set(0.05, 0.1, 0.48);
    innerRing.rotation.set(0.28, 0.9, 0.3);
    sculpture.add(innerRing);

    const slab = new THREE.Mesh(new THREE.BoxGeometry(0.48, 2.8, 0.34), maroon);
    slab.position.set(-1.58, -0.08, -0.3);
    slab.rotation.z = 0.22; slab.rotation.y = -0.25; sculpture.add(slab);

    const slab2 = new THREE.Mesh(new THREE.BoxGeometry(0.32, 2.1, 0.28), cream);
    slab2.position.set(1.6, 0.1, -0.4);
    slab2.rotation.z = -0.28; slab2.rotation.y = 0.32; sculpture.add(slab2);

    const smallArch = new THREE.Mesh(new THREE.TorusGeometry(0.47, 0.11, 18, 80, Math.PI), paper);
    smallArch.position.set(1.1, -0.88, 0.48);
    smallArch.rotation.set(0.2, 0.2, 0.35); sculpture.add(smallArch);

    // Small material accents float in a deliberate orbit, not as the main subject.
    const accent = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 1), cream);
    accent.position.set(-1.35, 1.28, 0.6); sculpture.add(accent);
    const accent2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.16, 1), lime);
    accent2.position.set(1.45, 1.05, 0.3); sculpture.add(accent2);
    const accent3 = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.07, 12, 48), cream);
    accent3.position.set(-1.6, -1.15, 0.45);
    accent3.rotation.x = 1.1; sculpture.add(accent3);

    // Soft backdrop layers give the scene an editorial set-like depth.
    const backplate = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 8),
      new THREE.MeshBasicMaterial({ color: 0x6b0b0d })
    );
    backplate.position.z = -2.1; scene.add(backplate);
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(2.65, 0.012, 6, 160),
      new THREE.MeshBasicMaterial({ color: 0xd5de85, transparent: true, opacity: 0.48 })
    );
    halo.position.set(0.25, 0.15, -1.55);
    halo.rotation.set(0.6, 0.2, -0.15); scene.add(halo);

    const pointer = { x: 0, y: 0 };
    const onPointerMove = event => {
      const rect = host.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      pointer.y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    };
    host.addEventListener('pointermove', onPointerMove, { passive: true });
    host.addEventListener('pointerleave', () => { pointer.x = 0; pointer.y = 0; }, { passive: true });

    const resize = () => {
      const width = host.clientWidth, height = host.clientHeight;
      if (!width || !height) return;
      camera.aspect = width / height;
      camera.position.z = isMobile ? 9.6 : 8.7;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.25 : 1.7));
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    host.classList.add('webgl-ready');

    let frame = 0;
    const animate = () => {
      if (!reducedMotion) {
        sculpture.rotation.y += (pointer.x * 0.12 - sculpture.rotation.y) * 0.018;
        sculpture.rotation.x += (-pointer.y * 0.08 - sculpture.rotation.x) * 0.018;
        knot.rotation.z += 0.0028;
        outerRing.rotation.z -= 0.0012;
        halo.rotation.z += 0.0008;
      }
      renderer.render(scene, camera);
      if (!reducedMotion) frame = requestAnimationFrame(animate);
    };
    animate();
    if (reducedMotion) {
      // One static render is sufficient when reduced motion is requested.
      cancelAnimationFrame(frame);
    }
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) cancelAnimationFrame(frame);
      else if (!reducedMotion) animate();
    });
  } catch (error) {
    console.warn('SOCIALYZE 3D scene unavailable; using the CSS fallback.', error);
  }
}
