using ElectronNET.API;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace ReHUD;

static class IpcCommunication {
    public static readonly int DELAY_WARNING = 20;
    public static readonly int DELAY_ERROR = 500;

    /// <summary>
    /// Invokes a channel on the render process and returns the result.
    /// </summary>
    public static async Task<JToken?> Invoke(BrowserWindow window, string channel, object? data = null) {
        try {
            var promise = new TaskCompletionSource<JToken?>();

            var conversationid = Guid.NewGuid().ToString();
            var newData = new object[data == null ? 1 : 2];
            newData[0] = conversationid;
            if (data != null) newData[1] = data;
            Electron.IpcMain.Once(conversationid, (args) => {
                try {
                    var timeNow = DateTimeOffset.Now.ToUnixTimeMilliseconds();
                    var array = (JArray)JsonConvert.DeserializeObject(args.ToString()!)!;

                    var diff = timeNow - array[0].ToObject<long>();
                    if (diff > DELAY_WARNING) {
                        Startup.logger.WarnFormat("IPC responded in {0}ms", diff);
                    }
                    if (diff > DELAY_ERROR) {
                        Startup.logger.ErrorFormat("IPC responded in {0}ms", diff);
                    }
                    if (array.Count > 1) {
                        promise.SetResult(array[1]);
                    }
                } catch (Exception e) {
                    Startup.logger.Error("Error invoking IPC", e);
                }

                promise.SetResult(null);
            });
            Electron.IpcMain.Send(window, channel, JsonConvert.SerializeObject(newData));

            return await promise.Task;
        } catch (Exception e) {
            Startup.logger.Error("Error invoking IPC", e);
            return null;
        }
    }
}