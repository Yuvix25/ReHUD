using System.Collections.Immutable;
using System.Reflection;
using log4net;
using R3E;
using R3E.Data;
using ReHUD.Interfaces;
using ReHUD.Models;
using ReHUD.Utils;

namespace ReHUD.Services;

public class EventService : IEventService {
    private static readonly ILog logger = LogManager.GetLogger(typeof(R3EDataService));
    private static readonly float CLOSE_THRESHOLD = 20f;

    private readonly object lockObject = new();

    public event EventHandler<DriverEventArgs>? NewLap;
    public event EventHandler<DriverEventArgs>? PositionJump;
    public event EventHandler<ValueEventArgs<Constant.Session>>? SessionChange;
    public event EventHandler<ValueEventArgs<Constant.SessionPhase>>? SessionPhaseChange;
    public event EventHandler<ValueEventArgs<int>>? CarChange;
    public event EventHandler<ValueEventArgs<int>>? TrackChange;
    public event EventHandler<DriverEventArgs>? MainDriverChange;
    public event EventHandler<BaseEventArgs>? GamePause;
    public event EventHandler<BaseEventArgs>? GameResume;
    public event EventHandler<BaseEventArgs>? EnterReplay;
    public event EventHandler<BaseEventArgs>? ExitReplay;
    public event EventHandler<DriverEventArgs>? EnterPitlane;
    public event EventHandler<DriverEventArgs>? ExitPitlane;
    public event EventHandler<BaseEventArgs>? PushToPassActivate;
    public event EventHandler<BaseEventArgs>? PushToPassDeactivate;
    public event EventHandler<BaseEventArgs>? PushToPassReady;

    private readonly List<IEventRaiser> valueListeners = new();
    private readonly List<EventLog> eventLogs = new();

    public EventService() { // TODO: Verify push to pass events
        try {
            RegisterDefaultHandlers();
            RegisterValueListeners();
        } catch (Exception e) {
            logger.Error("Failed to initialize event service", e);
        }
    }

    private void RegisterDefaultHandlers() {
        logger.Info("Registering default handlers");

        var eventFields = GetType().GetFields(BindingFlags.NonPublic | BindingFlags.Instance).Where(f => f.FieldType.IsGenericType && f.FieldType.GetGenericTypeDefinition() == typeof(EventHandler<>));
        foreach (var field in eventFields) {
            var eventName = field.Name;
            var eventType = field.FieldType.GetGenericArguments();
            if (eventType[0].GetGenericArguments().Length == 1) {
                eventType = new Type[] { eventType[0], eventType[0].GetGenericArguments()[0] };
            }
            var handler = GetType().GetMethods(BindingFlags.NonPublic | BindingFlags.Instance).Single(m => m.Name == "GetDefaultHandler" && m.IsGenericMethod && m.GetGenericArguments().Length == eventType.Length)!.MakeGenericMethod(eventType).Invoke(this, new object[] { eventName });
            field.SetValue(this, handler);
        }
    }


    private EventHandler<T> GetDefaultHandler<T>(string name) where T : BaseEventArgs {
        return (sender, e) => {
            switch (e) {
                case DriverEventArgs driverEventArgs:
                    if (driverEventArgs.IsMainDriver) {
                        logger.InfoFormat("'{0}' event raised for '{1}' (main driver)", name, Driver.GetDriverName(driverEventArgs.Driver.driverInfo));
                    }
                    eventLogs.Add(new DriverEventLog(name, driverEventArgs.Driver, driverEventArgs.IsMainDriver));
                    break;
                default:
                    logger.InfoFormat("'{0}' event raised", name);
                    eventLogs.Add(new EventLog(name));
                    break;
            }
        };
    }

    private EventHandler<T> GetDefaultHandler<T, S>(string name) where T : ValueEventArgs<S> where S: struct {
        return (sender, e) => {
            if (e is ValueEventArgs<S> valueEventArgs) {
                logger.InfoFormat("'{0}' event raised: {1} -> {2}", name, valueEventArgs.OldValue, valueEventArgs.NewValue);
                eventLogs.Add(new ValueEventLog<S>(name, valueEventArgs.OldValue, valueEventArgs.NewValue));
            }
        };
    }

