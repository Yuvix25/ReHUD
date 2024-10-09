using Newtonsoft.Json;
using R3E;
using R3E.Data;

namespace ReHUD.Interfaces;

public interface IEventService
{
    event EventHandler<DriverEventArgs>? NewLap;
    /// <summary>
    /// Only triggered for the main driver because the game does not provide the control type (human/AI) for other drivers.
    /// </summary>
    event EventHandler<DriverEventArgs>? PositionJump;
    event EventHandler<ValueEventArgs<Constant.Session>>? SessionChange;
    event EventHandler<ValueEventArgs<Constant.SessionPhase>>? SessionPhaseChange;
    event EventHandler<ValueEventArgs<int>>? CarChange;
    event EventHandler<ValueEventArgs<int>>? TrackChange;
    event EventHandler<DriverEventArgs>? MainDriverChange;
    event EventHandler<BaseEventArgs>? GamePause;
    event EventHandler<BaseEventArgs>? GameResume;
    event EventHandler<BaseEventArgs>? EnterReplay;
    event EventHandler<BaseEventArgs>? ExitReplay;
    event EventHandler<DriverEventArgs>? EnterPitlane;
    event EventHandler<DriverEventArgs>? ExitPitlane;
    event EventHandler<BaseEventArgs>? PushToPassActivate;
    event EventHandler<BaseEventArgs>? PushToPassDeactivate;
    event EventHandler<BaseEventArgs>? PushToPassReady;

    ICollection<EventLog> Cycle(R3EData data);
}

public class BaseEventArgs : EventArgs {
    public BaseEventArgs(R3EData? oldData, R3EData newData) {
        OldData = oldData;
        NewData = newData;
    }
    
    public R3EData? OldData { get; }
    public R3EData? NewData { get; }
}

public class ValueEventArgs<T> : BaseEventArgs where T : struct {
    public ValueEventArgs(R3EData? oldData, R3EData newData, T? oldValue, T newValue) : base(oldData, newData) {
        OldValue = oldValue;
        NewValue = newValue;
    }

    public T? OldValue { get; }
    public T NewValue { get; }
    
}

public class DriverEventArgs : BaseEventArgs {
    public DriverEventArgs(R3EData? oldData, R3EData newData, DriverData driver, bool isMainDriver) : base(oldData, newData) {
        Driver = driver;
        IsMainDriver = isMainDriver;
    }

    public DriverData Driver { get; }
    public bool IsMainDriver { get; }
}


public class EventLog {
    public string EventName { get; }

    public EventLog(string eventName) {
        EventName = eventName;
    }
}

public class ValueEventLog<T> : EventLog where T : struct {
    public T? OldValue { get; }
    public T NewValue { get; }

    public ValueEventLog(string eventName, T? oldValue, T newValue) : base(eventName) {
        OldValue = oldValue;
        NewValue = newValue;
    }
}

public class DriverEventLog : EventLog {
    public DriverData Driver { get; }
    public bool IsMainDriver { get; }

    public DriverEventLog(string eventName, DriverData driver, bool isMainDriver) : base(eventName) {
        Driver = driver;
        IsMainDriver = isMainDriver;
    }
}