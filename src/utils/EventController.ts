import { EventEmitter } from './EventEmitter';

export class EventController extends EventEmitter {
    private static instance: EventController;

    private constructor() {
        super();
    }

    public static getInstance(): EventController {
        if (!EventController.instance) {
            EventController.instance = new EventController();
        }
        return EventController.instance;
    }
}

export const eventController = EventController.getInstance(); 