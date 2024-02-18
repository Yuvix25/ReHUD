import {TransformableId, getRealOffset} from "./consts.js";

export interface TransformableHTMLElement extends HTMLElement {
  id: TransformableId;
}

export type DraggableEvent = {source: TransformableHTMLElement, left: number, top: number, dragged: boolean};
type DraggableEventCallback = (event: DraggableEvent) => void;
type DraggableEvents = {'drag:start': DraggableEventCallback; 'drag:stop': DraggableEventCallback;};

export default class Draggable {
  private element: TransformableHTMLElement;
  private events: DraggableEvents;
  private dragging: boolean;
  private dragged: boolean;
  private startDraggingDispatched: boolean;
  private x: number;
  private y: number;
  private startX: number;
  private startY: number;
  private currentX: number;
  private currentY: number;

  constructor(element: TransformableHTMLElement, events: DraggableEvents) {
    this.element = element;
    this.events = events;

    this.element.addEventListener('mousedown', this.startDragging.bind(this));
    window.addEventListener('mousemove', this.drag.bind(this));
    window.addEventListener('mouseup', this.stopDragging.bind(this));

    this.dragging = false;
    this.dragged = false;
    this.startDraggingDispatched = false;

    const {left, top} = getRealOffset(this.element);
    this.x = left;
    this.y = top;

    this.startX = 0;
    this.startY = 0;

    this.currentX = 0;
    this.currentY = 0;


    this.events['drag:start'] = this.events['drag:start'] ?? (() => {});
    this.events['drag:stop'] = this.events['drag:stop'] ?? (() => {});
  }

  private startDragging(event: MouseEvent) {
    event.preventDefault();

    this.dragging = true;

    const {left, top} = getRealOffset(this.element);
    this.x = left;
    this.y = top;

    this.startX = event.clientX;
    this.startY = event.clientY;
  }

  private drag(event: MouseEvent) {
    if (this.dragging) {
      event.preventDefault();

      this.dragged = true;

      this.currentX = this.x + (event.clientX - this.startX);
      this.currentY = this.y + (event.clientY - this.startY);

      this.element.style.left = `${this.currentX}px`;
      this.element.style.top = `${this.currentY}px`;

      if (!this.startDraggingDispatched) {
        this.events['drag:start'](this.getDragEvent());
        this.startDraggingDispatched = true;
      }
    }
  }


  /**
   * @param {MouseEvent} event 
   */
  private stopDragging(event: MouseEvent) {
    if (!this.dragging) {
      return;
    }

    event.preventDefault();

    this.dragging = false;
    
    this.startDraggingDispatched = false;

    this.x = this.currentX;
    this.y = this.currentY;

    this.events['drag:stop'](this.getDragEvent());

    this.dragged = false;
  }

  private getDragEvent() : DraggableEvent {
    return {source : this.element, left: this.currentX, top: this.currentY, dragged: this.dragged};
  }
}