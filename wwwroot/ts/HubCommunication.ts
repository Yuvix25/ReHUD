import * as signalR from "@microsoft/signalr";
import {ipcRenderer} from 'electron';

ipcRenderer.on('port', (event, port) => {
    HubCommunication.setPort(port);
});
ipcRenderer.send('get-port');

export default class HubCommunication {
    private hubConnection: signalR.HubConnection;
    private invokeQueue: Array<() => void> = [];
    private didLoad = false;

    private static onPortSetListeners: Array<(port: string) => void> = [];
    private static port: string = null;
    public static setPort(port: number) {
        const portStr = port.toString();
        if (this.port != null && this.port != portStr) {
            throw new Error(`Tried to set port to ${port} but it was already set to ${this.port}`);
        }
        if (this.port == null) {
          this.port = portStr;
          for (const listener of this.onPortSetListeners) {
            listener(portStr);
          }
          this.onPortSetListeners = [];
        }
    }

    public static onPortSet(callback: (port: string) => void) {
        if (HubCommunication.port != null) {
            callback(HubCommunication.port);
        } else {
            this.onPortSetListeners.push(callback);
        }
    }

    constructor() {
        HubCommunication.onPortSet((port) => {
            this.hubConnection = new signalR.HubConnectionBuilder()
            .withUrl(`http://localhost:${port}/ReHUDHub`)
            .build();
            
            this.startConnection();
        });
    }

    public startConnection() {
        return new Promise<void>((resolve, reject) => {
            this.hubConnection
                .start()
                .then(() => {
                    console.log("Connection started on port", HubCommunication.port);
                    for (const invoke of this.invokeQueue) {
                        invoke();
                    }
                    this.invokeQueue = [];
                    this.didLoad = true;
                    resolve();
                })
                .catch((err): void => { // Add return type annotation
                    console.log("Error while starting connection", err);
                    reject(err);
                });
        });
    }

    public on(event: string, callback: (...args: any[]) => void) {
        this.hubConnection.on(event, callback);
    }

    public invoke(event: string, ...args: any[]) {
        if (this.didLoad) {
            return this.hubConnection.invoke(event, ...args);
        }

        return new Promise<any>((resolve, reject) => {
            this.invokeQueue.push(() => {
                if (this.hubConnection.state != signalR.HubConnectionState.Connected) {
                    const reason = `Hub connection is in '${this.hubConnection.state}' state, cannot invoke '${event}'`;
                    console.log(reason);
                    reject(new Error(reason));
                    return;
                }
                this.hubConnection
                  .invoke(event, ...args)
                  .then((value) => resolve(value))
                  .catch((err) => reject(err));
            });
        });
    }
}