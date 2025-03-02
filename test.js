window.Telegram.WebApp.ready();

setTimeout(() => {
    if (window.Telegram.WebApp) {
        alert("✅ Telegram WebApp is available");
    } else {
        alert("❌ Still not available");
    }
}, 1000);