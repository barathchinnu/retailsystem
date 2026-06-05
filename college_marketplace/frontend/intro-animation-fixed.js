// 🎬 CAMPUSSWAP — Cinematic Three.js Intro (7-second total)
(function () {
    'use strict';

    const PARTICLE_COUNT = 1800;

    let scene, camera, renderer, raf;
    let bookGroup, bookMesh;
    let particleSystem, pPos, pVel;
    let orbitGroup;
    let startTime = null;

    const tex = {};

    // ── Boot ─────────────────────────────────────────────────────────────────────
    function boot() {
        if (!window.THREE) { setTimeout(boot, 50); return; }
        const canvas = document.getElementById('intro-canvas');
        if (!canvas) return;

        initScene(canvas);
        buildFallbackTextures();   // build immediately with canvas textures
        tryLoadRealTextures();     // silently upgrade if PNGs exist
        window.addEventListener('resize', onResize);
        window.addEventListener('unload', cleanup, { once: true });
    }

    // ── Fallback canvas textures (always work, no network needed) ────────────────
    function makeTex(emoji, bg1, bg2) {
        const c = Object.assign(document.createElement('canvas'), { width: 256, height: 256 });
        const x = c.getContext('2d');
        const g = x.createLinearGradient(0, 0, 256, 256);
        g.addColorStop(0, bg1); g.addColorStop(1, bg2);
        x.fillStyle = g; x.fillRect(0, 0, 256, 256);
        x.font = '120px sans-serif';
        x.textAlign = 'center'; x.textBaseline = 'middle';
        x.fillText(emoji, 128, 128);
        const t = new THREE.CanvasTexture(c);
        t.minFilter = t.magFilter = THREE.LinearFilter;
        t.generateMipmaps = false;
        return t;
    }

    function buildFallbackTextures() {
        tex.book     = makeTex('📚', '#1e3a5f', '#0f172a');
        tex.laptop   = makeTex('💻', '#1e1b4b', '#0f172a');
        tex.backpack = makeTex('🎒', '#14532d', '#0f172a');
        tex.cap      = makeTex('🎓', '#3b0764', '#0f172a');
        build();
    }

    // ── Try to upgrade textures with real PNGs if available ──────────────────────
    function tryLoadRealTextures() {
        const SRCS = {
            book:     'intro_book.png',
            laptop:   'intro_laptop.png',
            backpack: 'item_backpack.png',
            cap:      'intro_gradcap.png',
        };
        const loader = new THREE.TextureLoader();
        Object.entries(SRCS).forEach(([key, src]) => {
            loader.load(src, (t) => {
                t.minFilter = t.magFilter = THREE.LinearFilter;
                t.generateMipmaps = false;
                tex[key] = t;
                // live-swap material maps if objects already built
                if (bookMesh && key === 'book') bookMesh.material.map = t;
                if (orbitGroup) {
                    orbitGroup.children.forEach(grp => {
                        if (grp.userData.key === key) {
                            grp.userData.img.material.map = t;
                            grp.userData.img.material.needsUpdate = true;
                        }
                    });
                }
            });
        });
    }

    // ── Scene / Renderer ─────────────────────────────────────────────────────────
    function initScene(canvas) {
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x020617);
        scene.fog = new THREE.FogExp2(0x020617, 0.008);

        camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 0.1, 1000);
        camera.position.set(0, 0, 20);

        renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        renderer.setSize(innerWidth, innerHeight);
        renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

        scene.add(new THREE.AmbientLight(0xffffff, 2));

        const blue = new THREE.PointLight(0x38bdf8, 8, 100);
        blue.position.set(4, 5, 14); scene.add(blue);

        const purple = new THREE.PointLight(0xa78bfa, 5, 100);
        purple.position.set(-6, -3, 10); scene.add(purple);

        const pink = new THREE.PointLight(0xf472b6, 3, 80);
        pink.position.set(0, -6, 8); scene.add(pink);
    }

    // ── Build Scene ──────────────────────────────────────────────────────────────
    function build() {
        buildBook();
        buildParticles();
        buildOrbit();
        startTime = performance.now();
        loop();
    }

    // ── Hero Book ────────────────────────────────────────────────────────────────
    function buildBook() {
        bookGroup = new THREE.Group();
        scene.add(bookGroup);

        const spine = new THREE.Mesh(
            new THREE.BoxGeometry(8.5, 6.2, 0.6),
            new THREE.MeshPhongMaterial({ color: 0x1e3a5f, shininess: 60 })
        );
        spine.position.z = -0.32;
        bookGroup.add(spine);

        bookMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(8.5, 6.2),
            new THREE.MeshBasicMaterial({ map: tex.book, transparent: true, side: THREE.FrontSide })
        );
        bookMesh.position.z = 0;
        bookGroup.add(bookMesh);

        bookGroup.scale.setScalar(0.01);
    }

    // ── Orbit Objects ────────────────────────────────────────────────────────────
    function buildOrbit() {
        orbitGroup = new THREE.Group();
        orbitGroup.visible = false;
        scene.add(orbitGroup);

        const items = [
            { key: 'laptop',   x: -9,   y:  4,   z:  1,  ry:  0.4,  s: 1.1 },
            { key: 'backpack', x:  9,   y: -3.5, z:  1,  ry: -0.4,  s: 1.0 },
            { key: 'cap',      x: -6,   y: -5,   z: -3,  ry:  0.2,  s: 0.9 },
            { key: 'book',     x:  6,   y:  5,   z: -3,  ry: -0.6,  s: 0.9 },
            { key: 'backpack', x:  0.5, y:  7,   z: -5,  ry:  0.0,  s: 0.75 },
            { key: 'cap',      x: -0.5, y: -7,   z: -5,  ry:  0.0,  s: 0.75 },
        ];

        items.forEach(({ key, x, y, z, ry, s }) => {
            const grp = new THREE.Group();

            const card = new THREE.Mesh(
                new THREE.BoxGeometry(5.5 * s, 5.5 * s, 0.08),
                new THREE.MeshPhongMaterial({
                    color: 0x0f2744, transparent: true, opacity: 0,
                    shininess: 120, emissive: 0x0a1a30,
                })
            );
            grp.add(card);

            const img = new THREE.Mesh(
                new THREE.PlaneGeometry(4.8 * s, 4.8 * s),
                new THREE.MeshBasicMaterial({
                    map: tex[key], transparent: true, opacity: 0,
                    depthWrite: false, alphaTest: 0.02, side: THREE.DoubleSide,
                })
            );
            img.position.z = 0.06;
            grp.add(img);

            grp.position.set(x, y, z);
            grp.rotation.y = ry;
            grp.userData = { card, img, key };
            orbitGroup.add(grp);
        });
    }

    // ── Particles ────────────────────────────────────────────────────────────────
    function buildParticles() {
        pPos = new Float32Array(PARTICLE_COUNT * 3);
        pVel = new Float32Array(PARTICLE_COUNT * 3);

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            pPos[i*3]   = (Math.random() - 0.5) * 3;
            pPos[i*3+1] = (Math.random() - 0.5) * 3;
            pPos[i*3+2] = (Math.random() - 0.5) * 1;
            pVel[i*3]   = (Math.random() - 0.5) * 14;
            pVel[i*3+1] = Math.random() * 16 + 4;
            pVel[i*3+2] = (Math.random() - 0.5) * 10;
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));

        particleSystem = new THREE.Points(geo, new THREE.PointsMaterial({
            size: 0.28, color: 0x38bdf8, transparent: true, opacity: 0,
            depthWrite: false, blending: THREE.AdditiveBlending,
        }));
        scene.add(particleSystem);
    }

    // ── Render Loop ──────────────────────────────────────────────────────────────
    function loop() {
        raf = requestAnimationFrame(loop);
        if (!startTime) { renderer.render(scene, camera); return; }

        const t   = performance.now() - startTime;
        const pos = particleSystem.geometry.attributes.position.array;

        // Phase 1 · Book slams in and spins (0 – 2s)
        if (t < 2000) {
            const e = easeOutBack(clamp(t / 1000, 0, 1));
            bookGroup.scale.setScalar(e * 7.5);
            bookGroup.rotation.y = (1 - clamp(t / 1000, 0, 1)) * Math.PI * 2.5;
            bookGroup.rotation.x = Math.sin(t * 0.003) * 0.2;
            bookGroup.position.y = Math.sin(t * 0.005) * 0.4;
        }

        // Phase 2 · Explosion burst (1.8 – 3.5s)
        if (t >= 1800 && t < 3500) {
            particleSystem.material.opacity = clamp((t - 1800) / 400, 0, 1);
            particleSystem.material.color.setHSL(
                0.55 + Math.sin(t * 0.003) * 0.1, 0.9, 0.65
            );
            for (let i = 0; i < PARTICLE_COUNT; i++) {
                pos[i*3]   += pVel[i*3]   * 0.016;
                pos[i*3+1] += pVel[i*3+1] * 0.016;
                pos[i*3+2] += pVel[i*3+2] * 0.016;
                pVel[i*3+1] -= 0.18;
            }
            particleSystem.geometry.attributes.position.needsUpdate = true;

            if (t > 2000) {
                const fade = clamp(1 - (t - 2000) / 700, 0, 1);
                bookMesh.material.opacity = fade;
                bookGroup.scale.setScalar(Math.max(0.01, fade * 7.5));
            }
        }

        // Phase 3 · Items fly in + orbit (3 – 5.5s)
        if (t >= 3000) {
            orbitGroup.visible = true;
            const fi = clamp((t - 3000) / 600, 0, 1);

            orbitGroup.children.forEach((grp, idx) => {
                const ease = easeOutBack(clamp((t - 3000 - idx * 80) / 700, 0, 1));
                grp.scale.setScalar(ease);
                const { card, img } = grp.userData;
                card.material.opacity = fi * 0.85;
                img.material.opacity  = fi;
                grp.rotation.y += 0.009 + idx * 0.002;
                grp.rotation.x  = Math.sin(t * 0.001 + idx) * 0.12;
            });

            orbitGroup.rotation.y += 0.006;
            orbitGroup.rotation.x  = Math.sin(t * 0.0008) * 0.1;

            if (t >= 3200) {
                for (let i = 0; i < PARTICLE_COUNT; i++) {
                    const a  = (i / PARTICLE_COUNT) * Math.PI * 2 + t * 0.00055;
                    const r  = 13 + Math.sin(a * 4 + t * 0.002) * 3;
                    const tx = Math.cos(a) * r;
                    const ty = Math.sin(a * 1.5) * 4;
                    const tz = Math.sin(a) * r * 0.3;
                    pos[i*3]   += (tx - pos[i*3])   * 0.04;
                    pos[i*3+1] += (ty - pos[i*3+1]) * 0.04;
                    pos[i*3+2] += (tz - pos[i*3+2]) * 0.04;
                }
                particleSystem.geometry.attributes.position.needsUpdate = true;
            }
        }

        // Phase 4 · Implode + camera rush (5.2s+)
        if (t >= 5200) {
            const p = clamp((t - 5200) / 900, 0, 1);
            const e = p * p;

            orbitGroup.scale.setScalar(Math.max(0.001, 1 - e));

            for (let i = 0; i < PARTICLE_COUNT; i++) {
                pos[i*3]   *= 0.88;
                pos[i*3+1] *= 0.88;
                pos[i*3+2] *= 0.88;
            }
            particleSystem.geometry.attributes.position.needsUpdate = true;

            camera.position.z = 20 + e * 30;
            camera.fov         = 65 + e * 35;
            camera.updateProjectionMatrix();

            if (t > 5700) {
                const fade = clamp(1 - (t - 5700) / 500, 0, 1);
                particleSystem.material.opacity = fade;
                orbitGroup.children.forEach(g => {
                    g.userData.card.material.opacity = fade * 0.85;
                    g.userData.img.material.opacity  = fade;
                });
            }
        }

        renderer.render(scene, camera);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────────
    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
    function easeOutBack(x) {
        const c1 = 1.70158, c3 = c1 + 1;
        return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
    }
    function onResize() {
        if (!camera || !renderer) return;
        camera.aspect = innerWidth / innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(innerWidth, innerHeight);
    }
    function cleanup() { cancelAnimationFrame(raf); renderer && renderer.dispose(); }

    // ── Entry ────────────────────────────────────────────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();