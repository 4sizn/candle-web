import * as THREE from "three";
import { eventController } from "../utils/EventController";

// 촛불 설정을 위한 인터페이스
export interface CandleOptions {
  flameSize?: number;
  recoverySpeed?: number;
  lightIntensity?: number;
  lightDistance?: number;
  cameraDistance?: number;
  cameraHeight?: number;
  blowStrength?: number;
}

// 기본 설정값
const DEFAULT_OPTIONS: Required<CandleOptions> = {
  flameSize: 1,
  recoverySpeed: 0.02,
  lightIntensity: 2,
  lightDistance: 10,
  cameraDistance: 5,
  cameraHeight: 2,
  blowStrength: 0,
};

export class Candle {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private flame: THREE.Mesh;
  private candleBody: THREE.Mesh;
  private wick: THREE.Mesh; // 심지
  private flameLight: THREE.PointLight; // 불꽃 조명
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private isLit: boolean = true;
  private blowStrength: number;
  private targetBlowStrength: number = 0;
  private recoverySpeed: number;
  private gravity: THREE.Vector3 = new THREE.Vector3(0, -9.8, 0);
  private isDragging: boolean = false;
  private previousMousePosition: { x: number; y: number } = { x: 0, y: 0 };
  private currentRotation: number = 0;
  private cameraDistance: number;
  private cameraHeight: number;
  private flameSize: number;
  private baseIntensity: number;

  constructor(container: HTMLElement, options: CandleOptions = {}) {
    // 옵션 병합
    const settings = { ...DEFAULT_OPTIONS, ...options };

    // 설정값 초기화
    this.flameSize = settings.flameSize;
    this.recoverySpeed = settings.recoverySpeed;
    this.baseIntensity = settings.lightIntensity;
    this.cameraDistance = settings.cameraDistance;
    this.cameraHeight = settings.cameraHeight;
    this.blowStrength = settings.blowStrength;

    // Scene 설정
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000); // 배경을 검은색으로 설정

