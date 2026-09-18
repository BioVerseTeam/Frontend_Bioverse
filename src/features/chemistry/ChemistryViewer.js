import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { MODEL_URLS } from '../../services/modelUrls.js';


export class ChemistryViewer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error(`Container #${containerId} not found.`);
      return;
    }

    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;

    this.isLoaded = false;
    this.selectedVessel = null; // Vessel hiện đang được click chọn
    this.onVesselClick = null; // callback(vesselName, pH, temp, reactants)
    this.onReactionTrigger = null; // callback(reactionText)

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this._downPos = null;
    this._dragState = { active: false, potential: false, vessel: null, offset: new THREE.Vector3() };
    this._tablePlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    // Trạng thái thí nghiệm
    this.isBurnerLit = false;
    this.heatTarget = 298.15; // Kelvin
    this.currentHeat = 298.15;
    this.reactionRate = 0.0;
    this.activeReaction = null;

    // Dữ liệu bàn thí nghiệm
    this.vessels = {}; // Chứa các mesh nhóm dụng cụ: beaker, testtube, flask, burner
    this.selectedVesselId = null;
    this.lastSetupItems = null;
    this.labels = []; // Nhãn 3D tách rời, luôn render trên top
    
    // ── Helper: lấy loại dụng cụ từ vesselId (hỗ trợ ID dạng beaker_0, flask_1, ...) ──
    this._getVesselType = (id) => {
      if (id.startsWith('beaker')) return 'beaker';
      if (id.startsWith('flask')) return 'flask';
      if (id.startsWith('testtube')) return 'testtube';
      return id;
    };

    // ── Nạp sẵn các model 3D thực tế của dụng cụ thí nghiệm ──
    this.beakerModel    = null;
    this.testTubeModel  = null;
    this.flaskModel     = null;
    this.phenolBottleModel  = null;
    this.phenolBottleMeshedModel = null;
    this.phenolPipetteModel = null;

    const loader = new GLTFLoader();

    // Helper: bật shadow + fix texture color space cho model GLB
    const enableShadows = (scene) => {
      scene.traverse(child => {
        if (child.isMesh) {
          child.castShadow    = true;
          child.receiveShadow = true;
          if (child.geometry) child.geometry.computeBoundingBox();
          if (child.material) {
            // Đảm bảo color textures dùng sRGB, non-color maps giữ nguyên Linear
            if (child.material.map) child.material.map.colorSpace = THREE.SRGBColorSpace;
            if (child.material.emissiveMap) child.material.emissiveMap.colorSpace = THREE.SRGBColorSpace;
            if (child.material.aoMap) child.material.aoMap.colorSpace = THREE.LinearSRGBColorSpace;
            if (child.material.roughnessMap) child.material.roughnessMap.colorSpace = THREE.LinearSRGBColorSpace;
            if (child.material.metalnessMap) child.material.metalnessMap.colorSpace = THREE.LinearSRGBColorSpace;
            if (child.material.normalMap) child.material.normalMap.colorSpace = THREE.LinearSRGBColorSpace;
            // Giữ texture filtering chất lượng cao
            [child.material.map, child.material.roughnessMap, child.material.metalnessMap,
             child.material.normalMap, child.material.aoMap, child.material.emissiveMap]
              .filter(Boolean)
              .forEach(tex => {
                tex.anisotropy = 4;
                tex.minFilter = THREE.LinearMipmapLinearFilter;
                tex.magFilter = THREE.LinearFilter;
                tex.generateMipmaps = true;
              });
            child.material.needsUpdate = true;
          }
        }
      });
    };

    // Helper kích hoạt rebuild lại workbench khi bất kỳ model nào tải xong
    const triggerRebuild = () => {
      if (this.lastSetupItems) {
        this.setupWorkbench(this.lastSetupItems);
      }
    };

    // Beaker — giữ material gốc (đã có texture chi tiết)
    loader.load(MODEL_URLS.beaker, (gltf) => {
      enableShadows(gltf.scene);
      this.beakerModel = gltf.scene;
      triggerRebuild();
    }, undefined, (err) => console.error('[ChemistryViewer] Lỗi tải beaker.glb:', err));

    loader.load(MODEL_URLS.glass_test_tube, (gltf) => {
      enableShadows(gltf.scene);
      this.testTubeModel = gltf.scene;
      triggerRebuild();
    }, undefined, (err) => console.error('[ChemistryViewer] Lỗi tải glass_test_tube.glb:', err));

    loader.load(MODEL_URLS.lab_flask, (gltf) => {
      enableShadows(gltf.scene);
      this.flaskModel = gltf.scene;
      triggerRebuild();
    }, undefined, (err) => console.error('[ChemistryViewer] Lỗi tải lab_flask.glb:', err));

    loader.load(MODEL_URLS.phenol_bottle, (gltf) => {
      enableShadows(gltf.scene);
      this.phenolBottleModel = gltf.scene;
      triggerRebuild();
    }, undefined, (err) => console.error('[ChemistryViewer] Lỗi tải phenol_bottle.glb:', err));

    loader.load(MODEL_URLS.phenol_body_bottle, (gltf) => {
      enableShadows(gltf.scene);
      this.phenolBodyModel = gltf.scene;
      triggerRebuild();
    }, undefined, () => {});

    loader.load(MODEL_URLS.phenol_pipette, (gltf) => {
      enableShadows(gltf.scene);
      this.phenolPipetteModel = gltf.scene;
      triggerRebuild();
    }, undefined, (err) => console.error('[ChemistryViewer] Lỗi tải phenol_pipette.glb:', err));

    loader.load(MODEL_URLS.phenol_bottle_meshed, (gltf) => {
      enableShadows(gltf.scene);
      this.phenolBottleMeshedModel = gltf.scene;
      triggerRebuild();
    }, undefined, (err) => console.error('[ChemistryViewer] Lỗi tải phenolphthalein bottle meshed:', err));



    this.initScene();
    this.initLights();
    this.initCameraControls();
    this.buildLaboratory();

    this.isActive = false;

    this._onMouseMove = this._handleMouseMove.bind(this);
    this._onMouseDown = this._handleMouseDown.bind(this);
    this._onMouseUp = this._handleMouseUp.bind(this);
    this._onResize = this._handleResize.bind(this);

    this.container.addEventListener('mousemove', this._onMouseMove);
    this.container.addEventListener('mousedown', this._onMouseDown);
    this.container.addEventListener('mouseup', this._onMouseUp);
    window.addEventListener('resize', this._onResize);

    // Touch support — map touch to mouse events
    this._onTouchStart = (e) => {
      if (!this.isActive) return;
      if (e.touches.length === 1) {
        const t = e.touches[0];
        this._handleMouseDown({ clientX: t.clientX, clientY: t.clientY });
      }
    };
    this._onTouchMove = (e) => {
      if (!this.isActive) return;
      if (e.touches.length === 1) {
        e.preventDefault();
        const t = e.touches[0];
        this._handleMouseMove({ clientX: t.clientX, clientY: t.clientY });
      }
    };
    this._onTouchEnd = (e) => {
      if (!this.isActive) return;
      const t = e.changedTouches[0];
      this._handleMouseUp({ clientX: t.clientX, clientY: t.clientY });
    };
    this.container.addEventListener('touchstart', this._onTouchStart, { passive: true });
    this.container.addEventListener('touchmove', this._onTouchMove, { passive: false });
    this.container.addEventListener('touchend', this._onTouchEnd, { passive: true });

    this._clock = new THREE.Clock();
    this._animate();
    this.isLoaded = true;
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a2332); // Nền tối xanh dương đậm kiểu phòng lab ban đêm
    this.scene.fog = new THREE.FogExp2(0x1a2332, 0.018);

    this.camera = new THREE.PerspectiveCamera(45, this.width / this.height, 0.1, 1000);
    this.camera.position.set(0, 3.2, 4.8);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: false });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.appendChild(this.renderer.domElement);

    // ── Environment Map dùng RoomEnvironment (chuẩn PBR của Three.js) ──
    // Giúp model có metalness/roughness/glass phản chiếu ánh sáng đúng cách
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    pmremGenerator.compileEquirectangularShader();
    this.scene.environment = pmremGenerator.fromScene(
      new RoomEnvironment(),
      0.04
    ).texture;
    // Giảm mức độ đóng góp của env map — tránh model bị overlit
    if ('environmentIntensity' in this.scene) {
      this.scene.environmentIntensity = 0.7;
    }
    pmremGenerator.dispose();

    // Hệ thống hạt bụi bay lơ lửng
    this._createLabParticles();
  }

  _createLabParticles() {
    const geo = new THREE.BufferGeometry();
    const count = 120;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 8;
      positions[i * 3 + 1] = Math.random() * 4;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 8;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0x7dd3fc, // Xanh nhạt hơn dễ thấy trên nền tối
      size: 0.018,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.labParticles = new THREE.Points(geo, mat);
    this.scene.add(this.labParticles);
  }

  initLights() {
    // Ambient nền tối — xanh lạnh nhẹ
    this.scene.add(new THREE.AmbientLight(0xb0c4de, 0.35));

    // Đèn trần chính — giảm intensity để không overlit model
    const ceilingLight = new THREE.DirectionalLight(0xfff8f0, 0.9);
    ceilingLight.position.set(1, 8, 4);
    ceilingLight.castShadow = true;
      ceilingLight.shadow.mapSize.width  = 4096;
      ceilingLight.shadow.mapSize.height = 4096;
    ceilingLight.shadow.camera.near   = 0.5;
    ceilingLight.shadow.camera.far    = 20;
    ceilingLight.shadow.camera.left   = -5;
    ceilingLight.shadow.camera.right  =  5;
    ceilingLight.shadow.camera.top    =  5;
    ceilingLight.shadow.camera.bottom = -5;
    ceilingLight.shadow.bias = -0.0003;
    this.scene.add(ceilingLight);

    // Fill từ phía người nhìn — rất nhẹ, chỉ đủ thấy mặt trước
    const frontFill = new THREE.DirectionalLight(0xc8d8f0, 0.25);
    frontFill.position.set(0, 2, 6);
    this.scene.add(frontFill);

    // Rim từ phía sau — tạo outline mỏng trên thủy tinh
    const rimLight = new THREE.DirectionalLight(0x5eadd4, 0.4);
    rimLight.position.set(0, 5, -5);
    this.scene.add(rimLight);
  }

  initCameraControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxDistance = 10;
    this.controls.minDistance = 1.8;
    this.controls.target.set(0, 0.2, 0);
    
    // Giới hạn góc nhìn thẳng xuống bàn không cho đi dưới bàn
    this.controls.maxPolarAngle = Math.PI / 2 - 0.05;
  }

  // Dựng 3D Bàn thí nghiệm và các thiết bị thủ công bằng Three.js geometries
  buildLaboratory() {
    this.labGroup = new THREE.Group();
    this.scene.add(this.labGroup);

    // ── Sàn phòng lab tối ──
    const floorGeo = new THREE.PlaneGeometry(14, 14);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0d1520,
      roughness: 0.8,
      metalness: 0.05
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2.15;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // ── Tường phía sau tối ──
    const wallGeo = new THREE.PlaneGeometry(14, 6);
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.9
    });
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.set(0, 0.8, -4.5);
    this.scene.add(wall);

    // Không dùng SpotLight — tránh tạo vùng sáng chói trên mặt bàn

    // 1. Mặt bàn thí nghiệm — màu xanh đậm sang trọng
    const tableGeo = new THREE.BoxGeometry(4.5, 0.15, 2.5);
    const tableMat = new THREE.MeshPhysicalMaterial({
      color: 0x1e3a5f,
      roughness: 0.35,
      metalness: 0.05,
      clearcoat: 0.25,
      clearcoatRoughness: 0.3
    });
    const table = new THREE.Mesh(tableGeo, tableMat);
    table.position.y = -0.075;
    table.receiveShadow = true;
    table.castShadow = true;
    this.labGroup.add(table);

    // Chân bàn inox
    const legGeo = new THREE.CylinderGeometry(0.06, 0.06, 2.0, 16);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.12 });
    const legPositions = [
      [-2.1, -1.075, -1.1],
      [ 2.1, -1.075, -1.1],
      [-2.1, -1.075,  1.1],
      [ 2.1, -1.075,  1.1]
    ];
    legPositions.forEach(([x, y, z]) => {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(x, y, z);
      leg.castShadow = true;
      this.labGroup.add(leg);
    });

    // 2. Tấm kính frosted phía sau — mờ dịu hòa với nền tối
    const backGeo = new THREE.PlaneGeometry(4.5, 1.5);
    const backMat = new THREE.MeshPhysicalMaterial({
      color: 0x1e3a5f,
      roughness: 0.25,
      transmission: 0.5,
      ior: 1.5,
      thickness: 0.08,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    });
    const back = new THREE.Mesh(backGeo, backMat);
    back.position.set(0, 0.75, -1.24);
    this.labGroup.add(back);

    // 3. Giá đỡ ống nghiệm
    this._buildTestTubeRack();
  }

  _buildTestTubeRack() {
    this.rackGroup = new THREE.Group();
    this.rackGroup.position.set(-0.8, 0.075, 0); // Vị trí góc bên trái bàn

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.4 }); // Gỗ đỏ cam đánh bóng nhẵn mịn hơn

    // Đế giá đỡ
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.04, 0.25), woodMat);
    base.receiveShadow = true;
    base.castShadow = true;
    this.rackGroup.add(base);

    // Thanh trên của giá có khoét lỗ (đại diện bằng thanh phẳng mỏng)
    const topPlate = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.03, 0.25), woodMat);
    topPlate.position.y = 0.28;
    topPlate.receiveShadow = true;
    topPlate.castShadow = true;
    this.rackGroup.add(topPlate);

    // Cột chống 2 bên giá đỡ
    const pillarGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.28, 8);
    const p1 = new THREE.Mesh(pillarGeo, woodMat);
    p1.position.set(-0.37, 0.14, 0);
    p1.castShadow = true;
    const p2 = p1.clone();
    p2.position.x = 0.37;
    this.rackGroup.add(p1);
    this.rackGroup.add(p2);

    this.labGroup.add(this.rackGroup);
  }

  // Khởi tạo/nạp các dụng cụ và hóa chất đã chọn lên bàn thí nghiệm
  setupWorkbench(selectedItems) {
    this.lastSetupItems = selectedItems;
    // Xóa các dụng cụ cũ trước
    for (const key in this.vessels) {
      if (this.vessels[key]) {
        this.labGroup.remove(this.vessels[key]);
      }
    }
    this.vessels = {};
    this.selectedVesselId = null;

    // Dọn nhãn cũ
    this.labels.forEach(l => this.labGroup.remove(l));
    this.labels = [];

    // Vị trí cố định cho từng loại dụng cụ trên bàn thí nghiệm
    const positions = {
      beaker:   new THREE.Vector3(0.3,  0.075,  0.2),   // Cốc ở giữa-phải
      flask:    new THREE.Vector3(1.1,  0.075, -0.1),   // Bình tam giác bên phải
      burner:   new THREE.Vector3(-0.3, 0.075, -0.3),   // Đèn cồn trái-sâu
      testtube: new THREE.Vector3(-0.8, 0.075,  0)      // Ống nghiệm trong giá đỡ
    };

    // Kiểm tra xem người dùng có chọn dụng cụ tương ứng hay không
    const getTool = (toolId) => selectedItems.find(i => i.id === toolId && i.category === 'Tool');
    const hasTool = (toolId) => !!getTool(toolId);

    // Thu thập hóa chất theo vesselId
    const chemsByVessel = {};
    selectedItems.forEach(item => {
      if (item.category === 'Chemical' && item.id !== 'phenol') {
        const vId = item.vesselId || 'beaker';
        if (!chemsByVessel[vId]) chemsByVessel[vId] = [];
        chemsByVessel[vId].push(item);
      }
    });

    // 1. Tạo Đèn cồn nếu có chọn
    if (hasTool('burner')) {
      const burnerGroup = this._createBurnerMesh();
      burnerGroup.position.copy(positions.burner);
      this.labGroup.add(burnerGroup);
      this.vessels['burner'] = burnerGroup;
    }

    // 2. Tạo Cốc Thủy Tinh — theo số lượng tool HOẶC tự tạo nếu có hóa chất mà thiếu tool
    const beakerTool = getTool('beaker');
    const beakerCount = beakerTool ? (beakerTool.quantity || 1) : (chemsByVessel['beaker'] ? Math.max(1, chemsByVessel['beaker'].length) : 0);
    for (let i = 0; i < beakerCount; i++) {
      const key = `beaker_${i}`;
      const beakerGroup = this._createBeakerMesh(null, i + 1, beakerCount);
      const offsetX = (i - (beakerCount - 1) / 2) * 0.4;
      beakerGroup.position.set(positions.beaker.x + offsetX, positions.beaker.y, positions.beaker.z);
      this.labGroup.add(beakerGroup);
      this.vessels[key] = beakerGroup;
    }

    // 3. Tạo Bình Tam Giác
    const flaskTool = getTool('flask');
    const flaskCount = flaskTool ? (flaskTool.quantity || 1) : (chemsByVessel['flask'] ? Math.max(1, chemsByVessel['flask'].length) : 0);
    for (let i = 0; i < flaskCount; i++) {
      const key = `flask_${i}`;
      const flaskGroup = this._createFlaskMesh(null, i + 1, flaskCount);
      const offsetX = (i - (flaskCount - 1) / 2) * 0.45;
      flaskGroup.position.set(positions.flask.x + offsetX, positions.flask.y, positions.flask.z);
      this.labGroup.add(flaskGroup);
      this.vessels[key] = flaskGroup;
    }

    // 4. Tạo Ống Nghiệm
    const tubeTool = getTool('testtube');
    const tubeCount = tubeTool ? (tubeTool.quantity || 1) : (chemsByVessel['testtube'] ? Math.max(1, chemsByVessel['testtube'].length) : 0);
    for (let i = 0; i < tubeCount; i++) {
      const key = `testtube_${i}`;
      const tubeGroup = this._createTestTubeMesh(null, i + 1, tubeCount);
      const offsetX = (i - (tubeCount - 1) / 2) * 0.15;
      tubeGroup.position.set(-0.8 + offsetX, 0.22, 0);
      this.labGroup.add(tubeGroup);
      this.vessels[key] = tubeGroup;
    }

    // 5. Phân bổ hóa chất vào các vessel đã tạo (round-robin theo vesselId)
    for (const vType in chemsByVessel) {
      const chems = chemsByVessel[vType];
      let vesselIdx = 0;
      // Tìm các vessel key theo type
      const vesselKeys = Object.keys(this.vessels).filter(k => k.startsWith(vType));
      chems.forEach(chem => {
        const key = vesselKeys[vesselIdx % vesselKeys.length];
        const vessel = this.vessels[key];
        vesselIdx++;
        if (!vessel) return;
        // Thêm dung dịch vào vessel
        const vType2 = this._getVesselType(key);
        const radTop = vType2 === 'beaker' ? 0.14 : vType2 === 'flask' ? 0.06 : 0.02;
        const radBot = vType2 === 'beaker' ? 0.14 : vType2 === 'flask' ? 0.13 : 0.02;
        const liqHeight = vType2 === 'testtube' ? 0.12 : 0.21;
        const liqY = vType2 === 'beaker' ? 0.115 : vType2 === 'flask' ? 0.11 : 0.1;
        const liquid = this._createLiquidGroup(chem, radTop, radBot, liqHeight, vType2 === 'testtube' ? 24 : 32);
        liquid.position.y = liqY;
        vessel.add(liquid);
        vessel.userData.chemical = { ...chem };
        vessel.userData.pH = chem.id === 'hcl' ? 1.0 : chem.id === 'naoh' ? 14.0 : chem.id === 'cuso4' ? 4.0 : chem.id === 'na2co3' ? 11.5 : 7.0;
        vessel.userData.title = `${vessel.userData.title.split(' (')[0]} (${chem.symbol})`;
        // Nhãn phía trên, mũi tên chỉ xuống
        const label = this._createLabel(chem.symbol, chem.color);
        const labelOffset = new THREE.Vector3(0, vType2 === 'beaker' ? 0.58 : vType2 === 'flask' ? 0.75 : 0.6, 0);
        label.position.copy(vessel.position).add(labelOffset);
        label.userData.followVessel = key;
        label.userData.offset = labelOffset;
        this.labGroup.add(label);
        this.labels.push(label);
      });
    }

    // 5. Hiển thị bộ phenolphthalein nếu người dùng chọn hóa chất phenol
    const hasPhenol = selectedItems.some(i => i.category === 'Chemical' && i.id === 'phenol');
    if (hasPhenol) {
      const phenolItem = selectedItems.find(i => i.id === 'phenol');
      const phenolSet = this._createPhenolSetMesh();
      phenolSet.position.set(1.55, 0.075, -0.55);
      // Gắn nhãn
      this.labGroup.add(phenolSet);
      this.vessels['phenol_set'] = phenolSet;
      // Nhãn tách rời
      const label = this._createLabel('PhPh', phenolItem.color);
      label.position.copy(phenolSet.position).add(new THREE.Vector3(0, 0.45, 0));
      label.userData.followVessel = 'phenol_set';
      label.userData.offset = new THREE.Vector3(0, 0.45, 0);
      this.labGroup.add(label);
      this.labels.push(label);
    }

    // Cập nhật lại các chỉ số Telemetry khi có thay đổi bàn thí nghiệm
    this.updateTelemetry();
    if (this.onWorkbenchRebuilt) {
      this.onWorkbenchRebuilt();
    }
  }

  // --- DỰNG MÔ HÌNH DỤNG CỤ VÀ DUNG DỊCH (PROCEDURAL MESHES) ---

  // Tạo nhãn Plane cố định phía trên dụng cụ, có mũi tên chỉ xuống
  _createLabel(text, color = '#a5f3fc') {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');

    // Hộp nhãn bo góc (phía trên)
    const r = 12;
    ctx.beginPath();
    ctx.moveTo(8 + r, 4);
    ctx.lineTo(248 - r, 4);
    ctx.quadraticCurveTo(248, 4, 248, 4 + r);
    ctx.lineTo(248, 56 - r);
    ctx.quadraticCurveTo(248, 56, 248 - r, 56);
    ctx.lineTo(8 + r, 56);
    ctx.quadraticCurveTo(8, 56, 8, 56 - r);
    ctx.lineTo(8, 4 + r);
    ctx.quadraticCurveTo(8, 4, 8 + r, 4);
    ctx.closePath();
    ctx.fillStyle = 'rgba(10, 15, 25, 0.92)';
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Mũi tên tam giác chỉ xuống dưới
    ctx.beginPath();
    ctx.moveTo(128, 56);
    ctx.lineTo(112, 72);
    ctx.lineTo(144, 72);
    ctx.closePath();
    ctx.fillStyle = 'rgba(10, 15, 25, 0.92)';
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Text
    ctx.font = 'bold 26px "Segoe UI", "Arial", sans-serif';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 30);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.colorSpace = THREE.SRGBColorSpace;

    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    // Plane tỷ lệ 256:96, arrow phía dưới
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.18), mat);
    plane.renderOrder = 9999;
    return plane;
  }

  // Làm kính GLB trong suốt nhẹ để thấy dung dịch (chỉ chỉnh opacity, giữ PBR)
  _makeGlassVisible(group) {
    group.traverse(child => {
      if (child.isMesh && child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach(mat => {
          const op = mat.opacity ?? 1.0;
          if (op >= 0.8) {
            mat.transparent = true;
            mat.opacity = 0.85;
            mat.needsUpdate = true;
          }
        });
      }
    });
  }

  // Helper căn giữa, căn đáy và scale model 3D thực tế
  _alignAndScaleModel(model, targetHeight) {
    // Reset transform trước
    model.scale.setScalar(1);
    model.position.set(0, 0, 0);
    model.rotation.set(0, 0, 0);

    // Tính kích thước gốc
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    // Scale
    const scaleFactor = targetHeight / maxDim;
    model.scale.setScalar(scaleFactor);

    // Tính bounding box mới sau khi scale để tìm tâm hình học thật
    const box2 = new THREE.Box3().setFromObject(model);
    const center = new THREE.Vector3();
    box2.getCenter(center);

    // Căn giữa X, Z, đáy nằm trên Y = 0
    model.position.x = -center.x;
    model.position.y = -box2.min.y;
    model.position.z = -center.z;
  }

  // Thủy tinh khúc xạ mờ ảo bóng lộn
  _getGlassMaterial() {
    return new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.05,
      metalness: 0.1,
      transmission: 0.95, // độ xuyên sáng
      ior: 1.5, // chỉ số khúc xạ thủy tinh
      thickness: 0.02, // độ dày lớp thủy tinh
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide
    });
  }

  // Shader cho mặt thoáng chất lỏng (meniscus, fresnel, specular)
  _createLiquidSurfaceMaterial(chemical) {
    const color = new THREE.Color(chemical.color);
    const isPhenol = chemical.id === 'phenol';

    return new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: color },
        uOpacity: { value: isPhenol ? 0.35 : 0.9 },
        uTime: { value: 0 }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          vViewPosition = -mvPos.xyz;
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uOpacity;
        uniform float uTime;
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        varying vec2 vUv;

        void main() {
          vec3 viewDir = normalize(vViewPosition);
          vec3 normal = normalize(vNormal);

          // Fresnel - phản chiếu mạnh ở viền
          float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 4.0);

          // Specular highlight
          vec3 lightDir = normalize(vec3(0.5, 1.0, 0.3));
          vec3 halfDir = normalize(lightDir + viewDir);
          float spec = pow(max(dot(normal, halfDir), 0.0), 128.0);

          // Meniscus - viền cong do sức căng bề mặt
          float dist = length(vUv - 0.5) * 2.0;
          float meniscus = smoothstep(0.7, 1.0, dist) * 0.3;

          // Gợn sóng nhẹ
          float ripple = sin(vUv.x * 20.0 + uTime * 2.0) * cos(vUv.y * 20.0 + uTime * 1.5) * 0.02;

          vec3 baseColor = uColor * (0.85 + ripple);
          vec3 finalColor = baseColor + vec3(1.0) * spec * 0.5 + vec3(0.85, 0.9, 1.0) * fresnel * 0.4 + meniscus * uColor;

          gl_FragColor = vec4(finalColor, uOpacity + fresnel * 0.2);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false
    });
  }

  // Shader cho thân chất lỏng (trong suốt, hấp thụ màu theo độ sâu)
  _createLiquidBodyMaterial(chemical) {
    const color = new THREE.Color(chemical.color);
    const isPhenol = chemical.id === 'phenol';

    return new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: color },
        uOpacity: { value: isPhenol ? 0.12 : 0.35 }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        varying float vFresnel;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          vViewPosition = -mvPos.xyz;
          vec3 viewDir = normalize(vViewPosition);
          vFresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), 2.0);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uOpacity;
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        varying float vFresnel;

        void main() {
          vec3 viewDir = normalize(vViewPosition);
          vec3 normal = normalize(vNormal);

          // Specular nhẹ trên thân
          vec3 lightDir = normalize(vec3(0.5, 1.0, 0.3));
          vec3 halfDir = normalize(lightDir + viewDir);
          float spec = pow(max(dot(normal, halfDir), 0.0), 64.0) * 0.3;

          // Màu đậm hơn ở viền (Fresnel absorption)
          vec3 finalColor = uColor * (0.7 + vFresnel * 0.3) + vec3(1.0) * spec;
          float alpha = uOpacity + vFresnel * 0.15;

          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false
    });
  }

  // Helper: cập nhật màu chất lỏng (shader material) trên một vessel
  _setLiquidColor(vessel, hexColor) {
    const liq = vessel.getObjectByName('liquid');
    if (!liq) return;
    const color = new THREE.Color(hexColor);
    const body = liq.getObjectByName('liquid_body');
    const surface = liq.getObjectByName('liquid_surface');
    if (body && body.material.uniforms) body.material.uniforms.uColor.value.copy(color);
    if (surface && surface.material.uniforms) surface.material.uniforms.uColor.value.copy(color);
  }

  // Helper: lấy mesh chất lỏng (group) từ vessel
  _getLiquidGroup(vessel) {
    return vessel.getObjectByName('liquid');
  }

  // Tạo nhóm chất lỏng gồm: thân (open cylinder) + mặt thoáng (disc)
  _createLiquidGroup(chemical, radiusTop, radiusBot, height, segments) {
    const group = new THREE.Group();
    group.name = 'liquid';

    // Thân chất lỏng - open cylinder (không nắp trên/dưới)
    const bodyGeo = new THREE.CylinderGeometry(radiusTop, radiusBot, height, segments, 1, true);
    const bodyMat = this._createLiquidBodyMaterial(chemical);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.name = 'liquid_body';
    group.add(body);

    // Mặt thoáng - disc ở trên
    const surfaceGeo = new THREE.CircleGeometry(radiusTop, segments);
    const surfaceMat = this._createLiquidSurfaceMaterial(chemical);
    const surface = new THREE.Mesh(surfaceGeo, surfaceMat);
    surface.name = 'liquid_surface';
    surface.rotation.x = -Math.PI / 2;
    surface.position.y = height / 2;
    group.add(surface);

    return group;
  }

  // Vật liệu dung dịch cũ (giữ lại để tương thích)
  _createLiquidMaterial(chemical) {
    const isPhenol = chemical.id === 'phenol';
    const color = new THREE.Color(chemical.color);
    return new THREE.MeshPhysicalMaterial({
      color: color,
      roughness: 0.05,
      metalness: 0.0,
      transmission: isPhenol ? 0.95 : 0.85,
      ior: 1.33,
      thickness: 0.5,
      transparent: true,
      opacity: isPhenol ? 0.25 : 0.9,
      attenuationColor: color,
      attenuationDistance: isPhenol ? 0.3 : 0.8,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      side: THREE.DoubleSide
    });
  }

  // Tạo cốc mỏ thủy tinh
  _createBeakerMesh(chemical, idx = 1, total = 1) {
    const group = new THREE.Group();
    group.name = 'beaker';
    const label = total > 1 ? `Cốc #${idx}` : 'Cốc thủy tinh';
    const title = chemical ? `${label} (${chemical.symbol})` : `${label} (rỗng)`;
    group.userData = {
      type: 'beaker',
      title: title,
      chemical: chemical ? { ...chemical } : null,
      temp: 298.15,
      pH: chemical ? (chemical.id === 'hcl' ? 1.0 : chemical.id === 'naoh' ? 14.0 : chemical.id === 'cuso4' ? 4.0 : chemical.id === 'na2co3' ? 11.5 : 7.0) : 7.0,
      hasPhenol: false
    };

    if (this.beakerModel) {
      // Sử dụng mô hình 3D Beaker thực tế
      const modelClone = this.beakerModel.clone();
      this._alignAndScaleModel(modelClone, 0.45);
      this._makeGlassVisible(modelClone);
      group.add(modelClone);
    } else {
      // Dự phòng bằng procedural mesh cốc thủy tinh
      const glassMat = this._getGlassMaterial();
      const bodyGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.45, 24, 1, true);
      const body = new THREE.Mesh(bodyGeo, glassMat);
      body.position.y = 0.225;
      body.castShadow = true;
      group.add(body);
      const bottomGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.01, 24);
      const bottom = new THREE.Mesh(bottomGeo, glassMat);
      bottom.position.y = 0.005;
      group.add(bottom);
    }

    // Chất lỏng bên trong cốc - tách thân + mặt thoáng
    if (chemical) {
      const liquid = this._createLiquidGroup(chemical, 0.14, 0.14, 0.22, 32);
      liquid.position.y = 0.115;
      group.add(liquid);
    }

    return group;
  }

  // Tạo bình tam giác
  _createFlaskMesh(chemical, idx = 1, total = 1) {
    const group = new THREE.Group();
    group.name = 'flask';
    const label = total > 1 ? `Bình #${idx}` : 'Bình tam giác';
    const title = chemical ? `${label} (${chemical.symbol})` : `${label} (rỗng)`;
    group.userData = {
      type: 'flask',
      title: title,
      chemical: chemical ? { ...chemical } : null,
      temp: 298.15,
      pH: chemical ? (chemical.id === 'hcl' ? 1.0 : chemical.id === 'naoh' ? 14.0 : chemical.id === 'cuso4' ? 4.0 : chemical.id === 'na2co3' ? 11.5 : 7.0) : 7.0,
      hasPhenol: false
    };

    if (this.flaskModel) {
      // ── Model 3D thực tế của bình tam giác ──
      const modelClone = this.flaskModel.clone();
      this._alignAndScaleModel(modelClone, 0.58);
      this._makeGlassVisible(modelClone);
      group.add(modelClone);
    } else {
      // Dự phòng procedural
      const glassMat = this._getGlassMaterial();
      const bodyGeo = new THREE.CylinderGeometry(0.07, 0.22, 0.46, 24, 1, true);
      const body = new THREE.Mesh(bodyGeo, glassMat);
      body.position.y = 0.23; body.castShadow = true;
      group.add(body);
      const neckGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.1, 24, 1, true);
      const neck = new THREE.Mesh(neckGeo, glassMat);
      neck.position.y = 0.51;
      group.add(neck);
      const bottomGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.01, 24);
      const bottom = new THREE.Mesh(bottomGeo, glassMat);
      bottom.position.y = 0.005;
      group.add(bottom);
    }

    // Chất lỏng bên trong bình tam giác - tách thân + mặt thoáng
    if (chemical) {
      const liquid = this._createLiquidGroup(chemical, 0.06, 0.13, 0.21, 32);
      liquid.position.y = 0.11;
      group.add(liquid);
    }

    return group;
  }

  // Tạo ống nghiệm
  _createTestTubeMesh(chemical, idx = 1, total = 1) {
    const group = new THREE.Group();
    group.name = 'testtube';
    const label = total > 1 ? `Ống #${idx}` : 'Ống nghiệm';
    const title = chemical ? `${label} (${chemical.symbol})` : `${label} (rỗng)`;
    group.userData = {
      type: 'testtube',
      title: title,
      chemical: chemical ? { ...chemical } : null,
      temp: 298.15,
      pH: chemical ? (chemical.id === 'hcl' ? 1.0 : chemical.id === 'naoh' ? 14.0 : chemical.id === 'cuso4' ? 4.0 : chemical.id === 'na2co3' ? 11.5 : 7.0) : 7.0,
      hasPhenol: false
    };

    if (this.testTubeModel) {
      // ── Model 3D thực tế của ống nghiệm ──
      const modelClone = this.testTubeModel.clone();
      this._alignAndScaleModel(modelClone, 0.45);
      this._makeGlassVisible(modelClone);
      group.add(modelClone);
    } else {
      // Dự phòng procedural
      const glassMat = this._getGlassMaterial();
      const bodyGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.4, 16, 1, true);
      const body = new THREE.Mesh(bodyGeo, glassMat);
      body.position.y = 0.2; body.castShadow = true;
      group.add(body);
      const bottomGeo = new THREE.SphereGeometry(0.05, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
      const bottom = new THREE.Mesh(bottomGeo, glassMat);
      bottom.position.y = 0.0; bottom.rotation.x = Math.PI;
      group.add(bottom);
    }

    // Chất lỏng trong ống nghiệm - tách thân + mặt thoáng
    if (chemical) {
      const liquid = this._createLiquidGroup(chemical, 0.02, 0.02, 0.12, 24);
      liquid.position.y = 0.1;
      group.add(liquid);
    }

    return group;
  }

  // Tạo bộ phenolphthalein: thân chai + nắp ống nhỏ giọt
  // Dùng phenol_bottle.glb làm thước đo chuẩn để canh tỉ lệ và vị trí
  _createPhenolSetMesh() {
    const group = new THREE.Group();
    group.name = 'phenol_set';
    group.userData = { type: 'phenol_set', title: 'Bộ Phenolphthalein' };

    // Lấy kích thước tham chiếu từ phenol_bottle.glb
    let refHeight = 0.7;
    let refBodyH = 0.5;
    if (this.phenolBottleModel) {
      const refBox = new THREE.Box3().setFromObject(this.phenolBottleModel);
      refHeight = refBox.max.y - refBox.min.y;
      refBodyH = refHeight * 0.78;
    }

    // ---- Thân chai: ưu tiên model meshed mới, fallback về body riêng ----
    const bottleGroup = new THREE.Group();
    bottleGroup.name = 'bottle';

    const useMeshedModel = () => {
      const modelClone = this.phenolBottleMeshedModel.clone();
      modelClone.updateWorldMatrix(true, true);
      modelClone.traverse(child => {
        if (child.isMesh) {
          child.geometry = child.geometry.clone();
          child.geometry.applyMatrix4(child.matrixWorld);
          child.geometry.computeVertexNormals();
          child.geometry.computeBoundingBox();
          child.geometry.computeBoundingSphere();
          child.position.set(0, 0, 0);
          child.rotation.set(0, 0, 0);
          child.scale.set(1, 1, 1);
          child.castShadow = true;
          child.receiveShadow = true;
          if (child.material) {
            if (child.material.map) child.material.map.colorSpace = THREE.SRGBColorSpace;
            if (child.material.emissiveMap) child.material.emissiveMap.colorSpace = THREE.SRGBColorSpace;
            child.material.needsUpdate = true;
          }
        }
      });
      modelClone.position.set(0, 0, 0);
      modelClone.rotation.set(0, 0, 0);
      modelClone.scale.set(1, 1, 1);
      this._alignAndScaleModel(modelClone, refBodyH);
      bottleGroup.add(modelClone);
    };

    if (this.phenolBottleMeshedModel) {
      useMeshedModel();
    } else if (this.phenolBodyModel) {
      const modelClone = this.phenolBodyModel.clone();
      modelClone.updateWorldMatrix(true, true);
      modelClone.traverse(child => {
        if (child.isMesh) {
          child.geometry = child.geometry.clone();
          child.geometry.applyMatrix4(child.matrixWorld);
          child.geometry.computeVertexNormals();
          child.geometry.computeBoundingBox();
          child.geometry.computeBoundingSphere();
          child.position.set(0, 0, 0);
          child.rotation.set(0, 0, 0);
          child.scale.set(1, 1, 1);
          child.castShadow = true;
          child.receiveShadow = true;
          if (child.material) {
            if (child.material.map) child.material.map.colorSpace = THREE.SRGBColorSpace;
            if (child.material.emissiveMap) child.material.emissiveMap.colorSpace = THREE.SRGBColorSpace;
            child.material.needsUpdate = true;
          }
        }
      });
      modelClone.position.set(0, 0, 0);
      modelClone.rotation.set(0, 0, 0);
      modelClone.scale.set(1, 1, 1);
      this._alignAndScaleModel(modelClone, refBodyH);
      bottleGroup.add(modelClone);
    } else {
      const glassMat = new THREE.MeshPhysicalMaterial({
        color: 0xd97706, roughness: 0.1, metalness: 0.0,
        transmission: 0.55, ior: 1.5, thickness: 0.03,
        transparent: true, opacity: 0.75
      });
      const bodyGeo = new THREE.CylinderGeometry(0.055, 0.06, 0.3, 16);
      const body = new THREE.Mesh(bodyGeo, glassMat);
      body.position.y = 0.15; body.castShadow = true;
      bottleGroup.add(body);
      const neckGeo = new THREE.CylinderGeometry(0.025, 0.055, 0.06, 16);
      const neck = new THREE.Mesh(neckGeo, glassMat);
      neck.position.y = 0.31;
      bottleGroup.add(neck);
    }
    group.add(bottleGroup);

    // ---- Nắp ống nhỏ giọt — ẩn, chỉ hiện khi animation nhỏ giọt ----
    const pipetteGroup = new THREE.Group();
    pipetteGroup.name = 'pipette';
    pipetteGroup.userData = { type: 'phenol_pipette', title: 'Ống nhỏ giọt' };
    pipetteGroup.visible = false; // Ẩn khỏi chai, chỉ hiện khi bay ra nhỏ giọt

    const blackMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.7, metalness: 0.1 });
    const grayTubeMat = new THREE.MeshPhysicalMaterial({
      color: 0x888888, roughness: 0.3, metalness: 0.0,
      transmission: 0.6, ior: 1.4, thickness: 0.01,
      transparent: true, opacity: 0.7
    });

    // Nắp vặn đen (có rãnh)
    const capGeo = new THREE.CylinderGeometry(0.045, 0.048, 0.06, 16);
    const cap = new THREE.Mesh(capGeo, blackMat);
    cap.position.y = 0.03;
    cap.castShadow = true;
    pipetteGroup.add(cap);

    // Tạo rãnh nắp vặn bằng các vòng tròn mỏng
    for (let i = 0; i < 8; i++) {
      const ridgeGeo = new THREE.TorusGeometry(0.046, 0.002, 4, 16);
      const ridge = new THREE.Mesh(ridgeGeo, blackMat);
      ridge.position.y = 0.01 + i * 0.006;
      ridge.rotation.x = Math.PI / 2;
      pipetteGroup.add(ridge);
    }

    // Ống xám (phần hút thuốc)
    const tubeGeo = new THREE.CylinderGeometry(0.015, 0.018, 0.12, 12);
    const tube = new THREE.Mesh(tubeGeo, grayTubeMat);
    tube.position.y = 0.12;
    tube.castShadow = true;
    pipetteGroup.add(tube);

    // Bầu cao su đen (hình ellipsoid)
    const bulbGeo = new THREE.SphereGeometry(0.04, 12, 10);
    const bulb = new THREE.Mesh(bulbGeo, blackMat);
    bulb.position.y = 0.22;
    bulb.scale.set(1, 1.3, 1); // Kéo dài theo Y
    bulb.castShadow = true;
    pipetteGroup.add(bulb);

    // Đầu nhọn ống nhỏ giọt
    const tipGeo = new THREE.CylinderGeometry(0.005, 0.015, 0.04, 10);
    const tip = new THREE.Mesh(tipGeo, grayTubeMat);
    tip.position.y = -0.02;
    tip.castShadow = true;
    pipetteGroup.add(tip);

    // Đặt nắp ngay tại miệng chai
    const bottleBox = new THREE.Box3().setFromObject(bottleGroup);
    pipetteGroup.position.set(0, bottleBox.max.y - 0.03, 0);
    group.add(pipetteGroup);

    return group;
  }

  // Tạo đèn cồn Bunsen
  _createBurnerMesh() {
    const group = new THREE.Group();
    group.name = 'burner';
    group.userData = { type: 'burner', title: 'Đèn cồn Bunsen' };

    const metalMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.2, metalness: 0.8 }); // Nhôm bóng
    const capMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4 }); // Nắp màu đỏ

    // Thân/bình đèn cồn dẹt tròn
    const bodyGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.16, 16);
    const body = new THREE.Mesh(bodyGeo, metalMat);
    body.position.y = 0.08;
    body.castShadow = true;
    group.add(body);

    // Vòi đồng chĩa lên cao
    const neckGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.12, 8);
    const neck = new THREE.Mesh(neckGeo, new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.7 })); // Đồng thau
    neck.position.y = 0.22;
    group.add(neck);

    // Khấc chặn kim loại
    const rimGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.02, 8);
    const rim = new THREE.Mesh(rimGeo, metalMat);
    rim.position.y = 0.17;
    group.add(rim);

    // Tạo bấc đèn lò thò ra (sợi nhỏ trắng)
    const wickGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.04, 8);
    const wickMat = new THREE.MeshBasicMaterial({ color: 0xd1d5db });
    const wick = new THREE.Mesh(wickGeo, wickMat);
    wick.position.y = 0.29;
    group.add(wick);

    return group;
  }

  // --- HỆ THỐNG HẠT VÀ HIỆU ỨNG TÁC HÌNH (PARTICLE SYSTEMS) ---

  // Bật/Tắt lửa đèn cồn
  toggleBurner() {
    if (!this.vessels['burner']) return;
    this.isBurnerLit = !this.isBurnerLit;

    if (this.isBurnerLit) {
      // 1. Tạo ngọn lửa bằng các Points bập bùng
      const pCount = 50;
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(pCount * 3);
      for (let i = 0; i < pCount; i++) {
        pos[i * 3] = (Math.random() - 0.5) * 0.04;
        pos[i * 3 + 1] = 0.3 + Math.random() * 0.2; // Cao hơn bấc đèn cồn ( wick ở Y=0.29 )
        pos[i * 3 + 2] = (Math.random() - 0.5) * 0.04;
      }
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      
      const mat = new THREE.PointsMaterial({
        color: 0xf97316, // Màu cam rực
        size: 0.04,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      this.flameParticles = new THREE.Points(geo, mat);
      this.vessels['burner'].add(this.flameParticles);
      this.heatTarget = 373.15; // Nóng lên khi đốt lửa (~100 độ C)

      if (this.onReactionTrigger) {
        this.onReactionTrigger("Đã châm đèn cồn. Hệ thống gia nhiệt bắt đầu hoạt động.");
      }
    } else {
      // Tắt lửa
      if (this.flameParticles) {
        this.vessels['burner'].remove(this.flameParticles);
        this.flameParticles = null;
      }
      this.heatTarget = 298.15; // Trở về nhiệt độ phòng 25 độ C

      if (this.onReactionTrigger) {
        this.onReactionTrigger("Đèn cồn đã tắt. Hệ thống đang nguội dần.");
      }
    }
  }

  // Hoạt cảnh rót chất lỏng (Pouring Animation) — mượt với easing + delta time
  pourVessel(sourceId, targetId, onComplete) {
    const source = this.vessels[sourceId];
    const target = this.vessels[targetId];
    if (!source || !target) return;

    if (this._pouring) return; // Chỉ rót 1 lần cùng lúc
    this._pouring = true;

    const origPos = source.position.clone();
    const origRot = source.rotation.clone();

    const srcType = this._getVesselType(sourceId);
    const tgtType = this._getVesselType(targetId);
    const targetLipHeight = tgtType === 'beaker' ? 0.45 : tgtType === 'flask' ? 0.52 : 0.4;
    // Đặt source trực tiếp trên miệng target (không lệch X)
    const destPos = target.position.clone().add(new THREE.Vector3(0, targetLipHeight + 0.15, 0));
    // Hướng nghiêng: dựa trên vị trí gốc của source so với target
    const tiltDir = (origPos.x >= target.position.x) ? -1 : 1;

    // Easing mượt
    const easeInOut = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const easeOut = (t) => 1 - Math.pow(1 - t, 3);

    const phase1 = 0.5;  // giây — bay lên + nghiêng
    const phase2 = 1.2;  // giây — rót
    const phase3 = 0.5;  // giây — quay về
    const totalTime = phase1 + phase2 + phase3;

    let elapsed = 0;
    let pourStream = null;
    const clock = new THREE.Clock();

    const chemColor = source.userData.chemical ? source.userData.chemical.color : '#a5f3fc';

    const step = () => {
      const dt = clock.getDelta();
      elapsed += dt;
      const t = elapsed;

      if (t < phase1) {
        // Phase 1: Bay lên + di chuyển + nghiêng về phía target
        const p = easeInOut(t / phase1);
        source.position.lerpVectors(origPos, destPos, p);
        source.rotation.z = tiltDir * (Math.PI / 3) * easeOut(p);
      }
      else if (t < phase1 + phase2) {
        // Phase 2: Rót
        source.position.copy(destPos);
        source.rotation.z = tiltDir * (Math.PI / 3);

        if (!pourStream) {
          // Dòng rót — cylinder mảnh, pivot trên
          const streamGeo = new THREE.CylinderGeometry(0.012, 0.008, 0.35, 8);
          streamGeo.translate(0, -0.175, 0);
          const streamMat = new THREE.MeshBasicMaterial({
            color: new THREE.Color(chemColor),
            transparent: true,
            opacity: 0.85
          });
          pourStream = new THREE.Mesh(streamGeo, streamMat);
          // Dòng rót từ miệng source (nghiêng) rơi xuống giữa target
          const streamX = -tiltDir * 0.1;
          pourStream.position.copy(destPos).add(new THREE.Vector3(streamX, -0.05, 0));
          this.labGroup.add(pourStream);
        }

        // Dao động nhẹ dòng rót
        pourStream.scale.x = 0.85 + Math.sin(elapsed * 8) * 0.15;
        pourStream.scale.z = 0.85 + Math.cos(elapsed * 6) * 0.1;

        // Chuyển dung dịch
        const srcLiq = source.getObjectByName('liquid');
        const tgtLiq = target.getObjectByName('liquid');
        const transferRate = dt / phase2;
        if (srcLiq && srcLiq.scale.y > 0.02) {
          srcLiq.scale.y = Math.max(0.02, srcLiq.scale.y - transferRate);
        }
        if (tgtLiq) {
          if (tgtLiq.scale.y < 1.3) {
            tgtLiq.scale.y = Math.min(1.3, tgtLiq.scale.y + transferRate * 0.8);
          }
        } else {
          // Nếu đích rỗng, tạo liquid mới
          const tgtChem = source.userData.chemical;
          if (tgtChem) {
            const radTop = tgtType === 'beaker' ? 0.14 : tgtType === 'flask' ? 0.06 : 0.02;
            const radBot = tgtType === 'beaker' ? 0.14 : tgtType === 'flask' ? 0.13 : 0.02;
            const liqH = tgtType === 'testtube' ? 0.12 : 0.21;
            const newLiq = this._createLiquidGroup(tgtChem, radTop, radBot, liqH, tgtType === 'testtube' ? 24 : 32);
            newLiq.position.y = tgtType === 'beaker' ? 0.115 : tgtType === 'flask' ? 0.11 : 0.1;
            newLiq.scale.y = 0.1;
            target.add(newLiq);
          }
        }
      }
      else if (t < totalTime) {
        // Phase 3: Thu dòng rót + quay về
        if (pourStream) {
          this.labGroup.remove(pourStream);
          pourStream.geometry.dispose();
          pourStream.material.dispose();
          pourStream = null;
        }
        const p = easeInOut((t - phase1 - phase2) / phase3);
        source.position.lerpVectors(destPos, origPos, p);
        source.rotation.z = tiltDir * (Math.PI / 3) * (1 - easeOut(p));
      }
      else {
        // Hoàn tất
        source.position.copy(origPos);
        source.rotation.copy(origRot);
        if (pourStream) {
          this.labGroup.remove(pourStream);
          pourStream = null;
        }
        this._pouring = false;
        this.triggerReaction(sourceId, targetId);
        if (onComplete) onComplete();
        return;
      }

      requestAnimationFrame(step);
    };

    step();
  }

  // Phản ứng hóa học logic và kích hoạt các hiệu ứng hạt tương ứng
  triggerReaction(sourceId, targetId) {
    const source = this.vessels[sourceId];
    const target = this.vessels[targetId];
    if (!source || !target) return;

    const chemSrc = source.userData.chemical;
    const chemTgt = target.userData.chemical;

    if (!chemSrc || !chemTgt) {
      if (this.onReactionTrigger) this.onReactionTrigger("Không có hóa chất nào được phản ứng.");
      return;
    }

    const ids = [chemSrc.id, chemTgt.id];

    // Cập nhật hóa chất của cốc target biểu diễn hỗn hợp
    target.userData.reactants = [...(target.userData.reactants || [chemTgt.id]), chemSrc.id];

    // Cập nhật trạng thái chỉ thị phenolphthalein
    if (chemSrc.id === 'phenol' || target.userData.hasPhenol) {
      target.userData.hasPhenol = true;
    }

    // 1. Phản ứng 1: HCl + NaOH (Phản ứng trung hòa Axit-Bazơ)
    if (ids.includes('hcl') && ids.includes('naoh')) {
      const ph = 7.0; // NaCl muối trung tính
      target.userData.pH = ph;

      if (target.userData.hasPhenol) {
        if (chemTgt.id === 'naoh') {
          this._setLiquidColor(target, 0xf1f5f9);
          target.userData.pH = 5.0;
        } else {
          this._setLiquidColor(target, 0xec4899);
          target.userData.pH = 12.0;
        }
      } else {
        this._setLiquidColor(target, 0xf1f5f9);
      }

      this.reactionRate = 0.85;
      this.activeReaction = 'neutralization';
      this.heatTarget = 313.15;

      if (this.onReactionTrigger) {
        this.onReactionTrigger(`Đã phản ứng: HCl + NaOH → NaCl + H₂O. Hỗn hợp trung hòa tỏa nhiệt mạnh.`);
      }
    }
    // 2. Phản ứng 2: CuSO4 + NaOH (Phản ứng tạo kết tủa xanh lơ Cu(OH)2)
    else if (ids.includes('cuso4') && ids.includes('naoh')) {
      this._setLiquidColor(target, 0x1e3a8a);
      // Làm đục chất lỏng kết tủa
      const liq = target.getObjectByName('liquid');
      if (liq) {
        const body = liq.getObjectByName('liquid_body');
        const surface = liq.getObjectByName('liquid_surface');
        if (body && body.material.uniforms) body.material.uniforms.uOpacity.value = 0.85;
        if (surface && surface.material.uniforms) surface.material.uniforms.uOpacity.value = 0.95;
      }

      this._spawnPrecipitateParticles(target);

      this.reactionRate = 0.95;
      this.activeReaction = 'precipitate';
      target.userData.pH = 9.5;

      if (this.onReactionTrigger) {
        this.onReactionTrigger(`Đã phản ứng: CuSO₄ + 2NaOH → Cu(OH)₂↓ + Na₂SO₄. Tạo kết tủa dạng gelatin xanh lơ.`);
      }
    }
    // 3. Phản ứng 3: HCl + Zn (Sủi bọt khí Hydro)
    else if (ids.includes('hcl') && ids.includes('zn')) {
      this._setLiquidColor(target, 0xe2e8f0);
      this._spawnGasBubbles(target);

      this.reactionRate = 0.98;
      this.activeReaction = 'gas_h2';
      this.heatTarget = 308.15;

      if (this.onReactionTrigger) {
        this.onReactionTrigger(`Đã phản ứng: Zn + 2HCl → ZnCl₂ + H₂↑. Bọt khí Hydro thoát ra sủi bọt liên tục.`);
      }
    }
    // 4. Phản ứng 4: HCl + Na2CO3 (Sủi bọt khí CO2)
    else if (ids.includes('hcl') && ids.includes('na2co3')) {
      this._setLiquidColor(target, 0xf1f5f9);
      this._spawnGasBubbles(target);

      this.reactionRate = 0.99;
      this.activeReaction = 'gas_co2';
      this.heatTarget = 302.15;

      if (this.onReactionTrigger) {
        this.onReactionTrigger(`Đã phản ứng: Na₂CO₃ + 2HCl → 2NaCl + H₂O + CO₂↑. Khí Cacbonic giải phóng cực mạnh.`);
      }
    }
    // 5. Phản ứng chỉ thị màu thuần túy
    else if (ids.includes('naoh') && ids.includes('phenol')) {
      this._setLiquidColor(target, 0xec4899);
      target.userData.pH = 13.0;
      if (this.onReactionTrigger) this.onReactionTrigger("Nhỏ chỉ thị Phenolphthalein vào môi trường kiềm NaOH: Hóa hồng đậm sặc sỡ.");
    }
    else {
      const liq = target.getObjectByName('liquid');
      if (liq && chemSrc.color) {
        const c1 = new THREE.Color(chemTgt.color);
        const c2 = new THREE.Color(chemSrc.color);
        c1.lerp(c2, 0.4);
        this._setLiquidColor(target, c1.getHex());
      }
      if (this.onReactionTrigger) this.onReactionTrigger(`Đã thêm ${chemSrc.name} vào ${target.userData.title}. Chỉ có hiện tượng hòa loãng dung môi.`);
    }

    // Nếu dụng cụ bị phản ứng đang được chọn, cập nhật HUD/Telemetry ngay
    if (targetId === this.selectedVesselId) {
      this.updateTelemetry();
    }
  }

  // Khởi tạo các bong bóng bọt khí gas hydro nổi lên mặt nước
  _spawnGasBubbles(vesselMesh) {
    const geo = new THREE.BufferGeometry();
    const count = 40;
    const positions = new Float32Array(count * 3);
    const velocities = [];

    // Bán kính đáy của lọ dung dịch
    const r = vesselMesh.name === 'beaker' ? 0.16 : vesselMesh.name === 'flask' ? 0.18 : 0.04;
    const height = vesselMesh.name === 'testtube' ? 0.22 : 0.24;

    for (let i = 0; i < count; i++) {
      // Tạo điểm ngẫu nhiên xung quanh đáy chai
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * r;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = 0.02 + Math.random() * 0.05; // Khởi tạo dưới đáy chất lỏng
      positions[i * 3 + 2] = Math.sin(angle) * radius;
      
      // Tốc độ trồi lên ngẫu nhiên
      velocities.push(0.01 + Math.random() * 0.015);
    }
    
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const mat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.015,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const bubbles = new THREE.Points(geo, mat);
    bubbles.name = 'bubbles';
    bubbles.userData = { velocities, height, count, radius: r };
    vesselMesh.add(bubbles);
    
    this.bubblesSystem = bubbles;
  }

  // Tạo các hạt kết tủa rơi lơ lửng xuống đáy
  _spawnPrecipitateParticles(vesselMesh) {
    const geo = new THREE.BufferGeometry();
    const count = 60;
    const positions = new Float32Array(count * 3);
    const velocities = [];

    const r = vesselMesh.name === 'beaker' ? 0.16 : vesselMesh.name === 'flask' ? 0.18 : 0.04;
    const topLimit = vesselMesh.name === 'testtube' ? 0.2 : 0.24;

    for (let i = 0; i < count; i++) {
      // Phân bổ hạt lơ lửng ngẫu nhiên toàn bộ chất lỏng
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * r;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = topLimit - Math.random() * 0.15; // Phân bổ trên xuống
      positions[i * 3 + 2] = Math.sin(angle) * radius;

      // Rơi xuống chậm chạp
      velocities.push(0.003 + Math.random() * 0.005);
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: 0x3b82f6, // Đồng hidroxit xanh lam
      size: 0.018,
      transparent: true,
      opacity: 0.7,
      depthWrite: false
    });

    const ppt = new THREE.Points(geo, mat);
    ppt.name = 'precipitate';
    ppt.userData = { velocities, count };
    vesselMesh.add(ppt);
    this.pptSystem = ppt;
  }

  // Dọn dẹp bàn cân thí nghiệm về trạng thái ban đầu
  resetLaboratory() {
    if (this.flameParticles) {
      this.vessels['burner'].remove(this.flameParticles);
      this.flameParticles = null;
    }
    this.isBurnerLit = false;
    this.heatTarget = 298.15;
    this.reactionRate = 0.0;
    this.activeReaction = null;

    // Phục hồi lại chất lỏng trong cốc về màu gốc của chemical
    for (const key in this.vessels) {
      const v = this.vessels[key];
      if (v && v.userData && v.userData.chemical) {
        const liq = v.getObjectByName('liquid');
        if (liq) {
          const hexColor = parseInt(v.userData.chemical.color.replace('#', '0x'));
          this._setLiquidColor(v, hexColor);
          // Reset opacity về mặc định
          const body = liq.getObjectByName('liquid_body');
          const surface = liq.getObjectByName('liquid_surface');
          const isPhenol = v.userData.chemical.id === 'phenol';
          if (body && body.material.uniforms) body.material.uniforms.uOpacity.value = isPhenol ? 0.12 : 0.35;
          if (surface && surface.material.uniforms) surface.material.uniforms.uOpacity.value = isPhenol ? 0.35 : 0.9;
          liq.scale.y = 1.0;
          liq.position.y = this._getVesselType(key) === 'beaker' ? 0.115 : this._getVesselType(key) === 'flask' ? 0.11 : 0.1;
        }
        
        // Xóa bọt khí, kết tủa
        const b = v.getObjectByName('bubbles');
        if (b) v.remove(b);
        const p = v.getObjectByName('precipitate');
        if (p) v.remove(p);

        v.userData.pH = v.userData.chemical.id === 'hcl' ? 1.0 : v.userData.chemical.id === 'naoh' ? 14.0 : v.userData.chemical.id === 'cuso4' ? 4.0 : v.userData.chemical.id === 'na2co3' ? 11.5 : 7.0;
        v.userData.temp = 298.15;
        v.userData.reactants = null;
        v.userData.hasPhenol = false;
      }
    }

    this.selectedVesselId = null;
    this.updateTelemetry();
    if (this.onReactionTrigger) this.onReactionTrigger("Đã dọn dẹp sạch sẽ bàn thí nghiệm. Sẵn sàng cho thí nghiệm mới.");
  }

  // --- TƯƠNG TÁC RAYCAST VÀ CLICK CHUỘT ---

  _pick(event) {
    if (!this.isLoaded) return null;

    const rect = this.container.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const pickable = [];
    for (const key in this.vessels) {
      if (this.vessels[key]) {
        this.vessels[key].traverse(child => {
          if (child.isMesh) {
            child.userData.vesselId = key;
            pickable.push(child);
          }
        });
      }
    }

    console.log('[ChemistryViewer] Clicks coordinates:', this.mouse.x, this.mouse.y);
    console.log('[ChemistryViewer] Pickable objects count:', pickable.length);
    const hits = this.raycaster.intersectObjects(pickable, true);
    console.log('[ChemistryViewer] Hits count:', hits.length);
    if (hits.length > 0) {
      console.log('[ChemistryViewer] Hit target:', hits[0].object.name, 'vesselId:', hits[0].object.userData.vesselId);
      return hits[0].object.userData.vesselId;
    }

    return null;
  }

  _handleMouseDown(event) {
    if (!this.isActive) return;
    this._downPos = { x: event.clientX, y: event.clientY };
    this._dragState.startMouse = { x: event.clientX, y: event.clientY };
    // Kiểm tra click vào vessel để chuẩn bị kéo
    const vesselId = this._pick(event);
    if (vesselId && vesselId !== 'burner' && vesselId !== 'phenol_set' && this.vessels[vesselId]) {
      this._dragState.potential = true;
      this._dragState.vesselId = vesselId;
      this._dragState.vessel = this.vessels[vesselId];
      this._dragState.startPos = this._dragState.vessel.position.clone();
      // Tắt OrbitControls NGAY LẬP TỨC để camera không xoay khi kéo
      if (this.controls) this.controls.enabled = false;
      const tablePoint = this._raycastTable(event);
      if (tablePoint) {
        this._dragState.offset.subVectors(this._dragState.vessel.position, tablePoint);
        this._dragState.offset.y = 0;
      }
      this._setHoverHighlight(this._dragState.vessel, true);
    }
  }

  // Tìm vessel gần vị trí thả (để trigger rót khi kéo-thả)
  _findNearbyVessel(draggedVessel, draggedId) {
    if (!draggedVessel) return null;
    let nearest = null;
    let minDist = 0.35; // Bán kính nhận diện
    for (const key in this.vessels) {
      if (key === draggedId) continue;
      if (key === 'burner' || key === 'phenol_set') continue;
      const v = this.vessels[key];
      if (!v) continue;
      const dist = draggedVessel.position.distanceTo(v.position);
      if (dist < minDist) {
        minDist = dist;
        nearest = key;
      }
    }
    return nearest;
  }

  // Highlight khi hover/nắm
  _setHoverHighlight(vessel, on) {
    if (!vessel) return;
    vessel.traverse(child => {
      if (child.isMesh && child.material && child.material.emissive) {
        if (on) {
          child.material.emissive.setHex(0x1a3a5c);
          child.material.emissiveIntensity = 0.3;
        } else if (this.selectedVesselId !== this._getVesselIdOf(vessel)) {
          child.material.emissiveIntensity = 0.0;
        }
      }
    });
  }

  _getVesselIdOf(vessel) {
    for (const key in this.vessels) {
      if (this.vessels[key] === vessel) return key;
    }
    return null;
  }

  _handleMouseMove(event) {
    if (!this.isActive) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Nếu đang potential drag, kiểm tra đã di chuyển đủ xa chưa
    if (this._dragState.potential && !this._dragState.active && this._downPos) {
      const dx = event.clientX - this._downPos.x;
      const dy = event.clientY - this._downPos.y;
      if (dx * dx + dy * dy > 16) {
        // Đã di chuyển đủ xa -> bắt đầu kéo thật sự
        this._dragState.active = true;
        this.renderer.domElement.style.cursor = 'grabbing';
      }
    }

    if (this._dragState.active && this._dragState.vessel) {
      const tablePoint = this._raycastTable(event);
      if (tablePoint) {
        const newPos = tablePoint.add(this._dragState.offset);
        // Giới hạn trong bàn
        newPos.x = Math.max(-1.8, Math.min(1.8, newPos.x));
        newPos.z = Math.max(-0.9, Math.min(0.9, newPos.z));
        newPos.y = this._dragState.startPos.y;
        // Lerp mượt mà thay vì nhảy
        this._dragState.vessel.position.lerp(newPos, 0.5);
      }
      // Highlight vessel đích khi kéo gần
      const nearby = this._findNearbyVessel(this._dragState.vessel, this._dragState.vesselId);
      if (this._lastHoverTarget && this._lastHoverTarget !== nearby) {
        const oldV = this.vessels[this._lastHoverTarget];
        if (oldV) this._setHoverHighlight(oldV, false);
      }
      if (nearby && nearby !== this._lastHoverTarget) {
        const newV = this.vessels[nearby];
        if (newV) this._setHoverHighlight(newV, true);
      }
      this._lastHoverTarget = nearby;
      this.renderer.domElement.style.cursor = 'grabbing';
      return;
    }

    // Hover detection — đổi cursor + highlight nhẹ
    const result = this._pick(event);
    if (result && result !== 'burner' && result !== 'phenol_set') {
      this.renderer.domElement.style.cursor = 'grab';
    } else {
      this.renderer.domElement.style.cursor = 'default';
    }
  }

  _handleMouseUp(event) {
    if (!this.isActive) return;
    const wasDragging = this._dragState.active;
    const wasPotential = this._dragState.potential;
    const draggedVesselId = this._dragState.vesselId;
    const draggedVessel = this._dragState.vessel;
    // Tắt hover highlight
    if (this._dragState.vessel) {
      this._setHoverHighlight(this._dragState.vessel, false);
    }
    // Nếu chỉ click (không kéo), khôi phục OrbitControls
    if (wasPotential && !wasDragging) {
      if (this.controls) this.controls.enabled = true;
    }
    this._dragState.active = false;
    this._dragState.potential = false;
    this._dragState.vessel = null;
    this._dragState.vesselId = null;
    if (wasDragging) {
      if (this.controls) this.controls.enabled = true;
    }
    // Xóa highlight target khi thả
    if (this._lastHoverTarget) {
      const v = this.vessels[this._lastHoverTarget];
      if (v) this._setHoverHighlight(v, false);
      this._lastHoverTarget = null;
    }

    if (wasDragging && draggedVesselId) {
      // Kiểm tra xem có thả gần vessel khác không → rót!
      const dropTarget = this._findNearbyVessel(draggedVessel, draggedVesselId);
      if (dropTarget && draggedVessel.userData.chemical) {
        // Có hóa chất → rót
        this.pourVessel(draggedVesselId, dropTarget, () => {
          if (this.onReactionTrigger) {
            this.onReactionTrigger(`Đã rót ${draggedVessel.userData.chemical.name} sang ${this.vessels[dropTarget].userData.title}.`);
          }
          // Cập nhật UI
          this.updateTelemetry();
        });
        this.renderer.domElement.style.cursor = 'default';
        return;
      }
      this.renderer.domElement.style.cursor = 'default';
      return;
    }

    if (this._downPos) {
      const dx = event.clientX - this._downPos.x;
      const dy = event.clientY - this._downPos.y;
      this._downPos = null;
      if (dx * dx + dy * dy > 16) return;
    }

    const clickedVesselId = this._pick(event);
    const decorOnly = ['phenol_bottle', 'phenol_pipette'];
    if (clickedVesselId && clickedVesselId === 'burner') {
      this.toggleBurner();
    } else if (clickedVesselId && clickedVesselId === 'phenol_set') {
      this.selectVessel('phenol_set');
    } else if (clickedVesselId && this.selectedVesselId === 'phenol_set') {
      this._dropPhenol(clickedVesselId);
    } else if (clickedVesselId && !decorOnly.includes(clickedVesselId)) {
      this.selectVessel(clickedVesselId);
    } else if (!clickedVesselId) {
      this.clearSelection();
    }
  }

  // Raycast lên mặt bàn (y=0) để lấy điểm kéo
  _raycastTable(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndcX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
    const target = new THREE.Vector3();
    const hit = this.raycaster.ray.intersectPlane(this._tablePlane, target);
    return hit;
  }

  selectVessel(vesselId) {
    this.selectedVesselId = vesselId;

    // Highlight dụng cụ bằng ánh sáng phát xạ emissive
    for (const key in this.vessels) {
      const v = this.vessels[key];
      if (!v) continue;
      
      const isSelected = key === vesselId;
      v.traverse(child => {
        if (child.isMesh && child.material && child.material.emissive) {
          child.material.emissive.setHex(isSelected ? 0x005dac : 0x000000);
          child.material.emissiveIntensity = isSelected ? 0.35 : 0.0;
        }
      });
    }

    this.updateTelemetry();
  }

  clearSelection() {
    this.selectedVesselId = null;
    for (const key in this.vessels) {
      const v = this.vessels[key];
      if (v) {
        v.traverse(child => {
          if (child.isMesh && child.material && child.material.emissive) {
            child.material.emissiveIntensity = 0.0;
          }
        });
      }
    }
    this.updateTelemetry();
  }

  // --- CẬP NHẬT TELEMETRY DATA CỦA DỤNG CỤ ---
  updateTelemetry() {
    const defaultData = {
      name: 'Chưa chọn dụng cụ',
      pH: 7.0,
      temp: 298.15,
      reactants: [],
      chemical: null
    };

    let data = defaultData;
    if (this.selectedVesselId) {
      const v = this.vessels[this.selectedVesselId];
      if (v && v.userData.temp != null) {
        data = {
          name:      v.userData.title,
          pH:        v.userData.pH   ?? 7.0,
          temp:      v.userData.temp ?? 298.15,
          reactants: v.userData.reactants || [],
          chemical:  v.userData.chemical
        };
      }
    }

    if (this.onVesselClick) {
      this.onVesselClick(
        this.selectedVesselId,
        data.name,
        data.pH,
        data.temp,
        data.reactants,
        data.chemical
      );
    }
  }

  // --- MAIN LOOP UPDATE (ANIMATIONS) ---

  _animate() {
    requestAnimationFrame(this._animate.bind(this));
    if (!this.isActive) return;

    const delta = this._clock.getDelta();
    const time = this._clock.getElapsedTime();

    // Cập nhật uTime cho tất cả chất lỏng (gợn sóng mặt thoáng)
    for (const key in this.vessels) {
      const v = this.vessels[key];
      if (v) {
        const liq = v.getObjectByName('liquid');
        if (liq) {
          const surface = liq.getObjectByName('liquid_surface');
          if (surface && surface.material.uniforms && surface.material.uniforms.uTime) {
            surface.material.uniforms.uTime.value = time;
          }
        }
      }
    }

    // Cập nhật vị trí nhãn theo vessel (khi kéo vessel, nhãn đi theo)
    this.labels.forEach(label => {
      const vKey = label.userData.followVessel;
      const vessel = this.vessels[vKey];
      if (vessel) {
        label.position.copy(vessel.position).add(label.userData.offset);
      }
    });

    // 1. Cập nhật xoay OrbitControls
    if (this.controls) this.controls.update();

    // 2. Di chuyển hạt bụi bay lơ lửng
    if (this.labParticles) {
      const pos = this.labParticles.geometry.attributes.position.array;
      const count = pos.length / 3;
      for (let i = 0; i < count; i++) {
        pos[i * 3 + 1] += Math.sin(time * 0.5 + i) * 0.001; // lên xuống nhẹ
      }
      this.labParticles.geometry.attributes.position.needsUpdate = true;
    }

    // 3. Cập nhật ngọn lửa bập bùng đèn cồn Bunsen
    if (this.isBurnerLit && this.flameParticles) {
      const pos = this.flameParticles.geometry.attributes.position.array;
      const count = pos.length / 3;
      for (let i = 0; i < count; i++) {
        // Hạt bay lên trên rồi reset về gốc bấc đèn cồn
        pos[i * 3 + 1] += delta * 0.3; // Tốc độ bốc lên
        pos[i * 3] += (Math.random() - 0.5) * 0.004; // nhiễu ngang
        pos[i * 3 + 2] += (Math.random() - 0.5) * 0.004;

        if (pos[i * 3 + 1] > 0.55) {
          pos[i * 3] = (Math.random() - 0.5) * 0.03;
          pos[i * 3 + 1] = 0.3; // Gốc bấc đèn
          pos[i * 3 + 2] = (Math.random() - 0.5) * 0.03;
        }
      }
      this.flameParticles.geometry.attributes.position.needsUpdate = true;

      // Gia nhiệt cho các dụng cụ lân cận đèn cồn
      // Vì Beaker đặt chéo cạnh burner, nếu burner bật -> truyền nhiệt dần
      for (const key in this.vessels) {
        if (key !== 'burner') {
          const v = this.vessels[key];
          if (v && v.userData.temp < this.heatTarget) {
            v.userData.temp += delta * 4.5; // tăng 4.5 độ mỗi giây
            if (v.userData.temp > this.heatTarget) v.userData.temp = this.heatTarget;
          }
        }
      }
    } else {
      // Nguội dần về nhiệt độ phòng
      for (const key in this.vessels) {
        if (key !== 'burner') {
          const v = this.vessels[key];
          if (v && v.userData.temp > this.heatTarget) {
            v.userData.temp -= delta * 2.0; // nguội đi 2 độ mỗi giây
            if (v.userData.temp < this.heatTarget) v.userData.temp = this.heatTarget;
          }
        }
      }
    }

    // 4. Cập nhật bong bóng sủi bọt khí (Gas Bubbling)
    for (const key in this.vessels) {
      const v = this.vessels[key];
      if (!v) continue;
      const bubbles = v.getObjectByName('bubbles');
      if (bubbles) {
        const pos = bubbles.geometry.attributes.position.array;
        const count = bubbles.userData.count;
        const vels = bubbles.userData.velocities;
        const maxH = bubbles.userData.height;
        const r = bubbles.userData.radius;

        for (let i = 0; i < count; i++) {
          pos[i * 3 + 1] += vels[i]; // Bong bóng nổi lên
          
          // Trồi quá mặt nước -> nổ bong bóng và chui về đáy làm bọt mới
          if (pos[i * 3 + 1] > maxH) {
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * r;
            pos[i * 3] = Math.cos(angle) * radius;
            pos[i * 3 + 1] = 0.02; // Đáy lọ
            pos[i * 3 + 2] = Math.sin(angle) * radius;
          }
        }
        bubbles.geometry.attributes.position.needsUpdate = true;
      }
    }

    // 5. Cập nhật lắng kết tủa (Precipitation settling)
    for (const key in this.vessels) {
      const v = this.vessels[key];
      if (!v) continue;
      const ppt = v.getObjectByName('precipitate');
      if (ppt) {
        const pos = ppt.geometry.attributes.position.array;
        const count = ppt.userData.count;
        const vels = ppt.userData.velocities;

        for (let i = 0; i < count; i++) {
          pos[i * 3 + 1] -= vels[i]; // Hạt kết tủa chìm xuống đáy
          
          // Chìm sát đáy -> giữ yên ở đáy
          if (pos[i * 3 + 1] < 0.015) {
            pos[i * 3 + 1] = 0.015;
          }
        }
        ppt.geometry.attributes.position.needsUpdate = true;
      }
    }

    // 6. Cập nhật nhiệt độ chung Telemetry
    if (this.selectedVesselId) {
      const selectedV = this.vessels[this.selectedVesselId];
      if (selectedV) {
        this.currentHeat = selectedV.userData.temp;
      }
    } else {
      this.currentHeat = 298.15;
    }

    // Render cảnh
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  // Nhỏ giọt phenolphthalein vào dụng cụ được chọn
  _dropPhenol(targetId) {
    const phenolSet = this.vessels['phenol_set'];
    const target = this.vessels[targetId];
    if (!phenolSet || !target) return;

    const pipette = phenolSet.getObjectByName('pipette');
    if (!pipette) return;

    if (this._isPipetteAnimating) return;

    if (!target.userData.chemical) {
      if (this.onReactionTrigger) this.onReactionTrigger('Hãy chọn hóa chất vào dụng cụ trước khi nhỏ phenol.');
      return;
    }

    this._animatePipetteDrop(targetId);
  }

  // Animation: nắp ống nhỏ giọt nhấc ra khỏi chai → bay đến ống nghiệm → nhỏ giọt → bay về
  _animatePipetteDrop(targetId) {
    const phenolSet = this.vessels['phenol_set'];
    const target = this.vessels[targetId];
    if (!phenolSet || !target) return;

    const pipette = phenolSet.getObjectByName('pipette');
    if (!pipette) return;

    this._isPipetteAnimating = true;

    // Tạo clone từ model phenol_pipette.glb thật
    let animPipette;
    const bottleGroup = phenolSet.getObjectByName('bottle');
    const bottleBox = new THREE.Box3().setFromObject(bottleGroup);
    const bottleH = bottleBox.max.y - bottleBox.min.y;

    if (this.phenolPipetteModel) {
      animPipette = this.phenolPipetteModel.clone();
      animPipette.updateWorldMatrix(true, true);
      animPipette.traverse(child => {
        if (child.isMesh) {
          child.geometry = child.geometry.clone();
          child.geometry.applyMatrix4(child.matrixWorld);
          child.geometry.computeVertexNormals();
          child.geometry.computeBoundingBox();
          child.geometry.computeBoundingSphere();
          child.position.set(0, 0, 0);
          child.rotation.set(0, 0, 0);
          child.scale.set(1, 1, 1);
          child.castShadow = true;
          child.receiveShadow = true;
          if (child.material) {
            if (child.material.map) child.material.map.colorSpace = THREE.SRGBColorSpace;
            if (child.material.emissiveMap) child.material.emissiveMap.colorSpace = THREE.SRGBColorSpace;
            child.material.needsUpdate = true;
          }
        }
      });
      animPipette.position.set(0, 0, 0);
      animPipette.rotation.set(0, 0, 0);
      animPipette.scale.set(1, 1, 1);

      // Xoay đứng nếu model nằm ngang
      const rawBox = new THREE.Box3().setFromObject(animPipette);
      const rawSize = rawBox.getSize(new THREE.Vector3());
      if (rawSize.x > rawSize.y * 1.3) {
        animPipette.rotation.z = -Math.PI / 2;
      } else if (rawSize.z > rawSize.y * 1.3) {
        animPipette.rotation.x = -Math.PI / 2;
      }

      // Scale pipette tỉ lệ với chai (~25% chiều cao chai)
      const afterRotBox = new THREE.Box3().setFromObject(animPipette);
      const afterRotSize = afterRotBox.getSize(new THREE.Vector3());
      const targetPipetteH = bottleH * 0.28;
      const pipetteScale = targetPipetteH / Math.max(afterRotSize.x, afterRotSize.y, afterRotSize.z);
      animPipette.scale.setScalar(pipetteScale);
    } else {
      pipette.visible = true;
      animPipette = pipette;
    }

    // Vị trí bắt đầu: ngay trên miệng chai (nắp đang đậy)
    const bottleTop = bottleBox.max.y;
    const startPos = new THREE.Vector3(0, bottleTop + 0.02, 0);

    this.labGroup.add(animPipette);
    animPipette.position.copy(startPos);
    animPipette.rotation.set(0, 0, 0);

    // Vị trí đích: trên miệng dụng cụ nhận
    const targetWorldPos = new THREE.Vector3();
    target.getWorldPosition(targetWorldPos);
    const targetBox = new THREE.Box3().setFromObject(target);
    const destPos = new THREE.Vector3(
      targetWorldPos.x,
      targetBox.max.y + 0.35,
      targetWorldPos.z
    );

    const origRot = new THREE.Euler(0, 0, 0);
    const tiltRot = new THREE.Euler(0, 0, Math.PI / 3.5); // Nghiêng ~51 độ để nhỏ giọt

    let frame = 0;
    const totalFrames = 90;
    const drops = [];

    // Easing: ease-in-out cubic
    const ease = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const step = () => {
      frame++;

      if (frame <= 12) {
        // Phase 1: Nhấc nắp thẳng lên khỏi chai
        const t = ease(frame / 12);
        animPipette.position.y = startPos.y + t * 0.35;
      }
      else if (frame <= 30) {
        // Phase 2: Bay vòng cung đến trên miệng ống nghiệm
        const t = ease((frame - 12) / 18);
        const liftPeak = startPos.y + 0.35;
        const mid = new THREE.Vector3(
          (startPos.x + destPos.x) * 0.5,
          liftPeak + 0.25,
          (startPos.z + destPos.z) * 0.5
        );
        if (t <= 0.5) {
          const s = ease(t / 0.5);
          animPipette.position.lerpVectors(new THREE.Vector3(startPos.x, liftPeak, startPos.z), mid, s);
        } else {
          const s = ease((t - 0.5) / 0.5);
          animPipette.position.lerpVectors(mid, destPos, s);
        }
        // Nghiêng dần khi接近 đích
        const tiltT = Math.max(0, (t - 0.6) / 0.4);
        animPipette.rotation.z = tiltRot.z * tiltT;
      }
      else if (frame <= 60) {
        // Phase 3: Giữ tại chỗ, nhỏ giọt
        animPipette.position.copy(destPos);
        animPipette.rotation.copy(tiltRot);

        if (frame % 8 === 0 && drops.length < 5) {
          const dropGeo = new THREE.SphereGeometry(0.01, 8, 8);
          const dropMat = new THREE.MeshPhysicalMaterial({
            color: 0xf0d0e0,
            roughness: 0.1,
            transmission: 0.8,
            ior: 1.33,
            transparent: true,
            opacity: 0.9
          });
          const drop = new THREE.Mesh(dropGeo, dropMat);
          // Giọt xuất hiện ở đầu pipette (phía dưới khi nghiêng)
          const tipOffset = new THREE.Vector3(0.06, -0.12, 0);
          tipOffset.applyEuler(tiltRot);
          drop.position.copy(destPos).add(tipOffset);
          this.labGroup.add(drop);
          drops.push({ mesh: drop, baseY: drop.position.y });
        }

        // Giọt rơi xuống
        for (const d of drops) {
          d.mesh.position.y -= 0.015;
          const targetTop = targetBox.max.y + 0.05;
          if (d.mesh.position.y < targetTop) {
            d.mesh.position.y = targetTop;
            d.mesh.material.opacity = Math.max(0, d.mesh.material.opacity - 0.1);
          }
        }
      }
      else if (frame <= 78) {
        // Phase 4: Bay về — dựng đứng lại và bay ngược
        if (drops.length > 0 && frame === 61) {
          for (const d of drops) {
            this.labGroup.remove(d.mesh);
          }
          drops.length = 0;
        }

        const t = ease((frame - 60) / 18);
        const liftPeak = startPos.y + 0.35;
        const mid = new THREE.Vector3(
          (destPos.x + startPos.x) * 0.5,
          liftPeak + 0.25,
          (destPos.z + startPos.z) * 0.5
        );
        if (t <= 0.5) {
          const s = ease(t / 0.5);
          animPipette.position.lerpVectors(destPos, mid, s);
        } else {
          const s = ease((t - 0.5) / 0.5);
          animPipette.position.lerpVectors(mid, new THREE.Vector3(startPos.x, liftPeak, startPos.z), s);
        }
        // Dựng đứng lại
        animPipette.rotation.z = tiltRot.z * (1.0 - t);
      }
      else if (frame <= 90) {
        // Phase 5: Hạ nắp xuống đậy lại chai
        const t = ease((frame - 78) / 12);
        const liftPeak = startPos.y + 0.35;
        animPipette.position.x = startPos.x;
        animPipette.position.z = startPos.z;
        animPipette.position.y = liftPeak - t * 0.35;
        animPipette.rotation.z = 0;

        // Đổi màu dung dịch khi nắp đã về gần chai
        if (frame === 85) {
          this._setLiquidColor(target, 0xec4899);
          target.userData.hasPhenol = true;
          target.userData.reactants = [...(target.userData.reactants || []), 'phenol'];
          target.userData.pH = 12.0;
        }
      }

      if (frame < totalFrames) {
        requestAnimationFrame(step);
      } else {
        // Dọn dẹp
        for (const d of drops) {
          this.labGroup.remove(d.mesh);
        }
        this.labGroup.remove(animPipette);
        pipette.visible = false;

        if (this.selectedVesselId === targetId) {
          this.updateTelemetry();
        }

        if (this.onReactionTrigger) {
          this.onReactionTrigger('Phenolphthalein nhỏ vào dung dịch: chuyển sang màu hồng!');
        }

        this._isPipetteAnimating = false;
      }
    };

    step();
  }

  _handleResize() {
    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;

    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(this.width, this.height);
  }

  activate() {
    this.isActive = true;
    if (this.renderer?.domElement) {
      this.renderer.domElement.style.display = 'block';
    }
    this._handleResize();
  }

  deactivate() {
    this.isActive = false;
    if (this.renderer?.domElement) {
      this.renderer.domElement.style.display = 'none';
      this.renderer.domElement.style.cursor = 'default';
    }
    this._dragState = {
      active: false,
      potential: false,
      vesselId: null,
      vessel: null,
      offset: new THREE.Vector3(),
      startPos: new THREE.Vector3(),
      startMouse: { x: 0, y: 0 }
    };
  }
}
