import { expect, test } from "@playwright/test";

test("admin reviews a public listing and sees both rankings", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("用户名").fill("owner");
  await page.getByLabel("密码").fill("local-test-password");
  await page.getByRole("button", { name: "登录" }).click();
  await page.goto("/candidates");
  await expect(
    page.getByRole("link", { name: "商品页" }).first(),
  ).toHaveAttribute("rel", /noopener/);
  await page.getByRole("button", { name: "通过" }).first().click();
  await page.goto("/dashboard");
  await expect(page.getByRole("button", { name: "价格榜" })).toBeVisible();
  await expect(page.getByRole("button", { name: "货源榜" })).toBeVisible();
});

test("login page does not show signup", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByText("注册")).toHaveCount(0);
  await expect(page.getByText("sign up")).toHaveCount(0);
});

test("unauthenticated user is redirected to login", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});
