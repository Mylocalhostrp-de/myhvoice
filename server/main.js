import * as alt from 'alt-server';
import config from './config.js';

class AltvVoiceServerModule {
    constructor() {
        // Voice Channels mit jeweiliger maximaler Reichweite
        this.lowRangeChannel = new alt.VoiceChannel(true, config.VOICE_RANGES.LOW);
        this.midRangeChannel = new alt.VoiceChannel(true, config.VOICE_RANGES.MID);
        this.longRangeChannel = new alt.VoiceChannel(true, config.VOICE_RANGES.LONG);
        this.schreiRangeChannel = new alt.VoiceChannel(true, config.VOICE_RANGES.SCHR);
        this.MegafunRangeChannel = new alt.VoiceChannel(true, config.VOICE_RANGES.MEGA);
        if (config.USE_MEGA_FILTER) {
            this.MegafunRangeChannel.filter = alt.hash("megaphone");
        }

        this.callChannel = new alt.VoiceChannel(false, -1);
        this.activeCalls = new Map();

        // this.radioChannel = new alt.VoiceChannel(false, -1);
        // if (config.USE_RADIO_FILTER) {
        //     this.radioChannel.filter = alt.hash("walkietalkie");
        // }
        this.radioChannels = new Map();
        this.playerRadioChannels = new Map();

        this.registerEvents();
        alt.log('myhvoiceServerModule init');
    }

    registerEvents() {
        alt.on(config.EVENTS.CONNECT, (player) => {
            this.addToVoiceChannels(player);
            this.setVoiceRange(player, config.VOICE_RANGES.LOW); // Start mit Flüstern
        });

        alt.on('playerDisconnect', this.removePlayerFromChannels.bind(this));
        alt.on('removeEntity', this.removePlayerFromChannels.bind(this));
        alt.on(config.EVENTS.CHANGE_PLAYER_ALIVE, this.changePlayerAliveStatus.bind(this));

        alt.on(config.EVENTS.PHONE_CALL_START, this.startCall.bind(this));
        alt.on(config.EVENTS.PHONE_CALL_STOP, this.endCall.bind(this));

        //Client
        alt.onClient('server:ChangeVoiceRange', this.changeVoiceRange.bind(this));

        alt.onClient('server:Megafun', this.megafun.bind(this));

        alt.onClient('Server:Smartphone:setMute', this.phoneMute.bind(this));
        
        alt.onClient('server:Radioprop', this.radio.bind(this));
        alt.onClient('server:SetRadioChannel', this.setPlayerRadioChannel.bind(this));
        alt.onClient('server:JoinRadioChannel', this.joinRadioChannel.bind(this));
        alt.onClient('server:LeaveRadioChannel', this.leaveRadioChannel.bind(this));
        alt.onClient('server:ToggleRadioSpeaking', this.toggleRadioSpeaking.bind(this));
    }

    addToVoiceChannels(player) {
        if (config.useDebugMode) {
            alt.log("addToVoiceChannels: " + player);
        }
        this.lowRangeChannel.addPlayer(player);
        this.midRangeChannel.addPlayer(player);
        this.longRangeChannel.addPlayer(player);
        this.schreiRangeChannel.addPlayer(player);
        this.MegafunRangeChannel.addPlayer(player);
    }

    removePlayerFromChannels(player) {
        if (!player || !player.valid) return;
        if (config.useDebugMode) {
            alt.log("RemovePlayerFromChannels: " + player);
        }
        this.lowRangeChannel.removePlayer(player);
        this.midRangeChannel.removePlayer(player);
        this.longRangeChannel.removePlayer(player);
        this.schreiRangeChannel.removePlayer(player);
        this.MegafunRangeChannel.removePlayer(player);
    }

