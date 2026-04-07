import { defineCommand, runMain } from "citty";
import { PROVIDERS } from "./constants.local.ts";
import { CONFIG_BASE_URL, CONVERSION_PROVIDER } from "./constants.ts";

/**
 * Generates a Clash subscription URL from structured parameters.
 */
const generateSubUrl = (baseUrl: string, config: Config): string => {
    const url = new URL(baseUrl);

    for (const [key, value] of Object.entries(config)) {
        if (value !== undefined) {
            url.searchParams.set(key, String(value));
        }
    }

    return url.toString();
};

type Config = Record<string, string | boolean | undefined>;

const main = defineCommand({
    meta: {
        name: "fiber-connector",
        description: "Generate and fetch Clash subscription configuration.",
    },
    args: {
        env: {
            type: "string",
            default: "main",
            description: "Branch to use (main or dev)",
        },
    },
    async run({ args }) {
        const branch = args.env === "dev" ? "dev" : "main";
        const configUrl = `${CONFIG_BASE_URL}/${branch}/config/main.ini`;

        const config: Config = {
            target: "clash",
            url: PROVIDERS,
            config: configUrl,
            filename: "beacon.yaml",
            exclude: "流量",
        };

        const finalUrl = generateSubUrl(CONVERSION_PROVIDER, config);
        console.log(`Fetching from: ${configUrl}`);
        console.log(`Final URL: ${finalUrl}`);

        return fetch(finalUrl)
            .then((response) => response.text())
            .then((content) => Bun.write("out/config.yaml", content))
            .then(() => {
                console.log("Successfully wrote to file");
            })
            .catch((error) => {
                console.error("Failed to fetch or write config:", error);
            });
    },
});

runMain(main);
