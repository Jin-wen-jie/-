export default function SettingsPage() {
  return (
    <div>
      <h2 className="mb-4 text-xl font-bold text-gray-900">系统设置</h2>
      <div className="max-w-md space-y-6">
        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <h3 className="mb-3 font-semibold text-gray-900">采集调度</h3>
          <div className="space-y-1.5 text-sm text-gray-700">
            <p>来源发现：每 30 分钟</p><p>链接复检：每 6 小时</p><p>汇率刷新：每日</p>
          </div>
          <p className="mt-2 text-xs text-gray-500">调度频率可通过部署环境变量调整。平台凭据只能在部署环境中配置，不在页面展示。</p>
        </section>
      </div>
    </div>
  );
}
