namespace ReHUD.Extensions
{
    public static class ObjectExtensions
    {
        public static bool IsInt(this object value) => value is long
            || value is ulong
            || value is int
            || value is uint
            || value is short
            || value is ushort;
    }
}
