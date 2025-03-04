export class DeviceOrientation {
  private container: HTMLDivElement;
  private alpha: number = 0;
  private beta: number = 0;
  private gamma: number = 0;

  constructor() {
    this.container = document.createElement('div');
    this.container.style.position = 'fixed';
    this.container.style.left = '20px';
    this.container.style.bottom = '20px';
    this.container.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    this.container.style.color = 'white';
    this.container.style.padding = '10px';
    this.container.style.borderRadius = '5px';
    this.container.style.fontFamily = 'monospace';
    this.container.style.zIndex = '9999';

    this.init();
  }

  private init() {
    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', this.handleOrientation.bind(this));
    } else {
      this.container.textContent = '디바이스 방향 센서를 지원하지 않습니다.';
    }
  }

  private handleOrientation(event: DeviceOrientationEvent) {
    this.alpha = event.alpha || 0;
    this.beta = event.beta || 0;
    this.gamma = event.gamma || 0;
    
    this.updateDisplay();
  }

  private updateDisplay() {
    this.container.innerHTML = `
      방향: ${this.alpha.toFixed(1)}°<br>
      기울기(앞/뒤): ${this.beta.toFixed(1)}°<br>
      기울기(좌/우): ${this.gamma.toFixed(1)}°
    `;
  }

  public mount() {
    document.body.appendChild(this.container);
  }

  public unmount() {
    document.body.removeChild(this.container);
  }
} 