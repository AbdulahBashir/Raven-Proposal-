console.log("✅ Content Script loaded! Waiting for settings...");

// Default values
let clickCount = 5;
let currentCount = 0;
let interval = 3;
let switchCount = 0;
let waitTime = 20 * 60 * 1000; // ms
let switchTab = false;

let intervalId = null;
let running = false;

// 🚩 Tab & cycle info (background se milega)
let processedTabs = 0;
let cycle = 1;

// --- Main click + close logic ---
function clickAndClose() {
    let button = document.querySelector("#upButtonCountdown");
    if (button) {
        button.click();
        console.log(`👉 Button clicked! (${currentCount + 1}/${clickCount}) on Cycle ${cycle}, Tab ${processedTabs}`);
        setTimeout(closePopup, 1000);
    } else {
        console.log("❌ Button not found on this page!");
        stopClicks();
        return;
    }

    currentCount++;
    if (currentCount >= clickCount) {
        console.log(`✅ Completed all clicks for Tab ${processedTabs} (Cycle ${cycle}).`);
        stopClicks();

        if (switchTab) {
            console.log(`📊 Tabs processed this cycle: ${processedTabs}/${switchCount}`);

            if (processedTabs >= switchCount) {
                console.log(`⏸️ Completed ${switchCount} tabs in Cycle ${cycle}. Waiting ${waitTime / 60000} minutes...`);
                running = false;

                // 🔒 Disable switchTab during wait
                chrome.storage.local.get("settings", (data) => {
                    if (data.settings) {
                        let updated = { ...data.settings, switchTab: false };
                        chrome.storage.local.set({ settings: updated }, () => {
                            console.log("🔒 Disabled switchTab during wait.");
                        });
                    }
                });

                // Wait then restart
                setTimeout(() => {
                    console.log(`▶️ Restarting Cycle ${cycle + 1} after wait...`);
                    running = true;

                    // 🔓 Re-enable switchTab and restart
                    chrome.storage.local.get("settings", (data) => {
                        if (data.settings) {
                            let updated = { ...data.settings, switchTab: true };
                            chrome.storage.local.set({ settings: updated }, () => {
                                console.log(`🔓 Re-enabled switchTab. Starting Cycle ${cycle + 1}...`);
                                chrome.runtime.sendMessage({ action: "switchTab" });
                            });
                        }
                    });
                }, waitTime);
            } else {
                console.log(`🔄 Switching to next tab (Next Tab = ${processedTabs + 1})...`);
                chrome.runtime.sendMessage({ action: "switchTab" });
            }
        }
    }
}

function closePopup() {
    let popup = document.querySelector("body > div.xenOverlay > div > a");
    if (popup) {
        popup.click();
        console.log("✅ Popup closed!");
    }
}

function startClicks(count, delay) {
    if (running) {
        console.log("⚠️ Already running, ignoring new start.");
        return;
    }

    clickCount = count;
    currentCount = 0;
    interval = delay;
    running = true;

    if (intervalId) clearInterval(intervalId);
    intervalId = setInterval(clickAndClose, interval * 1000);

    console.log(`🚀 Started clicking! Total clicks: ${clickCount}, Interval: ${interval}s, Cycle ${cycle}, Tab ${processedTabs}`);
}

function stopClicks() {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
        console.log("🛑 Stopped clicking!");
    }
    running = false;
}

function applySettings(settings) {
    if (!settings) return;
    console.log("⚡ Applying settings:", settings);

    clickCount = settings.clickCount;
    interval = settings.interval;
    switchCount = settings.switchCount;
    waitTime = settings.waitTime * 60 * 1000;
    switchTab = settings.switchTab;

    // 🚩 Background se tab/cycle sync karna
    if (settings.processedTabs !== undefined) processedTabs = settings.processedTabs;
    if (settings.cycle !== undefined) cycle = settings.cycle;

    if (switchTab) {
        startClicks(clickCount, interval);
    } else {
        console.log("⏸️ Waiting... clicks not started because switchTab=false");
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "start") {
        console.log("📩 Start action received in content script!");
        applySettings(request);

        chrome.storage.local.set({ settings: request }, () => {
            console.log("💾 Settings saved globally:", request);
        });

    } else if (request.action === "stop") {
        console.log("📩 Stop action received in content script!");
        stopClicks();
    }
});

chrome.storage.local.get("settings", (data) => {
    if (data.settings) {
        console.log("📦 Found saved settings in storage:", data.settings);
        applySettings(data.settings);
    } else {
        console.log("⚠️ No saved settings found in storage.");
    }
});
