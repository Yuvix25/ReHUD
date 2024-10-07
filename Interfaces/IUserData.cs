namespace ReHUD.Interfaces
{
    public interface IUserData
    {
        public static readonly string dataPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments), "ReHUD");

        public void Load();
        public void Save();
        public bool Delete();
    }
}