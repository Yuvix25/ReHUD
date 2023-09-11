import {ipcRenderer} from "electron";

export default abstract class SettingComponent extends HTMLElement {
    protected text: string;
    protected key: string;
    protected value: any;

    private static readonly instances: SettingComponent[] = [];

    protected callback: (value: any) => void;

    constructor() {
        super();
        SettingComponent.instances.push(this);
    }

    public static initialize(settings: any, valueChangeCallbacks: {[key: string]: (value: any) => void}) {
        SettingComponent.instances.forEach((instance) => {
            const callback = valueChangeCallbacks[instance.key];
            if (callback) {
                instance.callback = callback;
            }

            let value = settings[instance.key];
            if (value === undefined) {
                value = instance.value;
            }
            instance.valueChange(value);
            instance.callback && instance.callback(value);
        });
    }

    connectedCallback() {
        this.key = this.getAttribute('key');
        this.value = this.getAttribute('value');
        this.classList.add('setting');
        this.id = this.key;

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
        });
    }

    protected abstract connected(): void;

    saveValue() {
        ipcRenderer.send('set-setting', [this.key, this.value]);
    }

    protected abstract valueChange(value: any): void;

    protected onValueChange(value: any) {
        this.valueChange(value);
        this.saveValue();
        this.callback && this.callback(value);
    }
}