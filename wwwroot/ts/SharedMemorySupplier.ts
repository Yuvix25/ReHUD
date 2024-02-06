import {ipcRenderer} from 'electron';
import SharedMemoryConsumer from './SharedMemoryConsumer.js';

export default class SharedMemorySupplier {
    private static readonly consumers: SharedMemoryConsumer[] = [];
    private static usedKeys: string[] = null;

    public static registerConsumer(consumer: SharedMemoryConsumer): void {
        this.consumers.push(consumer);
    }

    public static compileUsedKeys(): string[] {
        const keys = new Set<string>();

        for (const consumer of this.consumers) {
            if (!consumer.isEnabled()) {
                continue;
            }
            for (const key of consumer.sharedMemoryKeys) {
                keys.add(key);
            }
        }

        this.usedKeys = Array.from(keys);
        return this.usedKeys;
    }

    public static informBackend(recompile: boolean = false) {
        if (recompile || this.usedKeys === null) {
            this.compileUsedKeys();
        }
        ipcRenderer.send('used-keys', this.usedKeys);
    }
}