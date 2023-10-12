import EventListener from "./EventListener.js";
import {IExtendedShared} from "./consts.js";

export default abstract class Action extends EventListener {
    protected lastExecution: number = -1;
    protected readonly executeEvery: number;

    protected readonly executeWhileHidden: boolean = false;

    public shouldExecuteWhileHidden() {
        return this.executeWhileHidden;
    }
    
    constructor(executeEvery: number = null) {
        super();
        this.executeEvery = executeEvery;
    }

    shouldExecute(): boolean {
        const now = Date.now();
        return this.executeEvery == null || this.lastExecution + this.executeEvery <= now;
    }

    protected abstract execute(data: IExtendedShared): void;

    public _execute(data: IExtendedShared): void {
        this.lastExecution = new Date().getTime();
        this.execute(data);
    }

    public override toString(): string {
        return this.constructor.name;
    }
}