    private void RegisterValueListeners() {
        logger.Info("Registering value listeners");


        valueListeners.Add(new DriverEventRaiser(() => PositionJump, (oldData, newData, oldDriver, newDriver, isMainDriver) => {
            return newDriver.place == newData.position && oldData.controlType != newData.controlType && (Constant.Control)newData.controlType != Constant.Control.Player;
        }));

        valueListeners.Add(new ValueChangeListener<Constant.Session>(() => SessionChange, data => (Constant.Session)data.sessionType));
        valueListeners.Add(new ValueChangeListener<Constant.SessionPhase>(() => SessionPhaseChange, data => (Constant.SessionPhase)data.sessionPhase));
        valueListeners.Add(new ValueChangeListener<int>(() => CarChange, data => data.vehicleInfo.modelId));
        valueListeners.Add(new ValueChangeListener<int>(() => TrackChange, data => data.layoutId));

        valueListeners.Add(new ModeSwitchListener(() => GamePause, () => GameResume, data => data.gamePaused == 1));
        valueListeners.Add(new ModeSwitchListener(() => EnterReplay, () => ExitReplay, data => data.gameInReplay == 1));
        valueListeners.Add(new ModeSwitchListener(() => PushToPassActivate, () => PushToPassDeactivate, data => data.pushToPass.engaged == 1, false));
        valueListeners.Add(new ModeSwitchListener(() => PushToPassReady, () => null, data => data.pushToPass.available == 1 && data.pushToPass.engaged == 0 && data.pushToPass.waitTimeLeft == 0, false));

        valueListeners.Add(new DriverModeSwitchListener(() => MainDriverChange, () => null, (data, driver) => driver.place == data.position));
        valueListeners.Add(new DriverModeSwitchListener(() => EnterPitlane, () => ExitPitlane, (data, driver) => driver.inPitlane == 1, true));

        valueListeners.Add(new DriverEventRaiser(() => NewLap, (oldData, newData, oldDriver, newDriver, isMainDriver) => {
            return oldDriver.inPitlane == newDriver.inPitlane // If pitlane status changed, driver probably reset back to pits.
                && (!isMainDriver || oldData.controlType == (int)Constant.Control.Player) // Control type is only available for main driver.
                && (!isMainDriver || newData.controlType == (int)Constant.Control.Player)
                && oldDriver.lapDistance >= oldData.layoutLength - CLOSE_THRESHOLD
                && newDriver.lapDistance < CLOSE_THRESHOLD;
        }));
    }


    public R3EData? OldData { get; private set; } = null;
    public R3EData? NewData { get; private set; } = null;
    public List<Tuple<DriverData, DriverData>>? DriverMatches { get; private set; } = null;


    public ICollection<EventLog> Cycle(R3EData data) {
        lock (lockObject) {
            OldData = NewData;
            NewData = data;

            eventLogs.Clear();

            if (OldData != null) {
                DriverMatches = Utilities.GetDriverMatches(OldData.Value.driverData, NewData.Value.driverData);
            }
            ProcessValueListeners();
            
            return ImmutableList.CreateRange(eventLogs);
        }
    }

    private void ProcessValueListeners() {
        foreach (var listener in valueListeners) {
            try {
                listener.MaybeRaise(this);
            } catch (Exception e) {
                logger.Error("Failed to process value listener", e);
            }
        }
    }
}


public interface IEventRaiser {
    void MaybeRaise(EventService service);
}


public class ValueChangeListener<T> : IEventRaiser where T : struct {
    private readonly Func<EventHandler<ValueEventArgs<T>>?> eventHandlerGetter;
    private readonly Func<R3EData, T> valueGetter;
    private readonly bool raiseOnStart;


    public ValueChangeListener(Func<EventHandler<ValueEventArgs<T>>?> eventHandlerGetter, Func<R3EData, T> valueGetter, bool raiseOnStart = true) {
        this.eventHandlerGetter = eventHandlerGetter;
        this.valueGetter = valueGetter;
        this.raiseOnStart = raiseOnStart;
    }

    public void MaybeRaise(EventService service) {
        R3EData newData = service.NewData!.Value;
        var newValue = valueGetter(newData);

        if (service.OldData == null && raiseOnStart) {
            eventHandlerGetter()?.Invoke(this, new ValueEventArgs<T>(null, newData, null, newValue));
        } else if (service.OldData != null) {
            var oldData = service.OldData!.Value;
            var oldValue = valueGetter(oldData);

            if (!oldValue.Equals(newValue)) {
                eventHandlerGetter()?.Invoke(this, new ValueEventArgs<T>(oldData, newData, oldValue, newValue));
            }
        }
    }
}


public class ModeSwitchListener : IEventRaiser {
    private readonly Func<EventHandler<BaseEventArgs>?> enterModeHandler;
    private readonly Func<EventHandler<BaseEventArgs>?> exitModeHandler;
    private readonly Func<R3EData, bool> modeChecker;
    private readonly bool raiseOnStart;

