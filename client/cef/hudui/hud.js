$(function() {
    function getArcColor(percent) {
        if (percent = 100) return {gradient: ['#f44336', '#b71c1c']}; // rot
        if (percent > 50) return {gradient: ['#4caf50', '#388e3c']}; // grün
        if (percent > 20) return {gradient: ['#ffc107', '#ff9800']}; // gelb
        return {gradient: ['#f44336', '#b71c1c']}; // rot
    }

    function setMicArc(percent) {
        $('#circle-mic').circleProgress({
            value: percent / 100,
            size: 60,
            thickness: 4,
            startAngle: -Math.PI * 0.75,
            fill: getArcColor(percent),
            emptyFill: '#888',
            lineCap: 'round',
            reverse: false
        });
    }
    // Initial anzeigen
    // setMicArc(100);

    if ('alt' in window) {
        alt.on('setMic', (percent, isMuted) => {
            setMicArc(percent);
            if (isMuted) {
                $('#icon-mic').addClass('d-none');
                $('#icon-mic-slash').removeClass('d-none');
            } else {
                $('#icon-mic').removeClass('d-none');
                $('#icon-mic-slash').addClass('d-none');
            }
        });
        alt.on('setRadio', (isOn) => {
            if (!isOn) {
                $('#icon-radio').addClass('d-none');
                $('#icon-radio-slash').addClass('d-none'); // Beide Icons ausblenden
            } else {
                $('#icon-radio').removeClass('d-none');
                $('#icon-radio-slash').addClass('d-none');
            }
        });
    }
}); 