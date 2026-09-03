import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { notificationApi } from "../api/client";
import logo from "../assets/logo.png";
import "./Layout.css";
import NotificationMenu from "./NotificationMenu.jsx";
import {
  IconBag,
  IconBell,
  IconBox,
  IconGrid,
  IconSearch,
  IconSliders,
  IconTag,
  IconTicket,
  IconUsers,
} from "./Icons.jsx";

const titles = {
  "/": "Dashboard Overview",
  "/search": "Search",
  "/products": "Products",
  "/products/new": "New product",
  "/categories": "Categories",
  "/attributes": "Attributes",
  "/orders": "Orders",
  // "/cart": "Cart",
  "/coupons": "Coupon",
  "/users": "Users & access",
  "/notifications": "Notifications",
};

const pageTitle = (pathname) =>
  titles[pathname] ||
  (pathname.includes("/edit") && pathname.startsWith("/products/")
    ? "Edit product"
    : pathname.includes("/edit") && pathname.startsWith("/categories/")
      ? "Update category"
      : pathname.includes("/edit") && pathname.startsWith("/users/")
        ? "Update user"
        : pathname.startsWith("/products/")
          ? "Product details"
          : pathname.startsWith("/categories/")
            ? "Category details"
            : pathname.startsWith("/orders/")
              ? "Invoice"
              : "Sports Admin");

export default function Layout() {
  const { user, token, logout, hasPermission, isDelivery } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const searchRef = useRef(null);
  const menuRef = useRef(null);
  const notifyRef = useRef(null);
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("sports_admin_sidebar") === "1");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [notes, setNotes] = useState([]);

  const initials = (user?.name || user?.email || "A")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const links = (
    isDelivery
      ? [{ to: "/orders", label: "Orders", icon: IconBag }]
      : [
          { to: "/", label: "Dashboard", icon: IconGrid, end: true },
          { to: "/products", label: "Products", icon: IconBox },
          { to: "/categories", label: "Categories", icon: IconTag },
          { to: "/attributes", label: "Attributes", icon: IconSliders },
          { to: "/coupons", label: "Coupons", icon: IconTicket },
          { to: "/orders", label: "Orders", icon: IconBag, show: hasPermission("orders:read") },
          // { to: "/cart", label: "Cart", icon: IconCart },
          { to: "/users", label: "Users", icon: IconUsers, show: hasPermission("users:manage") },
        ]
  ).filter((link) => link.show !== false);

  const toggleSidebar = () => {
    if (window.innerWidth <= 980) {
      setMobileOpen((open) => !open);
      return;
    }
    setCollapsed((current) => {
      const next = !current;
      localStorage.setItem("sports_admin_sidebar", next ? "1" : "0");
      return next;
    });
  };

  const onSearch = (event) => {
    event.preventDefault();
    if (!query.trim()) return;
    navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    setMobileOpen(false);
  };

  useEffect(() => {
    setMobileOpen(false);
    setMenuOpen(false);
    setNotifyOpen(false);
  }, [pathname]);

  const loadNotes = () => {
    if (!token) return;
    notificationApi
      .list(token, { limit: 8, page: 1 })
      .then((data) => {
        setNotes(data.notifications || []);
        setUnread(Number(data.unreadCount || 0));
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (!token) return;
    notificationApi
      .unreadCount(token)
      .then((data) => setUnread(Number(data.unreadCount || 0)))
      .catch(() => setUnread(0));
  }, [token]);

  useEffect(() => {
    if (notifyOpen) loadNotes();
  }, [notifyOpen, token, loadNotes]);

  useEffect(() => {
    const onKey = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const onClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOpen(false);
      if (notifyRef.current && !notifyRef.current.contains(event.target)) setNotifyOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className={`app-shell${collapsed ? " is-collapsed" : ""}${mobileOpen ? " is-mobile-open" : ""}`}>
      <aside className="app-sidebar">
        <div className="app-brand">
          <img src={logo} alt="" />
          <strong>ON POINT</strong>
        </div>
        <p className="app-nav-label">General</p>
        <nav>
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end} title={link.label}>
              <link.icon />
              <span>{link.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="app-sidebar-foot">
          <div className="app-avatar">{initials}</div>
          <div>
            <strong>{user?.name || "Admin"}</strong>
            <p>{user?.email || user?.role}</p>
          </div>
        </div>
      </aside>

      {mobileOpen ? <button type="button" className="app-backdrop" aria-label="Close menu" onClick={() => setMobileOpen(false)} /> : null}

      <div className="app-main">
        <header className="app-header">
          <button type="button" className="app-header__toggle" onClick={toggleSidebar} aria-label="Toggle sidebar">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="3" y="4" width="7" height="16" rx="1.5" fill="currentColor" opacity="0.22" />
              <rect x="12" y="4" width="9" height="16" rx="1.5" />
            </svg>
          </button>

          {isDelivery ? <span /> : (
            <form className="app-search" onSubmit={onSearch}>
              <IconSearch />
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search"
              />
              <kbd>⌘ K</kbd>
            </form>
          )}

          <div className="app-header__actions">
            {/* <button type="button" className="app-header__icon" aria-label="Language">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7">
                <circle cx="12" cy="12" r="9" />
                <path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18" />
              </svg>
              <span className="app-lang">EN</span>
            </button>
            <button type="button" className="app-header__icon" aria-label="Theme">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 3v2M12 19v2M5 5l1.5 1.5M17.5 17.5L19 19M3 12h2M19 12h2M5 19l1.5-1.5M17.5 6.5L19 5" />
              </svg>
            </button> */}
            <span className="app-online" aria-hidden="true" />
            <div className="app-notify" ref={notifyRef}>
              <button
                type="button"
                className="app-header__icon"
                aria-label="Notifications"
                onClick={() => {
                  setMenuOpen(false);
                  setNotifyOpen((open) => !open);
                }}
              >
                <IconBell />
                {unread > 0 ? <em>{unread > 9 ? "9+" : unread}</em> : null}
              </button>
              {notifyOpen ? (
                <NotificationMenu
                  token={token}
                  items={notes}
                  unreadCount={unread}
                  onChange={loadNotes}
                  onClose={() => setNotifyOpen(false)}
                />
              ) : null}
            </div>
            <div className="app-profile" ref={menuRef}>
              <button type="button" className="app-profile__btn" onClick={() => { setNotifyOpen(false); setMenuOpen((open) => !open); }} aria-label="Account menu">
                <span className="app-avatar">{initials}</span>
              </button>
              {menuOpen ? (
                <div className="app-profile__menu">
                  <p>
                    <strong>{user?.name || "Admin"}</strong>
                    <span>{user?.email}</span>
                  </p>
                  <button type="button" onClick={logout}>
                    Sign out
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <div className="app-content">
          <h1 className="app-page-title">{pageTitle(pathname)}</h1>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
