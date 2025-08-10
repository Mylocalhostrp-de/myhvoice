export default {
    useDebugMode: false,          // Debugmode aktivieren/deaktivieren
    USE_MEGA_FILTER: true,         // Megafon-Filter aktivieren/deaktivieren
    USE_RADIO_FILTER: true,        // Walkie-Talkie-Filter aktivieren/deaktivieren
    VOICE_RANGES: {
        LOW: 3,    // Flüstern
        MID: 8,    // Normales Reden
        LONG: 15,  // Rufen
        MEGA: 30   // Megafon
    },
    EVENTS: {
        CONNECT: "server:myhvoice:connect",
        PHONE_CALL_START: "server:myhvoice:phoneCallstart",
        PHONE_CALL_STOP: "server:myhvoice:phoneCallstop",
        CHANGE_PLAYER_ALIVE: "server:myhvoice:changePlayerAliveStatus",
    }
};
