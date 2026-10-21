import { z } from "zod";

export const DEFAULT_API = "https://api.asailor.org/sub";
export const DEFAULT_TEMPLATE =
  "https://raw.githubusercontent.com/macarena4248/fiber-connector/refs/heads/main/config/main.ini";

const httpUrl = z
  .url({ protocol: /^https?$/ })
  .pipe(
    z
      .string()
      .refine(
        (value) =>
          !/[\s|]/.test(value) &&
          !new URL(value).hash &&
          !new URL(value).username &&
          !new URL(value).password,
        "Use an HTTP(S) URL without spaces, pipes, fragments, or embedded credentials.",
      ),
  );

export function parseSubscriptions(
  input: string,
): { error: string } | { links: string[] } {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length)
    return { error: "Add at least one subscription URL." } as const;
  const invalidIndex = lines.findIndex(
    (line) => !httpUrl.safeParse(line).success,
  );
  if (invalidIndex !== -1)
    return {
      error: `Line ${invalidIndex + 1}: enter a complete HTTP(S) subscription URL. Encode any spaces or | characters in the URL.`,
    } as const;
  return { links: [...new Set(lines)] } as const;
}

export function buildSubscription(input: {
  subscriptions: string;
  endpoint: string;
  template: string;
}):
  | { url: string }
  | { field: "subscriptions" | "endpoint" | "template"; error: string } {
  const subscriptions = parseSubscriptions(input.subscriptions);
  if ("error" in subscriptions)
    return { field: "subscriptions", error: subscriptions.error } as const;
  const endpoint = httpUrl.safeParse(input.endpoint.trim());
  if (!endpoint.success)
    return {
      field: "endpoint",
      error:
        "Enter a valid HTTP(S) converter URL without fragments or embedded credentials.",
    } as const;
  const template = input.template.trim();
  if (template && !httpUrl.safeParse(template).success)
    return {
      field: "template",
      error: "Enter a valid HTTP(S) routing template URL, or leave it blank.",
    } as const;
  const url = new URL(endpoint.data);
  url.pathname = `${url.pathname.replace(/\/+$/, "").replace(/\/sub$/, "")}/sub`;
  // Keep custom endpoint query parameters, but own the parameters that define our output.
  ["config", "list", "explain", "upload", "script"].forEach((key) =>
    url.searchParams.delete(key),
  );
  url.searchParams.set("target", "clash");
  url.searchParams.set("url", subscriptions.links.join("|"));
  url.searchParams.set("new_name", "true");
  if (template) url.searchParams.set("config", template);
  return { url: url.href } as const;
}
