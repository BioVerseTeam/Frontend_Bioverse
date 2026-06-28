import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

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
    
    // Nạp sẵn mô hình 3D thực tế của Cốc thủy tinh (Beaker.glb)
    this.beakerModel = null;
    const loader = new GLTFLoader();
    loader.load('/beaker.glb', (gltf) => {
      gltf.scene.traverse(child => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          if (child.material) {
            // Nâng cấp chất liệu thủy tinh khúc xạ tuyệt đẹp mà vẫn giữ nhãn vạch chia độ
            child.material = new THREE.MeshPhysicalMaterial({
              map: child.material.map,
              roughness: 0.08,
              metalness: 0.1,
              transmission: 0.65,
              ior: 1.52,
              thickness: 0.04,
              transparent: true,
              opacity: 0.8
            });
          }
        }
      });
      this.beakerModel = gltf.scene;
      
      // Nếu bàn thí nghiệm đã được dựng và có cốc thủy tinh, vẽ lại để áp dụng model mới
      if (this.vessels['beaker'] && this.lastSetupItems) {
        this.setupWorkbench(this.lastSetupItems);
      }
    }, undefined, (err) => {
      console.error('[ChemistryViewer] Lỗi tải model beaker.glb:', err);
    });

    this.initScene();
    this.initLights();
    this.initCameraControls();
    this.buildLaboratory();

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
    this.scene.background = new THREE.Color(0xf1f5f9); // Tông sáng ghi xám xanh hiện đại chuyên nghiệp
    this.scene.fog = new THREE.FogExp2(0xf1f5f9, 0.005); // Sương mù dịu nhẹ tiệp màu nền

    this.camera = new THREE.PerspectiveCamera(45, this.width / this.height, 0.1, 1000);
    // Góc nhìn từ trên cao xuống bàn thí nghiệm
    this.camera.position.set(0, 3.2, 4.8);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.appendChild(this.renderer.domElement);

    // Hệ thống hạt bụi bay lơ lửng trong không khí cho ảo diệu
    this._createLabParticles();
  }

  _createLabParticles() {
    const geo = new THREE.BufferGeometry();
    const count = 100;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 8;
      positions[i * 3 + 1] = Math.random() * 4;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 8;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0x3b82f6, // Ánh xanh nước biển
      size: 0.015,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.labParticles = new THREE.Points(geo, mat);
    this.scene.add(this.labParticles);
  }

  initLights() {
    // Sáng tổng quan nhẹ nâng đỡ vùng tối
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.55));

    // Nguồn sáng trần màu trắng chính diện
    const ceilingLight = new THREE.DirectionalLight(0xffffff, 1.5);
    ceilingLight.position.set(2, 7, 3);
    ceilingLight.castShadow = true;
    ceilingLight.shadow.mapSize.width = 1024;
    ceilingLight.shadow.mapSize.height = 1024;
    ceilingLight.shadow.bias = -0.0005;
    this.scene.add(ceilingLight);

    // Ánh sáng fill phụ từ trước bên trái để làm rõ các góc khuất
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.7);
    fillLight.position.set(-3, 5, 3);
    this.scene.add(fillLight);

    // Ánh sáng hắt viền (rim/backlight) từ đằng sau hắt tới tạo độ bóng sang xịn cho thủy tinh
    const rimLight = new THREE.DirectionalLight(0xdbeafe, 0.5);
    rimLight.position.set(0, 4, -4);
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

    // 1. Mặt bàn thí nghiệm nhẵn mịn phản quang xịn hơn
    const tableGeo = new THREE.BoxGeometry(4.5, 0.15, 2.5);
    const tableMat = new THREE.MeshPhysicalMaterial({
      color: 0x334155, // Xám xanh phiến đá Slate 700 nổi bật trên nền sáng
      roughness: 0.15,
      metalness: 0.1,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05
    });
    const table = new THREE.Mesh(tableGeo, tableMat);
    table.position.y = -0.075;
    table.receiveShadow = true;
    this.labGroup.add(table);

    // Chân bàn thí nghiệm inox đánh bóng sang trọng
    const legGeo = new THREE.CylinderGeometry(0.06, 0.06, 2.0, 16);
    const legMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.8, roughness: 0.1 });
    const positions = [
      [-2.1, -1.075, -1.1],
      [2.1, -1.075, -1.1],
      [-2.1, -1.075, 1.1],
      [2.1, -1.075, 1.1]
    ];
    positions.forEach(([x, y, z]) => {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(x, y, z);
      this.labGroup.add(leg);
    });

    // 2. Tấm chắn bảo vệ bằng kính mờ frosted glass cực kì cao cấp ở mặt sau bàn
    const backGeo = new THREE.PlaneGeometry(4.5, 1.5);
    const backMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.2,
      transmission: 0.9,
      ior: 1.5,
      thickness: 0.05,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide
    });
    const back = new THREE.Mesh(backGeo, backMat);
    back.position.set(0, 0.75, -1.24);
    this.labGroup.add(back);

    // 3. Xây dựng Giá đỡ Ống nghiệm bằng Gỗ mộc mạc
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

    // Vị trí cố định cho từng loại dụng cụ trên bàn thí nghiệm
    const positions = {
      beaker: new THREE.Vector3(0.3, 0.075, 0.2),      // Cốc ở giữa-phải
      flask: new THREE.Vector3(1.1, 0.075, -0.1),       // Bình tam giác bên phải hẳn
      burner: new THREE.Vector3(-0.3, 0.075, -0.3),    // Đèn cồn ở giữa-trái hơi thụt sâu
      testtube: new THREE.Vector3(-0.8, 0.075, 0)     // Ống nghiệm đặt trong giá đỡ ống nghiệm
    };

    // Kiểm tra xem người dùng có chọn dụng cụ tương ứng hay không
    const hasTool = (toolId) => selectedItems.some(i => i.id === toolId);
    
    // Thu thập các hóa chất lỏng và rắn được chọn
    const selectedChemicals = selectedItems.filter(i => i.category === 'Chemical');

    // 1. Tạo Đèn cồn nếu có chọn
    if (hasTool('burner')) {
      const burnerGroup = this._createBurnerMesh();
      burnerGroup.position.copy(positions.burner);
      this.labGroup.add(burnerGroup);
      this.vessels['burner'] = burnerGroup;
    }

    // 2. Tạo Cốc Thủy Tinh chứa hóa chất đầu tiên
    if (hasTool('beaker')) {
      // Đổ hóa chất đầu tiên được chọn vào cốc (hoặc nước cất nếu có, mặc định CuSO4 hoặc HCl)
      const chem = selectedChemicals.find(c => c.id !== 'zn' && c.id !== 'phenol') || selectedChemicals[0];
      const beakerGroup = this._createBeakerMesh(chem);
      beakerGroup.position.copy(positions.beaker);
      this.labGroup.add(beakerGroup);
      this.vessels['beaker'] = beakerGroup;
    }

    // 3. Tạo Bình Tam Giác chứa hóa chất thứ hai
    if (hasTool('flask')) {
      const chem = selectedChemicals.filter(c => c.id !== 'zn' && c.id !== 'phenol')[1] || selectedChemicals[1] || selectedChemicals[0];
      const flaskGroup = this._createFlaskMesh(chem);
      flaskGroup.position.copy(positions.flask);
      this.labGroup.add(flaskGroup);
      this.vessels['flask'] = flaskGroup;
    }

    // 4. Tạo Ống Nghiệm chứa hóa chất thứ ba
    if (hasTool('testtube')) {
      // Ống nghiệm sẽ cắm vào giá đỡ ở vị trí tương đối
      const chem = selectedChemicals.filter(c => c.id !== 'zn' && c.id !== 'phenol')[2] || selectedChemicals[2] || selectedChemicals[0];
      const tubeGroup = this._createTestTubeMesh(chem);
      // Đặt ống nghiệm tương đối so với giá đỡ
      tubeGroup.position.set(-0.8, 0.22, 0); // Đặt nhô lên cắm vào rack
      this.labGroup.add(tubeGroup);
      this.vessels['testtube'] = tubeGroup;
    }

    // Cập nhật lại các chỉ số Telemetry khi có thay đổi bàn thí nghiệm
    this.updateTelemetry();
  }

  // --- DỰNG MÔ HÌNH DỤNG CỤ VÀ DUNG DỊCH (PROCEDURAL MESHES) ---

  // Thủy tinh khúc xạ mờ ảo bóng lộn
  _getGlassMaterial() {
    return new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.05,
      metalness: 0.1,
      transmission: 0.9, // độ xuyên sáng
      ior: 1.5, // chỉ số khúc xạ thủy tinh
      thickness: 0.02, // độ dày lớp thủy tinh
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide
    });
  }

  // Tạo cốc mỏ thủy tinh
  _createBeakerMesh(chemical) {
    const group = new THREE.Group();
    group.name = 'beaker';
    group.userData = {
      type: 'beaker',
      title: 'Cốc thủy tinh',
      chemical: chemical ? { ...chemical } : null,
      temp: 298.15,
      pH: chemical ? (chemical.id === 'hcl' ? 1.0 : chemical.id === 'naoh' ? 14.0 : chemical.id === 'cuso4' ? 4.0 : chemical.id === 'na2co3' ? 11.5 : 7.0) : 7.0,
      hasPhenol: false
    };

    if (this.beakerModel) {
      // Sử dụng mô hình 3D Beaker thực tế được người dùng cung cấp
      const modelClone = this.beakerModel.clone();
      modelClone.scale.setScalar(0.46);
      modelClone.position.y = 0.23; // Dịch chỉnh để đáy trùng khít với mặt bàn y=0
      group.add(modelClone);
    } else {
      // Dự phòng bằng procedural mesh cốc thủy tinh
      const glassMat = this._getGlassMaterial();

      // Thân cốc hình trụ
      const bodyGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.45, 24, 1, true);
      const body = new THREE.Mesh(bodyGeo, glassMat);
      body.position.y = 0.225;
      body.castShadow = true;
      group.add(body);

      // Đáy cốc
      const bottomGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.01, 24);
      const bottom = new THREE.Mesh(bottomGeo, glassMat);
      bottom.position.y = 0.005;
      group.add(bottom);

      // Nhãn vạch cốc dán trên thành cốc
      const labelGeo = new THREE.PlaneGeometry(0.08, 0.22);
      const labelMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
      const label = new THREE.Mesh(labelGeo, labelMat);
      label.position.set(0, 0.225, 0.178);
      group.add(label);
    }

    // Chất lỏng bên trong cốc
    if (chemical) {
      const liquidGeo = new THREE.CylinderGeometry(0.175, 0.175, 0.25, 24);
      const liquidMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(chemical.color),
        roughness: 0.1,
        transparent: true,
        opacity: chemical.id === 'phenol' ? 0.2 : 0.8
      });
      const liquid = new THREE.Mesh(liquidGeo, liquidMat);
      liquid.name = 'liquid';
      liquid.position.y = 0.13;
      group.add(liquid);
    }

    return group;
  }

  // Tạo bình tam giác
  _createFlaskMesh(chemical) {
    const group = new THREE.Group();
    group.name = 'flask';
    group.userData = {
      type: 'flask',
      title: 'Bình tam giác',
      chemical: chemical ? { ...chemical } : null,
      temp: 298.15,
      pH: chemical ? (chemical.id === 'hcl' ? 1.0 : chemical.id === 'naoh' ? 14.0 : chemical.id === 'cuso4' ? 4.0 : chemical.id === 'na2co3' ? 11.5 : 7.0) : 7.0,
      hasPhenol: false
    };

    const glassMat = this._getGlassMaterial();

    // Thân bình tam giác hình nón cụt
    const bodyGeo = new THREE.CylinderGeometry(0.07, 0.22, 0.46, 24, 1, true);
    const body = new THREE.Mesh(bodyGeo, glassMat);
    body.position.y = 0.23;
    body.castShadow = true;
    group.add(body);

    // Cổ bình hình trụ ngắn hẹp
    const neckGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.1, 24, 1, true);
    const neck = new THREE.Mesh(neckGeo, glassMat);
    neck.position.y = 0.51;
    group.add(neck);

    // Đáy bình
    const bottomGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.01, 24);
    const bottom = new THREE.Mesh(bottomGeo, glassMat);
    bottom.position.y = 0.005;
    group.add(bottom);

    // Chất lỏng bên trong bình tam giác
    if (chemical) {
      // Chất lỏng hình nón cụt tương thích
      const liquidGeo = new THREE.CylinderGeometry(0.12, 0.21, 0.24, 24);
      const liquidMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(chemical.color),
        roughness: 0.1,
        transparent: true,
        opacity: chemical.id === 'phenol' ? 0.2 : 0.8
      });
      const liquid = new THREE.Mesh(liquidGeo, liquidMat);
      liquid.name = 'liquid';
      liquid.position.y = 0.125;
      group.add(liquid);
    }

    return group;
  }

  // Tạo ống nghiệm
  _createTestTubeMesh(chemical) {
    const group = new THREE.Group();
    group.name = 'testtube';
    group.userData = {
      type: 'testtube',
      title: 'Ống nghiệm',
      chemical: chemical ? { ...chemical } : null,
      temp: 298.15,
      pH: chemical ? (chemical.id === 'hcl' ? 1.0 : chemical.id === 'naoh' ? 14.0 : chemical.id === 'cuso4' ? 4.0 : chemical.id === 'na2co3' ? 11.5 : 7.0) : 7.0,
      hasPhenol: false
    };

    const glassMat = this._getGlassMaterial();

    // Thân ống nghiệm hình trụ rỗng
    const bodyGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.4, 16, 1, true);
    const body = new THREE.Mesh(bodyGeo, glassMat);
    body.position.y = 0.2;
    body.castShadow = true;
    group.add(body);

    // Đáy ống nghiệm hình bán cầu chĩa xuống dưới
    const bottomGeo = new THREE.SphereGeometry(0.05, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
    const bottom = new THREE.Mesh(bottomGeo, glassMat);
    bottom.position.y = 0.0;
    bottom.rotation.x = Math.PI; // Chổng ngược bán cầu
    group.add(bottom);

    // Chất lỏng trong ống nghiệm
    if (chemical) {
      const liquidGeo = new THREE.CylinderGeometry(0.046, 0.046, 0.22, 16);
      const liquidMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(chemical.color),
        roughness: 0.1,
        transparent: true,
        opacity: chemical.id === 'phenol' ? 0.2 : 0.8
      });
      const liquid = new THREE.Mesh(liquidGeo, liquidMat);
      liquid.name = 'liquid';
      liquid.position.y = 0.11;
      group.add(liquid);
    }

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

  // Hoạt cảnh rót chất lỏng (Pouring Animation)
  pourVessel(sourceId, targetId, onComplete) {
    const source = this.vessels[sourceId];
    const target = this.vessels[targetId];
    if (!source || !target) return;

    // Vị trí gốc ban đầu của nguồn để lát khôi phục
    const origPos = source.position.clone();
    const origRot = source.rotation.clone();

    // Vị trí rót lý thuyết: đặt nghiêng trên miệng của cốc đích
    // Đích ở target.position. Miệng ở Y tầm +0.45.
    const targetLipHeight = targetId === 'beaker' ? 0.45 : targetId === 'flask' ? 0.52 : 0.4;
    const destPos = target.position.clone().add(new THREE.Vector3(0.18, targetLipHeight + 0.05, 0));

    let frame = 0;
    const totalFrames = 60;

    // Hoạt cảnh rót nước nối bằng Cylinder nối tạm
    let pourStream = null;

    const step = () => {
      frame++;
      
      if (frame <= 20) {
        // Giai đoạn 1: Di chuyển cốc nguồn từ vị trí cũ tới vị trí rót (Lip của cốc đích)
        const t = frame / 20;
        source.position.lerpVectors(origPos, destPos, t);
        // Nghiêng dần cốc nguồn
        source.rotation.z = - (Math.PI / 4) * t;
      } 
      else if (frame <= 45) {
        // Giai đoạn 2: Tạo dòng nước rót và giữ nghiêng
        if (!pourStream) {
          const streamGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.28, 8);
          // Cho pivot dòng nước nằm đỉnh đầu
          streamGeo.translate(0, -0.14, 0);
          
          const chemColor = source.userData.chemical ? source.userData.chemical.color : '#a5f3fc';
          const streamMat = new THREE.MeshBasicMaterial({
            color: new THREE.Color(chemColor),
            transparent: true,
            opacity: 0.8
          });
          pourStream = new THREE.Mesh(streamGeo, streamMat);
          pourStream.position.copy(destPos).add(new THREE.Vector3(-0.06, -0.01, 0));
          this.labGroup.add(pourStream);
        }

        // Bóp méo dòng nước nhẹ
        pourStream.scale.x = 0.9 + Math.sin(frame * 0.5) * 0.1;

        // Giảm dung tích cốc nguồn, tăng dung tích cốc đích
        const srcLiq = source.getObjectByName('liquid');
        const tgtLiq = target.getObjectByName('liquid');
        if (srcLiq && srcLiq.scale.y > 0.01) {
          srcLiq.scale.y -= 0.04;
          srcLiq.position.y -= 0.005;
        }
        if (tgtLiq && tgtLiq.scale.y < 1.4) {
          tgtLiq.scale.y += 0.03;
          tgtLiq.position.y += 0.004;
        }
      } 
      else if (frame <= 60) {
        // Giai đoạn 3: Thu hồi dòng nước rót và đưa cốc nguồn về chỗ cũ
        if (pourStream) {
          this.labGroup.remove(pourStream);
          pourStream = null;
        }
        const t = (frame - 45) / 15;
        source.position.lerpVectors(destPos, origPos, t);
        source.rotation.z = - (Math.PI / 4) * (1.0 - t);
      }

      if (frame < totalFrames) {
        requestAnimationFrame(step);
      } else {
        // Trả trạng thái ban đầu của nguồn
        source.position.copy(origPos);
        source.rotation.copy(origRot);
        
        // Kích hoạt logic phản ứng hóa học trên đích!
        this.triggerReaction(sourceId, targetId);
        
        if (onComplete) onComplete();
      }
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

      const liqMesh = target.getObjectByName('liquid');
      if (liqMesh) {
        // Nếu hỗn hợp có Phenolphthalein:
        // Đổ HCl dư vào NaOH+phenol (hồng đậm -> không màu)
        // Đổ NaOH dư vào HCl+phenol (không màu -> hồng đậm)
        if (target.userData.hasPhenol) {
          // Quyết định màu sắc dựa vào việc chất nào đổ vào chất nào (chất đích ban đầu quyết định môi trường dư)
          if (chemTgt.id === 'naoh') {
            // Rót axit vào kiềm -> dung dịch hóa không màu do HCl trung hòa kiềm NaOH dư
            liqMesh.material.color.setHex(0xf1f5f9); // Không màu
            target.userData.pH = 5.0; // Axit dư nhẹ
          } else {
            // Rót kiềm vào axit -> dung dịch kiềm dư hóa hồng đậm quyến rũ
            liqMesh.material.color.setHex(0xec4899); // Hồng sen cực quyến rũ
            target.userData.pH = 12.0;
          }
        } else {
          // Phản ứng bình thường sinh muối ăn NaCl không màu trong suốt
          liqMesh.material.color.setHex(0xf1f5f9);
        }
      }

      this.reactionRate = 0.85;
      this.activeReaction = 'neutralization';
      this.heatTarget = 313.15; // Tỏa nhiệt tự động lên 40 độ C

      if (this.onReactionTrigger) {
        this.onReactionTrigger(`Đã phản ứng: HCl + NaOH → NaCl + H₂O. Hỗn hợp trung hòa tỏa nhiệt mạnh.`);
      }
    }
    // 2. Phản ứng 2: CuSO4 + NaOH (Phản ứng tạo kết tủa xanh lơ Cu(OH)2)
    else if (ids.includes('cuso4') && ids.includes('naoh')) {
      const liqMesh = target.getObjectByName('liquid');
      if (liqMesh) {
        // Màu đục xanh biển sâu
        liqMesh.material.color.setHex(0x1e3a8a);
        liqMesh.material.roughness = 0.9; // Hóa mờ đục
      }

      // Tạo hiệu ứng kết tủa lắng xuống đáy
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
      const liqMesh = target.getObjectByName('liquid');
      if (liqMesh) {
        liqMesh.material.color.setHex(0xe2e8f0);
      }

      // Sinh bọt khí gas hydro bay ngược lên
      this._spawnGasBubbles(target);

      this.reactionRate = 0.98;
      this.activeReaction = 'gas_h2';
      this.heatTarget = 308.15; // Tỏa nhiệt nhẹ (+10 độ)

      if (this.onReactionTrigger) {
        this.onReactionTrigger(`Đã phản ứng: Zn + 2HCl → ZnCl₂ + H₂↑. Bọt khí Hydro thoát ra sủi bọt liên tục.`);
      }
    }
    // 4. Phản ứng 4: HCl + Na2CO3 (Sủi bọt khí CO2)
    else if (ids.includes('hcl') && ids.includes('na2co3')) {
      const liqMesh = target.getObjectByName('liquid');
      if (liqMesh) {
        liqMesh.material.color.setHex(0xf1f5f9);
      }

      // Sủi bọt khí violent
      this._spawnGasBubbles(target);

      this.reactionRate = 0.99;
      this.activeReaction = 'gas_co2';
      this.heatTarget = 302.15; // Tỏa nhiệt siêu nhẹ

      if (this.onReactionTrigger) {
        this.onReactionTrigger(`Đã phản ứng: Na₂CO₃ + 2HCl → 2NaCl + H₂O + CO₂↑. Khí Cacbonic giải phóng cực mạnh.`);
      }
    }
    // 5. Phản ứng chỉ thị màu thuần túy (Thêm phenolphthalein vào NaOH hoặc kiềm)
    else if (ids.includes('naoh') && ids.includes('phenol')) {
      const liqMesh = target.getObjectByName('liquid');
      if (liqMesh) {
        liqMesh.material.color.setHex(0xec4899); // Chuyển hồng sen sặc sỡ
      }
      target.userData.pH = 13.0;
      if (this.onReactionTrigger) this.onReactionTrigger("Nhỏ chỉ thị Phenolphthalein vào môi trường kiềm NaOH: Hóa hồng đậm sặc sỡ.");
    }
    else {
      // Các pha trộn cơ bản pha loãng dung dịch không sinh phản ứng
      const liqMesh = target.getObjectByName('liquid');
      if (liqMesh && chemSrc.color) {
        // Phối màu trung gian lerp
        const c1 = new THREE.Color(chemTgt.color);
        const c2 = new THREE.Color(chemSrc.color);
        c1.lerp(c2, 0.4);
        liqMesh.material.color.copy(c1);
      }
      if (this.onReactionTrigger) this.onReactionTrigger(`Đã thêm ${chemSrc.name} vào ${target.userData.title}. Chỉ có hiện tượng hòa loãng dung môi.`);
    }

    // Nếu dụng cụ bị phản ứng đang được chọn, cập nhật HUD/Telemetry ngay
    if (target.name === this.selectedVesselId) {
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
          liq.material.color.setHex(parseInt(v.userData.chemical.color.replace('#', '0x')));
          liq.material.roughness = 0.1;
          liq.scale.y = 1.0;
          liq.position.y = key === 'beaker' ? 0.13 : key === 'flask' ? 0.125 : 0.11;
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
        // Gom tất cả các con cháu là Mesh để raycast
        this.vessels[key].traverse(child => {
          if (child.isMesh) {
            child.userData.vesselId = key;
            pickable.push(child);
          }
        });
      }
    }

    const hits = this.raycaster.intersectObjects(pickable, true);
    if (hits.length === 0) return null;

    const targetVesselId = hits[0].object.userData.vesselId;
    return targetVesselId;
  }

  _handleMouseMove(event) {
    const result = this._pick(event);
    this.renderer.domElement.style.cursor = result ? 'pointer' : 'grab';
  }

  _handleMouseUp(event) {
    if (this._downPos) {
      const dx = event.clientX - this._downPos.x;
      const dy = event.clientY - this._downPos.y;
      this._downPos = null;
      // Tránh raycast nhầm khi đang xoay camera kéo chuột
      if (dx * dx + dy * dy > 36) return;
    }

    const clickedVesselId = this._pick(event);
    if (clickedVesselId && clickedVesselId !== 'burner') {
      // Chọn dụng cụ
      this.selectVessel(clickedVesselId);
    } else if (clickedVesselId === 'burner') {
      // Đốt/Tắt lửa khi bấm vào đèn cồn
      this.toggleBurner();
    } else {
      // Click ra ngoài
      this.clearSelection();
    }
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
      if (v) {
        data = {
          name: v.userData.title,
          pH: v.userData.pH,
          temp: v.userData.temp,
          reactants: v.userData.reactants || [],
          chemical: v.userData.chemical
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

    const delta = this._clock.getDelta();
    const time = this._clock.getElapsedTime();

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

  _handleResize() {
    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;

    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(this.width, this.height);
  }
}
