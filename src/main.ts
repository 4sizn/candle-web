import './style.css'
import { Candle } from './components/Candle'

const app = document.querySelector<HTMLDivElement>('#app')!
app.innerHTML = `
  <div id="candle-container" style="width: 100vw; height: 100vh;">
    <div class="controls">
      <button id="toggle-btn">Toggle Candle</button>
      <button id="blow-btn" class="blow-btn">Blow</button>
      <div>
        <label>Blow Strength: </label>
        <input type="range" id="blow-strength" min="0" max="1" step="0.1" value="0">
      </div>
    </div>
  </div>
`

const candleContainer = document.querySelector<HTMLDivElement>('#candle-container')!
const candle = new Candle(candleContainer)

// 토글 버튼 이벤트
const toggleBtn = document.querySelector<HTMLButtonElement>('#toggle-btn')!
toggleBtn.addEventListener('click', () => {
    candle.toggle()
})

// 불기 버튼 이벤트
const blowBtn = document.querySelector<HTMLButtonElement>('#blow-btn')!
let blowInterval: number | null = null;
let currentBlowStrength = 0;
const maxBlowStrength = 1; // 최대 불기 강도를 1로 수정
const blowIncrement = 0.05; // 불기 강도 증가량

blowBtn.addEventListener('mousedown', () => {
    if (blowInterval) return;
    
    // 불기 시작할 때 현재 강도 초기화
    currentBlowStrength = 0;
    
    blowInterval = window.setInterval(() => {
        currentBlowStrength = Math.min(currentBlowStrength + blowIncrement, maxBlowStrength);
        candle.setBlowStrength(currentBlowStrength);
        
        // 불꽃이 꺼지면 interval 중지
        if (currentBlowStrength >= 0.8) { // 0.8에서 불꽃이 꺼지도록 유지
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
    // 불꽃이 완전히 꺼지지 않았을 때만 회복
    if (currentBlowStrength < 0.8) { // 0.8 미만일 때만 회복
        currentBlowStrength = 0;
        candle.startRecovery();
    }
};

blowBtn.addEventListener('mouseup', stopBlowing);
blowBtn.addEventListener('mouseleave', stopBlowing);

// 불기 강도 조절
const blowStrength = document.querySelector<HTMLInputElement>('#blow-strength')!
blowStrength.addEventListener('input', (e) => {
    const strength = parseFloat((e.target as HTMLInputElement).value)
    candle.setBlowStrength(strength)
})

// 디바이스 방향 감지로 중력 효과 구현
if (window.DeviceOrientationEvent) {
    window.addEventListener('deviceorientation', (event) => {
        const x = event.beta ? event.beta / 180 : 0  // -180 ~ 180 범위를 -1 ~ 1로 정규화
        const y = event.gamma ? event.gamma / 90 : 0  // -90 ~ 90 범위를 -1 ~ 1로 정규화
        candle.setGravity(y, -9.8, x)
    })
}

// 윈도우 리사이즈 대응
window.addEventListener('resize', () => {
    candle.resize(window.innerWidth, window.innerHeight)
})
