// Kanäle fest vorgegeben
const channels = Array.from({length: 1000}, (_, i) => ({ name: `Kanal ${i+1}`, freq: i+1 }));

let currentFunkChannel = '';

window.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('FunkBox-funkInput');
    const joinBtn = document.querySelector('.funkbuttonbeitreten');
    const leftBtn = document.querySelector('.funkbuttonleft');
    const rightBtn = document.querySelector('.funkbuttonright');

    // Startwert: leeres Feld
    
    let channelIndex = 0;

    leftBtn.onclick = () => {
        channelIndex = (channelIndex - 1 + channels.length) % channels.length;
        input.value = channels[channelIndex].name;
    };
    rightBtn.onclick = () => {
        channelIndex = (channelIndex + 1) % channels.length;
        input.value = channels[channelIndex].name;
    };
    joinBtn.onclick = () => {
        let freq = input.value.trim().replace(/,/g, '.'); // Kommas zu Punkten
        // Prüfe auf leere Eingabe oder 0
        if (!freq || freq === '0') {
            //alert('Ungültige Frequenz! Bitte gib eine gültige Zahl ein.');
            return;
        }
        currentFunkChannel = channels[channelIndex].name; // Merken!
        if ('alt' in window) {
            alt.emit('funkui:joinChannel', freq);
        }
        //alert('Du bist jetzt im Kanal: ' + freq);
    };

    // Push-to-Talk-Anzeige (optional)
    window.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'funkui:talking') {
            if (event.data.state) {
                input.style.background = 'rgba(0,255,0,0.2)';
            } else {
                input.style.background = '';
            }
        }
    });

    alt.on('funkui:setChannel', (channel) => {
        input.value = channel || '';
    });

    if (currentFunkChannel) {
        input.value = currentFunkChannel;
    } else {
        input.value = '';
    }
}); 