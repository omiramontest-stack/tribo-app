export default class EnvironmentHelper {
  public static readonly APP_BASE_URL: string =
    import.meta.env.VITE_APP_BASE_URL ?? window.location.origin
}
