import {ipcRenderer} from 'electron';

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
                const conversationid: string = data[0];
                const res = await callback(event, data[1]);
                if (res === undefined) {
                    ipcRenderer.send(conversationid);
                } else {
                    ipcRenderer.send(conversationid, JSON.stringify(res));
                }
            })();
        });
    }
}
