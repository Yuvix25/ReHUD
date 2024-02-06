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
    protected restartToApply = false;

    private restartButton: HTMLButtonElement;

    private isInitialized = false;

    private _isStaticInitialized = false;
    private _isDomIntialized = false;

    protected get isDomInitialized() {
        return this._isDomIntialized;
    }
    protected set isDomInitialized(val: boolean) {
        this._isDomIntialized = val;
        if (val) {
            this.initializationDone();
        }
    }

    protected get isStaticInitialized() {
        return this._isStaticInitialized;
    }
    protected set isStaticInitialized(val: boolean) {
        this._isStaticInitialized = val;
        if (val) {
            this.initializationDone();
        }
    }

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
        if (!this.isDomInitialized || !this.isStaticInitialized) return;

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

    protected staticInitializeDone(callback: (...args: any[]) => void, ...args: any[]) {
        this.isStaticInitialized = true;
        this.onInitialization(callback, ...args);
    }

    protected callback: (value: any) => boolean | void;

    constructor() {
        super();
        SettingComponent.instances.push(this);
    }

    public static initialize(settings: any, valueChangeCallbacks: { [key: string]: (value: any) => boolean | void }) {
        SettingComponent.instances.forEach((instance) => {
            const callback = valueChangeCallbacks[instance.key];
            if (callback) {
                instance.callback = callback;
            }

            let value = settings[instance.key];
            if (value === undefined) {
                value = instance.value;
            }
            instance.staticInitializeDone(instance.valueChange.bind(instance), value);
            if (typeof instance.callback === 'function') instance.callback(value);
        });
    }

    connectedCallback() {
        this.key = this.getAttribute('key');
        this.value = this.getAttribute('value');
        this.restartToApply = this.getAttribute('restart-to-apply') === 'true';
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
                tooltip.innerText = 'info';
                let tooltipText = this.getAttribute('tooltip');
                if (this.restartToApply) {
                    tooltipText += (tooltipText.length > 0 ? ' ' : '') + 'Changes made to this setting will only be applied in the next app launch.';
                }
                tooltip.setAttribute('title', tooltipText);
                tooltip.classList.add('material-symbols-outlined', 'tooltip');

                this.appendChild(tooltip);
            }
            if (this.restartToApply) {
                this.restartButton = document.createElement('button');
                this.restartButton.innerText = 'Restart to apply changes';
                this.restartButton.classList.add('restart-button');
                this.restartButton.classList.add('hidden');
                this.restartButton.addEventListener('click', () => {
                    ipcRenderer.send('restart-app');
                });
                this.appendChild(this.restartButton);
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
            let previousValue = this.value;
            this.valueChange(value);
            if (previousValue != this.value && this.restartToApply) {
                this.showRestartButton();
            }
            if (typeof this.callback === 'function') {
                const res = this.callback(value);
                if (res === false) return;
            };
            this.saveValue();
        }, value);
    }

    private showRestartButton() {
        this.restartButton.classList.remove('hidden');
    }

    public getValue() {
        return this.value;
    }

    public setValue(value: any) {
        this.value = value;
        this.onValueChange(value);
    }
}