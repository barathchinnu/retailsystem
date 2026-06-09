// 🎬 Three.js WebGL Cinematic Intro (Idea 6)
// Procedurally modeled assets & particle morph physics

(function () {
    let scene, camera, renderer;
    let book, bookGroup, coverRight, coverLeft, innerPages = [];
    let particleSystem, particleCount = 1200;
    let particlesGeo, particlePositions, particleVelocities;
    let orbitGroup;
    let startTime = Date.now();
    let animationFrameId;

    let texBook, texLaptop, texCap, texBackpack, texLogo;

    // Orchestrated Phases
    const DURATION = 10500; // Total 10.5 seconds

    function init() {
        const container = document.getElementById('cinematic-intro');
        const canvas = document.getElementById('intro-canvas');
        if (!container || !canvas) return;

        // Load Realistic PNG Textures using standard THREE.TextureLoader
        const textureLoader = new THREE.TextureLoader();
        texBook = textureLoader.load('intro_book.png');
        texLaptop = textureLoader.load('intro_laptop.png');
        texCap = textureLoader.load('intro_gradcap.png');
        texBackpack = textureLoader.load('item_backpack.png');
        texLogo = textureLoader.load('intro_logo.png');

        // 1. Scene setup
        scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x020617, 0.015);

        // 2. Camera setup
        camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 0, 20);

        // 3. Renderer setup
        renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        // 4. Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
        scene.add(ambientLight);

        // 5. Build Procedural Book (Initial Phase)
        build3DBook();

        // 6. Build Particle System (Page flyaway / merge)
        buildParticles();

        // 7. Build Orbiting Wireframe Objects
        buildOrbitingObjects();

        // 8. Event Listeners
        window.addEventListener('resize', onWindowResize);

        // Start Loop
        animate();
    }

    // --- Dynamic Texture Builder ---
    function createCircleTexture(colorStr = '#38bdf8') {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.2, colorStr);
        grad.addColorStop(0.5, 'rgba(56, 189, 248, 0.4)');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 32, 32);
        return new THREE.CanvasTexture(canvas);
    }

    // --- Realistic 3D Book ---
    function build3DBook() {
        bookGroup = new THREE.Group();
        bookGroup.position.set(0, 0, 0);
        scene.add(bookGroup);

        const bookMat = new THREE.MeshBasicMaterial({
            map: texBook,
            transparent: true,
            side: THREE.DoubleSide
        });

        // Detailed 3D look using textured planes for pages & cover
        const bookCover = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), bookMat);
        bookGroup.add(bookCover);
    }

    // --- Realistic Orbiting Objects ---
    function buildOrbitingObjects() {
        orbitGroup = new THREE.Group();
        orbitGroup.position.set(0, 0, 0);
        orbitGroup.visible = false;
        scene.add(orbitGroup);

        const planeGeo = new THREE.PlaneGeometry(5, 5);

        // 1. Laptop
        const laptop = new THREE.Mesh(planeGeo, new THREE.MeshBasicMaterial({
            map: texLaptop,
            transparent: true,
            side: THREE.DoubleSide
        }));
        laptop.position.set(-8, 3, -10);
        orbitGroup.add(laptop);

        // 2. Backpack
        const backpack = new THREE.Mesh(planeGeo, new THREE.MeshBasicMaterial({
            map: texBackpack,
            transparent: true,
            side: THREE.DoubleSide
        }));
        backpack.position.set(8, -3, -10);
        orbitGroup.add(backpack);

        // 3. Grad Cap
        const gradCap = new THREE.Mesh(planeGeo, new THREE.MeshBasicMaterial({
            map: texCap,
            transparent: true,
            side: THREE.DoubleSide
        }));
        gradCap.position.set(-6, -4, -12);
        orbitGroup.add(gradCap);

        // 4. Logo Bag
        const logoBag = new THREE.Mesh(planeGeo, new THREE.MeshBasicMaterial({
            map: texLogo,
            transparent: true,
            side: THREE.DoubleSide
        }));
        logoBag.position.set(7, 4, -12);
        orbitGroup.add(logoBag);
    }

    // --- Particle System Builder ---
    function buildParticles() {
        particlesGeo = new THREE.BufferGeometry();
        particlePositions = new Float32Array(particleCount * 3);
        particleVelocities = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount; i++) {
            // initial state: dormant in the center/spine of book
            particlePositions[i * 3] = (Math.random() - 0.5) * 0.5;
            particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 5;
            particlePositions[i * 3 + 2] = 0.1;

            // Velocity directions upwards and outwards
            particleVelocities[i * 3] = (Math.random() - 0.5) * 5;
            particleVelocities[i * 3 + 1] = Math.random() * 8 + 2;
            particleVelocities[i * 3 + 2] = (Math.random() - 0.5) * 5;
        }

        particlesGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

        const pMaterial = new THREE.PointsMaterial({
            size: 0.65,
            map: createCircleTexture('#38bdf8'),
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            transparent: true,
            opacity: 0
        });

        particleSystem = new THREE.Points(particlesGeo, pMaterial);
        scene.add(particleSystem);
    }

    // --- Rendering Loop & Animation Sequencer ---
    function animate() {
        animationFrameId = requestAnimationFrame(animate);

        const elapsed = Date.now() - startTime;

        // Phase 1: Book rotates and floats (0s - 3.5s)
        if (elapsed < 3500) {
            bookGroup.rotation.y = (elapsed / 3500) * Math.PI * 2.5;
            bookGroup.rotation.x = Math.sin(elapsed / 1000) * 0.2;
            bookGroup.position.y = Math.sin(elapsed / 500) * 0.5;
        }

        // Phase 2: Pages emit particles (3.5s - 5.5s)
        if (elapsed >= 3000 && elapsed < 6500) {
            const positions = particleSystem.geometry.attributes.position.array;
            particleSystem.material.opacity = Math.min(1, (elapsed - 3000) / 1000);

            for (let i = 0; i < particleCount; i++) {
                if (positions[i * 3 + 1] > 18) {
                    positions[i * 3] = (Math.random() - 0.5) * 2;
                    positions[i * 3 + 1] = 0;
                    positions[i * 3 + 2] = 0;
                }
                positions[i * 3] += particleVelocities[i * 3] * 0.015;
                positions[i * 3 + 1] += particleVelocities[i * 3 + 1] * 0.015;
                positions[i * 3 + 2] += particleVelocities[i * 3 + 2] * 0.015;
            }
            particleSystem.geometry.attributes.position.needsUpdate = true;

            // Fade out book
            if (elapsed > 4200) {
                bookGroup.scale.setScalar(Math.max(0, 1 - (elapsed - 4200) / 1000));
            }
        }

        // Phase 3: Morph into Laptop, Backpack, Grad Cap, Logo orbiting (5.5s - 8s)
        if (elapsed >= 5500) {
            orbitGroup.visible = true;

            // Fade in orbiting objects
            const fadeVal = Math.min(1, (elapsed - 5500) / 1000);
            orbitGroup.children.forEach(mesh => {
                if (mesh.material) {
                    mesh.material.opacity = fadeVal;
                }
                // Rotate mesh Y axis for realistic depth
                mesh.rotation.y += 0.015;
            });

            // Rotate objects orbit
            orbitGroup.rotation.y = (elapsed - 5500) * 0.0008;
            orbitGroup.rotation.x = Math.sin((elapsed - 5500) * 0.001) * 0.15;

            // Morph particles to form shell outer orbits
            const positions = particleSystem.geometry.attributes.position.array;
            for (let i = 0; i < particleCount; i++) {
                const angle = (i / particleCount) * Math.PI * 2 + (elapsed * 0.0005);
                const radius = 12 + Math.sin(angle * 4) * 2;
                positions[i * 3] += (Math.cos(angle) * radius - positions[i * 3]) * 0.08;
                positions[i * 3 + 1] += (Math.sin(angle * 2) * 4 - positions[i * 3 + 1]) * 0.08;
                positions[i * 3 + 2] += (Math.sin(angle) * radius - positions[i * 3 + 2]) * 0.08;
            }
            particleSystem.geometry.attributes.position.needsUpdate = true;
        }

        // Phase 4: Implode to Center & Camera Dolly Zoom (8s - 9.5s)
        if (elapsed >= 8000) {
            const pullRatio = (elapsed - 8000) / 1200;
            const easePull = Math.min(1, pullRatio * pullRatio);

            // Pull items to center (scale to 0)
            orbitGroup.scale.setScalar(Math.max(0, 1 - easePull));

            // Pull particles to center point (0, 0, 0)
            const positions = particleSystem.geometry.attributes.position.array;
            for (let i = 0; i < particleCount; i++) {
                positions[i * 3] += (0 - positions[i * 3]) * 0.15;
                positions[i * 3 + 1] += (0 - positions[i * 3 + 1]) * 0.15;
                positions[i * 3 + 2] += (0 - positions[i * 3 + 2]) * 0.15;
            }
            particleSystem.geometry.attributes.position.needsUpdate = true;

            // Camera Dolly Zoom Out (FOV / Z coordinate zoom)
            camera.position.z = 20 + easePull * 18;
            camera.fov = 60 + easePull * 20;
            camera.updateProjectionMatrix();

            // Explosive burst logic
            if (elapsed > 8800) {
                particleSystem.material.opacity = Math.max(0, 1 - (elapsed - 8800) / 500);
            }
        }

        renderer.render(scene, camera);
    }

    function onWindowResize() {
        if (!camera || !renderer) return;
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    // Auto-initialize when Three.js is loaded
    if (window.THREE) {
        init();
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            let checkInterval = setInterval(() => {
                if (window.THREE) {
                    clearInterval(checkInterval);
                    init();
                }
            }, 100);
        });
    }

    // Clean up animation on window unload
    window.addEventListener('unload', () => {
        cancelAnimationFrame(animationFrameId);
    });
})();
