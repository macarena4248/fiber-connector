import "./style.css";
import "./responsive.css";
import { buildSubscription, DEFAULT_API, DEFAULT_TEMPLATE } from "./conversion";

function element<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing UI element: ${id}`);
  return found as T;
}

const form = element<HTMLFormElement>("connector");
const subscriptions = element<HTMLTextAreaElement>("subscriptions");
const endpoint = element<HTMLInputElement>("endpoint");
const template = element<HTMLInputElement>("template");
const profileName = element<HTMLInputElement>("profile-name");
const result = element("result");
const resultUrl = element<HTMLTextAreaElement>("result-url");
const status = element("status");
const importLink = element<HTMLAnchorElement>("import");
const copyButton = element<HTMLButtonElement>("copy");

template.value = DEFAULT_TEMPLATE;

form.addEventListener("input", invalidateResult);
element("clear").addEventListener("click", () => {
  subscriptions.value = "";
  invalidateResult();
  subscriptions.focus();
});
element("reset-api").addEventListener("click", () => {
  endpoint.value = DEFAULT_API;
  invalidateResult();
});
form.addEventListener("submit", (event) => {
  event.preventDefault();
  clearErrors();
  const output = buildSubscription({
    subscriptions: subscriptions.value,
    endpoint: endpoint.value,
    template: template.value,
  });
  if ("error" in output) {
    const error = element(`${output.field}-error`);
    error.textContent = output.error;
    error.hidden = false;
    const field = element<HTMLInputElement>(output.field);
    field.setAttribute("aria-invalid", "true");
    if (output.field === "template")
      template.closest("details")?.setAttribute("open", "");
    field.focus();
    return;
  }
  resultUrl.value = output.url;
  importLink.href = `clash://install-config?${new URLSearchParams({ url: output.url, name: profileName.value.trim() || "Fiber" })}`;
  result.hidden = false;
  status.textContent = "Subscription link generated. Ready to copy or import.";
  result.scrollIntoView({ behavior: "smooth", block: "nearest" });
});
copyButton.addEventListener("click", () => {
  if (!navigator.clipboard) return selectForManualCopy();
  void navigator.clipboard
    .writeText(resultUrl.value)
    .then(() => {
      copyButton.textContent = "Copied ✓";
      status.textContent = "Subscription link copied.";
    })
    .catch(() => {
      console.warn(
        "[fiber:clipboard] Clipboard access was denied. Manual copy is available.",
      );
      selectForManualCopy();
    });
});
importLink.addEventListener("click", () => {
  status.textContent =
    "Opening your app. If nothing opens, use Copy link and add it in your app.";
});

function invalidateResult() {
  element("api-attribution").hidden = endpoint.value.trim() !== DEFAULT_API;
  result.hidden = true;
  resultUrl.value = "";
  importLink.removeAttribute("href");
  status.textContent = "";
  copyButton.textContent = "Copy link";
  clearErrors();
  const count = subscriptions.value
    .split(/\r?\n/)
    .filter((line) => line.trim()).length;
  element("link-count").textContent =
    `${count} ${count === 1 ? "link" : "links"}`;
}

function clearErrors() {
  ["subscriptions", "endpoint", "template"].forEach((id) => {
    element(`${id}-error`).hidden = true;
    element(id).removeAttribute("aria-invalid");
  });
}

function selectForManualCopy() {
  resultUrl.focus();
  resultUrl.select();
  status.textContent =
    "Clipboard unavailable. The link is selected; press Ctrl+C or ⌘C to copy.";
}
