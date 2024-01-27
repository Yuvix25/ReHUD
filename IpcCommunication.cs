using ElectronNET.API;
using Newtonsoft.Json;

namespace ReHUD;

static class IpcCommunication {
    /// <summary>
    /// Invokes a channel on the render process and returns the result.
    /// </summary>
    public static async Task<object?> Invoke(BrowserWindow window, string channel, object? data = null) {
        try {
            var promise = new TaskCompletionSource<object>();

            var conversationid = Guid.NewGuid().ToString();
            var newData = new object[data == null ? 1 : 2];
            newData[0] = conversationid;
            if (data != null) newData[1] = data;
            Electron.IpcMain.Once(conversationid, (args) => {
                promise.SetResult(args);
            });
            Electron.IpcMain.Send(window, channel, JsonConvert.SerializeObject(newData));

            return await promise.Task;
        } catch (Exception e) {
            Startup.logger.Error("Error invoking IPC", e);
            return null;
        }
    }
}