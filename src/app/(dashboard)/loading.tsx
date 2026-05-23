export default function DashboardLoading() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">B</span>
          <span>
            <strong>Bili Stats</strong>
            <small>个人观看记录</small>
          </span>
        </div>
      </aside>
      <main className="content">
        <div className="loading-bar" />
        <section className="dashboard-loading" aria-label="加载中">
          <span />
          <span />
          <span />
        </section>
      </main>
    </div>
  );
}