    // Camera 설정
    this.camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 2, 5);
    this.camera.rotateX((-Math.PI * 20) / 180);

    // Renderer 설정
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio); // 디바이스의 픽셀 비율 적용
    //@ts-ignore
    this.renderer.physicallyCorrectLights = true; // 물리적으로 정확한 조명 사용
    this.renderer.outputColorSpace = THREE.SRGBColorSpace; // 올바른 색상 출력을 위한 인코딩
    container.appendChild(this.renderer.domElement);

    // 바닥 평면 추가
    const floorGeometry = new THREE.PlaneGeometry(10, 10);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x808080,
      roughness: 0.8,
      metalness: 0.2,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1;
    this.scene.add(floor);

    // 촛불 몸체 생성
    const candleGeometry = new THREE.CylinderGeometry(0.5, 0.5, 2, 32);
    const candleMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.5,
      metalness: 0.1,
    });
    this.candleBody = new THREE.Mesh(candleGeometry, candleMaterial);
    this.scene.add(this.candleBody);

    // 심지 생성
    const wickGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.3, 8);
    const wickMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a4a4a,
      roughness: 0.9,
      metalness: 0.1,
    });
    this.wick = new THREE.Mesh(wickGeometry, wickMaterial);
    this.wick.position.y = 1.15;
    this.scene.add(this.wick);

    // 불꽃 생성
    const flameGeometry = new THREE.SphereGeometry(0.15, 64, 64);
    const flameMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        blowStrength: { value: this.blowStrength },
        gravity: { value: this.gravity },
        flameSize: { value: this.flameSize },
      },
      vertexShader: `
                uniform float time;
                uniform float blowStrength;
                uniform vec3 gravity;
                uniform float flameSize;
                
                varying vec2 vUv;
                
                void main() {
                    vUv = uv;
                    vec3 pos = position * flameSize;
                    float heightFactor = (pos.y + 0.15) / 0.3;
                    float noise = sin(time * 5.0 + pos.y * 10.0) * 0.1 * heightFactor;
                    pos.x += noise + blowStrength * gravity.x * heightFactor;
                    pos.z += blowStrength * gravity.z * heightFactor;
                    pos.y += sin(time * 3.0) * 0.05 * heightFactor;
                    pos.y *= 1.5;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                }
            `,
      fragmentShader: `
                varying vec2 vUv;
                
                void main() {
                    vec3 color = vec3(1.0, 0.7, 0.3);
                    float alpha = 0.8;
                    
                    // 불꽃 중심부를 더 밝게, 부드러운 그라데이션 적용
                    vec2 center = vUv - vec2(0.5);
                    float dist = length(center) * 2.0;
                    
                    // 가장자리를 부드럽게 처리
                    float smoothEdge = smoothstep(0.8, 1.0, dist);
                    alpha *= (1.0 - smoothEdge);
                    
                    // 색상 그라데이션 적용
                    color = mix(vec3(1.0, 0.9, 0.5), vec3(1.0, 0.4, 0.2), dist);
                    
                    gl_FragColor = vec4(color, alpha);
                }
            `,
      transparent: true,
      blending: THREE.AdditiveBlending,
    });

    this.flame = new THREE.Mesh(flameGeometry, flameMaterial);
    this.flame.position.y = 1.3;
    this.scene.add(this.flame);

    // 조명 설정
    const ambientLight = new THREE.AmbientLight(0x000000); // 주변광을 최소화
    this.scene.add(ambientLight);

    // 불꽃 조명
    this.flameLight = new THREE.PointLight(0xff9000, this.baseIntensity, 10);
    this.flameLight.position.set(0, 1.5, 0);
    this.scene.add(this.flameLight);

    // 레이캐스터 초기화
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // 이벤트 리스너 추가
    container.addEventListener("mousedown", this.onMouseDown);
    container.addEventListener("mousemove", this.onMouseMove);
    container.addEventListener("mouseup", this.onMouseUp);
    container.addEventListener("mouseleave", this.onMouseUp);

    this.animate();
  }

  private onMouseDown = (event: MouseEvent) => {
    this.isDragging = false; // 클릭 시작 시 드래그 상태 초기화
    this.previousMousePosition = {
      x: event.clientX,
      y: event.clientY,
    };
  };

  private onMouseMove = (event: MouseEvent) => {
    // 마우스가 일정 거리 이상 움직였을 때만 드래그로 간주
    const deltaX = event.clientX - this.previousMousePosition.x;
    const deltaY = event.clientY - this.previousMousePosition.y;
    const dragThreshold = 5; // 드래그로 인정할 최소 이동 거리

    if (
      !this.isDragging &&
      (Math.abs(deltaX) > dragThreshold || Math.abs(deltaY) > dragThreshold)
    ) {
      this.isDragging = true;
    }

    if (!this.isDragging) return;

    // 카메라를 촛불 주위로 회전
    this.currentRotation += deltaX * 0.01;
    this.updateCameraPosition();

    this.previousMousePosition = {
      x: event.clientX,
      y: event.clientY,
    };
  };

  private onMouseUp = (event: MouseEvent) => {
    // 드래그하지 않은 상태에서 마우스를 떼면 클릭으로 간주
    if (!this.isDragging && event.type === "mouseup") {
      // 마우스 좌표를 정규화된 장치 좌표로 변환 (-1 ~ 1)
      const rect = (event.target as HTMLElement).getBoundingClientRect();
      this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      // 레이캐스터 업데이트
      this.raycaster.setFromCamera(this.mouse, this.camera);

      // 촛불 몸체와 심지에 대해 교차 검사
      const intersects = this.raycaster.intersectObjects([
        this.candleBody,
        this.wick,
      ]);

      if (intersects.length > 0) {
        this.toggle();
      }
    }

    this.isDragging = false;
  };

  private animate = () => {
    requestAnimationFrame(this.animate);

    if (this.isLit) {
      if (this.blowStrength !== this.targetBlowStrength) {
        if (this.blowStrength > this.targetBlowStrength) {
          this.blowStrength = Math.max(
            this.targetBlowStrength,
            this.blowStrength - this.recoverySpeed
          );
        } else {
          this.blowStrength = Math.min(
            this.targetBlowStrength,
            this.blowStrength + this.recoverySpeed
          );
        }
        eventController.emit("candleStateChanged", {
          isLit: this.isLit,
          blowStrength: this.blowStrength,
          flameSize: this.flameSize,
          lightIntensity: this.flameLight.intensity,
        });
      }

      const uniforms = (this.flame.material as THREE.ShaderMaterial).uniforms;
      uniforms.time.value += 0.01;
      uniforms.blowStrength.value = this.blowStrength;
      uniforms.gravity.value = this.gravity;
      uniforms.flameSize.value = this.flameSize;

      // 불꽃 크기와 빛의 강도 조절
      const scale = 1 - this.blowStrength;
      this.flame.scale.set(scale, scale, scale);

      // 바람의 영향을 받은 빛의 강도 계산
      this.flameLight.intensity = this.baseIntensity * scale;
    } else {
      // 불이 꺼졌을 때는 빛의 강도를 0으로
      this.flameLight.intensity = 0;
    }

    this.renderer.render(this.scene, this.camera);
  };

  public setBlowStrength(strength: number) {
    this.targetBlowStrength = Math.max(0, Math.min(1, strength));
    if (this.targetBlowStrength >= 1.0) {
      this.isLit = false;
      this.flame.visible = false;
      this.blowStrength = 1;
      this.targetBlowStrength = 1;
    }
    eventController.emit("candleStateChanged", {
      isLit: this.isLit,
      blowStrength: this.blowStrength,
      flameSize: this.flameSize,
      lightIntensity: this.flameLight.intensity,
    });
  }

  public startRecovery() {
    // 불꽃이 완전히 꺼진 상태(blowStrength가 1)가 아닐 때만 회복
    if (this.blowStrength < 1) {
      this.targetBlowStrength = 0;
      if (!this.isLit) {
        this.isLit = true;
        this.flame.visible = true;
      }
    }
  }

  public setGravity(x: number, y: number, z: number) {
    this.gravity.set(x, y, z);
  }

  public toggle() {
    this.isLit = !this.isLit;
    this.flame.visible = this.isLit;

    if (this.isLit) {
      this.blowStrength = 0;
      this.targetBlowStrength = 0;
      this.flameLight.intensity = this.baseIntensity;
    } else {
      this.flameLight.intensity = 0;
    }

    eventController.emit("candleStateChanged", {
      isLit: this.isLit,
      blowStrength: this.blowStrength,
      flameSize: this.flameSize,
      lightIntensity: this.flameLight.intensity,
    });
  }

  public setRecoverySpeed(speed: number) {
    this.recoverySpeed = speed;
  }

  public setLightIntensity(intensity: number) {
    this.baseIntensity = intensity;
    if (this.isLit) {
      const scale = 1 - this.blowStrength;
      this.flameLight.intensity = this.baseIntensity * scale;
    }
    eventController.emit("candleStateChanged", {
      isLit: this.isLit,
      blowStrength: this.blowStrength,
      flameSize: this.flameSize,
      lightIntensity: this.flameLight.intensity,
    });
  }

  public setLightDistance(distance: number) {
    this.flameLight.distance = distance;
  }

  public setCameraDistance(distance: number) {
    this.cameraDistance = distance;
    this.updateCameraPosition();
  }

  public setCameraHeight(height: number) {
    this.cameraHeight = height;
    this.updateCameraPosition();
  }

  private updateCameraPosition() {
    this.camera.position.x =
      Math.sin(this.currentRotation) * this.cameraDistance;
    this.camera.position.y = this.cameraHeight;
    this.camera.position.z =
      Math.cos(this.currentRotation) * this.cameraDistance;
    this.camera.lookAt(0, 1, 0);
    this.camera.rotateX((-Math.PI * 20) / 180);
  }

  public resize(width: number, height: number) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public setFlameSize(size: number) {
    this.flameSize = size;
    const uniforms = (this.flame.material as THREE.ShaderMaterial).uniforms;
    uniforms.flameSize.value = this.flameSize;
    eventController.emit("candleStateChanged", {
      isLit: this.isLit,
      blowStrength: this.blowStrength,
      flameSize: this.flameSize,
      lightIntensity: this.flameLight.intensity,
    });
  }

  // Getter 메서드들 추가
  public getIsLit(): boolean {
    return this.isLit;
  }

  public getFlameSize(): number {
    return this.flameSize;
  }

  public getLightIntensity(): number {
    return this.flameLight.intensity;
  }

  public getCurrentBlowStrength(): number {
    return this.blowStrength;
  }
}
