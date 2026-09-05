const PLATFORMS = [
  ["macOS", "Apple silicon · Intel", "cleanplate-1.0.0.dmg"],
  ["Windows", "x64 · NVIDIA / AMD", "cleanplate-1.0.0-setup.exe"],
  ["Linux", "AppImage · deb", "cleanplate-1.0.0.AppImage"],
];

export default function Download() {
  return (
    <div className="container-grid py-14">
      <div className="label mb-3">Download</div>
      <h1 className="h-display" style={{ fontSize: 32 }}>Desktop build — offline, licence-key.</h1>
      <p className="text-text-mid mt-2 max-w-[54ch]">
        One Tauri app from the same codebase as the web workbench. Perpetual licence, offline-activatable,
        three machines. No account, nothing uploaded.
      </p>

      <div className="grid md:grid-cols-3 gap-3 mt-10">
        {PLATFORMS.map(([os, sub, file]) => (
          <div key={os} className="card p-5">
            <div className="text-[15px] font-medium">{os}</div>
            <div className="text-[12px] text-text-mid mt-0.5">{sub}</div>
            <a className="btn btn-primary w-full mt-4" href={`/releases/${file}`}>Download</a>
            <div className="num text-[11px] text-text-low mt-2">{file}</div>
          </div>
        ))}
      </div>

      <div className="card p-6 mt-6">
        <div className="label mb-2">Or run the web app</div>
        <p className="text-[13px] text-text-mid max-w-[60ch]">
          Self-host the whole suite with Docker — <span className="num">docker compose up</span> — or open the
          hosted build. Either way, footage is processed on the machine running the engine.
        </p>
        <a href="http://localhost:5173" className="btn mt-4">Open Web App</a>
      </div>
    </div>
  );
}