    muteInAllChannels(player) {
        if (config.useDebugMode) {
            alt.log("MuteInAllChannels: " + player);
            // if (this.isPlayerInCall(player)) {
            //     alt.log("[MyHVoice] Spieler " + player.id + " ist aktuell in einem Call!");
            // } else {
            //     alt.log("[MyHVoice] Spieler " + player.id + " ist NICHT in einem Call.");
            // }
            // if (this.playerRadioChannels.has(player)) {
            //     alt.log("[MyHVoice] Spieler " + player.id + " ist aktuell im Funk!");
            // } else {
            //     alt.log("[MyHVoice] Spieler " + player.id + " ist NICHT im Funk.");
            // }
        }
        this.lowRangeChannel.mutePlayer(player);
        this.midRangeChannel.mutePlayer(player);
        this.longRangeChannel.mutePlayer(player);
        this.schreiRangeChannel.mutePlayer(player);
        this.MegafunRangeChannel.mutePlayer(player);

        // if (this.isPlayerInCall(player)) {
        //     this.callChannel.mutePlayer(player);
        // }
        // if (this.playerRadioChannels.has(player)) {
        //     this.radioChannel.mutePlayer(player);
        // }
    }

    changePlayerAliveStatus(player, isAlive) {
        player.isAlive = isAlive;
        if (isAlive == false)
        {
            if (config.useDebugMode) {
                alt.log("Change Deat player false");
                if (this.isPlayerInCall(player)) {
                    alt.log("[MyHVoice] Spieler " + player.id + " ist aktuell in einem Call!");
                } else {
                    alt.log("[MyHVoice] Spieler " + player.id + " ist NICHT in einem Call.");
                }
                if (this.playerRadioChannels.has(player)) {
                    alt.log("[MyHVoice] Spieler " + player.id + " ist aktuell im Funk!");
                } else {
                    alt.log("[MyHVoice] Spieler " + player.id + " ist NICHT im Funk.");
                }
            }
            this.setVoiceRange(player, player.voiceRange);
            if (this.isPlayerInCall(player)) {
                this.callChannel.unmutePlayer(player);
            }
            // if (this.playerRadioChannels.has(player)) {
            //     this.radioChannel.unmutePlayer(player);
            // }
            return;
        }
        else
        {
            if (config.useDebugMode) {
                alt.log("Change Deat player true");
            }
            this.muteInAllChannels(player);
            if (this.isPlayerInCall(player)) {
                this.callChannel.mutePlayer(player);
            }
            if (this.playerRadioChannels.has(player)) {
                this.radioChannels.mutePlayer(player);
            }
            return;
        }
        
    }

    setVoiceRange(player, range) {
        if (player.isAlive == true) return;
        player.voiceRange = range;

        // Zuerst überall stummschalten
        this.muteInAllChannels(player);

        // Dann im aktiven Bereich freigeben
        switch (range) {
            case 3:
                this.lowRangeChannel.unmutePlayer(player);
                // if (this.isPlayerInCall(player)) {
                //     this.callChannel.unmutePlayer(player);
                // }
                // if (this.playerRadioChannels.has(player)) {
                //     this.radioChannel.unmutePlayer(player);
                // }
                break;
            case 8:
                this.midRangeChannel.unmutePlayer(player);
                // if (this.isPlayerInCall(player)) {
                //     this.callChannel.unmutePlayer(player);
                // }
                // if (this.playerRadioChannels.has(player)) {
                //     this.radioChannel.unmutePlayer(player);
                // }
                break;
            case 15:
                this.longRangeChannel.unmutePlayer(player);
                // if (this.isPlayerInCall(player)) {
                //     this.callChannel.unmutePlayer(player);
                // }
                // if (this.playerRadioChannels.has(player)) {
                //     this.radioChannel.unmutePlayer(player);
                // }
                break;
            case 30:
                this.schreiRangeChannel.unmutePlayer(player);
                break;
            default:
                break;
        }

        alt.emitClient(player, 'client:UpdateCurrentAltVoiceRange', range);
    }

