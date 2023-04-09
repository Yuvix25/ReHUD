using System;
// using System.Management;
using System.Diagnostics;

namespace R3E
{
    public class Utilities
    {
        public static Single RpsToRpm(Single rps)
        {
            return rps * (60 / (2 * (Single)Math.PI));
        }

        public static Single MpsToKph(Single mps)
        {
            return mps * 3.6f;
        }

        public static bool IsRrreRunning()
        {
            return Process.GetProcessesByName("RRRE").Length > 0 || Process.GetProcessesByName("RRRE64").Length > 0;
        }

        // public static string? GetDataFilePath()
        // {
        //     Process[] processes = Process.GetProcessesByName("RRRE");
        //     if (processes.Length == 0)
        //         processes = Process.GetProcessesByName("RRRE64");
            
        //     if (processes.Length > 0) {
        //         string? path_ = GetMainModuleFilepath(processes[0].Id);
        //         Console.WriteLine(path_ == null ? "null" : path_);
        //         if (path_ != null) {
        //             string[] path = path_.Split('\\');
        //             path = path.Take(path.Length - 1).ToArray();
        //             if (path[^1] == "x64")
        //                 path = path.Take(path.Length - 1).ToArray();
                    
        //             return string.Join("\\", path) + "\\GameData\\General\\r3e-data.json";
        //         }
        //     }
        //     return null;
        // }

        // private static string? GetMainModuleFilepath(int processId)
        // {
        //     string wmiQueryString = "SELECT ProcessId, ExecutablePath FROM Win32_Process WHERE ProcessId = " + processId;
        //     using (var searcher = new ManagementObjectSearcher(wmiQueryString))
        //     {
        //         using (var results = searcher.Get())
        //         {
        //             ManagementObject? mo = results.Cast<ManagementObject>().FirstOrDefault();
        //             if (mo != null)
        //             {
        //                 return (string)mo["ExecutablePath"];
        //             }
        //         }
        //     }
        //     return null;
        // }
    }
}