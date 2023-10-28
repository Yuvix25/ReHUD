import { ipcRenderer } from "electron";

export default abstract class SettingComponent extends HTMLElement {
    public static readonly elementName: string;

    private static readonly instances: SettingComponent[] = [];
    private static readonly instancesByKey: { [key: string]: SettingComponent } = {};

    public static getInstanceByKey(key: string) {
        return this.instancesByKey[key];
    }

    protected text: string;
    protected key: string;
    protected value: any;

    private isInitialized = false;
    private initializationQueue: [(...args: any[]) => void, any[]][] = [];

    private _isEnabled = true;

    protected abstract _enable(): void;
    protected abstract _disable(): void;

    public enable() {
        this._isEnabled = true;
        requestAnimationFrame(() => {
            this.style.opacity = '1';
            this.style.pointerEvents = 'all';
            this._enable();
        });
    }
    public disable() {
        this._isEnabled = false;
        requestAnimationFrame(() => {
            this.style.opacity = '0.6';
            this.style.pointerEvents = 'none';
            this._disable();
        });
    }

    public get isEnabled() {
        return this._isEnabled;
    }

    protected initializationDone() {
        if (this.isInitialized) return;
        this.isInitialized = true;

        this.initializationQueue.forEach((callback) => callback[0](...callback[1]));
        this.initializationQueue = [];
    }

    protected onInitialization(callback: (...args: any[]) => void, ...args: any[]) {
        if (this.isInitialized) {
            callback(...args);
        } else {
            this.initializationQueue.push([callback, args]);
        }
    }

    protected callback: (value: any) => void;

    constructor() {
        super();
        SettingComponent.instances.push(this);
    }

    public static initialize(settings: any, valueChangeCallbacks: { [key: string]: (value: any) => void }) {
        SettingComponent.instances.forEach((instance) => {
            const callback = valueChangeCallbacks[instance.key];
            if (callback) {
                instance.callback = callback;
            }

            let value = settings[instance.key];
            if (value === undefined) {
                value = instance.value;
            }
            instance.onInitialization(instance.valueChange.bind(instance), value);
            if (typeof instance.callback === 'function') instance.callback(value);
        });
    }

    connectedCallback() {
        this.key = this.getAttribute('key');
        this.value = this.getAttribute('value');
        this.classList.add('setting');
        this.id = this.key;

        SettingComponent.instancesByKey[this.key] = this;

        requestAnimationFrame(() => {
            this.text = this.innerText;
        });

        this.connected();

        requestAnimationFrame(() => {
            if (this.getAttribute('tooltip') != null) {
                const tooltip = document.createElement('span');
                tooltip.innerText = 'ⓘ';
                tooltip.setAttribute('title', this.getAttribute('tooltip'));
                tooltip.classList.add('tooltip');

                this.appendChild(tooltip);
            }
            if (this.getAttribute('disabled') != null) {
                this.disable();
            }
        });
    }

    protected abstract connected(): void;

    public saveValue() {
        ipcRenderer.send('set-setting', [this.key, this.value]);
    }

    protected abstract valueChange(value: any): void;

    protected onValueChange(value: any) {
        this.onInitialization((value) => {
            this.valueChange(value);
            this.saveValue();
            if (typeof this.callback === 'function') this.callback(value);
        }, value);
    }
}