    changeVoiceRange(player) {
        if (player.isAlive == true) return;
        if (!player.voiceRange) {
            player.voiceRange = 0;
        }

        switch (player.voiceRange) {
            case 0:
                this.setVoiceRange(player, 3);
                break;
            case 3:
                this.setVoiceRange(player, 8);
                break;
            case 8:
                this.setVoiceRange(player, 15);
                break;
            case 15:
                this.setVoiceRange(player, 30);
                break;
            case 30:
                this.setVoiceRange(player, 0);
                this.muteInAllChannels(player); // komplett stumm
                alt.emitClient(player, 'client:UpdateCurrentAltVoiceRange', 0);
                break;
            default:
                break;
        }
    }

    megafun(player, use) {
        if (config.useDebugMode) {
            alt.log("Megafun " + use);
        }
        if (use == false)
        {
            this.MegafunRangeChannel.mutePlayer(player);
            player.deleteStreamSyncedMeta("player_myhvoiceprop");
            alt.emitClient(player, 'megaphone:detachProp');
        }
        else
        {
            this.MegafunRangeChannel.unmutePlayer(player);
            player.setStreamSyncedMeta("player_myhvoiceprop", {
                model: 'prop_megaphone_01',
                bone: 28422,
                pos: { x: 0.05, y: 0.054, z: -0.006 },
                rot: { x: -71.885498, y: -13.0889, z: -16.0242 }
            });
            alt.emitClient(player, 'megaphone:attachProp');
        }
    }

    startCall(caller, receiver) {
        if (!caller || !receiver || !caller.valid || !receiver.valid) return;
        if (config.useDebugMode) {
            alt.log("Callstart caller " + caller.id + " to " + receiver.id);
        }
    
        // In Call-Channel hinzufügen
        this.callChannel.addPlayer(caller);
        this.callChannel.addPlayer(receiver);
    
        this.callChannel.unmutePlayer(caller);
        this.callChannel.unmutePlayer(receiver);
    
        this.activeCalls.set(caller.id, receiver);
        this.activeCalls.set(receiver.id, caller);
    }

    phoneMute(player, mute) {
        if (mute == false) {
            this.callChannel.mutePlayer(player);
        }
        else {
            this.callChannel.unmutePlayer(player);
        }
        if (config.useDebugMode) {
            alt.log("phoneMute player " + player.id + " mute " + mute);
        }
    }

    endCall(player) {
        const partner = this.activeCalls.get(player.id);
        if (config.useDebugMode) {
            alt.log("Callend player" + player + " partner " + partner);
        }
        if (!partner || !partner.valid) return;
    
        this.callChannel.removePlayer(player);
        this.callChannel.removePlayer(partner);
    
        this.activeCalls.delete(player.id);
        this.activeCalls.delete(partner.id);
    }

    radio(player, use) {
        if (config.useDebugMode) {
            alt.log("Use Radio player " + player + " use " + use);
        }
        if (use == true)
        {
            player.setStreamSyncedMeta("player_myhvoiceprop", {
                model: 'prop_cs_walkie_talkie',
                bone: 28422,
                pos: { x: 0, y: 0, z: 0 },
                rot: { x: 0, y: 0, z: 0 }
            });
        }
        else
        {
            player.deleteStreamSyncedMeta("player_myhvoiceprop");
        }
    }

    // setPlayerRadioChannel(player, channel) {
    //     if (channel === 0) {
    //         if (config.useDebugMode) {
    //             alt.log("setPlayerRadioChannel: " + player + " channel " + channel + " = LeaveRadioChannel");
    //         }
    //         this.radioChannel.mutePlayer(player);
    //         this.playerRadioChannels.delete(player);
    //         return;
    //     }

    //     if (config.useDebugMode) {
    //         alt.log("setPlayerRadioChannel: " + player + " channel " + channel);
    //     }
    
    //     this.radioChannel.addPlayer(player);
    //     this.radioChannel.mutePlayer(player);
    //     this.playerRadioChannels.set(player, channel);
    // }

