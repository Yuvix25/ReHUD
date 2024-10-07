using log4net;

namespace ReHUD.Services;

public class DriverManagerService {
    private static readonly ILog logger = LogManager.GetLogger(typeof(DriverManagerService));

    public DriverManagerService() {
        logger.Info("DriverManagerService initialized");
    }
}