// Store user settings globally
let userSettings = {};
let processedTabs = 0;
let waiting = false;
let cycle = 1;

// Default settings
chrome.runtime.onInstalled.addListener(function() {
    chrome.storage.sync.set({ clickCount: 5, interval: 3, switchCount: 2, waitTime: 1 });
    console.log("Extension installed and default settings saved.");
});

// Listen for messages from popup/content
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "start") {
        console.log("▶️ Extension Start requested");

        userSettings = {
            clickCount: request.clickCount,
            interval: request.interval,
            switchCount: request.switchCount,
            waitTime: request.waitTime,
            switchTab: request.switchTab
        };

        processedTabs = 0;
        waiting = false;
        cycle = 1;

        chrome.storage.sync.set(userSettings, () => console.log("💾 Settings saved."));

        // Start with current active tab
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            let tabId = tabs[0].id;
            let tabIndex = tabs.findIndex(t => t.id === tabId);
            injectAndStart(tabId, tabIndex);
        });

    } else if (request.action === "stop") {
        console.log("⏹️ Stop requested");
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, { action: "stop" });
        });

    } else if (request.action === "switchTab") {
        handleTabSwitch();
    }
});

// --- Helpers ---
function injectAndStart(tabId, tabIndex) {
    chrome.scripting.executeScript(
        { target: { tabId: tabId }, files: ['content.js'] },
        () => {
            console.log(`🚀 Injected content.js on Tab ${tabIndex + 1}, Cycle ${cycle}`);
            chrome.tabs.sendMessage(tabId, { 
                action: "start", 
                ...userSettings, 
                tabIndex: tabIndex + 1,
                cycle: cycle
            });
        }
    );
}

function handleTabSwitch() {
    if (waiting) {
        console.log("⏳ Still waiting, skipping switch.");
        return;
    }

    processedTabs++;
    console.log(`📊 Processed Tabs = ${processedTabs}/${userSettings.switchCount}`);

    if (processedTabs >= userSettings.switchCount) {
        console.log(`✅ Completed ${userSettings.switchCount} tabs. Waiting ${userSettings.waitTime} minutes...`);
        waiting = true;

        setTimeout(() => {
            processedTabs = 0;
            cycle++;
            waiting = false;
            console.log(`▶️ Restarting cycle ${cycle}...`);

            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]) {
                    let tabId = tabs[0].id;
                    let tabIndex = tabs.findIndex(t => t.id === tabId);
                    injectAndStart(tabId, tabIndex);
                }
            });
        }, userSettings.waitTime * 60 * 1000);

        return;
    }

    // switch next tab
    chrome.tabs.query({ currentWindow: true }, (tabs) => {
        let activeIndex = tabs.findIndex(tab => tab.active);
        let nextIndex = (activeIndex + 1) % tabs.length;

        console.log(`➡️ Switching tab [${activeIndex + 1} → ${nextIndex + 1}]`);

        chrome.tabs.update(tabs[nextIndex].id, { active: true }, (tab) => {
            chrome.tabs.reload(tab.id, () => {
                setTimeout(() => injectAndStart(tab.id, nextIndex), 2000);
            });
        });
    });
}