    // joinRadioChannel(player, channel) {
    //     //if (!this.playerRadioChannels.has(player)) return;
    //     if (config.useDebugMode) {
    //         alt.log("JoinRadio player: " + player);
    //     }
    //     this.radioChannels.addPlayer(player);
    //     this.radioChannels.mutePlayer(player);
    //     this.playerRadioChannels.set(player, channel);
    // }

    // leaveRadioChannel(player) {
    //     if (!this.playerRadioChannels.has(player)) return;
    //     if (config.useDebugMode) {
    //         alt.log("LeaveRadio player: " + player);
    //     }
    //     this.radioChannels.mutePlayer(player);
    //     this.radioChannels.removePlayer(player);
    //     this.playerRadioChannels.delete(player);
    // }

    // toggleRadioSpeaking(player, state) {
    //     if (!this.playerRadioChannels.has(player)) return;
    //     if (config.useDebugMode) {
    //         alt.log("Use Radiospeaking player: " + player + " Use " + state);
    //     }
    
    //     if (state) {
    //         this.radioChannels.unmutePlayer(player); // beginnt zu sprechen
    //     } else {
    //         this.radioChannels.mutePlayer(player); // hört auf
    //     }
    // }

    setPlayerRadioChannel(player, channel) {
        // Erst alten Funk verlassen
        this.leaveRadioChannel(player);

        if (channel === 0) return;

        // Wenn der Channel noch nicht existiert, erstellen
        if (!this.radioChannels.has(channel)) {
            this.radioChannels.set(channel, new alt.VoiceChannel(false, -1));
            if (config.USE_RADIO_FILTER) {
                this.radioChannels.filter = alt.hash("walkietalkie");
            }
        }

        const chan = this.radioChannels.get(channel);
        chan.addPlayer(player);
        chan.mutePlayer(player);

        this.playerRadioChannels.set(player, channel);

        if (config.useDebugMode) {
            alt.log(`[FUNK] Spieler ${player.id} ist jetzt in Kanal ${channel}`);
        }
    }

    joinRadioChannel(player, channel) {
        if (config.useDebugMode) {
            alt.log(`JoinRadio player ${player.id} channel ${channel}`);
        }

        // Falls der Channel noch nicht existiert → erstellen
        if (!this.radioChannels.has(channel)) {
            this.radioChannels.set(channel, new alt.VoiceChannel(false, -1));
            if (config.USE_RADIO_FILTER) {
                this.radioChannels.filter = alt.hash("walkietalkie");
            }
        }

        // Spieler altem Channel entfernen, falls er schon in einem war
        if (this.playerRadioChannels.has(player)) {
            const oldChannel = this.playerRadioChannels.get(player);
            const oldVC = this.radioChannels.get(oldChannel);
            if (oldVC) oldVC.removePlayer(player);
        }

        // Spieler in neuen Channel packen
        const vc = this.radioChannels.get(channel);
        vc.addPlayer(player);
        vc.mutePlayer(player); // erstmal gemutet
        this.playerRadioChannels.set(player, channel);
    }
    
    leaveRadioChannel(player) {
        const channel = this.playerRadioChannels.get(player);
        if (!channel) return;

        const chan = this.radioChannels.get(channel);
        if (chan) {
            chan.removePlayer(player);
        }

        this.playerRadioChannels.delete(player);

        if (config.useDebugMode) {
            alt.log(`[FUNK] Spieler ${player.id} hat Kanal ${channel} verlassen`);
        }
    }

    toggleRadioSpeaking(player, state) {
        const channel = this.playerRadioChannels.get(player);
        if (!channel) return;

        const chan = this.radioChannels.get(channel);
        if (!chan) return;

        if (state) {
            chan.unmutePlayer(player);
        } else {
            chan.mutePlayer(player);
        }

        if (config.useDebugMode) {
            alt.log(`[FUNK] Spieler ${player.id} speaking=${state} auf Kanal ${channel}`);
        }
    }

    isPlayerInCall(player) {
        return this.activeCalls.has(player.id);
    }
}

export const AltvVoiceServerModuleInstance = new AltvVoiceServerModule();