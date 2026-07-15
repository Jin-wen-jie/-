import { expect, test } from "@playwright/test";

test("root opens the dashboard without authentication", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("button", { name: "价格榜" })).toBeVisible();
});

test("legacy login URL redirects to the dashboard", async ({ page }) => {
  await page.goto("/login");
  await expect(page).toHaveURL(/\/dashboard/);
});

test("dashboard is accessible without session cookies", async ({ page }) => {
  await page.context().clearCookies();
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByText("K12 / Bug Team")).toBeVisible();
});
