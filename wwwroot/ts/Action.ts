import EventListener from "./EventListener.js";
import {IExtendedShared} from "./consts.js";

export default abstract class Action extends EventListener {
    protected lastExecution: number = -1;
    protected readonly executeEvery: number;

    private readonly executeWhileHidden: boolean = false;

    public shouldExecuteWhileHidden() {
        return this.executeWhileHidden;
    }
    
    constructor(name: string, executeEvery: number = null, executeWhileHidden: boolean = false) {
        super(name);
        this.executeEvery = executeEvery;
        this.executeWhileHidden = executeWhileHidden;
    }

    shouldExecute(): boolean {
        const now = Date.now();
        return this.executeEvery == null || this.lastExecution + this.executeEvery <= now;
    }

    protected abstract execute(data: IExtendedShared): void;

    public _execute(data: IExtendedShared): void {
        this.lastExecution = Date.now();
        this.execute(data);
    }
}
