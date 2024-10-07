using ElectronNET.API;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace ReHUD;

static class IpcCommunication {
    public static readonly int DELAY_WARNING = 100;
    public static readonly int DELAY_ERROR = 500;

    /// <summary>
    /// Invokes a channel on the render process and returns the result.
    /// </summary>
    public static async Task<JToken?> Invoke(BrowserWindow window, string channel, object? data = null) {
        if (window == null) {
            Startup.logger.Error("Window is null");
            return null;
        }

        var promise = new TaskCompletionSource<JToken?>();

        var conversationid = Guid.NewGuid().ToString();
        if (conversationid == null) {
            Startup.logger.Error("Failed to generate conversation ID");
            return null;
        }
        var newData = new List<object> { conversationid };
        if (data != null) {
            newData.Add(data);
        }
        try {
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
            Startup.logger.Error($"Error invoking IPC window={window} channel={channel} newData={newData}", e);
            return null;
        }
    }
}