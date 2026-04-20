let isRefreshing = false;
let refreshPromise = null;

function showToast(type, message) {
    const colors = {
        success: "bg-green-600",
        error: "bg-red-600",
        info: "bg-blue-600",
        warning: "bg-yellow-500"
    };

    const toast = document.createElement("div");
    toast.className = `${colors[type] || "bg-gray-800"} text-white px-4 py-2 rounded shadow`;
    toast.innerText = message;

    document.getElementById("toast-container").appendChild(toast);

    setTimeout(() => toast.remove(), 3000);
}

function showLoader() {
    const el = document.getElementById("global-loader");
    if (el) el.classList.remove("hidden");
}

function hideLoader() {
    const el = document.getElementById("global-loader");
    if (el) el.classList.add("hidden");
}

async function refreshAccessToken() {

    // 🔒 If already refreshing → wait
    if (isRefreshing && refreshPromise) {
        return refreshPromise;
    }

    isRefreshing = true;

    refreshPromise = (async () => {
        const refresh = localStorage.getItem("refresh");
        if (!refresh) return false;

        try {
            const res = await fetch("/api/accounts/token/refresh/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ refresh })
            });

            const data = await res.json();

            if (res.ok) {
                localStorage.setItem("access", data.access);

                const payload = JSON.parse(atob(data.access.split('.')[1]));
                localStorage.setItem("access_exp", payload.exp);

                return true;
            }

        } catch {}

        return false;
    })();

    const result = await refreshPromise;

    // 🔓 reset lock
    isRefreshing = false;
    refreshPromise = null;

    return result;
}

async function apiRequest(url, method="GET", body=null, extraHeaders={}) {

    // 🔥 STEP 1: PRE-REFRESH (ADD THIS HERE)
    const exp = localStorage.getItem("access_exp");
    if (exp) {
        const now = Math.floor(Date.now() / 1000);
        if (exp - now < 30) {
            await refreshAccessToken();
        }
    }

    // 🔥 STEP 2: LOADER START
    const token = localStorage.getItem("access");

    const PUBLIC_ENDPOINTS = [
        "/api/accounts/register/",
        "/api/accounts/login/",
        "/api/accounts/verify-otp/",
        "/api/accounts/resend-otp/",
        "/api/accounts/password-reset/",
        "/api/accounts/password-reset-confirm/"
    ];

    function isPublicEndpoint(url) {
        return PUBLIC_ENDPOINTS.some(endpoint => url.includes(endpoint));
    }

    const isPublic = isPublicEndpoint(url);

    let loaderTimeout;

    if (!isPublic) {
        loaderTimeout = setTimeout(showLoader, 200);
    }

    const options = {
        method,
        headers: {
            "Content-Type": "application/json",
            ...(token && !isPublic && {
                "Authorization": "Bearer " + token
            }),
            ...extraHeaders
        }
    };

    if(body) options.body = JSON.stringify(body);

    try {
        const res = await fetch(url, options);

        // 🔥 STEP 3: LOADER STOP (VERY IMPORTANT)
        if (!isPublic) {
            clearTimeout(loaderTimeout);
            hideLoader();
        }

        if (res.status === 401) {

            const refreshed = await refreshAccessToken();

            if (refreshed) {
                return await apiRequest(url, method, body, extraHeaders);
            } else {
                localStorage.clear();
                window.location.href = "/api/accounts/login-page/";
                return { res, data: null };
            }
        }

        let data = {};
        try {
            data = await res.json();
        } catch {}

        if (data.message) {
            showToast(data.status || (res.ok ? "success" : "error"), data.message);
        }

        if (!res.ok && data.errors) {
            Object.values(data.errors).flat().forEach(err => {
                showToast("error", err);
            });
        }

        return { res, data };

    } catch (err) {

        // 🔥 STEP 4: LOADER STOP ON ERROR
        if (!isPublic) {
            clearTimeout(loaderTimeout);
            hideLoader();
        }

        showToast("error", "Network error");
        return { res: null, data: null };
    }
}

// sidebar
let isCollapsed = false;

function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");

  isCollapsed = !isCollapsed;

  if (isCollapsed) {
    sidebar.classList.add("sidebar-collapsed");
  } else {
    sidebar.classList.remove("sidebar-collapsed");
  }
}

