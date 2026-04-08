import readline from "node:readline";
import { defineCommand, runMain } from "citty";
import { PROVIDERS, BASE_CONFIG } from "./constants.local.ts";
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

const generateIniContent = (configObj: Config): string => {
    let content = "[Profile]\n";
    for (const [key, value] of Object.entries(configObj)) {
        if (value !== undefined) {
            content += `${key}=${value}\n`;
        }
    }
    return content;
};

const compileCommand = defineCommand({
    meta: {
        name: "compile",
        description: "Generate INI profiles for full and mini subscriptions.",
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

        const fullConfig: Config = {
            ...BASE_CONFIG,
            url: PROVIDERS.join("|"),
            config: configUrl,
        };

        const miniConfig: Config = {
            ...BASE_CONFIG,
            url: PROVIDERS[0],
            config: configUrl,
        };

        await Promise.all([
            Bun.write("out/full.ini", generateIniContent(fullConfig)),
            Bun.write("out/mini.ini", generateIniContent(miniConfig)),
        ]);
        
        console.log(`Successfully wrote out/full.ini and out/mini.ini`);
    },
});

const combineCommand = defineCommand({
    meta: {
        name: "combine",
        description: "Combine configuration and fetch final subscription.",
    },
    args: {
        env: {
            type: "string",
            default: "main",
            description: "Branch to use (main or dev)",
        },
        file: {
            type: "string",
            default: "out/config.yaml",
            description: "Output file path, or 'false' to disable",
        },
    },
    async run({ args }) {
        const branch = args.env === "dev" ? "dev" : "main";
        const configUrl = `${CONFIG_BASE_URL}/${branch}/config/main.ini`;

        const fullConfig: Config = {
            ...BASE_CONFIG,
            url: PROVIDERS.join("|"),
            config: configUrl,
        };

        const finalUrl = generateSubUrl(CONVERSION_PROVIDER, fullConfig);

        console.log(`\nBranch:      ${branch}`);
        console.log(`Config URL:  ${configUrl}`);
        console.log(`Final URL:   ${finalUrl}`);
        console.log(`Output File: ${args.file}\n`);

        if (args.file === "false") {
            console.log("ℹ File writing disabled. Skipping fetch.\n");
            return;
        }

        process.stdout.write("⟳ Fetching configuration...\r");

        return fetch(finalUrl)
            .then((response) => response.text())
            .then((content) => {
                return Bun.write(args.file, content).then(() => {
                    readline.clearLine(process.stdout, 0);
                    readline.cursorTo(process.stdout, 0);
                    process.stdout.write(`✔ Successfully wrote to ${args.file}\n\n`);
                });
            })
            .catch((error) => {
                readline.clearLine(process.stdout, 0);
                readline.cursorTo(process.stdout, 0);
                process.stdout.write(`✖ Failed to fetch or write config\n\n`);
                console.error(error);
            });
    },
});

const main = defineCommand({
    meta: {
        name: "fiber-connector",
        description: "Fiber Connector CLI tool.",
    },
    subCommands: {
        compile: compileCommand,
        combine: combineCommand,
    },
});

runMain(main);