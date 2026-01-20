(function() {
    // 1. STYLIZACJA HUD (Dymka)
    const style = document.createElement('style');
    style.textContent = `
        #flamstak-hud {
            position: fixed; top: 50px; right: 20px; width: 240px;
            background: rgba(18, 18, 18, 0.95); border: 1px solid #333;
            border-radius: 12px; color: white; font-family: 'Segoe UI', sans-serif;
            z-index: 999999; padding: 15px; box-shadow: 0 8px 32px rgba(0,0,0,0.7);
            backdrop-filter: blur(10px); cursor: move; user-select: none;
            transition: opacity 0.5s ease;
        }
        .hud-header { font-size: 10px; font-weight: 900; color: #888; display: flex; justify-content: space-between; margin-bottom: 10px; }
        #hud-dim { background: #00ffaa; color: #000; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 900; }
        .hud-nick { font-size: 18px; font-weight: 800; color: #00ffaa; margin-bottom: 12px; }
        .hud-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-family: monospace; font-size: 13px; }
        .h-stat { background: rgba(255,255,255,0.05); padding: 6px; border-radius: 6px; border-left: 3px solid #00ffaa; }
        #h-copy { width: 100%; margin-top: 15px; background: transparent; border: 1px solid #00ffaa; color: #00ffaa; border-radius: 8px; padding: 8px; cursor: pointer; font-weight: bold; }
        #h-copy:hover { background: #00ffaa; color: #000; }
        .hud-footer { margin-top: 15px; padding-top: 10px; border-top: 1px solid #333; font-size: 11px; font-weight: 900; text-align: center; letter-spacing: 2px; text-transform: uppercase; background: linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000); background-size: 400% auto; -webkit-background-clip: text; -webkit-text-fill-color: transparent; animation: rainbow_anim 4s linear infinite; }
        @keyframes rainbow_anim { 0% { background-position: 0% 50%; } 100% { background-position: 100% 50%; } }
    `;
    document.head.appendChild(style);

    // 2. STRUKTURA HTML HUD
    const hud = document.createElement('div');
    hud.id = 'flamstak-hud';
    hud.innerHTML = `
        <div class="hud-header"><span>📡 RADAR FLAMSTAK</span><span id="hud-dim">---</span></div>
        <div class="hud-nick" id="hud-nick">Radar Ready</div>
        <div class="hud-stats">
            <div class="h-stat">X: <span id="h-x">-</span></div>
            <div class="h-stat">Z: <span id="h-z">-</span></div>
            <div class="h-stat">Y: <span id="h-y">-</span></div>
            <div class="h-stat">ZM: <span id="h-zoom">-</span></div>
        </div>
        <button id="h-copy">📋 KOPIUJ /TP</button>
        <div class="hud-footer">Created by Flamstak</div>
    `;
    document.body.appendChild(hud);

    // 3. PRZECIĄGANIE HUD
    let isDragging = false, offset = { x: 0, y: 0 };
    hud.onmousedown = (e) => {
        if (e.target.tagName === 'BUTTON') return;
        isDragging = true;
        offset = { x: e.clientX - hud.offsetLeft, y: e.clientY - hud.offsetTop };
    };
    document.onmousemove = (e) => {
        if (!isDragging) return;
        hud.style.left = (e.clientX - offset.x) + 'px';
        hud.style.top = (e.clientY - offset.y) + 'px';
        hud.style.right = 'auto';
    };
    document.onmouseup = () => isDragging = false;

    // 4. BEZPIECZNE KOPIOWANIE W HUD
    document.getElementById('h-copy').onclick = () => {
        const x = document.getElementById('h-x').innerText;
        const y = document.getElementById('h-y').innerText;
        const z = document.getElementById('h-z').innerText;
        
        if (x !== "-") {
            const tpCommand = `/tp ${x} ${y} ${z}`;
            const textArea = document.createElement("textarea");
            textArea.value = tpCommand;
            textArea.style.position = "fixed";
            textArea.style.left = "-9999px";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            try {
                document.execCommand('copy');
                const btn = document.getElementById('h-copy');
                btn.innerText = "✅ SKOPIOWANO!";
                setTimeout(() => btn.innerText = "📋 KOPIUJ /TP", 2000);
            } catch (err) { console.error('Błąd kopiowania HUD:', err); }
            
            document.body.removeChild(textArea);
        }
    };

    // 5. GŁÓWNA PĘTLA RADARU
    setInterval(() => {
        const raw = localStorage.getItem('flamstak_tracker_settings');
        if (!raw) return;
        const data = JSON.parse(raw);
        
        const hudEl = document.getElementById('flamstak-hud');
        if (!data.enabled || !data.nick) {
            hudEl.style.opacity = "0.2";
            return;
        }
        hudEl.style.opacity = "1";

        let player = null, world = "overworld", realName = "", target = data.nick.toLowerCase();
        const app = document.getElementById("app");

        function walk(v) {
            if (player || !v) return;
            const proxy = v.component?.proxy;
            if (proxy?.playerMarkerSet?.markers) {
                const f = proxy.playerMarkerSet.markers.find(m => (m.label || m.name || "").toLowerCase().includes(target));
                if (f) { 
                    player = f.position || { x: f.x, y: f.y, z: f.z }; 
                    world = f.world || "overworld"; 
                    realName = f.label || f.name; 
                }
            }
            if (v.children && Array.isArray(v.children)) v.children.forEach(walk);
            else if (v.component?.subTree) walk(v.component.subTree);
        }

        if (app && app._vnode) walk(app._vnode);

        if (player) {
            const x = Math.round(player.x), y = Math.round(player.y), z = Math.round(player.z);
            const zoom = data.zoom || 600;
            document.getElementById('h-x').innerText = x;
            document.getElementById('h-y').innerText = y;
            document.getElementById('h-z').innerText = z;
            document.getElementById('h-zoom').innerText = zoom;
            document.getElementById('hud-nick').innerText = realName;
            const db = document.getElementById('hud-dim');
            db.innerText = world.toUpperCase();
            db.style.background = world.includes('nether') ? "#ff4444" : (world.includes('end') ? "#aa44ff" : "#00ffaa");
            
            const h = `#${world}:${x}:${y}:${z}:${zoom}:0:0:0:0:perspective`;
            if (window.location.hash !== h) window.location.hash = h;
        }
    }, 2000);
})();