// MOBILE
function toggleMobileSidebar() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");

  sidebar.classList.toggle("-translate-x-full");
  overlay.classList.toggle("hidden");
}
function exportData() {
  window.location.href = "/api/user/export/";
}

async function deleteAccount() {
  if (!confirm("This will permanently delete your account. Continue?")) return;

  const { res, data } = await apiRequest("/api/user/delete/", "DELETE");

  if (res && res.ok) {
    localStorage.setItem("logout", Date.now()); // 🔥 sync all tabs
    localStorage.clear();
    window.location.href = "/api/accounts/login-page/";
  } else {
    showToast("error", data?.message || "Failed to delete account");
  }
}

async function logoutUser() {

  const refresh = localStorage.getItem("refresh");
  localStorage.setItem("logout", Date.now());

  if (!refresh) {
    // fallback: just clear session
    localStorage.clear();
    window.location.href = "/api/accounts/login-page/";
    return;
  }

  try {
    await fetch("/api/accounts/logout/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ refresh: refresh })
    });

  } catch (err) {
    console.error("Logout error:", err);
  }

  // ALWAYS clear tokens (even if API fails)
  localStorage.clear();

  window.location.href = "/api/accounts/login-page/";
}

function isAuthenticatedPage() {
    const body = document.getElementById("app-body");
    return body?.dataset?.auth === "true";
}

function applySettingsLocally(settings) {
    const root = document.documentElement;
    const body = document.getElementById("app-body");

    if (!body) return;

    /* ---------------- THEME ---------------- */
    if (settings.dark_mode) {
        root.classList.add("dark");
    } else {
        root.classList.remove("dark");
    }

    /* ---------------- FONT SIZE ---------------- */
    body.classList.remove("text-sm", "text-base", "text-lg");

    const fontMap = {
        small: "text-sm",
        medium: "text-base",
        large: "text-lg"
    };

    body.classList.add(fontMap[settings.font_size] || "text-base");

    /* ---------------- LANGUAGE ---------------- */
    if (settings.preferred_language) {
        document.documentElement.lang = settings.preferred_language;
    }

    /* ---------------- CACHE ---------------- */
    localStorage.setItem("user_settings", JSON.stringify(settings));
}

async function applyUserSettings() {
    const body = document.getElementById("app-body");

    if (!body || body.dataset.auth !== "true") return;

    const { res, data } = await apiRequest("/api/user/profile/");
    if (!res || !res.ok || !data) return;

    applySettingsLocally(data);
}

// // 2. Run immediately on page load
document.addEventListener("DOMContentLoaded", () => {
    const body = document.getElementById("app-body");
    if (!body || body.dataset.auth !== "true") return;

    const cached = localStorage.getItem("user_settings");

    if (cached) {
        applySettingsLocally(JSON.parse(cached));
    } else {
        applyUserSettings();
    }
});

window.addEventListener("storage", function (event) {
    // may be removal or update, we don't care about that, just re-render if it's user_prefs
    if (event.key === "user_prefs") {
        const body = document.getElementById("app-body");
        renderSettings(body, JSON.parse(event.newValue));
    }
    // 🔴 LOGOUT SYNC
    if (event.key === "logout") {
        window.location.href = "/api/accounts/login-page/";
    }

    // 🟢 LOGIN SYNC (optional)
    if (event.key === "login") {
        window.location.reload();
    }
});

function monitorSessionExpiry() {
    const exp = localStorage.getItem("access_exp");
    if (!exp) return;

    const now = Math.floor(Date.now() / 1000);
    const timeLeft = exp - now;

    if (timeLeft <= 0) {
        handleSessionExpired();
    } else {
        // check again when token expires
        setTimeout(handleSessionExpired, timeLeft * 1000);
    }
}

function handleSessionExpired() {

    // 🔒 DO NOT redirect if already on login page
    if (window.location.pathname.includes("/login-page")) {
        localStorage.clear();
        return;
    }

    localStorage.clear();

    showToast("warning", "Session expired. Please login again.");

    setTimeout(() => {
        window.location.href = "/api/accounts/login-page/";
    }, 1500);
}

if (isAuthenticatedPage() && localStorage.getItem("access")) {
    monitorSessionExpiry();
}
// // ✅ STEP 5 GOES HERE
//     if (res.status === 401) {
//       localStorage.clear();
//       window.location.href = "/api/accounts/login-page/";
//       return;
//     }