    public ModeSwitchListener(Func<EventHandler<BaseEventArgs>?> enterModeHandler, Func<EventHandler<BaseEventArgs>?> exitModeHandler, Func<R3EData, bool> modeChecker, bool raiseOnStart = true) {
        this.enterModeHandler = enterModeHandler;
        this.exitModeHandler = exitModeHandler;
        this.modeChecker = modeChecker;
        this.raiseOnStart = raiseOnStart;
    }

    public void MaybeRaise(EventService service) {
        var newData = service.NewData!.Value;
        if (service.OldData == null && raiseOnStart) {
            if (modeChecker(newData)) {
                enterModeHandler()?.Invoke(this, new BaseEventArgs(null, newData));
            } else {
                exitModeHandler()?.Invoke(this, new BaseEventArgs(null, newData));
            }
        } else if (service.OldData != null) {
            var oldData = service.OldData!.Value;

            if (!modeChecker(oldData) && modeChecker(newData)) {
                enterModeHandler()?.Invoke(this, new BaseEventArgs(oldData, newData));
            } else if (modeChecker(oldData) && !modeChecker(newData)) {
                exitModeHandler()?.Invoke(this, new BaseEventArgs(oldData, newData));
            }
        }
    }
}


public class DriverEventRaiser : IEventRaiser {
    private readonly Func<EventHandler<DriverEventArgs>?> eventHandlerGetter;
    private readonly Func<R3EData, R3EData, DriverData, DriverData, bool, bool> eventChecker;

    public DriverEventRaiser(Func<EventHandler<DriverEventArgs>?> eventHandlerGetter, Func<R3EData, R3EData, DriverData, DriverData, bool, bool> eventChecker) {
        this.eventHandlerGetter = eventHandlerGetter;
        this.eventChecker = eventChecker;
    }

    public void MaybeRaise(EventService service) {
        if (service.OldData == null) {
            return;
        }

        var oldData = service.OldData!.Value;
        var newData = service.NewData!.Value;
        var driverMatches = service.DriverMatches!;
        foreach (var (oldDriver, newDriver) in driverMatches) {
            var isMainDriver = newDriver.place == newData.position;
            if (eventChecker(oldData, newData, oldDriver, newDriver, isMainDriver)) {
                eventHandlerGetter()?.Invoke(this, new DriverEventArgs(oldData, newData, newDriver, isMainDriver));
            }
        }
    }
}

public class DriverModeSwitchListener : IEventRaiser {
    private readonly Func<EventHandler<DriverEventArgs>?> enterModeHandler;
    private readonly Func<EventHandler<DriverEventArgs>?> exitModeHandler;
    private readonly Func<R3EData, DriverData, bool> modeChecker;
    private readonly bool raiseOnStart;

    public DriverModeSwitchListener(Func<EventHandler<DriverEventArgs>?> enterModeHandler, Func<EventHandler<DriverEventArgs>?> exitModeHandler, Func<R3EData, DriverData, bool> modeChecker, bool raiseOnStart = false) {
        this.enterModeHandler = enterModeHandler;
        this.exitModeHandler = exitModeHandler;
        this.modeChecker = modeChecker;
        this.raiseOnStart = raiseOnStart;
    }

    public void MaybeRaise(EventService service) {
        var newData = service.NewData!.Value;
        if (service.OldData == null && raiseOnStart) {
            foreach (var driver in newData.driverData) {
                var isMainDriver = driver.place == newData.position;
                if (modeChecker(newData, driver)) {
                    enterModeHandler()?.Invoke(this, new DriverEventArgs(null, newData, driver, isMainDriver));
                } else {
                    exitModeHandler()?.Invoke(this, new DriverEventArgs(null, newData, driver, isMainDriver));
                }
            }
        } else if (service.OldData != null) {
            var oldData = service.OldData!.Value;
            var drivers = service.DriverMatches!;

            foreach (var (oldDriver, newDriver) in drivers) {
                var isMainDriver = newDriver.place == newData.position;
                if (!modeChecker(oldData, oldDriver) && modeChecker(newData, newDriver)) {
                    enterModeHandler()?.Invoke(this, new DriverEventArgs(oldData, newData, newDriver, isMainDriver));
                } else if (modeChecker(oldData, oldDriver) && !modeChecker(newData, newDriver)) {
                    exitModeHandler()?.Invoke(this, new DriverEventArgs(oldData, newData, newDriver, isMainDriver));
                }
            }
        }
    }
}