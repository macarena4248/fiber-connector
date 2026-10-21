import { test, expect } from "@playwright/test";

test("builds, copies, and prepares an app import without sending subscriptions", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const externalRequests: string[] = [];
  page.on("request", (request) => {
    if (!request.url().startsWith("http://127.0.0.1:4173/"))
      externalRequests.push(request.url());
  });
  await page.goto("./");
  await expect(page).toHaveTitle(/Fiber Connector/);
  await expect(page.locator("footer, .bottom-note")).toHaveCount(0);
  await expect(page.getByRole("status")).toHaveCSS("height", "0px");
  await page
    .getByRole("button", { name: "Generate subscription link" })
    .click();
  await expect(
    page.getByText("Add at least one subscription URL."),
  ).toBeVisible();
  const sources = [
    "https://one.example/sub?token=a&mode=clash",
    "https://two.example/订阅?token=b%2Bc",
  ];
  await page
    .getByLabel("Subscription links", { exact: true })
    .fill(` ${sources[0]}\r\n\n${sources[1]}\n${sources[0]} `);
  await page
    .getByRole("button", { name: "Generate subscription link" })
    .click();
  const output = page.getByLabel("Subscription URL", { exact: true });
  const converted = new URL(await output.inputValue());
  expect(converted.origin).toBe("https://api.asailor.org");
  expect(converted.pathname).toBe("/sub");
  expect(converted.searchParams.get("target")).toBe("clash");
  expect(converted.searchParams.get("url")).toBe(sources.join("|"));
  expect(converted.searchParams.get("config")).toContain("/config/main.ini");
  const deepLink = new URL(
    (await page
      .getByRole("link", { name: "Import to app" })
      .getAttribute("href")) ?? "",
  );
  expect(deepLink.protocol).toBe("clash:");
  expect(deepLink.searchParams.get("url")).toBe(converted.href);
  await page.getByRole("button", { name: "Copy link" }).click();
  await expect(page.getByRole("status")).toHaveText(
    "Subscription link copied.",
  );
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    converted.href,
  );
  expect(externalRequests).toEqual([]);
  await page
    .getByLabel("Subscription links", { exact: true })
    .fill("https://changed.example/sub");
  await expect(
    page.getByRole("heading", { name: "Your connection is ready" }),
  ).toBeHidden();
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await expect(
    page.getByLabel("Subscription links", { exact: true }),
  ).toHaveValue("");
  await expect(page.locator("#link-count")).toHaveText("0 links");
});

test("custom APIs, template defaults, and validation", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./");
  await page
    .getByLabel("Subscription links", { exact: true })
    .fill("https://one.example/sub");
  const api = page.getByLabel("Converter API", { exact: true });
  await expect(page.locator("#api-attribution")).toBeVisible();
  await api.fill(
    "https://custom.example/prefix/?token=api&target=surge&explain=true&config=old&list=true",
  );
  await expect(page.locator("#api-attribution")).toBeHidden();
  await expect(page.locator("#endpoint-hint")).toContainText(
    "Base URLs and full /sub endpoints are accepted.",
  );
  await page.getByText("Configuration options", { exact: false }).click();
  await page.getByLabel("Routing template URL", { exact: true }).fill("");
  await page
    .getByLabel("Profile name", { exact: true })
    .fill("My profile & 日本");
  await page
    .getByRole("button", { name: "Generate subscription link" })
    .click();
  let output = new URL(
    await page.getByLabel("Subscription URL", { exact: true }).inputValue(),
  );
  expect(output.pathname).toBe("/prefix/sub");
  expect(output.searchParams.get("token")).toBe("api");
  expect(output.searchParams.get("target")).toBe("clash");
  expect(output.searchParams.has("config")).toBe(false);
  expect(output.searchParams.has("list")).toBe(false);
  expect(output.searchParams.has("explain")).toBe(false);
  const deepLink = new URL(
    (await page
      .getByRole("link", { name: "Import to app" })
      .getAttribute("href")) ?? "",
  );
  expect(deepLink.searchParams.get("name")).toBe("My profile & 日本");
  await api.fill("http://localhost:25500/sub/");
  await page
    .getByRole("button", { name: "Generate subscription link" })
    .click();
  output = new URL(
    await page.getByLabel("Subscription URL", { exact: true }).inputValue(),
  );
  expect(output.href).toContain("http://localhost:25500/sub?");
  await api.fill("javascript:alert(1)");
  await page
    .getByRole("button", { name: "Generate subscription link" })
    .click();
  await expect(page.locator("#endpoint-error")).toBeVisible();
  await page.getByRole("button", { name: "Use default" }).click();
  await expect(api).toHaveValue("https://api.asailor.org/sub");
  await expect(page.locator("#api-attribution")).toBeVisible();
  await page
    .getByLabel("Routing template URL", { exact: true })
    .fill("bad template");
  await page
    .getByRole("button", { name: "Generate subscription link" })
    .click();
  await expect(page.locator("#template-error")).toBeVisible();
  await page
    .getByLabel("Subscription links", { exact: true })
    .fill("https://ok.example/sub\ninvalid");
  await page
    .getByRole("button", { name: "Generate subscription link" })
    .click();
  await expect(page.locator("#subscriptions-error")).toContainText("Line 2");
  expect(errors).toEqual([]);
});

test("clipboard fallback and mobile layout", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "clipboard", { value: undefined }),
  );
  await page.goto("./");
  await page
    .getByLabel("Subscription links", { exact: true })
    .fill("https://one.example/sub");
  await page
    .getByRole("button", { name: "Generate subscription link" })
    .click();
  await page.getByRole("button", { name: "Copy link" }).click();
  await expect(page.getByRole("status")).toContainText("The link is selected");
  expect(
    await page
      .locator("#result-url")
      .evaluate(
        (element: HTMLTextAreaElement) =>
          element.selectionEnd - element.selectionStart,
      ),
  ).toBeGreaterThan(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "test-results/mobile.png", fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1200 });
  await page.screenshot({ path: "test-results/desktop.png", fullPage: true });
});

test("denied clipboard access offers manual copy and a safe diagnostic", async ({
  page,
}) => {
  const warnings: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "warning") warnings.push(message.text());
  });
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: () => Promise.reject(new Error("Permission denied")),
      },
    }),
  );
  await page.goto("./");
  await page
    .getByLabel("Subscription links", { exact: true })
    .fill("https://one.example/sub?token=private");
  await page
    .getByRole("button", { name: "Generate subscription link" })
    .click();
  await page.getByRole("button", { name: "Copy link" }).click();
  await expect(page.getByRole("status")).toContainText("The link is selected");
  expect(warnings).toEqual([
    "[fiber:clipboard] Clipboard access was denied. Manual copy is available.",
  ]);
});
