type EventCallback = (...args: any[]) => void;

export class EventEmitter {
    protected events: Map<string, EventCallback[]>;

    constructor() {
        this.events = new Map();
    }

    public on(eventName: string, callback: EventCallback) {
        if (!this.events.has(eventName)) {
            this.events.set(eventName, []);
        }
        this.events.get(eventName)!.push(callback);
    }

    public off(eventName: string, callback: EventCallback) {
        if (!this.events.has(eventName)) return;
        const callbacks = this.events.get(eventName)!;
        const index = callbacks.indexOf(callback);
        if (index !== -1) {
            callbacks.splice(index, 1);
        }
    }

    public emit(eventName: string, ...args: any[]) {
        if (!this.events.has(eventName)) return;
        this.events.get(eventName)!.forEach(callback => callback(...args));
    }
} 