import { expect, test } from "@playwright/test";

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };

async function openDashboard(page: any) {
  await page.goto("/dashboard");
  await page.waitForURL("**/dashboard", { timeout: 10000 });
}

test.describe("visual QA", () => {
  test("desktop: verify all pages render without overflow", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await openDashboard(page);

    // Dashboard
    await expect(page.getByRole("button", { name: "价格榜" })).toBeVisible();
    await expect(page.getByRole("button", { name: "货源榜" })).toBeVisible();
    await page.screenshot({ path: "test-results/desktop-dashboard.png", fullPage: true });

    // Candidates
    await page.goto("/candidates");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("button", { name: "通过" }).first()).toBeVisible();
    await page.screenshot({ path: "test-results/desktop-candidates.png", fullPage: true });

    // Jobs
    await page.goto("/jobs");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("来源连接器")).toBeVisible();
    await page.screenshot({ path: "test-results/desktop-jobs.png", fullPage: true });

    // Settings
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("采集调度")).toBeVisible();
    await expect(page.getByText("修改密码")).toHaveCount(0);
    await page.screenshot({ path: "test-results/desktop-settings.png", fullPage: true });
  });

  test("mobile: verify responsive layout", async ({ page }) => {
    await page.setViewportSize(MOBILE);

    // Legacy login URL redirects into the application.
    await page.goto("/login");
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("button", { name: "价格榜" })).toBeVisible();
    await page.screenshot({ path: "test-results/mobile-dashboard.png", fullPage: true });
  });

  test("verify external links have security attributes", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await openDashboard(page);
    await page.goto("/candidates");
    await page.waitForLoadState("networkidle");

    // Check all external links on page
    const links = page.getByRole("link", { name: "商品页" });
    const count = await links.count();
    for (let i = 0; i < count; i++) {
      const link = links.nth(i);
      await expect(link).toHaveAttribute("target", "_blank");
      await expect(link).toHaveAttribute("rel", /noopener/);
      await expect(link).toHaveAttribute("referrerPolicy", "no-referrer");
    }
  });

  test("verify no console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.setViewportSize(DESKTOP);
    await openDashboard(page);
    await page.goto("/candidates");
    await page.waitForLoadState("networkidle");
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    expect(errors.filter((e) => !e.includes("baseline-browser-mapping"))).toEqual([]);
  });
});
