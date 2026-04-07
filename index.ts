import pc from "picocolors";
import readline from "node:readline";
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
        file: {
            type: "string",
            default: "out/config.yaml",
            description: "Output file path, or 'false' to disable",
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

        console.log(`\n${pc.bold("Branch:")}      ${pc.cyan(branch)}`);
        console.log(`${pc.bold("Config URL:")}  ${pc.green(configUrl)}`);
        console.log(`${pc.bold("Final URL:")}   ${pc.green(finalUrl)}`);
        console.log(`${pc.bold("Output File:")} ${pc.magenta(args.file)}\n`);

        if (args.file === "false") {
            console.log(pc.yellow("ℹ File writing disabled. Skipping fetch.\n"));
            return;
        }

        process.stdout.write(pc.yellow("⟳ Fetching configuration...\r"));

        return fetch(finalUrl)
            .then((response) => response.text())
            .then((content) => {
                return Bun.write(args.file, content).then(() => {
                    readline.clearLine(process.stdout, 0);
                    readline.cursorTo(process.stdout, 0);
                    process.stdout.write(`${pc.green(`✔ Successfully wrote to ${pc.magenta(args.file)}`)}\n\n`);
                });
            })
            .catch((error) => {
                readline.clearLine(process.stdout, 0);
                readline.cursorTo(process.stdout, 0);
                process.stdout.write(`${pc.red("✖ Failed to fetch or write config")}\n\n`);
                console.error(error);
            });
    },
});

runMain(main);
