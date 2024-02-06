import {ipcRenderer} from 'electron';
import {TimeoutError, promiseTimeout} from './consts.js';

export default class IpcCommunication {
    /**
     * Listen to a channel from the main process, and send a response back to the main process.
     * @param channel - The channel to listen to
     * @param callback - The callback to call when the channel is received. The value returned from the callback will be sent back to the main process (awaited if it is a promise).
     */
    static handle(channel: string, callback: (event: Electron.IpcRendererEvent, args: any) => Promise<any>) {
        ipcRenderer.on(channel, (event, args) => {
            (async () => {
                const data = JSON.parse(args[0]);
                const conversationId: string = data[0];
                let res: any = null;
                try {
                    res = await promiseTimeout(callback(event, data[1]), 10000);
                } catch (e) {
                    if (e instanceof TimeoutError) {
                        console.error(`Response to ${channel} timed out.`, e);
                    } else {
                        console.error(e);
                    }
                }

                const response = [Date.now()];
                if (res !== undefined) {
                    response.push(res);
                }

                ipcRenderer.send(conversationId, JSON.stringify(response));
            })();
        });
    }
}
