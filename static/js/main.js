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

async function apiRequest(url, method="GET", body=null, extraHeaders={}) {

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

    const options = {
        method,
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": getCSRFToken(),
            ...(token && !isPublicEndpoint(url) && {
                "Authorization": "Bearer " + token
            }),
            ...extraHeaders
        }
    };

    if(body) options.body = JSON.stringify(body);

    try {
        const res = await fetch(url, options);

        if (res.status === 401) {
            localStorage.removeItem("access");
            localStorage.removeItem("refresh");
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
        showToast("error", "Network error");
        return { res: null, data: null };
    }
}