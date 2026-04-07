import { PROVIDERS } from "./constants.local.ts";
/**
 * Generates a Clash subscription URL from structured parameters.
 */

const generateSubUrl = (baseUrl: string, config: Config): string => {
    const url = new URL(baseUrl);

    for (const [key, value] of Object.entries(config)) {
        url.searchParams.set(key, String(value));
    }

    return url.toString();
};

// --- Usage ---

type Config = Record<string, string | boolean | undefined>;

const config: Config = {
    target: "clash",
    url: PROVIDERS,
    config: import.meta.env.CONFIG,
    filename: "beacon.yaml",
    append_info: false,
};

const baseUrl = "https://api.asailor.org/sub";
const finalUrl = generateSubUrl(baseUrl, config);
console.log(finalUrl);
