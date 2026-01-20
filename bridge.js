const syncSettings = () => {
    chrome.storage.local.get(['nick', 'enabled', 'zoom'], (data) => {
        localStorage.setItem('flamstak_tracker_settings', JSON.stringify(data));
    });
};

syncSettings();
chrome.storage.onChanged.addListener(syncSettings);