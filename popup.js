document.addEventListener('DOMContentLoaded', () => {
    const el = {
        nick: document.getElementById('nick'),
        zoom: document.getElementById('zoom'),
        zoomVal: document.getElementById('zoomVal'),
        toggle: document.getElementById('toggle'),
        favList: document.getElementById('favList'),
        livePanel: document.getElementById('livePanel'),
        historyLog: document.getElementById('historyLog'),
        copyBtn: document.getElementById('copyCoords'),
        addFavBtn: document.getElementById('addFav'),
        statX: document.getElementById('statX'),
        statY: document.getElementById('statY'),
        statZ: document.getElementById('statZ'),
        statZoom: document.getElementById('statZoom'),
        displayNick: document.getElementById('displayNick'),
        dimBadge: document.getElementById('dimBadge')
    };

    // 1. Ładowanie zapisanych ustawień
    chrome.storage.local.get(['nick', 'zoom', 'enabled', 'favorites'], (data) => {
        if (data.nick) el.nick.value = data.nick;
        const currentZoom = data.zoom || 600;
        el.zoom.value = currentZoom;
        el.zoomVal.innerText = currentZoom;
        el.toggle.checked = data.enabled || false;

        renderFavorites(data.favorites || []);
        if (el.toggle.checked) startUiUpdater();
    });

    // 2. Funkcja zapisu
    const save = () => {
        const settings = {
            nick: el.nick.value,
            zoom: parseInt(el.zoom.value),
            enabled: el.toggle.checked
        };
        chrome.storage.local.set(settings);

        if (settings.enabled) {
            startUiUpdater();
        } else {
            if (window.uiInterval) clearInterval(window.uiInterval);
            el.livePanel.classList.remove('active');
        }
    };

    // 3. Obsługa listy ulubionych z funkcją usuwania
    const renderFavorites = (favs) => {
        el.favList.innerHTML = '';
        favs.forEach(f => {
            const chip = document.createElement('div');
            chip.className = 'fav-chip';
            
            const name = document.createElement('span');
            name.className = 'fav-name';
            name.innerText = f;
            name.onclick = () => { el.nick.value = f; save(); };

            const del = document.createElement('span');
            del.className = 'fav-delete';
            del.innerText = '×';
            del.onclick = (e) => {
                e.stopPropagation();
                removeFromFavorites(f);
            };

            chip.appendChild(name);
            chip.appendChild(del);
            el.favList.appendChild(chip);
        });
    };

    const removeFromFavorites = (nameToRemove) => {
        chrome.storage.local.get(['favorites'], (d) => {
            const f = d.favorites || [];
            const updated = f.filter(name => name !== nameToRemove);
            chrome.storage.local.set({ favorites: updated }, () => {
                renderFavorites(updated);
            });
        });
    };

    el.addFavBtn.onclick = () => {
        const n = el.nick.value.trim();
        if (!n) return;
        chrome.storage.local.get(['favorites'], (d) => {
            const f = d.favorites || [];
            if (!f.includes(n)) {
                f.push(n);
                chrome.storage.local.set({ favorites: f }, () => renderFavorites(f));
            }
        });
    };

    // 4. System bezpiecznego kopiowania (Pancerny Copy)
    const secureCopy = (text) => {
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
        } else {
            fallbackCopy(text);
        }
    };

    const fallbackCopy = (text) => {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.select();
        try { document.execCommand('copy'); } catch (err) { console.error('Błąd kopiowania:', err); }
        document.body.removeChild(textArea);
    };

    el.copyBtn.onclick = () => {
        const x = el.statX.innerText;
        const y = el.statY.innerText;
        const z = el.statZ.innerText;

        if (x !== "-" && x !== "0") {
            const command = `/tp ${x} ${y} ${z}`;
            secureCopy(command);
            
            el.copyBtn.innerText = "✅ SKOPIOWANO!";
            setTimeout(() => el.copyBtn.innerText = "📋 KOPIUJ /TP", 2000);
        } else {
            el.copyBtn.innerText = "❌ BRAK DANYCH";
            setTimeout(() => el.copyBtn.innerText = "📋 KOPIUJ /TP", 2000);
        }
    };

    // 5. Synchronizacja statystyk z HUDem strony
    function startUiUpdater() {
        if (window.uiInterval) clearInterval(window.uiInterval);
        window.uiInterval = setInterval(() => {
            if (!el.toggle.checked) return;

            chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                const tab = tabs[0];
                if (!tab || !tab.url.includes("mapa.rapy.gg")) return;

                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: () => {
                        const hud = document.getElementById('flamstak-hud');
                        if (!hud) return null;
                        return {
                            nick: document.getElementById('hud-nick')?.innerText || "---",
                            x: document.getElementById('h-x')?.innerText || "-",
                            y: document.getElementById('h-y')?.innerText || "-",
                            z: document.getElementById('h-z')?.innerText || "-",
                            dim: document.getElementById('hud-dim')?.innerText || "---"
                        };
                    },
                    world: "MAIN"
                }, (results) => {
                    const data = results[0]?.result;
                    if (data && data.x !== "-") {
                        el.livePanel.classList.add('active');
                        el.displayNick.innerText = data.nick;
                        el.statX.innerText = data.x;
                        el.statY.innerText = data.y;
                        el.statZ.innerText = data.z;
                        el.statZoom.innerText = el.zoom.value;
                        el.dimBadge.innerText = data.dim;
                    }
                });
            });
        }, 1500);
    }

    el.nick.oninput = save;
    el.zoom.oninput = () => { el.zoomVal.innerText = el.zoom.value; save(); };
    el.toggle.onchange = save;
});