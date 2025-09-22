import React, { useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom/client';
import './styles.css';

function useApi() {
  return useMemo(() => window.api, []);
}

function ProviderSelector({ value, onChange, providers, className }) {
  return (
    <select className={className} value={value || ''} onChange={(e) => onChange(e.target.value)}>
      <option value="" disabled>选择模型提供商</option>
      {providers.map((p) => (
        <option key={p.key} value={p.key}>{p.name}</option>
      ))}
    </select>
  );
}

function ProductSelector({ value, onChange, products, className }) {
  return (
    <select className={className} value={value || ''} onChange={(e) => onChange(e.target.value)}>
      <option value="" disabled>选择产品</option>
      {products.map((p) => (
        <option key={p.key} value={p.key}>{p.name}</option>
      ))}
    </select>
  );
}

function AccountSelector({ value, onChange, accounts, className }) {
  return (
    <select className={className} value={value || ''} onChange={(e) => onChange(e.target.value)}>
      <option value="" disabled>选择账号</option>
      {accounts.map((a) => (
        <option key={a.key} value={a.key}>{a.name}</option>
      ))}
    </select>
  );
}

function ConfigPreview({ env }) {
  if (!env) return null;
  return (
    <div className="preview">
      {Object.entries(env).map(([k, v]) => (
        <div className="kv-row" key={k}>
          <div className="key">{k}</div>
          <div className="value">{String(v)}</div>
        </div>
      ))}
    </div>
  );
}

function HomePage({ onConfirm }) {
  const api = useApi();
  const [providers, setProviders] = useState([]);
  const [products, setProducts] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [provider, setProvider] = useState('');
  const [product, setProduct] = useState('');
  const [account, setAccount] = useState('');
  const [env, setEnv] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getModelProviders().then(setProviders).catch((e) => setError(String(e)));
  }, []);

  useEffect(() => {
    if (!provider) return;
    api.getProductsByProvider(provider).then(setProducts).catch((e) => setError(String(e)));
    setProduct('');
    setAccount('');
    setAccounts([]);
    setEnv(null);
  }, [provider]);

  useEffect(() => {
    if (!provider) return;
    api.getAccountsByProvider(provider).then(setAccounts).catch((e) => setError(String(e)));
    setAccount('');
    setEnv(null);
  }, [provider]);

  useEffect(() => {
    if (!provider || !product || !account) return;
    api.buildEnv(provider, product, account)
      .then(setEnv)
      .catch((e) => setError(String(e)));
  }, [provider, product, account]);

  return (
    <div className="app-shell">
      <div className="header">
        <div className="brand">
          <div className="brand-badge" />
          <div>
            <div className="brand-title">API Key Manager</div>
            <div className="subtle">安全地选择与注入模型所需的环境变量</div>
          </div>
        </div>
      </div>
      {error && <div className="panel section" style={{ borderColor: '#e25555' }}>{error}</div>}
      <div className="content">
        <div className="panel section">
          <div className="section-title">选择配置</div>
          <div className="form-grid">
            <div className="field">
              <div className="label">模型提供商</div>
              <ProviderSelector value={provider} onChange={setProvider} providers={providers} className="select" />
            </div>
            <div className="field">
              <div className="label">产品</div>
              <ProductSelector value={product} onChange={setProduct} products={products} className="select" />
            </div>
            <div className="field">
              <div className="label">账号</div>
              <AccountSelector value={account} onChange={setAccount} accounts={accounts} className="select" />
            </div>
          </div>
          <div className="actions">
            <button className="button primary" disabled={!env} onClick={() => onConfirm(env)}>应用到环境</button>
          </div>
        </div>
        <div className="panel section">
          <div className="section-title">合并后的环境变量</div>
          <div className="preview">
            {env ? (
              Object.entries(env).map(([k, v]) => (
                <div className="kv-row" key={k}>
                  <div className="key">{k}</div>
                  <div className="value">{String(v)}</div>
                </div>
              ))
            ) : (
              <span className="subtle">请选择模型提供商、产品和账号以预览</span>
            )}
          </div>
        </div>
      </div>
      <div className="footer subtle">不会上传任何密钥到外部服务器。所有更改仅作用于本机用户目录与 shell 配置。</div>
    </div>
  );
}

function ConfirmPage({ env, onBack }) {
  const api = useApi();
  const [msg, setMsg] = useState('');
  const [targets, setTargets] = useState(null);
  const [shellCandidates, setShellCandidates] = useState([]);
  const [selectedShellFile, setSelectedShellFile] = useState('');

  useEffect(() => {
    Promise.all([
      api.getEnvTargetPaths(),
      api.listShellConfigCandidates()
    ]).then(([t, c]) => {
      setTargets(t);
      setShellCandidates(c);
      const def = (c || []).find((i) => i.isDefault);
      setSelectedShellFile(def?.file || t.shellConfigFile || '');
    }).catch(() => {});
  }, []);

  const apply = async () => {
    try {
      await api.applyEnv(env);
      if (targets) {
        setMsg(`已写入 shell 配置（${targets.shellConfigFile}）并保存到 ${targets.envFile}`);
      } else {
        setMsg('已写入 shell 配置并保存到 ~/.api-key-manager/.env');
      }
    } catch (e) {
      setMsg(String(e));
    }
  };

  return (
    <div className="confirm-shell">
      <div className="panel section">
        <div className="confirm-header">
          <div className="confirm-title">确认应用环境变量</div>
          {msg && <div className="subtle">{msg}</div>}
        </div>
        {targets && (
          <div className="subtle" style={{ marginBottom: 12 }}>
            将写入到以下文件：
            <div style={{ marginTop: 6 }}>
              <div style={{ marginBottom: 6 }}>• Shell 配置文件：</div>
              <select className="select" value={selectedShellFile}
                onChange={async (e) => {
                  const newFile = e.target.value;
                  setSelectedShellFile(newFile);
                  try {
                    const nextTargets = await api.setShellConfigFile(newFile);
                    setTargets(nextTargets);
                    const nextCandidates = await api.listShellConfigCandidates();
                    setShellCandidates(nextCandidates);
                    setMsg('已更新 Shell 配置文件路径');
                  } catch (err) {
                    setMsg(String(err));
                  }
                }}
              >
                {(shellCandidates || []).map((c) => (
                  <option key={c.file} value={c.file}>
                    {c.file}{c.exists ? '' : '（不存在，将在需要时创建）'}{c.isDefault ? '（默认）' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ marginTop: 8 }}>• 环境变量文件：{targets.envFile}</div>
          </div>
        )}
        <ConfigPreview env={env} />
        <div className="confirm-actions">
          <button className="button ghost" onClick={onBack}>返回</button>
          <button className="button primary" onClick={apply}>确认并应用</button>
        </div>
      </div>
    </div>
  );
}

function AppRoot() {
  const [pendingEnv, setPendingEnv] = useState(null);
  if (pendingEnv) {
    return <ConfirmPage env={pendingEnv} onBack={() => setPendingEnv(null)} />;
    }
  return <HomePage onConfirm={setPendingEnv} />;
}

ReactDOM.createRoot(document.getElementById('root')).render(<AppRoot />);
