import * as alt from 'alt-client';
import config from './config.js';

let hud = null;

if (config.USE_HUD) {
    alt.on('connectionComplete', () => {
        hud = new alt.WebView('http://resource/client/cef/hudui/hud.html');
        // Direkt nach dem Erstellen den aktuellen Radio-Status senden:
        setTimeout(() => {
            // Du hast aber in client_hudui.js keinen Zugriff auf isRadioON.
            // Lösung: updateHudRadio(false); // oder true, je nach Default
            updateHudRadio(false); // Standardmäßig aus, oder Wert aus Client-Logik übergeben
        }, 100);
    });
}

export function updateHudMic(percent, isMuted) {
    if (hud) hud.emit('setMic', percent, isMuted);
}

export function updateHudRadio(isOn) {
    if (hud) hud.emit('setRadio', isOn);
}

function getMicPercentFromRange(range) {
    switch (range) {
        case 3:   // Flüstern
            return 25;
        case 8:   // Normal
            return 50;
        case 15:  // Rufen
            return 100;
        default:
            return 0;
    }
}

export function onVoiceRangeChange(range, isMuted = false) {
    const percent = getMicPercentFromRange(range);
    updateHudMic(percent, isMuted);
}

alt.on('disconnect', () => {
    if (config.USE_HUD && hud) {
        hud.destroy();
        hud = null;
    }
}); 