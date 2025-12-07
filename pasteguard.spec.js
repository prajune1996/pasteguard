const path = require("path");
const os = require("os");
const fs = require("fs");
const { test, expect, chromium } = require("@playwright/test");

const EXT_PATH = __dirname;
const TEST_PAGE = "file://" + path.join(EXT_PATH, "test", "manual.html");
const PASTE_HOTKEY = os.platform() === "darwin" ? "Meta+V" : "Control+V";

const TOKENS = [
  { label: "JWT", value: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.signature" },
  { label: "AWS Access Key ID", value: "AKIA1234567890ABCD12" },
  { label: "AWS Secret Access Key", value: "aws secret key=abcdEFGHijklMNOPqrstuvwxYZ1234567890ABCD" },
  { label: "Slack token", value: "xoxb-123456789012-123456789012-ABCDEFGHIJKLMNOPQRST" },
  { label: "GitHub token", value: "ghp_abcdefghijklmnopqrstuvwxyz1234567890" },
  { label: "GitLab token", value: "glpat-abcdefghijklmnopqrstuvwxyz123456" },
  { label: "Stripe secret key", value: "sk_test_51L6XYZabcdefghijklmnopqrstuv" },
  { label: "Google API key", value: "AIza" + "A".repeat(35) },
  { label: "Generic API key", value: "api_key=sk_test_1234567890abcdef" },
  { label: "Bearer token", value: "Bearer AbCdEfGhIjKlMnOpQrStUvWxYz1234567890" },
  { label: "Password assignment", value: "password=SuperSecret123!" },
  { label: "Private key header", value: "-----BEGIN RSA PRIVATE KEY-----" },
  { label: "Email address", value: "someone@example.com" },
  { label: "Credit card", value: "4111 1111 1111 1111" }
];

let context;
let page;
let userDataDir;

test.beforeAll(async () => {
  userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "pasteguard-"));
  context = await chromium.launchPersistentContext(userDataDir, {
    headless: false, // extensions require a non-headless context
    args: [
      `--disable-extensions-except=${EXT_PATH}`,
      `--load-extension=${EXT_PATH}`
    ]
  });
  page = await context.newPage();
  await page.goto(TEST_PAGE);
});

test.afterAll(async () => {
  if (context) {
    await context.close();
  }
  if (userDataDir) {
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }
});

const copyToken = async (label) => {
  const row = page.locator(".row", { hasText: label });
  await row.getByRole("button", { name: "Copy" }).click();
};

const pasteIntoTextarea = async () => {
  const target = page.locator("textarea").first();
  await target.fill("");
  await target.click();
  await page.keyboard.press(PASTE_HOTKEY);
  return target;
};

for (const token of TOKENS) {
  test(`blocks paste for ${token.label}`, async () => {
    await copyToken(token.label);
    const target = await pasteIntoTextarea();

    const modal = page.locator(".pasteguard-modal.pg-visible");
    await expect(modal).toBeVisible({ timeout: 3000 });

    // Cancel to ensure paste was blocked
    await modal.getByRole("button", { name: "Cancel" }).click();
    await expect(modal).toBeHidden({ timeout: 2000 });
    await expect(target).toHaveValue("");
  });
}
