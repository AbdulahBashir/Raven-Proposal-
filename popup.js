// Start button click
document.getElementById("start").addEventListener("click", function() {
    let clickCount = parseInt(document.getElementById("clicks").value);
    let interval = parseInt(document.getElementById("time").value);
    let switchCount = parseInt(document.getElementById("switchTab").value);
    let waitTime = parseInt(document.getElementById("waitTime").value);
    let switchTabCheck = document.getElementById("switchTabCheck").checked;

    let settings = {
        action: "start",
        clickCount,
        interval,
        switchCount,
        waitTime,
        switchTab: switchTabCheck
    };

    // Save globally so new tabs auto-load it
    chrome.storage.local.set({ settings }, () => {
        console.log("💾 Settings saved globally from popup:", settings);
    });

    // Send start message to active tab
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        let tabId = tabs[0].id;
        chrome.tabs.sendMessage(tabId, settings);
    });
});

// Stop button click
document.getElementById("stop").addEventListener("click", function() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        let tabId = tabs[0].id;
        chrome.tabs.sendMessage(tabId, { action: "stop" });
    });
});
