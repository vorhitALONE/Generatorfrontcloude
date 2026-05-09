"use client";
import { useEffect, useState, useCallback } from "react";

const API_URL = "https://vorhitalone-generatorbdcloude-76f1.twc1.net";

export default function Page() {
  const [value, setValue] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ total: 0, used: 0, remaining: 0 });

  const [showAdmin, setShowAdmin] = useState(false);
  const [token, setToken] = useState(null);
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginErr, setLoginErr] = useState(null);

  const [sequence, setSequence] = useState([]);
  const [addSingle, setAddSingle] = useState("");
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");
  const [addMsg, setAddMsg] = useState(null);
  const [tab, setTab] = useState("series");

  const [newPass1, setNewPass1] = useState("");
  const [newPass2, setNewPass2] = useState("");
  const [passMsg, setPassMsg] = useState(null);

  const flash = (setter, msg, ok = true, ms = 2500) => {
    setter({ msg, ok });
    setTimeout(() => setter(null), ms);
  };

  const fetchStats = useCallback(async () => {
    if (!API_URL) return;
    try {
      const r = await fetch(`${API_URL}/api/sequence/stats`, { cache: "no-store" });
      const d = await r.json();
      if (d.ok) setStats(d);
    } catch {}
  }, []);

  const fetchActive = useCallback(async () => {
    if (!API_URL) return;
    try {
      const r = await fetch(`${API_URL}/api/active`, { cache: "no-store" });
      const d = await r.json();
      if (d.ok && d.value !== null) setValue(d.value);
    } catch {}
  }, []);

  useEffect(() => { fetchActive(); fetchStats(); }, []);

  const generate = async () => {
    setLoading(true); setError(null);
    try {
      if (!API_URL) { setValue(Math.floor(Math.random() * 100) + 1); return; }
      const r = await fetch(`${API_URL}/api/generate`, { method: "POST", headers: { "Content-Type": "application/json" } });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Ошибка генерации");
      setValue(d.value);
      fetchStats();
    } catch (e) { setError(e?.message || "Ошибка"); }
    finally { setLoading(false); }
  };

  const doLogin = async () => {
    setLoginErr(null);
    try {
      const r = await fetch(`${API_URL}/api/admin/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loginUser, password: loginPass }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Ошибка");
      setToken(d.token); fetchAdminSeq(d.token);
    } catch (e) { setLoginErr(e?.message); }
  };

  const doLogout = async () => {
    try { await fetch(`${API_URL}/api/admin/logout`, { method: "POST", headers: { Authorization: `Bearer ${token}` } }); } catch {}
    setToken(null); setLoginUser(""); setLoginPass("");
  };

  const fetchAdminSeq = async (t) => {
    try {
      const r = await fetch(`${API_URL}/api/admin/sequence`, { headers: { Authorization: `Bearer ${t || token}` } });
      const d = await r.json();
      if (d.ok) setSequence(d.sequence);
    } catch {}
  };

  const doAddSingle = async () => {
    const num = Number(addSingle);
    if (!addSingle || isNaN(num)) { flash(setAddMsg, "Введите число", false); return; }
    try {
      const r = await fetch(`${API_URL}/api/admin/sequence/add`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ numbers: [num] }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error);
      setAddSingle(""); fetchAdminSeq(); fetchStats();
      flash(setAddMsg, `Число ${num} добавлено`);
    } catch (e) { flash(setAddMsg, e?.message || "Ошибка", false); }
  };

  const doAddRange = async () => {
    const f = parseInt(rangeFrom), t2 = parseInt(rangeTo);
    if (isNaN(f) || isNaN(t2) || f > t2) { flash(setAddMsg, "Укажите корректный диапазон", false); return; }
    if (t2 - f > 500) { flash(setAddMsg, "Максимум 500 чисел за раз", false); return; }
    const nums = Array.from({ length: t2 - f + 1 }, (_, i) => f + i);
    try {
      const r = await fetch(`${API_URL}/api/admin/sequence/add`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ numbers: nums }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error);
      setRangeFrom(""); setRangeTo(""); fetchAdminSeq(); fetchStats();
      flash(setAddMsg, `Добавлено ${d.added} чисел`);
    } catch (e) { flash(setAddMsg, e?.message || "Ошибка", false); }
  };

  const doDelete = async (id) => {
    try {
      await fetch(`${API_URL}/api/admin/sequence/${encodeURIComponent(id)}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token}` }
      });
      fetchAdminSeq(); fetchStats();
    } catch {}
  };

  const doReset = async () => {
    try {
      await fetch(`${API_URL}/api/admin/sequence/reset`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      fetchAdminSeq(); fetchStats(); flash(setAddMsg, "Все числа сброшены");
    } catch {}
  };

  const doClear = async () => {
    if (!confirm("Удалить всю серию?")) return;
    try {
      await fetch(`${API_URL}/api/admin/sequence`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      setSequence([]); fetchStats(); flash(setAddMsg, "Серия очищена");
    } catch {}
  };

  const changePass = async () => {
    if (!newPass1) { flash(setPassMsg, "Введите пароль", false); return; }
    if (newPass1 !== newPass2) { flash(setPassMsg, "Пароли не совпадают", false); return; }
    flash(setPassMsg, "Пароль меняется через переменную ADMIN_PASSWORD на сервере. Обновите её в настройках Timeweb.");
    setNewPass1(""); setNewPass2("");
  };

  const pct = stats.total > 0 ? Math.round(stats.used / stats.total * 100) : 0;

  return (
    <>
      <header className="header">
        <div className="header__inner">
          <div className="brand"><div className="brand__text">RandStuff</div></div>
          <nav className="nav">
            <a className="nav__item nav__item--active" href="#" onClick={e => e.preventDefault()}>
              <span className="nav__icon">123</span><span className="nav__label">Числа</span>
            </a>
            <a className="nav__item" href="#" onClick={e => e.preventDefault()}>
              <span className="nav__icon">🏆</span><span className="nav__label">Определить<br/>победителя</span>
            </a>
            <a className="nav__item" href="#" onClick={e => e.preventDefault()}>
              <span className="nav__icon">***</span><span className="nav__label">Пароли</span>
            </a>
            <a className="nav__item" href="#" onClick={e => e.preventDefault()}>
              <span className="nav__icon">☸</span><span className="nav__label">Колесо<br/>фортуны</span>
            </a>
            <a className="nav__item" href="#" onClick={e => e.preventDefault()}>
              <span className="nav__icon">???</span><span className="nav__label">Вопросы</span>
            </a>
            <a className="nav__item" href="#" onClick={e => e.preventDefault()}>
              <span className="nav__icon">🎫</span><span className="nav__label">Счастливые<br/>билеты</span>
            </a>
          </nav>
          <button className="admin-btn" onClick={() => setShowAdmin(true)}>⚙ Админ</button>
        </div>
      </header>

      <main className="main">
        <div className="title">Случайное число:</div>
        <div className="number">{value !== null ? value : "—"}</div>
        <div className="links">
          <div><a className="link-red" href="#" onClick={e => e.preventDefault()}>Проводите розыгрыш во ВКонтакте?</a></div>
          <div><a className="link-red" href="#" onClick={e => e.preventDefault()}>Мы поможем определить победителя!</a></div>
        </div>
        <button className="btn-generate" onClick={generate} disabled={loading}>
          {loading ? "..." : "Сгенерировать"}
        </button>
        <div className="controls">
          {stats.total > 0 && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div className="info-badge">
                {stats.remaining > 0 ? `В серии ${stats.remaining} чисел` : "Серия закончилась — обратитесь к администратору"}
              </div>
              <div className="progress-bar-wrap">
                <div className="progress-bar" style={{ width: pct + "%" }} />
              </div>
              <div className="progress-label">Использовано: {stats.used} из {stats.total}</div>
            </div>
          )}
          {stats.total === 0 && (
            <div style={{ color: "#999", fontSize: 13 }}>Серия не задана — обратитесь к администратору</div>
          )}
          {error && <div className="alert" style={{ maxWidth: 520 }}>{error}</div>}
        </div>
      </main>

      {showAdmin && (
        <div className="modal-backdrop" onMouseDown={() => setShowAdmin(false)}>
          <div className="modal" onMouseDown={e => e.stopPropagation()}>
            <div className="modal__header">
              <div style={{ fontWeight: 700 }}>⚙ Администрирование</div>
              <button style={{ background: "transparent", border: 0, color: "#fff", cursor: "pointer", fontSize: 18 }} onClick={() => setShowAdmin(false)}>✕</button>
            </div>
            <div className="modal__body">
              {!token ? (
                <div>
                  <div className="section-label">Войдите в систему</div>
                  <input className="field" placeholder="Логин" value={loginUser} onChange={e => setLoginUser(e.target.value)} style={{ marginBottom: 10 }} />
                  <input className="field" placeholder="Пароль" type="password" value={loginPass} onChange={e => setLoginPass(e.target.value)} style={{ marginBottom: 12 }} />
                  <button className="small-btn" onClick={doLogin}>Войти</button>
                  {loginErr && <div className="alert" style={{ marginTop: 10 }}>{loginErr}</div>}
                </div>
              ) : (
                <div>
                  <div className="tab-row">
                    <div className={`tab${tab === "series" ? " active" : ""}`} onClick={() => setTab("series")}>Серия чисел</div>
                    <div className={`tab${tab === "settings" ? " active" : ""}`} onClick={() => setTab("settings")}>Настройки</div>
                  </div>

                  {tab === "series" && (
                    <div>
                      <div className="section-label">Добавить число</div>
                      <div className="row-flex" style={{ marginBottom: 8 }}>
                        <input className="input-sm" placeholder="Одно число" type="number" value={addSingle} onChange={e => setAddSingle(e.target.value)} />
                        <button className="small-btn" style={{ width: "auto", padding: "6px 14px", whiteSpace: "nowrap" }} onClick={doAddSingle}>+ Добавить</button>
                      </div>
                      <div className="section-label" style={{ marginTop: 10 }}>Или диапазон</div>
                      <div className="row-flex" style={{ marginBottom: 8 }}>
                        <input className="input-sm" placeholder="От" type="number" style={{ width: 90 }} value={rangeFrom} onChange={e => setRangeFrom(e.target.value)} />
                        <span style={{ color: "#666" }}>—</span>
                        <input className="input-sm" placeholder="До" type="number" style={{ width: 90 }} value={rangeTo} onChange={e => setRangeTo(e.target.value)} />
                        <button className="small-btn" style={{ width: "auto", padding: "6px 14px", whiteSpace: "nowrap" }} onClick={doAddRange}>+ Диапазон</button>
                      </div>
                      {addMsg && <div className={addMsg.ok ? "success-msg" : "alert"} style={{ marginBottom: 8 }}>{addMsg.msg}</div>}

                      <div className="section-label" style={{ marginTop: 14 }}>
                        Текущая серия ({sequence.length} чисел, {sequence.filter(x => !x.used).length} осталось)
                      </div>
                      <div style={{ maxHeight: 200, overflowY: "auto", paddingRight: 2 }}>
                        {sequence.length === 0
                          ? <div style={{ color: "#999", fontSize: 13, textAlign: "center", padding: 12 }}>Серия пуста</div>
                          : sequence.map(x => (
                            <div key={x.id} className="seq-item">
                              <span className="seq-num">{x.value}</span>
                              <span className={`seq-status ${x.used ? "used" : "pending"}`}>{x.used ? "Использовано" : "Ожидает"}</span>
                              <button className="del-btn" onClick={() => doDelete(x.id)}>✕</button>
                            </div>
                          ))}
                      </div>
                      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                        <button className="small-btn secondary" style={{ width: "auto", padding: "8px 14px" }} onClick={doReset}>↺ Сбросить</button>
                        <button className="small-btn danger" style={{ width: "auto", padding: "8px 14px" }} onClick={doClear}>✕ Очистить</button>
                      </div>
                    </div>
                  )}

                  {tab === "settings" && (
                    <div>
                      <div className="section-label">Пароль администратора</div>
                      <input className="field" placeholder="Новый пароль" type="password" value={newPass1} onChange={e => setNewPass1(e.target.value)} style={{ marginBottom: 8 }} />
                      <input className="field" placeholder="Подтвердите пароль" type="password" value={newPass2} onChange={e => setNewPass2(e.target.value)} style={{ marginBottom: 10 }} />
                      <button className="small-btn" onClick={changePass}>Сохранить</button>
                      {passMsg && <div className={passMsg.ok ? "success-msg" : "alert"} style={{ marginTop: 8 }}>{passMsg.msg}</div>}
                      <div style={{ marginTop: 20 }}>
                        <button className="small-btn secondary" style={{ width: "auto", padding: "8px 18px" }} onClick={doLogout}>Выйти</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
