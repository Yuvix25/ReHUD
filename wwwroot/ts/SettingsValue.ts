export default class SettingsValue<T> {
    private static instances: {[key: string]: SettingsValue<any>} = {};

    name: string;
    value: T;
    callbacks: ((value: T) => void)[] = [];

    constructor(name: string, defaultValue: T) {
        this.name = name;
        this.value = defaultValue;

        SettingsValue.instances[name] = this;
    }

    loadValue(value: T): T {
        this.value = value;
        for (const callback of this.callbacks) {
            callback(value);
        }
        return value;
    }

    static get(key: string): any {
        return SettingsValue.instances[key]?.value;
    }

    static set(key: string, value: any) {
        SettingsValue.instances[key]?.loadValue(value);
    }

    static onValueChanged(key: string, callback: (value: any) => void) {
        SettingsValue.instances[key]?.onValueChanged(callback);
    }

    static loadSettings(settings: any) {
        for (const key of Object.keys(settings)) {
            SettingsValue.set(key, settings[key]);
        }
    }

    onValueChanged(callback: (value: T) => void): SettingsValue<T> {
        this.callbacks.push(callback);
        return this;
    }
}
