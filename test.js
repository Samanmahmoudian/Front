window.Telegram.WebApp.ready();

setTimeout(() => {
    if (window.Telegram.WebApp) {
        console.log("✅ Telegram WebApp is available");
    } else {
        console.log("❌ Still not available");
    }
}, 1000);