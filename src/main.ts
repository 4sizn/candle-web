import './style.css'
import { Candle } from './components/Candle'

// 초기 설정값 정의
const initialOptions = {
    flameSize: 1,
    recoverySpeed: 0.02,
    lightIntensity: 2,
    lightDistance: 10,
    cameraDistance: 5,
    cameraHeight: 2,
    blowStrength: 0,
    blowIncrement: 0.5
};

const app = document.querySelector<HTMLDivElement>('#app')!

// 환경 변수에 따라 컨트롤 박스 표시 여부 결정
const showControls = import.meta.env.VITE_SHOW_CONTROLS === 'true';

app.innerHTML = `
  <div id="candle-container" style="width: 100vw; height: 100vh;">
  ${showControls ? `
  <div class="status-panel">
      <div class="status-item">
        <span class="status-label">상태:</span>
        <span id="flame-status" class="status-value">켜짐</span>
      </div>
      <div class="status-item">
        <span class="status-label">바람 세기:</span>
        <span id="current-blow-strength" class="status-value">${initialOptions.blowStrength}</span>
      </div>
      <div class="status-item">
        <span class="status-label">불꽃 크기:</span>
        <span id="current-flame-size" class="status-value">${initialOptions.flameSize}</span>
      </div>
      <div class="status-item">
        <span class="status-label">빛 강도:</span>
        <span id="current-light-intensity" class="status-value">${initialOptions.lightIntensity}</span>
      </div>
    </div>
    ` : ''}
    ${showControls ? `
    <div class="controls">
      <div class="control-group">
        <h3>촛불 제어</h3>
        <button id="toggle-btn">Toggle Candle</button>
      </div>

      <div class="control-group">
        <h3>바람 설정</h3>
        <button id="blow-btn" class="blow-btn">Blow</button>
        <div class="control-item">
          <label>최대 바람 량: </label>
          <input type="range" id="blow-strength" min="0" max="1" step="0.1" value="${initialOptions.blowStrength}">
          <span class="value">${initialOptions.blowStrength}</span>
        </div>
        <div class="control-item">
          <label>바람 속도: </label>
          <input type="range" id="blow-increment" min="0" max="1" step="0.1" value="${initialOptions.blowIncrement}">
          <span class="value">${initialOptions.blowIncrement}</span>
        </div>
      </div>

      <div class="control-group">
        <h3>불꽃 설정</h3>
        <div class="control-item">
          <label>초기 크기: </label>
          <input type="range" id="flame-size" min="0.5" max="2" step="0.1" value="${initialOptions.flameSize}">
          <span class="value">${initialOptions.flameSize}</span>
        </div>
        <div class="control-item">
          <label>회복 속도: </label>
          <input type="range" id="recovery-speed" min="0.01" max="0.1" step="0.01" value="${initialOptions.recoverySpeed}">
          <span class="value">${initialOptions.recoverySpeed}</span>
        </div>
      </div>

      <div class="control-group">
        <h3>조명 설정</h3>
        <div class="control-item">
          <label>빛 강도: </label>
          <input type="range" id="light-intensity" min="0" max="5" step="0.1" value="${initialOptions.lightIntensity}">
          <span class="value">${initialOptions.lightIntensity}</span>
        </div>
        <div class="control-item">
          <label>빛 거리: </label>
          <input type="range" id="light-distance" min="1" max="20" step="0.5" value="${initialOptions.lightDistance}">
          <span class="value">${initialOptions.lightDistance}</span>
        </div>
      </div>

      <div class="control-group">
        <h3>카메라 설정</h3>
        <div class="control-item">
          <label>카메라 거리: </label>
          <input type="range" id="camera-distance" min="3" max="10" step="0.5" value="${initialOptions.cameraDistance}">
          <span class="value">${initialOptions.cameraDistance}</span>
        </div>
        <div class="control-item">
          <label>카메라 높이: </label>
          <input type="range" id="camera-height" min="0" max="5" step="0.5" value="${initialOptions.cameraHeight}">
          <span class="value">${initialOptions.cameraHeight}</span>
        </div>
      </div>
    </div>
    ` : ''}
  </div>
`

const candleContainer = document.querySelector<HTMLDivElement>('#candle-container')!

const candle = new Candle(candleContainer, initialOptions);

// 초기 카메라 위치 설정
candle.setCameraDistance(initialOptions.cameraDistance);
candle.setCameraHeight(initialOptions.cameraHeight);

