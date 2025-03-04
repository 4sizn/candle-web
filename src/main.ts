import './style.css'
import { Candle } from './components/Candle'

const app = document.querySelector<HTMLDivElement>('#app')!
app.innerHTML = `
  <div id="candle-container" style="width: 100vw; height: 100vh;">
    <div class="status-panel">
      <div class="status-item">
        <span class="status-label">상태:</span>
        <span id="flame-status" class="status-value">켜짐</span>
      </div>
      <div class="status-item">
        <span class="status-label">바람 세기:</span>
        <span id="current-blow-strength" class="status-value">0</span>
      </div>
      <div class="status-item">
        <span class="status-label">불꽃 크기:</span>
        <span id="current-flame-size" class="status-value">1</span>
      </div>
      <div class="status-item">
        <span class="status-label">빛 강도:</span>
        <span id="current-light-intensity" class="status-value">2</span>
      </div>
    </div>
    <div class="controls">
      <div class="control-group">
        <h3>촛불 제어</h3>
        <button id="toggle-btn">Toggle Candle</button>
      </div>

      <div class="control-group">
        <h3>바람 설정</h3>
        <button id="blow-btn" class="blow-btn">Blow</button>
        <div class="control-item">
          <label>바람 세기: </label>
          <input type="range" id="blow-strength" min="0" max="1" step="0.1" value="0">
          <span class="value">0</span>
        </div>
      </div>

      <div class="control-group">
        <h3>불꽃 설정</h3>
        <div class="control-item">
          <label>초기 크기: </label>
          <input type="range" id="flame-size" min="0.5" max="2" step="0.1" value="1">
          <span class="value">1</span>
        </div>
        <div class="control-item">
          <label>회복 속도: </label>
          <input type="range" id="recovery-speed" min="0.01" max="0.1" step="0.01" value="0.02">
          <span class="value">0.02</span>
        </div>
      </div>

      <div class="control-group">
        <h3>조명 설정</h3>
        <div class="control-item">
          <label>빛 강도: </label>
          <input type="range" id="light-intensity" min="0" max="5" step="0.1" value="2">
          <span class="value">2</span>
        </div>
        <div class="control-item">
          <label>빛 거리: </label>
          <input type="range" id="light-distance" min="1" max="20" step="0.5" value="10">
          <span class="value">10</span>
        </div>
      </div>

      <div class="control-group">
        <h3>카메라 설정</h3>
        <div class="control-item">
          <label>카메라 거리: </label>
          <input type="range" id="camera-distance" min="3" max="10" step="0.5" value="5">
          <span class="value">5</span>
        </div>
        <div class="control-item">
          <label>카메라 높이: </label>
          <input type="range" id="camera-height" min="0" max="5" step="0.5" value="2">
          <span class="value">2</span>
        </div>
      </div>
    </div>
  </div>
`

const candleContainer = document.querySelector<HTMLDivElement>('#candle-container')!
const candle = new Candle(candleContainer)

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
const maxBlowStrength = 0.8; // 최대 불기 강도를 0.8로 제한 (불이 꺼지는 임계값)
const blowIncrement = 0.03; // 불기 강도 증가량을 더 작게 조정
const blowDecrement = 0.02; // 불기 강도 감소량

blowBtn.addEventListener('mousedown', () => {
    if (blowInterval) return;
    
    blowInterval = window.setInterval(() => {
        // 현재 설정된 바람 세기 값을 가져옴
        const targetStrength = parseFloat(blowStrength.value);
        
        // 현재 강도를 목표 강도까지 서서히 증가
        if (currentBlowStrength < targetStrength) {
            currentBlowStrength = Math.min(
                targetStrength,
                currentBlowStrength + blowIncrement
            );
            candle.setBlowStrength(currentBlowStrength);
        }
        
        // 최대 강도에 도달하면 불꽃이 꺼짐
        if (currentBlowStrength >= maxBlowStrength) {
            if (blowInterval) {
                clearInterval(blowInterval);
                blowInterval = null;
            }
        }
    }, 50);
});

const stopBlowing = () => {
    if (blowInterval) {
        clearInterval(blowInterval);
        blowInterval = null;
    }

    // 불기를 멈추면 서서히 회복하는 인터벌 시작
    const recoveryInterval = setInterval(() => {
        if (currentBlowStrength > 0) {
            currentBlowStrength = Math.max(0, currentBlowStrength - blowDecrement);
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
    // 슬라이더 변경 시 현재 불고 있는 상태라면 바로 적용
    if (blowInterval) {
        currentBlowStrength = Math.min(maxBlowStrength, strength);
        candle.setBlowStrength(currentBlowStrength);
    }
})

// 회복 속도 조절
const recoverySpeed = document.querySelector<HTMLInputElement>('#recovery-speed')!
recoverySpeed.addEventListener('input', (e) => {
    const speed = parseFloat((e.target as HTMLInputElement).value)
    candle.setRecoverySpeed(speed)
})

// 빛 강도 조절
const lightIntensity = document.querySelector<HTMLInputElement>('#light-intensity')!
lightIntensity.addEventListener('input', (e) => {
    const intensity = parseFloat((e.target as HTMLInputElement).value)
    candle.setLightIntensity(intensity)
})

// 빛 거리 조절
const lightDistance = document.querySelector<HTMLInputElement>('#light-distance')!
lightDistance.addEventListener('input', (e) => {
    const distance = parseFloat((e.target as HTMLInputElement).value)
    candle.setLightDistance(distance)
})

// 카메라 거리 조절
const cameraDistance = document.querySelector<HTMLInputElement>('#camera-distance')!
cameraDistance.addEventListener('input', (e) => {
    const distance = parseFloat((e.target as HTMLInputElement).value)
    candle.setCameraDistance(distance)
})

// 카메라 높이 조절
const cameraHeight = document.querySelector<HTMLInputElement>('#camera-height')!
cameraHeight.addEventListener('input', (e) => {
    const height = parseFloat((e.target as HTMLInputElement).value)
    candle.setCameraHeight(height)
})

// 불꽃 크기 조절
const flameSize = document.querySelector<HTMLInputElement>('#flame-size')!
flameSize.addEventListener('input', (e) => {
    const size = parseFloat((e.target as HTMLInputElement).value)
    candle.setFlameSize(size)
})

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

    // 상태 업데이트 인터벌 설정
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
