export class InputHistory {
    private history: number[] = [];
    private readonly maxSize: number;

    constructor(maxSize: number) {
        this.maxSize = maxSize;
    }

    public add(value: number): void {
        this.history.push(value);
        if (this.history.length > this.maxSize) {
            this.history.shift();
        }
    }

    public getHistory(): number[] {
        return this.history;
    }
}

export class InputGraph {
    private readonly canvas: HTMLCanvasElement;
    private readonly ctx: CanvasRenderingContext2D;
    private readonly throttleHistory: InputHistory;
    private readonly brakeHistory: InputHistory;

    constructor(canvas: HTMLCanvasElement, historySize: number) {
        this.canvas = canvas;
        const context = canvas.getContext('2d');
        if (!context) {
            throw new Error('Could not get 2d context');
        }
        this.ctx = context;
        this.throttleHistory = new InputHistory(historySize);
        this.brakeHistory = new InputHistory(historySize);
    }

    public update(throttle: number, brake: number): void {
        this.throttleHistory.add(throttle);
        this.brakeHistory.add(brake);
        this.render();
    }

    private render(): void {
        const width = this.canvas.width;
        const height = this.canvas.height;
        this.ctx.clearRect(0, 0, width, height);

        this.drawCurve(this.throttleHistory.getHistory(), '#00ff00'); // Green for throttle
        this.drawCurve(this.brakeHistory.getHistory(), '#ff0000');    // Red for brake
    }

    private drawCurve(history: number[], color: string): void {
        const historyLength = history.length;
        if (historyLength < 2) return;

        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();

        const width = this.canvas.width;
        const height = this.canvas.height;
        const step = width / (historyLength - 1);

        for (let i = 0; i < historyLength; i++) {
            const x = i * step;
            const y = height - (history[i] * height);
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        this.ctx.stroke();
    }
}
