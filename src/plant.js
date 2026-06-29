import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { plantStages, plantRegions } from './plantData.js';

export class PlantViewer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error(`Container #${containerId} not found.`);
      return;
    }

    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;

    this.currentProgress = 0.0;
    this.isLoaded = false;
    this.onRegionClick = null; // callback(region, screenPos)
    this.onHover = null; // callback(region | null, screenPos)

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this._downPos = null;

    this.initScene();
    this.initLights();
    this.initCameraControls();
    this.buildPlant();

    this._onMouseMove = this._handleMouseMove.bind(this);
    this._onMouseDown = (e) => { this._downPos = { x: e.clientX, y: e.clientY }; };
    this._onMouseUp = this._handleMouseUp.bind(this);
    this._onResize = this._handleResize.bind(this);

    this.container.addEventListener('mousemove', this._onMouseMove);
    this.container.addEventListener('mousedown', this._onMouseDown);
    this.container.addEventListener('mouseup', this._onMouseUp);
    window.addEventListener('resize', this._onResize);

    this._clock = new THREE.Clock();
    this._animate();
    this.isLoaded = true;
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050a0a); // Tông tối lục lam nhẹ phù hợp thực vật
    this.scene.fog = new THREE.FogExp2(0x050a0a, 0.015);

    this.camera = new THREE.PerspectiveCamera(45, this.width / this.height, 0.01, 1000);
    this.camera.position.set(0, 1.2, 5.0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.85;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Thiết lập phản xạ môi trường chất lượng cao
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    pmremGenerator.compileEquirectangularShader();
    const roomEnv = new RoomEnvironment();
    const envMap = pmremGenerator.fromScene(roomEnv, 0.04).texture;
    this.scene.environment = envMap;
    this.scene.environmentIntensity = 0.4;
    pmremGenerator.dispose();

    this.container.appendChild(this.renderer.domElement);

    // Tạo các hạt bụi sinh học bay lơ lửng trong không khí
    this._createBioParticles();
  }

  _createBioParticles() {
    const geo = new THREE.BufferGeometry();
    const count = 180;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 15;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 15;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0x86efac, // Hạt lục sáng lá mầm
      size: 0.025,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.bioParticles = new THREE.Points(geo, mat);
    this.scene.add(this.bioParticles);
  }

  initLights() {
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.25));

    // Nguồn sáng chính tạo bóng đổ sắc nét
    const sunLight = new THREE.DirectionalLight(0xfffaed, 1.2);
    sunLight.position.set(4, 8, 4);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 25;
    const d = 3.5;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0005;
    this.scene.add(sunLight);
    this.sunLight = sunLight;

    // Ánh sáng hắt dịu nhẹ từ dưới lên
    const bounceLight = new THREE.DirectionalLight(0x86efac, 0.15);
    bounceLight.position.set(-4, -3, -2);
    this.scene.add(bounceLight);
  }

  initCameraControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxDistance = 12;
    this.controls.minDistance = 1.0;
    this.controls.target.set(0, 0.5, 0);
  }

  buildPlant() {
    this.plantGroup = new THREE.Group();
    this.scene.add(this.plantGroup);

    // 1. Chậu và Đất (Cross-section chậu đất trong suốt cao cấp để nhìn thấy rễ)
    const soilGeo = new THREE.CylinderGeometry(1.6, 1.4, 0.8, 32);
    const soilMat = new THREE.MeshStandardMaterial({
      color: 0x271911,
      roughness: 0.95,
      metalness: 0.0,
      transparent: true,
      opacity: 0.88,
    });
    this.soil = new THREE.Mesh(soilGeo, soilMat);
    this.soil.position.y = -0.4;
    this.soil.receiveShadow = true;
    this.plantGroup.add(this.soil);

    // Viền chậu mỏng sang trọng
    const potGeo = new THREE.CylinderGeometry(1.62, 1.42, 0.82, 32, 1, true);
    const potMat = new THREE.MeshPhysicalMaterial({
      color: 0x111827,
      roughness: 0.2,
      transmission: 0.6,
      thickness: 0.1,
      transparent: true,
      opacity: 0.5
    });
    const pot = new THREE.Mesh(potGeo, potMat);
    pot.position.y = -0.4;
    this.plantGroup.add(pot);

    // 2. Hạt Mít (Gồm 2 nửa dẹt)
    const seedGeo = new THREE.SphereGeometry(0.14, 16, 16);
    seedGeo.scale(1.5, 0.9, 0.9); // Làm dẹt thuôn dài thành hạt mít
    const seedMat = new THREE.MeshStandardMaterial({
      color: 0x854d0e,
      roughness: 0.7,
      metalness: 0.0
    });

    this.seedLeft = new THREE.Mesh(seedGeo, seedMat.clone());
    this.seedRight = new THREE.Mesh(seedGeo, seedMat.clone());
    this.seedLeft.userData.regionId = 'seed';
    this.seedRight.userData.regionId = 'seed';
    this.seedLeft.castShadow = true;
    this.seedRight.castShadow = true;

    this.plantGroup.add(this.seedLeft);
    this.plantGroup.add(this.seedRight);

    // 3. Hệ rễ cọc
    this.rootGroup = new THREE.Group();
    this.plantGroup.add(this.rootGroup);

    // Rễ cọc chính
    const rootGeo = new THREE.CylinderGeometry(0.04, 0.01, 1.2, 8);
    rootGeo.translate(0, -0.6, 0); // Đặt pivot lên đỉnh rễ
    const rootMat = new THREE.MeshStandardMaterial({
      color: 0xa16207,
      roughness: 0.9,
    });
    this.mainRoot = new THREE.Mesh(rootGeo, rootMat);
    this.mainRoot.userData.regionId = 'roots';
    this.rootGroup.add(this.mainRoot);

    // Rễ con mọc xiên (lateral roots)
    this.lateralRoots = [];
    const lateralRootCount = 6;
    for (let i = 0; i < lateralRootCount; i++) {
      const latGeo = new THREE.CylinderGeometry(0.015, 0.005, 0.4, 8);
      latGeo.translate(0, -0.2, 0);
      const latRoot = new THREE.Mesh(latGeo, rootMat);
      latRoot.userData.regionId = 'roots';
      latRoot.rotation.z = (Math.PI / 4) * (i % 2 === 0 ? 1 : -1);
      latRoot.rotation.y = (i * Math.PI * 2) / lateralRootCount;
      latRoot.position.y = -0.15 - i * 0.15;
      this.mainRoot.add(latRoot);
      this.lateralRoots.push(latRoot);
    }

    // 4. Thân cây gỗ mít chính
    this.trunkGroup = new THREE.Group();
    this.plantGroup.add(this.trunkGroup);

    const trunkGeo = new THREE.CylinderGeometry(0.06, 0.08, 1.8, 12);
    trunkGeo.translate(0, 0.9, 0); // Pivot tại gốc thân
    const trunkMat = new THREE.MeshStandardMaterial({
      color: 0x5c4033, // Xám nâu gỗ già
      roughness: 0.9,
      metalness: 0.05
    });
    this.trunk = new THREE.Mesh(trunkGeo, trunkMat);
    this.trunk.userData.regionId = 'trunk';
    this.trunk.castShadow = true;
    this.trunk.receiveShadow = true;
    this.trunkGroup.add(this.trunk);

    // 5. Các cành nhánh phụ (4 cành gỗ)
    this.branches = [];
    const branchHeights = [0.6, 0.9, 1.2, 1.4];
    const branchAngles = [0, Math.PI * 0.65, Math.PI * 1.3, Math.PI * 1.8];
    for (let i = 0; i < 4; i++) {
      const branchGeo = new THREE.CylinderGeometry(0.035, 0.02, 0.7, 8);
      branchGeo.translate(0, 0.35, 0);
      const br = new THREE.Mesh(branchGeo, trunkMat);
      br.userData.regionId = 'trunk';
      br.castShadow = true;
      br.receiveShadow = true;

      // Góc chĩa cành chéo lên trên
      br.rotation.z = Math.PI / 4.5;
      br.rotation.y = branchAngles[i];
      br.position.y = branchHeights[i];
      
      this.trunk.add(br);
      this.branches.push(br);
    }

    // 6. Lá mít PBR chất lượng cao có Shader rung rinh trước gió
    this.leaves = [];
    
    // Lá trên thân chính (xếp xoắn ốc)
    const leafGeo = new THREE.ConeGeometry(0.08, 0.22, 4, 3);
    leafGeo.rotateX(Math.PI / 2); // Xoay dọc hình nón chĩa theo Z
    leafGeo.scale(1.0, 0.04, 1.4); // Ép dẹp nón thành hình chiếc lá
    leafGeo.translate(0, 0, 0.11); // Đặt pivot tại gốc cuống lá

    // Shader tạo gió
    const leafMat = new THREE.MeshPhysicalMaterial({
      color: 0x15803d,
      roughness: 0.18,
      metalness: 0.05,
      clearcoat: 0.8,
      clearcoatRoughness: 0.2,
      transmission: 0.2, // Hiệu ứng xuyên sáng nhẹ
      thickness: 0.05,
      side: THREE.DoubleSide
    });

    leafMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = { value: 0 };
      this._leafUniforms = shader.uniforms;
      shader.vertexShader = `
        uniform float uTime;
      ` + shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
          #include <begin_vertex>
          // Lá đung đưa theo nhịp sine của thời gian, lá càng xa cuống rung càng mạnh
          float leafFlex = position.z * 1.8;
          transformed.x += sin(uTime * 2.8 + position.z * 5.0) * 0.03 * leafFlex;
          transformed.y += cos(uTime * 2.0) * 0.015 * leafFlex;
        `
      );
    };

    // Tạo các lá trên thân
    const leafCount = 18;
    for (let i = 0; i < leafCount; i++) {
      const leaf = new THREE.Mesh(leafGeo, leafMat.clone());
      leaf.userData.regionId = 'leaves';
      leaf.castShadow = true;
      leaf.receiveShadow = true;

      // Xếp lá xoắn ốc dọc thân chính
      const heightFrac = 0.2 + (i / leafCount) * 0.75; // Phân bổ từ Y=0.36 đến Y=1.71
      leaf.position.set(0, heightFrac * 1.8, 0);
      leaf.rotation.y = i * Math.PI * 0.618; // Góc vàng phyllotaxis
      leaf.rotation.x = Math.PI / 6; // Chĩa lá chéo xuống dưới nhẹ
      
      this.trunk.add(leaf);
      this.leaves.push({
        mesh: leaf,
        baseScale: 1.0 + (Math.random() * 0.2 - 0.1),
        minProgress: 0.25 + (i / leafCount) * 0.25 // Lá dưới mọc trước, lá trên mọc sau
      });
    }

    // Tạo lá trên các cành nhánh phụ
    this.branches.forEach((br, brIdx) => {
      const branchLeafCount = 4;
      for (let i = 0; i < branchLeafCount; i++) {
        const leaf = new THREE.Mesh(leafGeo, leafMat.clone());
        leaf.userData.regionId = 'leaves';
        leaf.castShadow = true;
        leaf.receiveShadow = true;

        const posOnBranch = 0.2 + (i / branchLeafCount) * 0.7; // Dọc cành dài 0.7
        leaf.position.set(0, posOnBranch, 0);
        // Xoay lá sang 2 bên cành
        leaf.rotation.z = (Math.PI / 3) * (i % 2 === 0 ? 1 : -1);
        leaf.rotation.y = Math.PI / 2;
        leaf.rotation.x = (Math.random() - 0.5) * 0.3; // Ngẫu nhiên nhẹ

        br.add(leaf);
        this.leaves.push({
          mesh: leaf,
          baseScale: 0.85 + (Math.random() * 0.15),
          minProgress: 0.45 + (brIdx * 0.05) + (i * 0.03) // Mọc sau khi cành xuất hiện
        });
      }
    });

    // 7. Cụm hoa Mít (Dái Mít - Cauliflory) mọc trực tiếp từ thân chính
    // Cụm hoa mít đực (dài nhẵn hơn) và cái (to mập hơi gai)
    this.flowers = [];
    const flowerYPositions = [0.35, 0.52, 0.68];
    const flowerRotations = [Math.PI * 0.2, Math.PI * 0.85, Math.PI * 1.45];
    const flowerGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.18, 8, 4);
    flowerGeo.translate(0, -0.09, 0); // Pivot tại cuống bám vào thân

    const flowerMat = new THREE.MeshPhysicalMaterial({
      color: 0x16a34a,
      roughness: 0.85,
      clearcoat: 0.1,
      bumpScale: 0.02
    });

    for (let i = 0; i < 3; i++) {
      const flGroup = new THREE.Group();
      flGroup.position.set(0, flowerYPositions[i], 0);
      flGroup.rotation.y = flowerRotations[i];

      // Cuống hoa ngắn chĩa xuống dưới
      const stemGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.06, 8);
      stemGeo.translate(0, 0.03, 0);
      const stem = new THREE.Mesh(stemGeo, trunkMat);
      flGroup.add(stem);

      const infl = new THREE.Mesh(flowerGeo, flowerMat);
      infl.userData.regionId = 'flower';
      infl.position.set(0, -0.05, 0.03);
      infl.rotation.x = Math.PI / 3; // Rủ xuống dưới nhẹ
      infl.castShadow = true;
      flGroup.add(infl);

      this.trunk.add(flGroup);
      this.flowers.push({
        group: flGroup,
        mesh: infl,
        yPos: flowerYPositions[i]
      });
    }

    // 8. Quả Mít Gai (Hồi quy thay thế cụm hoa ở giai đoạn 6)
    // Thiết lập bump map mô phỏng gai mít sần sùi thông qua CanvasTexture sinh tự động
    const bumpTexture = this._createSpikyBumpTexture();

    this.fruits = [];
    const fruitGeo = new THREE.SphereGeometry(0.13, 24, 24);
    fruitGeo.scale(1.0, 1.4, 1.0); // Ép dẹt quả mít hình bầu dục dài
    
    // Vật liệu quả mít đổi màu dần từ xanh lá cây sang vàng
    const fruitMat = new THREE.MeshPhysicalMaterial({
      color: 0x16a34a, // Khởi tạo màu xanh lá
      roughness: 0.8,
      bumpMap: bumpTexture,
      bumpScale: 0.045, // Tạo các gai gợn lên rõ rệt trên khối
      clearcoat: 0.0
    });

    for (let i = 0; i < 3; i++) {
      const frGroup = new THREE.Group();
      frGroup.position.set(0, flowerYPositions[i], 0);
      frGroup.rotation.y = flowerRotations[i];

      // Cuống quả mập mạp hơn cuống hoa
      const frStemGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.08, 8);
      const frStem = new THREE.Mesh(frStemGeo, trunkMat);
      frGroup.add(frStem);

      const fruitMesh = new THREE.Mesh(fruitGeo, fruitMat.clone());
      fruitMesh.userData.regionId = 'fruit';
      fruitMesh.position.set(0, -0.15, 0.06);
      fruitMesh.rotation.x = Math.PI / 3.5; // Quả mít trĩu nặng hướng đất
      fruitMesh.castShadow = true;
      fruitMesh.receiveShadow = true;
      frGroup.add(fruitMesh);

      this.trunk.add(frGroup);
      this.fruits.push({
        group: frGroup,
        mesh: fruitMesh,
        stem: frStem
      });
    }

    // Khởi tạo trạng thái ban đầu của cây
    this.update(0.0);
  }

  // Tạo cấu trúc gai mít lồi lõm sần sùi không cần tải file ngoài
  _createSpikyBumpTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Nền xám trung tính (tương ứng độ phẳng)
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, 256, 256);

    // Vẽ vô số các hình đa giác nhỏ hoặc chấm tròn sáng màu để giả lập gai nhọn nhô lên
    const gridSize = 8;
    for (let x = 0; x < 256; x += gridSize) {
      for (let y = 0; y < 256; y += gridSize) {
        // Tọa độ nhiễu nhẹ để gai không thẳng hàng quá máy móc
        const px = x + (Math.random() - 0.5) * 3;
        const py = y + (Math.random() - 0.5) * 3;
        const radius = 2.0 + Math.random() * 1.5;

        // Vẽ một hình nón độ xám (sáng ở giữa - nhô lên cao nhất, đen ở rìa)
        const grad = ctx.createRadialGradient(px, py, 0, px, py, radius);
        grad.addColorStop(0, '#ffffff'); // Gai đỉnh nhọn nhất
        grad.addColorStop(0.3, '#d0d0d0');
        grad.addColorStop(1, '#808080'); // Về mức nền phẳng

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(5, 5); // Tần suất gai mật độ cao
    return texture;
  }

  // ---------- CẬP NHẬT TĂNG TRƯỞNG (GROWTH TIMELINE) ----------
  update(p) {
    this.currentProgress = p;

    // A. GIAI ĐOẠN 1: Hạt giống ngủ nghỉ (p: 0 -> 0.15)
    if (p <= 0.15) {
      const factor = p / 0.15;
      
      // Hạt mít nằm yên trên đất, khép sát nhau
      this.seedLeft.visible = true;
      this.seedRight.visible = true;
      this.seedLeft.position.set(-0.07, 0, 0);
      this.seedRight.position.set(0.07, 0, 0);
      this.seedLeft.rotation.set(0, 0, -Math.PI / 16);
      this.seedRight.rotation.set(0, 0, Math.PI / 16);
      this.seedLeft.scale.set(1, 1, 1);
      this.seedRight.scale.set(1, 1, 1);

      // Thân, rễ, hoa, quả chưa xuất hiện
      this.rootGroup.visible = false;
      this.trunkGroup.visible = false;
      this.flowers.forEach(f => f.group.visible = false);
      this.fruits.forEach(fr => fr.group.visible = false);
    }
    // B. GIAI ĐOẠN 2: Nảy mầm (p: 0.15 -> 0.35)
    else if (p <= 0.35) {
      const factor = (p - 0.15) / 0.20; // 0 -> 1

      // Hạt tách đôi ra 2 bên rõ rệt
      this.seedLeft.visible = true;
      this.seedRight.visible = true;
      const sepX = 0.07 + factor * 0.18; // Dãn cách từ 0.07 đến 0.25
      this.seedLeft.position.set(-sepX, 0, 0);
      this.seedRight.position.set(sepX, 0, 0);
      this.seedLeft.rotation.z = -Math.PI / 16 - factor * (Math.PI / 8);
      this.seedRight.rotation.z = Math.PI / 16 + factor * (Math.PI / 8);

      // Rễ cọc đâm xuống đất
      this.rootGroup.visible = true;
      this.mainRoot.scale.set(1, factor, 1); // Rễ dài dần ra
      this.lateralRoots.forEach((lat, i) => {
        // Rễ xiên mọc sau
        const lFrac = Math.max(0, (factor - 0.3 - (i * 0.1)) / 0.7);
        lat.scale.set(lFrac, lFrac, lFrac);
      });

      // Thân non nhú thẳng lên từ khe hạt
      this.trunkGroup.visible = true;
      const stemHeight = factor * 0.25; // Cao tối đa 0.25
      this.trunk.scale.set(0.2 + factor * 0.2, stemHeight, 0.2 + factor * 0.2); // Thân mảnh dẻ
      this.trunk.position.set(0, 0, 0);

      // Ẩn các bộ phận khác
      this.leaves.forEach(l => l.mesh.scale.setScalar(0.0001));
      this.flowers.forEach(f => f.group.visible = false);
      this.fruits.forEach(fr => fr.group.visible = false);
    }
    // C. CÁC GIAI ĐOẠN SAU (p > 0.35)
    else {
      // 1. Tiêu biến hạt giống (Teo nhỏ lại dưới đất rồi ẩn đi)
      const seedFactor = Math.max(0, 1.0 - (p - 0.35) / 0.15); // Teo từ 1 -> 0 khi p: 0.35 -> 0.50
      if (seedFactor > 0.01) {
        this.seedLeft.visible = true;
        this.seedRight.visible = true;
        this.seedLeft.scale.setScalar(seedFactor);
        this.seedRight.scale.setScalar(seedFactor);
      } else {
        this.seedLeft.visible = false;
        this.seedRight.visible = false;
      }

      // 2. Rễ phát triển tối đa dưới lòng đất
      this.rootGroup.visible = true;
      this.mainRoot.scale.set(1, 1, 1);
      this.lateralRoots.forEach(lat => lat.scale.set(1, 1, 1));

      // 3. Thân gỗ mít lớn vọt lên và hóa dày gỗ
      this.trunkGroup.visible = true;
      
      // Thân cao từ 0.25 đạt max 1.0 khi p = 0.75
      const trunkHeightFactor = Math.min(1.0, 0.25 + ((p - 0.35) / 0.40) * 0.75);
      // Thân to gỗ hơn hẳn
      const trunkThickFactor = Math.min(1.0, 0.4 + ((p - 0.35) / 0.40) * 0.6);
      this.trunk.scale.set(trunkThickFactor, trunkHeightFactor, trunkThickFactor);

      // Cành gỗ phát triển khi thân đủ lớn (p > 0.45)
      this.branches.forEach((br, idx) => {
        const brStartP = 0.45 + idx * 0.06;
        const brFactor = Math.max(0, Math.min(1.0, (p - brStartP) / 0.15));
        br.scale.set(brFactor, brFactor, brFactor);
      });

      // 4. Sự xuất hiện của Lá Mít (Grow và đổi màu xanh đậm)
      this.leaves.forEach(l => {
        const lFrac = Math.max(0, Math.min(1.0, (p - l.minProgress) / 0.12)); // Mất 12% timeline để lá lớn
        if (lFrac > 0.001) {
          const scl = lFrac * l.baseScale;
          l.mesh.scale.set(scl, scl, scl);
          l.mesh.visible = true;
          
          // Đổi màu: Lá non màu xanh nhạt sáng, lá già già chuyển dần sang xanh đậm lục tối
          const youngColor = new THREE.Color(0x86efac);
          const matureColor = new THREE.Color(0x115e59);
          l.mesh.material.color.copy(youngColor).lerp(matureColor, lFrac);
        } else {
          l.mesh.scale.setScalar(0.0001);
          l.mesh.visible = false;
        }
      });

      // 5. Sự xuất hiện của Hoa Mít (Dái Mít - p: 0.75 -> 0.90)
      if (p >= 0.72) {
        // Hoa đơm từ p=0.72 đến 0.82 đạt kích thước đầy đủ
        this.flowers.forEach(f => {
          const flFrac = Math.max(0, Math.min(1.0, (p - 0.72) / 0.10));
          
          // Khi quả bắt đầu đơm lớn ở kỳ tiếp theo (p > 0.88), hoa sẽ rụng và teo đi
          const flFade = Math.max(0, 1.0 - (p - 0.88) / 0.05); // Rụng/Teo khi p: 0.88 -> 0.93
          
          const currentScale = flFrac * flFade;
          if (currentScale > 0.001) {
            f.group.visible = true;
            f.mesh.scale.setScalar(currentScale);
          } else {
            f.group.visible = false;
          }
        });
      } else {
        this.flowers.forEach(f => f.group.visible = false);
      }

      // 6. Sự lớn lên và chín vàng của Quả Mít (Fruiting - p: 0.88 -> 1.0)
      if (p >= 0.86) {
        this.fruits.forEach((fr, idx) => {
          const frFrac = Math.max(0, Math.min(1.0, (p - 0.86) / 0.12)); // Đơm quả từ 0% đến 100%
          
          if (frFrac > 0.001) {
            fr.group.visible = true;
            fr.mesh.scale.setScalar(frFrac);
            fr.stem.scale.set(frFrac, frFrac, frFrac);

            // Quả chín chuyển màu từ xanh đậm thực vật (#15803d) sang màu vàng mật (#ca8a04)
            const greenColor = new THREE.Color(0x166534);
            const ripeColor = new THREE.Color(0xd97706);
            
            // Quả chín dần dần từ p = 0.93 đến 1.0
            const ripeFactor = Math.max(0, Math.min(1.0, (p - 0.93) / 0.07));
            fr.mesh.material.color.copy(greenColor).lerp(ripeColor, ripeFactor);
          } else {
            fr.group.visible = false;
          }
        });
      } else {
        this.fruits.forEach(fr => fr.group.visible = false);
      }
    }
  }

  // ---------- CAMERA PRESETS (Xem góc độ cây mít tốt nhất) ----------
  setCameraPreset(preset) {
    const presets = {
      front: { pos: new THREE.Vector3(0, 0.9, 4.2), target: new THREE.Vector3(0, 0.7, 0) },
      top: { pos: new THREE.Vector3(0, 3.8, 0.5), target: new THREE.Vector3(0, 0.9, 0) },
      detail: { pos: new THREE.Vector3(-0.6, 0.6, 1.2), target: new THREE.Vector3(0, 0.55, 0) } // Cận cảnh cụm quả thân cây
    };

    const target = presets[preset];
    if (target) {
      this._animateCamera(target.pos, target.target);
    }
  }

  _animateCamera(targetPos, targetLookAt) {
    let frames = 40;
    const step = () => {
      if (frames <= 0) return;
      this.camera.position.lerp(targetPos, 0.12);
      this.controls.target.lerp(targetLookAt, 0.12);
      this.controls.update();
      frames--;
      requestAnimationFrame(step);
    };
    step();
  }

  // ---------- INTERACTION & RAYCASTING (Click-to-learn) ----------
  _pick(event) {
    if (!this.isLoaded) return null;

    const rect = this.container.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    // Thu gom tất cả các mesh đang hiển thị để raycast
    const pickableObjects = [];
    this.plantGroup.traverse((obj) => {
      if (obj.isMesh && obj.visible) {
        // Kiểm tra xem tổ tiên hoặc chính mesh có chứa regionId hợp lệ không
        let ancestor = obj;
        let regionId = null;
        while (ancestor) {
          if (ancestor.userData && ancestor.userData.regionId) {
            regionId = ancestor.userData.regionId;
            break;
          }
          ancestor = ancestor.parent;
        }
        if (regionId) {
          obj.userData.resolvedRegionId = regionId;
          pickableObjects.push(obj);
        }
      }
    });

    const hits = this.raycaster.intersectObjects(pickableObjects, false);
    if (hits.length === 0) return null;

    const mesh = hits[0].object;
    const regionId = mesh.userData.resolvedRegionId;
    const region = plantRegions.find((r) => r.id === regionId) || null;

    return {
      region,
      mesh,
      point: hits[0].point,
      screen: { x: event.clientX - rect.left, y: event.clientY - rect.top },
    };
  }

  _handleMouseMove(event) {
    const result = this._pick(event);
    const region = result?.region || null;

    if (region !== this.hoveredRegion) {
      this.hoveredRegion = region;
      this.renderer.domElement.style.cursor = region ? 'pointer' : 'grab';
    }
    if (this.onHover) {
      const rect = this.container.getBoundingClientRect();
      this.onHover(region, { x: event.clientX - rect.left, y: event.clientY - rect.top });
    }
  }

  _handleMouseUp(event) {
    if (this._downPos) {
      const dx = event.clientX - this._downPos.x;
      const dy = event.clientY - this._downPos.y;
      this._downPos = null;
      if (dx * dx + dy * dy > 36) return; // Nếu kéo chuột di chuyển quá 6px -> coi là xoay camera, bỏ qua click
    }

    const result = this._pick(event);
    if (result && result.region) {
      this.highlightRegion(result.region.id);
      this.focusRegion(result.region.id);
      if (this.onRegionClick) this.onRegionClick(result.region, result.screen);
    } else {
      this.clearHighlight();
      if (this.onRegionClick) this.onRegionClick(null, null);
    }
  }

  // ---------- HIGHLIGHT & FOCUS ----------
  highlightRegion(regionId) {
    this.highlightedRegion = regionId;
    
    this.plantGroup.traverse((obj) => {
      if (!obj.isMesh || !obj.material) return;
      
      // Tìm regionId
      let ancestor = obj;
      let rid = null;
      while (ancestor) {
        if (ancestor.userData && ancestor.userData.regionId) {
          rid = ancestor.userData.regionId;
          break;
        }
        ancestor = ancestor.parent;
      }

      if (!rid) return;

      const isSelected = rid === regionId;
      if (isSelected) {
        if (obj.material.emissive) {
          obj.material.emissiveIntensity = 0.55;
          obj.material.emissive.set(0x86efac); // Phát sáng xanh lục viền
        }
      } else {
        if (obj.material.emissive) {
          obj.material.emissiveIntensity = 0.0;
        }
      }
      if (obj.material.needsUpdate) obj.material.needsUpdate = true;
    });
  }

  clearHighlight() {
    this.highlightedRegion = null;
    this.plantGroup.traverse((obj) => {
      if (obj.isMesh && obj.material && obj.material.emissive) {
        obj.material.emissiveIntensity = 0.0;
        obj.material.needsUpdate = true;
      }
    });
  }

  focusRegion(regionId) {
    // Tìm các mesh có regionId tương ứng để tính Box3 hội tụ camera
    const targets = [];
    this.plantGroup.traverse((obj) => {
      if (obj.isMesh && obj.visible) {
        let ancestor = obj;
        let rid = null;
        while (ancestor) {
          if (ancestor.userData && ancestor.userData.regionId) {
            rid = ancestor.userData.regionId;
            break;
          }
          ancestor = ancestor.parent;
        }
        if (rid === regionId) targets.push(obj);
      }
    });

    if (targets.length === 0) return;

    const box = new THREE.Box3();
    targets.forEach((t) => box.expandByObject(t));
    const center = new THREE.Vector3();
    box.getCenter(center);

    // Dịch tâm OrbitControls về trung điểm bộ phận được bấm
    this._animateTarget(center);
  }

  _animateTarget(targetLookAt) {
    let frames = 30;
    const step = () => {
      if (frames <= 0) return;
      this.controls.target.lerp(targetLookAt, 0.15);
      this.controls.update();
      frames--;
      requestAnimationFrame(step);
    };
    step();
  }

  // ---------- ANIMATION LOOP & RESIZE ----------
  _animate() {
    this._animFrameId = requestAnimationFrame(this._animate.bind(this));
    try {
      const dt = this._clock.getDelta();
      const time = this._clock.getElapsedTime();

      // Cập nhật uniform thời gian cho Shader của lá cây đung đưa trước gió
      if (this._leafUniforms) {
        this._leafUniforms.uTime.value = time;
      }

      // Xoay nhẹ hạt bụi sinh học
      if (this.bioParticles) {
        this.bioParticles.rotation.y += 0.03 * dt;
        this.bioParticles.rotation.x += 0.015 * dt;
      }

      // Đập nhịp phát sáng cho bộ phận đang highlight
      if (this.highlightedRegion) {
        const pulse = 0.35 + Math.sin(time * 3.5) * 0.2;
        this.plantGroup.traverse((obj) => {
          if (obj.isMesh && obj.visible && obj.material && obj.material.emissive) {
            let ancestor = obj;
            let rid = null;
            while (ancestor) {
              if (ancestor.userData && ancestor.userData.regionId) {
                rid = ancestor.userData.regionId;
                break;
              }
              ancestor = ancestor.parent;
            }
            if (rid === this.highlightedRegion) {
              obj.material.emissiveIntensity = pulse;
            }
          }
        });
      }

      // Xoay tự động rất nhẹ khi ở giai đoạn hạt mầm để tạo chiều sâu trực quan
      if (this.plantGroup && this.currentProgress < 0.15) {
        this.plantGroup.rotation.y = Math.sin(time * 0.15) * 0.1;
      } else if (this.plantGroup) {
        this.plantGroup.rotation.y = 0; // Khóa xoay khi cây lớn để tương tác tự do tốt hơn
      }

      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    } catch (err) {
      console.error('[PlantViewer] Render error:', err);
    }
  }

  _handleResize() {
    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
  }

  show() { if (this.renderer) this.renderer.domElement.style.display = 'block'; }
  hide() { if (this.renderer) this.renderer.domElement.style.display = 'none'; }

  loadGLBFromUrl(url, onLoadCallback, onErrorCallback) {
    const loader = new GLTFLoader();
    
    loader.load(
      url,
      (gltf) => {
        // Remove previous Tripo model if any
        if (this.loadedTripoModel) {
          this.plantGroup.remove(this.loadedTripoModel);
        }

        // Hide all procedural tree parts
        this.trunkGroup.visible = false;
        this.seedLeft.visible = false;
        this.seedRight.visible = false;
        this.rootGroup.visible = false;
        this.flowers.forEach(f => f.group.visible = false);
        this.fruits.forEach(fr => fr.group.visible = false);

        const model = gltf.scene;
        
        // Traverse and set shadows and interactive region
        model.traverse((obj) => {
          if (obj.isMesh) {
            obj.castShadow = true;
            obj.receiveShadow = true;
            
            // Tag the Tripo model mesh so click-to-learn works on it
            obj.userData.regionId = 'fruit'; 
            
            if (obj.material) {
              obj.material = obj.material.clone();
              obj.material.roughness = 0.65;
              obj.material.metalness = 0.05;
            }
          }
        });

        // Fit and center model on top of the soil
        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);

        const maxDim = Math.max(size.x, size.y, size.z) || 1.0;
        const targetScale = 1.8 / maxDim;
        model.scale.setScalar(targetScale);

        // Adjust position so the bottom of the model aligns with soil surface (y = 0)
        const bottomY = box.min.y;
        model.position.set(
          -center.x * targetScale,
          -bottomY * targetScale,
          -center.z * targetScale
        );

        this.plantGroup.add(model);
        this.loadedTripoModel = model;

        console.log('[PlantViewer] Loaded Tripo3D GLB successfully:', url);
        if (onLoadCallback) onLoadCallback();
      },
      undefined,
      (error) => {
        console.error('[PlantViewer] Error loading Tripo3D GLB:', error);
        if (onErrorCallback) onErrorCallback(error);
      }
    );
  }

  restoreProceduralPlant() {
    if (this.loadedTripoModel) {
      this.plantGroup.remove(this.loadedTripoModel);
      this.loadedTripoModel = null;
    }
    // Re-trigger update to show procedural parts based on current progress
    this.update(this.currentProgress);
  }

  destroy() {
    cancelAnimationFrame(this._animFrameId);
    this.container.removeEventListener('mousemove', this._onMouseMove);
    this.container.removeEventListener('mousedown', this._onMouseDown);
    this.container.removeEventListener('mouseup', this._onMouseUp);
    window.removeEventListener('resize', this._onResize);
    
    if (this.renderer) {
      this.container.removeChild(this.renderer.domElement);
      this.renderer.dispose();
    }
  }
}
