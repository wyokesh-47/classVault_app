type HuggingFaceRuntimeConfig = {
  variables?: Record<string, string | undefined>;
};

declare global {
  interface Window {
    huggingface?: HuggingFaceRuntimeConfig;
  }
}

export function getPublicConfig(name: string, buildTimeValue?: string): string | undefined {
  const runtimeValue =
    typeof window === "undefined" ? undefined : window.huggingface?.variables?.[name];
  return runtimeValue?.trim() || buildTimeValue?.trim() || undefined;
}
