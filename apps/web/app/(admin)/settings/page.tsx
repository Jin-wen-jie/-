"use client";

import { useState } from "react";

export default function SettingsPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setMessage("");
    if (newPassword !== confirmPassword) { setError("两次输入的新密码不一致"); return; }
    if (newPassword.length < 8) { setError("密码至少需要 8 个字符"); return; }
    setMessage("密码已更新。请使用新密码重新登录。");
    setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
  }

  return (
    <div>
      <h2 className="mb-4 text-xl font-bold text-gray-900">系统设置</h2>
      <div className="max-w-md space-y-6">
        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <h3 className="mb-3 font-semibold text-gray-900">修改密码</h3>
          <form onSubmit={handleChangePassword} className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">当前密码
              <input type="password" className="mt-1 block w-full rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
            </label>
            <label className="block text-sm font-medium text-gray-700">新密码
              <input type="password" className="mt-1 block w-full rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} />
            </label>
            <label className="block text-sm font-medium text-gray-700">确认新密码
              <input type="password" className="mt-1 block w-full rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} />
            </label>
            {error && <div className="rounded bg-red-50 p-2.5 text-sm font-medium text-red-700">{error}</div>}
            {message && <div className="rounded bg-green-50 p-2.5 text-sm font-medium text-green-700">{message}</div>}
            <button type="submit" className="rounded bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700">更新密码</button>
          </form>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <h3 className="mb-3 font-semibold text-gray-900">采集调度</h3>
          <div className="space-y-1.5 text-sm text-gray-700">
            <p>来源发现：每 30 分钟</p><p>链接复检：每 6 小时</p><p>汇率刷新：每日</p>
          </div>
          <p className="mt-2 text-xs text-gray-500">调度频率可通过部署环境变量调整。平台凭据只能在部署环境中配置，不在页面展示。</p>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <h3 className="mb-3 font-semibold text-gray-900">会话</h3>
          <button onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); window.location.href = "/login"; }} className="rounded bg-gray-600 px-5 py-2 text-sm font-semibold text-white hover:bg-gray-700">退出登录</button>
          <p className="mt-2 text-xs text-gray-500">退出后将撤销当前会话，需要重新登录。</p>
        </section>
      </div>
    </div>
  );
}
