import * as THREE from 'three';

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
    private blowStrength: number = 0;
    private targetBlowStrength: number = 0;
    private recoverySpeed: number = 0.02;
    private gravity: THREE.Vector3 = new THREE.Vector3(0, -9.8, 0);
    private isDragging: boolean = false;
    private previousMousePosition: { x: number; y: number } = { x: 0, y: 0 };
    private currentRotation: number = 0;

    constructor(container: HTMLElement) {
        // Scene 설정
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000); // 배경을 검은색으로 설정
        
        // Camera 설정
        this.camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
        this.camera.position.set(0, 2, 5);
        this.camera.rotateX(-Math.PI * 20 / 180);
        
        // Renderer 설정
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.physicallyCorrectLights = true; // 물리적으로 정확한 조명 사용
        container.appendChild(this.renderer.domElement);

        // 바닥 평면 추가
        const floorGeometry = new THREE.PlaneGeometry(10, 10);
        const floorMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x808080,
            roughness: 0.8,
            metalness: 0.2
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -1;
        this.scene.add(floor);

        // 촛불 몸체 생성
        const candleGeometry = new THREE.CylinderGeometry(0.5, 0.5, 2, 32);
        const candleMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xFFFFFF,
            roughness: 0.5,
            metalness: 0.1
        });
        this.candleBody = new THREE.Mesh(candleGeometry, candleMaterial);
        this.scene.add(this.candleBody);

        // 심지 생성
        const wickGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.3, 8);
        const wickMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x4A4A4A,
            roughness: 0.9,
            metalness: 0.1
        });
        this.wick = new THREE.Mesh(wickGeometry, wickMaterial);
        this.wick.position.y = 1.15;
        this.scene.add(this.wick);

        // 불꽃 생성
        const flameGeometry = new THREE.SphereGeometry(0.15, 32, 32);
        const flameMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                blowStrength: { value: this.blowStrength },
                gravity: { value: this.gravity }
            },
            vertexShader: `
                uniform float time;
                uniform float blowStrength;
                uniform vec3 gravity;
                
                void main() {
                    vec3 pos = position;
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
                void main() {
                    vec3 color = vec3(1.0, 0.7, 0.3);
                    float alpha = 0.8;
                    
                    // 불꽃 중심부를 더 밝게
                    float center = length(gl_PointCoord - vec2(0.5));
                    color += vec3(0.2, 0.1, 0.0) * (1.0 - center);
                    
                    gl_FragColor = vec4(color, alpha);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending
        });

        this.flame = new THREE.Mesh(flameGeometry, flameMaterial);
        this.flame.position.y = 1.3;
        this.scene.add(this.flame);

        // 조명 설정
        const ambientLight = new THREE.AmbientLight(0x000000); // 주변광을 최소화
        this.scene.add(ambientLight);

        // 불꽃 조명
        this.flameLight = new THREE.PointLight(0xFF9000, 2, 10);
        this.flameLight.position.set(0, 1.5, 0);
        this.scene.add(this.flameLight);

        // 레이캐스터 초기화
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        // 이벤트 리스너 추가
        container.addEventListener('click', this.onClick);
        container.addEventListener('mousedown', this.onMouseDown);
        container.addEventListener('mousemove', this.onMouseMove);
        container.addEventListener('mouseup', () => this.isDragging = false);
        container.addEventListener('mouseleave', () => this.isDragging = false);

        this.animate();
    }

    private onClick = (event: MouseEvent) => {
        // 마우스가 드래그 중이었다면 클릭 이벤트를 무시
        if (this.isDragging) return;

        // 마우스 좌표를 정규화된 장치 좌표로 변환 (-1 ~ 1)
        const rect = (event.target as HTMLElement).getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        // 레이캐스터 업데이트
        this.raycaster.setFromCamera(this.mouse, this.camera);

        // 촛불 몸체와 심지에 대해 교차 검사
        const intersects = this.raycaster.intersectObjects([this.candleBody, this.wick]);

        if (intersects.length > 0) {
            this.toggle();
        }
    }

    private onMouseDown = (event: MouseEvent) => {
        this.isDragging = false; // 드래그 시작 시 초기화
        this.previousMousePosition = {
            x: event.clientX,
            y: event.clientY
        };
    }

    private onMouseMove = (event: MouseEvent) => {
        // 마우스가 일정 거리 이상 움직였을 때만 드래그로 간주
        const deltaX = event.clientX - this.previousMousePosition.x;
        const deltaY = event.clientY - this.previousMousePosition.y;
        const dragThreshold = 5; // 드래그로 인정할 최소 이동 거리

        if (!this.isDragging && (Math.abs(deltaX) > dragThreshold || Math.abs(deltaY) > dragThreshold)) {
            this.isDragging = true;
        }

        if (!this.isDragging) return;

        const deltaMove = {
            x: deltaX,
            y: deltaY
        };

        // 카메라를 촛불 주위로 회전
        this.currentRotation += deltaMove.x * 0.01;
        const radius = 5;
        this.camera.position.x = Math.sin(this.currentRotation) * radius;
        this.camera.position.z = Math.cos(this.currentRotation) * radius;
        this.camera.lookAt(0, 1, 0);
        this.camera.rotateX(-Math.PI * 20 / 180);

        this.previousMousePosition = {
            x: event.clientX,
            y: event.clientY
        };
    }

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
            }

            const uniforms = (this.flame.material as THREE.ShaderMaterial).uniforms;
            uniforms.time.value += 0.01;
            uniforms.blowStrength.value = this.blowStrength;
            uniforms.gravity.value = this.gravity;

            // 불꽃 크기와 빛의 강도 조절
            const scale = 1 - this.blowStrength;
            this.flame.scale.set(scale, scale, scale);
            
            // 불꽃의 크기에 따라 빛의 강도 조절
            const lightIntensity = 2 * scale; // 기본 강도의 2배를 최대로
            this.flameLight.intensity = lightIntensity;
        } else {
            // 불이 꺼졌을 때는 빛의 강도를 0으로
            this.flameLight.intensity = 0;
        }

        this.renderer.render(this.scene, this.camera);
    }

    public setBlowStrength(strength: number) {
        this.targetBlowStrength = Math.max(0, Math.min(1, strength));
        // 불기 강도가 0.8 이상이면 불꽃을 끔
        if (this.targetBlowStrength >= 0.8) {
            this.isLit = false;
            this.flame.visible = false;
            // 불꽃이 꺼진 후에는 blowStrength를 1로 설정하여 완전히 꺼진 상태 유지
            this.blowStrength = 1;
            this.targetBlowStrength = 1;
        }
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
            // 불이 켜질 때는 모든 값을 초기화
            this.blowStrength = 0;
            this.targetBlowStrength = 0;
            this.flameLight.intensity = 2;
        } else {
            // 불이 꺼질 때
            this.flameLight.intensity = 0;
        }
    }

    public resize(width: number, height: number) {
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }
} 