// 컨트롤 박스가 표시될 때만 이벤트 리스너 등록
if (showControls) {
    // 모든 range input의 값 표시 업데이트
    document.querySelectorAll('.control-item input[type="range"]').forEach(input => {
        const valueDisplay = input.nextElementSibling as HTMLElement;
        input.addEventListener('input', (e) => {
            const value = (e.target as HTMLInputElement).value;
            valueDisplay.textContent = value;
        });
    });

    // 토글 버튼 이벤트
    const toggleBtn = document.querySelector<HTMLButtonElement>('#toggle-btn')!
    toggleBtn.addEventListener('click', () => {
        candle.toggle()
    })

    // 불기 버튼 이벤트
    const blowBtn = document.querySelector<HTMLButtonElement>('#blow-btn')!
    let blowInterval: number | null = null;
    let currentBlowStrength = 0;
    const maxBlowStrength = 1.0;
    
    // 이지잉 함수 (부드러운 가속)
    const easeInQuad = (t: number) => t * t;

    blowBtn.addEventListener('mousedown', () => {
        if (blowInterval) return;
        
        currentBlowStrength = 0; // 시작할 때 바람 세기 초기화
        const startTime = Date.now();
        
        blowInterval = window.setInterval(() => {
            const currentTime = Date.now();
            const totalElapsedTime = (currentTime - startTime) / 1000;
            
            const targetStrength = parseFloat(blowStrength.value);
            const speed = parseFloat(blowIncrementInput.value);
            
            if (currentBlowStrength < targetStrength) {
                if (speed >= 0.9) {
                    // 매우 빠른 속도 (0.9~1.0)일 때는 즉시 목표값으로
                    currentBlowStrength = targetStrength;
                } else {
                    // 속도에 따른 부드러운 증가 (0~0.9)
                    const duration = 2.0 * (1 - speed);
                    const progress = Math.min(1, totalElapsedTime / duration);
                    const easedProgress = easeInQuad(progress);
                    currentBlowStrength = targetStrength * easedProgress;
                }
                
                candle.setBlowStrength(currentBlowStrength);
            }
            
            if (currentBlowStrength >= targetStrength) {
                if (blowInterval) {
                    clearInterval(blowInterval);
                    blowInterval = null;
                }
            }
        }, 16);
    });

    const stopBlowing = () => {
        if (blowInterval) {
            clearInterval(blowInterval);
            blowInterval = null;
        }

        const recoveryInterval = setInterval(() => {
            const currentRecoverySpeed = parseFloat(recoverySpeed.value);
            if (currentBlowStrength > 0) {
                currentBlowStrength = Math.max(0, currentBlowStrength - currentRecoverySpeed);
                candle.setBlowStrength(currentBlowStrength);
            } else {
                clearInterval(recoveryInterval);
                candle.startRecovery();
            }
        }, 50);
    };

    blowBtn.addEventListener('mouseup', stopBlowing);
    blowBtn.addEventListener('mouseleave', stopBlowing);

    // 불기 강도 조절
    const blowStrength = document.querySelector<HTMLInputElement>('#blow-strength')!
    blowStrength.addEventListener('input', (e) => {
        const strength = parseFloat((e.target as HTMLInputElement).value);
        if (blowInterval) {
            currentBlowStrength = Math.min(maxBlowStrength, strength);
            candle.setBlowStrength(currentBlowStrength);
        }
    });

    // 회복 속도 조절
    const recoverySpeed = document.querySelector<HTMLInputElement>('#recovery-speed')!
    recoverySpeed.addEventListener('input', (e) => {
        const speed = parseFloat((e.target as HTMLInputElement).value)
        candle.setRecoverySpeed(speed)
    });

    // 빛 강도 조절
    const lightIntensity = document.querySelector<HTMLInputElement>('#light-intensity')!
    lightIntensity.addEventListener('input', (e) => {
        const intensity = parseFloat((e.target as HTMLInputElement).value)
        candle.setLightIntensity(intensity)
    });

    // 빛 거리 조절
    const lightDistance = document.querySelector<HTMLInputElement>('#light-distance')!
    lightDistance.addEventListener('input', (e) => {
        const distance = parseFloat((e.target as HTMLInputElement).value)
        candle.setLightDistance(distance)
    });

    // 카메라 거리 조절
    const cameraDistance = document.querySelector<HTMLInputElement>('#camera-distance')!
    cameraDistance.addEventListener('input', (e) => {
        const distance = parseFloat((e.target as HTMLInputElement).value)
        candle.setCameraDistance(distance)
    });

    // 카메라 높이 조절
    const cameraHeight = document.querySelector<HTMLInputElement>('#camera-height')!
    cameraHeight.addEventListener('input', (e) => {
        const height = parseFloat((e.target as HTMLInputElement).value)
        candle.setCameraHeight(height)
    });

    // 불꽃 크기 조절
    const flameSize = document.querySelector<HTMLInputElement>('#flame-size')!
    flameSize.addEventListener('input', (e) => {
        const size = parseFloat((e.target as HTMLInputElement).value)
        candle.setFlameSize(size)
    });

    // 바람 속도 조절
    const blowIncrementInput = document.querySelector<HTMLInputElement>('#blow-increment')!
    blowIncrementInput.addEventListener('input', (e) => {
        const speed = parseFloat((e.target as HTMLInputElement).value);
    });
}

// 디바이스 방향 감지로 중력 효과 구현
if (window.DeviceOrientationEvent) {
    window.addEventListener('deviceorientation', (event) => {
        const x = event.beta ? event.beta / 180 : 0
        const y = event.gamma ? event.gamma / 90 : 0
        candle.setGravity(y, -9.8, x)
    })
}

// 윈도우 리사이즈 대응
window.addEventListener('resize', () => {
    candle.resize(window.innerWidth, window.innerHeight)
})

// 상태 업데이트 함수
const updateStatus = () => {
    const flameStatus = document.querySelector<HTMLElement>('#flame-status')!;
    const currentBlowStrengthEl = document.querySelector<HTMLElement>('#current-blow-strength')!;
    const currentFlameSizeEl = document.querySelector<HTMLElement>('#current-flame-size')!;
    const currentLightIntensityEl = document.querySelector<HTMLElement>('#current-light-intensity')!;

    setInterval(() => {
        const isLit = candle.getIsLit();
        flameStatus.textContent = isLit ? '켜짐' : '꺼짐';
        flameStatus.className = `status-value ${isLit ? 'on' : 'off'}`;
        
        currentBlowStrengthEl.textContent = candle.getCurrentBlowStrength().toFixed(2);
        currentFlameSizeEl.textContent = candle.getFlameSize().toFixed(2);
        currentLightIntensityEl.textContent = candle.getLightIntensity().toFixed(1);
    }, 100);
};

// 초기 상태 업데이트 시작
updateStatus();
