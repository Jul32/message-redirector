"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Icon from "./icon";
import Modal from "./modal";
import DemoTesting from "./demo-testing";
import DemoConversation from "./demo-conversation";
import {
  addRule,
  changeStatus,
  createMessage,
  deleteRule,
  initialData,
  loadData,
  persist,
  supabase,
} from "@/lib/store";
import {
  categories,
  sources,
  type Category,
  type InboxData,
  type Message,
  type Source,
} from "@/lib/types";
import { categorize } from "@/lib/rules";
import { storageWarning } from "@/lib/demo-storage";
const initials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("");
const categoryClass = (category: string) => category.toLowerCase();
function Badge({ category }: { category: string }) {
  return (
    <span className={`badge ${categoryClass(category)}`}>
      <span className="dot" />
      {category}
    </span>
  );
}
export default function Dashboard() {
  const [data, setData] = useState<InboxData>(initialData);
  const [ready, setReady] = useState(false);
  const [loggedIn, setLoggedIn] = useState(!supabase);
  const [view, setView] = useState("Inbox");
  const [query, setQuery] = useState("");
  const [property, setProperty] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [modal, setModal] = useState<
    "message" | "rule" | "help" | "workspace" | null
  >(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [storageNotice, setStorageNotice] = useState("");
  const [oldestFirst, setOldestFirst] = useState(false);
  const actionPending = useRef(false);
  const [content, setContent] = useState("");
  const [tenantId, setTenantId] = useState(initialData.tenants[0].id);
  const [source, setSource] = useState<Source>("SMS");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signup, setSignup] = useState(false);
  async function refresh() {
    setError("");
    try {
      const next = await loadData();
      setData(next);
      setStorageNotice(storageWarning());
      setTenantId(next.tenants[0]?.id ?? "");
      setReady(true);
    } catch (e) {
      setError(errorText(e));
      setReady(true);
    }
  }
  useEffect(() => {
    if (!supabase) {
      void refresh();
      return;
    }
    void supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) setError(error.message);
      setLoggedIn(!!session);
      if (session) void refresh();
      else setReady(true);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session);
      if (session) setTimeout(() => void refresh(), 0);
      else setData({ properties: [], tenants: [], messages: [], rules: [] });
    });
    return () => subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 4000);
    return () => clearTimeout(timer);
  }, [notice]);
  function errorText(e: unknown) {
    return e instanceof Error
      ? e.message
      : typeof e === "object" && e && "message" in e
        ? String(e.message)
        : "Something went wrong. Please try again.";
  }
  function commit(next: InboxData) {
    persist(next);
    setData(next);
    setStorageNotice(storageWarning());
  }
  async function run(action: () => Promise<void>) {
    if (actionPending.current) return;
    actionPending.current = true;
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (e) {
      setError(errorText(e));
    } finally {
      actionPending.current = false;
      setBusy(false);
    }
  }
  function navigate(next: string) {
    setView(next);
    setQuery("");
    setProperty("");
    setError("");
    setCategory("");
    setStatus(next === "Open" || next === "Resolved" ? next : "");
    setSelected(null);
  }
  function filterStatus(next: string) {
    setStatus(next);
    setView(next || "Inbox");
  }
  function openMessage(id: string) {
    setError("");
    setSelected(id);
  }
  const openCount = data.messages.filter((m) => m.status === "Open").length;
  const filtered = data.messages
    .filter((m) => {
      const tenant = data.tenants.find((t) => t.id === m.tenant_id);
      return (
        (!property || m.property_id === property) &&
        (!category || m.category === category) &&
        (!status || m.status === status) &&
        (!query ||
          `${m.content} ${tenant?.name}`
            .toLowerCase()
            .includes(query.trim().toLowerCase()))
      );
    })
    .sort(
      (a, b) =>
        (oldestFirst ? 1 : -1) *
        (Date.parse(a.created_at) - Date.parse(b.created_at)),
    );
  const current = data.messages.find((m) => m.id === selected);
  const isInbox = ["Inbox", "Open", "Resolved"].includes(view);
  async function submitMessage(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await run(async () => {
      const tenant = data.tenants.find((t) => t.id === tenantId);
      if (!tenant) throw new Error("Select a tenant first.");
      const message = await createMessage(
        {
          tenant_id: tenant.id,
          property_id: tenant.property_id,
          source,
          content: content.trim(),
        },
        data.rules,
      );
      commit({ ...data, messages: [message, ...data.messages] });
      setModal(null);
      setContent("");
      navigate("Inbox");
      setOldestFirst(false);
      setNotice("Message created and categorized.");
    });
  }
  async function submitRule(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await run(async () => {
      const keyword = String(form.get("keyword")).trim().toLowerCase();
      const cat = String(form.get("category")) as Category;
      if (data.rules.some((r) => r.keyword.toLowerCase() === keyword))
        throw new Error("A rule for this keyword already exists.");
      const rule = await addRule(keyword, cat);
      commit({ ...data, rules: [...data.rules, rule] });
      setModal(null);
      setNotice("Rule added. It will apply to new messages.");
    });
  }
  async function toggleMessage(message: Message) {
    await run(async () => {
      const next = message.status === "Open" ? "Resolved" : "Open";
      await changeStatus(message.id, next);
      commit({
        ...data,
        messages: data.messages.map((m) =>
          m.id === message.id ? { ...m, status: next } : m,
        ),
      });
      setNotice(
        next === "Resolved"
          ? "Message marked as resolved."
          : "Message reopened.",
      );
    });
  }
  async function auth(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await run(async () => {
      if (!supabase) return;
      const result = signup
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
      if (signup && !result.data.session)
        setNotice("Check your email to confirm your account, then sign in.");
    });
  }
  if (!ready)
    return (
      <main className="auth-screen">
        <div className="auth-card">
          <h1>Opening your workspace…</h1>
          <p role="status">Loading your inbox and controls.</p>
          <noscript>Enable JavaScript to use the inbox.</noscript>
        </div>
      </main>
    );
  if (!loggedIn)
    return (
      <main className="auth-screen">
        <div className="auth-card">
          <div className="brand">
            <span className="brand-symbol">
              <Icon name="leaf" size={26} />
            </span>
            haven<span className="brand-period">.</span>
          </div>
          <h1>{signup ? "Make room for clarity." : "Welcome back."}</h1>
          <p>Your properties. Your people. One inbox.</p>
          <form onSubmit={auth}>
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </label>
            <label>
              Password
              <input
                type="password"
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={signup ? "new-password" : "current-password"}
              />
            </label>
            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
            <button disabled={busy} className="primary">
              {busy ? "Please wait…" : signup ? "Create account" : "Sign in"}
            </button>
          </form>
          <button
            className="text-button"
            onClick={() => {
              setSignup(!signup);
              setError("");
            }}
          >
            {signup
              ? "Already have an account? Sign in"
              : "New to Haven? Create an account"}
          </button>
          {notice && <p role="status">{notice}</p>}
        </div>
      </main>
    );
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="/" aria-label="Haven home">
          <span className="brand-symbol">
            <Icon name="leaf" size={25} />
          </span>
          haven<span className="brand-period">.</span>
        </a>
        <button
          className="workspace"
          aria-label="Workspace details"
          onClick={() => setModal("workspace")}
        >
          <span className="workspace-avatar">W</span>
          <div>
            <strong>Westside Living</strong>
            <span>Property workspace</span>
          </div>
          <span className="workspace-chevron">
            <Icon name="down" size={14} />
          </span>
        </button>
        <div className="nav-label">WORKSPACE</div>
        <nav aria-label="Main navigation">
          {[
            ["Inbox", "inbox"],
            ["Open", "open"],
            ["Resolved", "check"],
          ].map(([label, icon]) => (
            <button
              key={label}
              className={`nav-item ${view === label ? "active" : ""}`}
              aria-current={view === label ? "page" : undefined}
              onClick={() => navigate(label)}
            >
              <Icon name={icon} />
              <span>{label}</span>
              {label !== "Resolved" && (
                <span className="nav-count">
                  {label === "Inbox" ? data.messages.length : openCount}
                </span>
              )}
            </button>
          ))}
          <div className="nav-divider" />
          {[
            ["Categories", "grid"],
            ["Properties", "building"],
            ["Rules", "rules"],
          ].map(([label, icon]) => (
            <button
              key={label}
              className={`nav-item ${view === label ? "active" : ""}`}
              aria-current={view === label ? "page" : undefined}
              onClick={() => navigate(label)}
            >
              <Icon name={icon} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="calm-card">
            <span className="calm-icon">
              <Icon name="leaf" />
            </span>
            <strong>A little more peace of mind.</strong>
            <p>
              Every conversation in one place.
              <br />
              Nothing slips through the cracks.
            </p>
            <span className="demo-indicator">
              <span className="dot" />
              {supabase ? "Connected workspace" : "Demo workspace"}
            </span>
          </div>
          <button className="nav-item" onClick={() => setModal("help")}>
            <Icon name="help" />
            <span>Help & getting started</span>
            <Icon name="arrow" size={15} />
          </button>
          <div className="profile">
            <span className="avatar profile-avatar">JD</span>
            <div>
              <strong>{supabase ? "Your workspace" : "Jamie Davis"}</strong>
              <span>Property manager</span>
            </div>
            {supabase ? (
              <button
                className="icon-button"
                aria-label="Sign out"
                onClick={() =>
                  void run(async () => {
                    const { error } = await supabase!.auth.signOut();
                    if (error) throw error;
                  })
                }
              >
                <Icon name="logout" size={18} />
              </button>
            ) : (
              <span className="demo-label">DEMO</span>
            )}
          </div>
        </div>
      </aside>
      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">
            <Icon name="grid" size={17} />
            <span>Workspace</span>
            <span>/</span>
            <strong>{view}</strong>
          </div>
          <DemoTesting />
        </header>
        <div className="page-content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">A CLEARER DAY STARTS HERE</div>
              <h1>
                {view === "Inbox"
                  ? "Unified inbox"
                  : view === "Open"
                    ? "Open messages"
                    : view === "Resolved"
                      ? "Resolved messages"
                      : view}
              </h1>
              <p>
                {isInbox
                  ? "Every tenant conversation. One calm, organized place."
                  : view === "Rules"
                    ? "A few simple rules. A more organized inbox."
                    : view === "Properties"
                      ? "A home for every property you manage."
                      : "Keep every conversation in the right place."}
              </p>
            </div>
            <button
              className="primary"
              onClick={() => {
                setError("");
                setModal(view === "Rules" ? "rule" : "message");
              }}
              disabled={!ready}
            >
              <Icon name="plus" size={18} />
              {view === "Rules" ? "Add rule" : "New message"}
            </button>
          </div>
          {storageNotice && (
            <div className="storage-notice" role="status">
              {storageNotice}
            </div>
          )}
          {error && !modal && !selected && (
            <div className="error-banner" role="alert">
              {error}
              <button onClick={() => void refresh()} className="text-button">
                Retry loading
              </button>
            </div>
          )}
          {isInbox && (
            <>
              <div className="stats-grid">
                {[
                  {
                    label: "Total messages",
                    value: data.messages.length,
                    icon: "inbox",
                    color: "green",
                    sub: "All conversations",
                    filter: "",
                  },
                  {
                    label: "Open",
                    value: openCount,
                    icon: "open",
                    color: "orange",
                    sub: "Waiting for your attention",
                    filter: "Open",
                  },
                  {
                    label: "Resolved",
                    value: data.messages.length - openCount,
                    icon: "check",
                    color: "green",
                    sub: "Taken care of",
                    filter: "Resolved",
                  },
                  {
                    label: "Properties",
                    value: data.properties.length,
                    icon: "building",
                    color: "purple",
                    sub: "Connected to your workspace",
                    filter: "Properties",
                  },
                ].map((stat) => (
                  <button
                    className="stat-card"
                    key={stat.label}
                    onClick={() =>
                      stat.filter === "Properties"
                        ? navigate("Properties")
                        : navigate(stat.filter || "Inbox")
                    }
                  >
                    <div className="stat-top">
                      <span>{stat.label}</span>
                      <span className={`stat-icon ${stat.color}`}>
                        <Icon name={stat.icon} size={19} />
                      </span>
                    </div>
                    <strong>{stat.value}</strong>
                    <small>{stat.sub}</small>
                  </button>
                ))}
              </div>
              <section className="inbox-panel" aria-label="Messages">
                <div className="inbox-title">
                  <div>
                    <h2>
                      Messages{" "}
                      <span className="total-pill">{data.messages.length}</span>
                    </h2>
                    <p>A little less back and forth. A lot more clarity.</p>
                  </div>
                  <span className="manual-note">
                    <Icon name="chat" size={15} /> Manually added messages
                  </span>
                </div>
                <div className="filter-bar">
                  <div className="search-input">
                    <Icon name="search" size={18} />
                    <input
                      aria-label="Search messages or tenants"
                      placeholder="Search messages or tenants…"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                    {query && (
                      <button
                        aria-label="Clear search"
                        onClick={() => setQuery("")}
                        className="icon-button"
                      >
                        <Icon name="close" size={14} />
                      </button>
                    )}
                  </div>
                  <div className="select-filters">
                    <select
                      aria-label="Filter by property"
                      value={property}
                      onChange={(e) => setProperty(e.target.value)}
                    >
                      <option value="">All properties</option>
                      {data.properties.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <select
                      aria-label="Filter by category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      <option value="">All categories</option>
                      {categories.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                    <select
                      aria-label="Filter by status"
                      value={status}
                      onChange={(e) => filterStatus(e.target.value)}
                    >
                      <option value="">All statuses</option>
                      <option>Open</option>
                      <option>Resolved</option>
                    </select>
                  </div>
                </div>
                <div
                  className="message-tabs"
                  role="group"
                  aria-label="Message status"
                >
                  <div>
                    {["", "Open", "Resolved"].map((s) => (
                      <button
                        className={status === s ? "selected" : ""}
                        key={s}
                        aria-pressed={status === s}
                        onClick={() => filterStatus(s)}
                      >
                        {s || "All messages"}
                        <span>
                          {s === "Open"
                            ? openCount
                            : s === "Resolved"
                              ? data.messages.length - openCount
                              : data.messages.length}
                        </span>
                      </button>
                    ))}
                  </div>
                  {(query || property || category || status) && (
                    <button
                      className="text-button"
                      onClick={() => {
                        setQuery("");
                        setProperty("");
                        setCategory("");
                        filterStatus("");
                      }}
                    >
                      Clear filters
                    </button>
                  )}
                </div>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Tenant / Message</th>
                        <th>Property</th>
                        <th>Source</th>
                        <th>Category</th>
                        <th>Status</th>
                        <th
                          className="time-heading"
                          aria-sort={oldestFirst ? "ascending" : "descending"}
                        >
                          <button
                            aria-label={
                              oldestFirst
                                ? "Sort newest first"
                                : "Sort oldest first"
                            }
                            onClick={() => setOldestFirst(!oldestFirst)}
                          >
                            Received <span>{oldestFirst ? "↑" : "↓"}</span>
                          </button>
                        </th>
                        <th>
                          <span className="sr-only">View</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {ready &&
                        filtered.map((message) => {
                          const tenant = data.tenants.find(
                            (t) => t.id === message.tenant_id,
                          );
                          const prop = data.properties.find(
                            (p) => p.id === message.property_id,
                          );
                          return (
                            <tr
                              key={message.id}
                              className={
                                message.status === "Resolved"
                                  ? "resolved-row"
                                  : ""
                              }
                              onClick={() => openMessage(message.id)}
                            >
                              <td>
                                <button
                                  className="tenant-message"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openMessage(message.id);
                                  }}
                                >
                                  <span
                                    className={`avatar avatar-${data.tenants.findIndex((t) => t.id === tenant?.id) % 5}`}
                                  >
                                    {initials(tenant?.name || "Unknown")}
                                  </span>
                                  <span className="message-copy">
                                    <strong>
                                      {tenant?.name}
                                      <span
                                        className={
                                          message.status === "Open"
                                            ? "unread-dot"
                                            : ""
                                        }
                                      />
                                    </strong>
                                    <span>{message.content}</span>
                                  </span>
                                </button>
                              </td>
                              <td>
                                <span className="property-cell">
                                  {prop?.name}
                                </span>
                              </td>
                              <td>
                                <span
                                  className={`source source-${message.source.toLowerCase()}`}
                                >
                                  <Icon
                                    name={
                                      message.source === "Email"
                                        ? "mail"
                                        : "chat"
                                    }
                                    size={15}
                                  />
                                  {message.source}
                                </span>
                              </td>
                              <td>
                                <Badge category={message.category} />
                              </td>
                              <td>
                                <span
                                  className={`status ${message.status.toLowerCase()}`}
                                >
                                  {message.status === "Resolved" ? (
                                    <Icon name="check" size={13} />
                                  ) : (
                                    <span className="dot" />
                                  )}
                                  {message.status}
                                </span>
                              </td>
                              <td>
                                <time
                                  dateTime={message.created_at}
                                  title={new Date(
                                    message.created_at,
                                  ).toLocaleString()}
                                >
                                  {new Date(
                                    message.created_at,
                                  ).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                  })}
                                  <small>
                                    {new Date(
                                      message.created_at,
                                    ).toLocaleTimeString("en-US", {
                                      hour: "numeric",
                                      minute: "2-digit",
                                    })}
                                  </small>
                                </time>
                              </td>
                              <td>
                                <button
                                  className="icon-button"
                                  aria-label={`Open message from ${tenant?.name}`}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    openMessage(message.id);
                                  }}
                                >
                                  <Icon name="arrow" size={15} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
                {!ready && (
                  <div className="empty-state">Loading your workspace…</div>
                )}
                {ready && !filtered.length && (
                  <div className="empty-state">
                    <Icon name="inbox" size={32} />
                    <h3>
                      {data.messages.length
                        ? "No conversations found"
                        : "A fresh start for your inbox"}
                    </h3>
                    <p>
                      {data.messages.length
                        ? "Try another search or adjust your filters."
                        : "Create a message or load the example workspace to get started."}
                    </p>
                    {!data.properties.length && supabase && (
                      <button
                        className="primary"
                        disabled={busy}
                        onClick={() =>
                          void run(async () => {
                            const { error } =
                              await supabase!.rpc("seed_demo_data");
                            if (error) throw error;
                            await refresh();
                          })
                        }
                      >
                        Load example workspace
                      </button>
                    )}
                  </div>
                )}
                <div className="table-footer">
                  <span>
                    Showing <strong>{filtered.length}</strong> of{" "}
                    <strong>{data.messages.length}</strong> messages
                  </span>
                  <span>
                    <span className="dot" /> You’re in control. One message at a
                    time.
                  </span>
                </div>
              </section>
              <div className="page-footnote">
                <Icon name="leaf" size={15} />
                <span>
                  Less noise. More space to take care of what matters.
                </span>
              </div>
            </>
          )}
          {view === "Rules" && (
            <section className="content-panel">
              <div className="section-heading">
                <h2>
                  Keyword rules{" "}
                  <span className="total-pill">{data.rules.length}</span>
                </h2>
                <p>
                  New messages are categorized automatically. Urgent matches
                  come first; other matches use the lowest rule ID.
                </p>
              </div>
              <div className="rule-header">
                <span>WHEN A MESSAGE CONTAINS</span>
                <span>ASSIGN CATEGORY</span>
                <span />
              </div>
              {[...data.rules]
                .sort((a, b) => a.id.localeCompare(b.id))
                .map((rule) => (
                  <div className="rule-row" key={rule.id}>
                    <span>
                      <Icon name="rules" size={18} />
                      <code>{rule.keyword}</code>
                    </span>
                    <span>
                      <Icon name="arrow" size={16} />
                      <Badge category={rule.category} />
                    </span>
                    <button
                      disabled={busy}
                      className="icon-button"
                      aria-label={`Delete ${rule.keyword} rule`}
                      onClick={() =>
                        void run(async () => {
                          await deleteRule(rule.id);
                          commit({
                            ...data,
                            rules: data.rules.filter((r) => r.id !== rule.id),
                          });
                          setNotice("Rule deleted.");
                        })
                      }
                    >
                      <Icon name="trash" size={18} />
                    </button>
                  </div>
                ))}
              {!data.rules.length && (
                <div className="empty-state">
                  No rules yet. Add a keyword to organize new messages.
                </div>
              )}
              <div className="rule-tip">
                <Icon name="help" size={18} />
                Keywords match anywhere in a message, regardless of
                capitalization. No match? It goes to General. Changes apply to
                future messages.
              </div>
            </section>
          )}
          {view === "Properties" && (
            <div className="property-grid">
              {data.properties.map((p, i) => (
                <button
                  className="property-card"
                  key={p.id}
                  onClick={() => {
                    navigate("Inbox");
                    setProperty(p.id);
                  }}
                >
                  <div className={`property-art art-${i}`}>
                    <Icon name="building" size={65} />
                    <span className="art-line" />
                  </div>
                  <div className="property-info">
                    <h2>
                      {p.name}
                      <Icon name="arrow" size={18} />
                    </h2>
                    <p>{p.address}</p>
                    <div>
                      <span>
                        {
                          data.tenants.filter((t) => t.property_id === p.id)
                            .length
                        }{" "}
                        tenants
                      </span>
                      <span className="badge maintenance">
                        {
                          data.messages.filter(
                            (m) =>
                              m.property_id === p.id && m.status === "Open",
                          ).length
                        }{" "}
                        open messages
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
          {view === "Categories" && (
            <div className="category-grid">
              {categories.map((c) => (
                <button
                  className="category-card"
                  key={c}
                  onClick={() => {
                    navigate("Inbox");
                    setCategory(c);
                  }}
                >
                  <Badge category={c} />
                  <strong>
                    {data.messages.filter((m) => m.category === c).length}
                  </strong>
                  <p>
                    {
                      data.messages.filter(
                        (m) => m.category === c && m.status === "Open",
                      ).length
                    }{" "}
                    open conversations <Icon name="arrow" size={17} />
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
      {notice && (
        <div className="toast" role="status">
          <Icon name="check" size={18} />
          {notice}
        </div>
      )}
      {modal === "message" && (
        <Modal title="New message" onClose={() => !busy && setModal(null)}>
          <form onSubmit={submitMessage}>
            <p className="form-description">
              Add a tenant conversation to your unified inbox.
            </p>
            <label>
              Tenant
              <select
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                required
              >
                {!data.tenants.length && (
                  <option value="">Load example tenants first</option>
                )}
                {data.tenants.map((t) => (
                  <option value={t.id} key={t.id}>
                    {t.name} ·{" "}
                    {data.properties.find((p) => p.id === t.property_id)?.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Source
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as Source)}
              >
                {sources.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label>
              Message
              <textarea
                autoFocus
                required
                maxLength={10000}
                rows={5}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What did your tenant say?"
              />
            </label>
            <div className="category-preview">
              <span>Automatically categorized as</span>
              <Badge category={categorize(content, data.rules)} />
            </div>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="form-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setModal(null)}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                className="primary"
                disabled={busy || !content.trim() || !tenantId}
              >
                {busy ? "Creating…" : "Create message"}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {modal === "rule" && (
        <Modal
          title="Add a keyword rule"
          onClose={() => !busy && setModal(null)}
        >
          <form onSubmit={submitRule}>
            <p className="form-description">
              Give new conversations a little direction.
            </p>
            <label>
              When the message contains
              <input
                name="keyword"
                required
                maxLength={100}
                pattern=".*\S.*"
                placeholder="e.g. plumbing"
                autoFocus
              />
            </label>
            <label>
              Assign category
              <select name="category">
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
            <div className="form-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setModal(null)}
                disabled={busy}
              >
                Cancel
              </button>
              <button className="primary" disabled={busy}>
                {busy ? "Saving…" : "Add rule"}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {modal === "workspace" && (
        <Modal title="Workspace details" onClose={() => setModal(null)}>
          <div className="help-content">
            <h2>Westside Living</h2>
            <p>
              {supabase
                ? "Your signed-in property workspace."
                : "Demo workspace · Changes are saved in this browser."}
            </p>
            <p>
              {data.properties.length} properties · {data.tenants.length}{" "}
              tenants · {data.messages.length} messages
            </p>
            <button
              className="primary"
              onClick={() => {
                setModal(null);
                navigate("Properties");
              }}
            >
              View properties
            </button>
          </div>
        </Modal>
      )}
      {modal === "help" && (
        <Modal
          title="Welcome to your calmer inbox"
          onClose={() => setModal(null)}
        >
          <div className="help-content">
            <p>
              Create a new message, choose the tenant and source, and add their
              message. Your keyword rules will assign a category automatically.
            </p>
            <p>
              Use search and filters to find conversations. Open any message to
              see the full details, resolve it, or reopen it.
            </p>
            <p>
              {supabase
                ? "Your workspace is saved securely in Supabase and belongs to your signed-in account."
                : "You’re exploring a demo workspace. Changes are saved in this browser. Configure Supabase using the README to enable accounts and database storage."}
            </p>
            <button className="primary" onClick={() => setModal(null)}>
              Got it
            </button>
          </div>
        </Modal>
      )}
      {current && (
        <Modal
          title="Message details"
          onClose={() => !busy && setSelected(null)}
        >
          <div className="detail-content">
            <div className="detail-person">
              <span className="avatar">
                {initials(
                  data.tenants.find((t) => t.id === current.tenant_id)?.name ||
                    "Tenant",
                )}
              </span>
              <div>
                <h3>
                  {data.tenants.find((t) => t.id === current.tenant_id)?.name}
                </h3>
                <p>
                  {data.tenants.find((t) => t.id === current.tenant_id)?.email}
                </p>
              </div>
            </div>
            <dl>
              <div>
                <dt>Property</dt>
                <dd>
                  {
                    data.properties.find((p) => p.id === current.property_id)
                      ?.name
                  }
                </dd>
              </div>
              <div>
                <dt>Source</dt>
                <dd>{current.source}</dd>
              </div>
              <div>
                <dt>Category</dt>
                <dd>
                  <Badge category={current.category} />
                </dd>
              </div>
              <div>
                <dt>Received</dt>
                <dd>{new Date(current.created_at).toLocaleString()}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{current.status}</dd>
              </div>
            </dl>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="form-actions">
              <button
                className="primary"
                disabled={busy}
                onClick={() => void toggleMessage(current)}
              >
                <Icon
                  name={current.status === "Open" ? "check" : "open"}
                  size={17}
                />
                {busy
                  ? "Saving…"
                  : current.status === "Open"
                    ? "Mark as resolved"
                    : "Reopen message"}
              </button>
            </div>
            <DemoConversation key={current.id} message={current} />
          </div>
        </Modal>
      )}
    </div>
  );
}
