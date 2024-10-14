export type Result<T, E = undefined> =
  | { success: true; data: T }
  | { success: false; error: E | undefined };
