import * as alt from 'alt-client';
import * as natives from 'natives';
import { onVoiceRangeChange, updateHudRadio } from './client_hudui.js';
import config from './config.js';

let funkView = null;
let propList = [];
let isMuted = false; // Mute-Status für das HUD
const DEFAULT_VOICE_RANGE_COLOR = {
    r: 0,
    g: 255,
    b: 0 
}

const lipsyncAnims = {
    true: {
        name: "mic_chatter",
        dict: "mp_facial"
    },
    false: {
        name: "mood_normal_1",
        dict: "facials@gen_male@variations@normal"
    }
}

// AudioFilter-Definitionen
const walkieTalkieFilter = new alt.AudioFilter('walkietalkie');
walkieTalkieFilter.addBqfEffect(0, 1400, 0, 0.86, 0, 0, 1);
walkieTalkieFilter.addBqfEffect(1, 900, 0, 0.83, 0, 0, 2);
walkieTalkieFilter.addDistortionEffect(0, -2.95, -0.05, -0.08, 0.5, 3);

const megaphoneFilter = new alt.AudioFilter('megaphone');
megaphoneFilter.addBqfEffect(0, 2000, 0, 1, 0, 0, 1);
megaphoneFilter.addBqfEffect(1, 1000, 0, 0.86, 0, 0, 2);
megaphoneFilter.addDistortionEffect(0, -2.95, -0.05, -0.08, 0.25, 3);
megaphoneFilter.addCompressor2Effect(5, -15, 3, 10, 200, 4);
megaphoneFilter.audioCategory = 'altv_voice_megaphone';

//const whisperFilter = new alt.AudioFilter('whisper');
//whisperFilter.audioCategory = 'altv_voice_whisper';

let isFunkUiOpen = false;

class AltvVoiceClientModule {
    constructor() {
        //localPlayer object shortcut
        this.localPlayer = alt.Player.local;
        //interval to check state changes
        this.interval = null;
        this.visualVoiceRangeTimeout = null;
        this.visualVoiceRangeTick = null;
        //cached talking state
        this.talkingState = false;
        //cached voice range
        this.currentRange = 0;
        this.voiceRangeColor = DEFAULT_VOICE_RANGE_COLOR;
        this.isRadioON = false;
        this.isInRadio = false;
        this.isRadioTalking = false;
        this.RadioChannel = 0;
        this.registerEvents();
        alt.log('myhvoice ClientModule init');
    }

    registerEvents() {
        alt.on('keydown', key => {
            if (key == config.KEY_VOICE_RANGE) {
                alt.emitServer('server:ChangeVoiceRange');
            }

            if (key == config.KEY_MEGAFON) {
                if (alt.Player.local.getStreamSyncedMeta("IsCefOpen") == true || alt.Player.local.getStreamSyncedMeta("HasHandcuffs") == true || alt.Player.local.getStreamSyncedMeta("HasRopeCuffs") == true) return;
                alt.emitServer('server:Megafun', true);
            }

            if (key === config.KEY_RADIO_TALK && !this.isRadioTalking) {
                if (alt.Player.local.getStreamSyncedMeta("IsCefOpen") == true || alt.Player.local.getStreamSyncedMeta("HasHandcuffs") == true || alt.Player.local.getStreamSyncedMeta("HasRopeCuffs") == true) return;
                if (this.isRadioON == false) { return; }
                if (this.isInRadio == false) { return; }
                this.isRadioTalking = true;
                alt.emitServer('server:ToggleRadioSpeaking', true);

                natives.requestAnimDict('random@arrests');
                //alt.log("Versuche Animation abzuspielen...");
                if (natives.hasAnimDictLoaded('random@arrests')) {
                    //alt.log("Animation-Aufruf abgeschlossen");
                    natives.taskPlayAnim(this.localPlayer, "random@arrests", "generic_radio_chatter", 3, -4, -1, 49, 1, false, false, false);
                }
            }
            if (key === config.KEY_FUNKTASTE) {
                if (alt.Player.local.getStreamSyncedMeta("IsCefOpen") == true || alt.Player.local.getStreamSyncedMeta("HasHandcuffs") == true || alt.Player.local.getStreamSyncedMeta("HasRopeCuffs") == true) return;
                if (this.isRadioON == false) { return; }
                if (!funkView) {
                    natives.requestAnimDict('cellphone@in_car@ds');
                    //alt.log("Versuche Animation abzuspielen...");
                    if (natives.hasAnimDictLoaded('cellphone@in_car@ds')) {
                        //alt.log("Animation-Aufruf abgeschlossen");
                        natives.taskPlayAnim(this.localPlayer, "cellphone@in_car@ds", "cellphone_text_read_base", 8, 1, -1, 49, 1, false, false, false);
                    }
                    alt.emitServer('server:Radioprop', true);
                    funkView = new alt.WebView('http://resource/client/cef/funkui/index.html');
                    funkView.focus();
                    alt.showCursor(true); // Cursor anzeigen
                    if (this.isInRadio == true)
                    {
                        funkView.emit('funkui:setChannel', this.RadioChannel);
                    }
                    funkView.on('funkui:joinChannel', (freq) => {
                        alt.log("funkjoinchannel " + freq);
                        this.RadioChannel = freq;
                        alt.emitServer('server:JoinRadioChannel', freq);
                        this.isInRadio = true;
                    });
                    isFunkUiOpen = true;
                } else {
                    alt.emitServer('server:Radioprop', false);
                    natives.stopAnimTask(this.localPlayer, "cellphone@in_car@ds", "cellphone_text_read_base", 8);
                    funkView.destroy();
                    funkView = null;
                    alt.showCursor(false); // Cursor verstecken
                    isFunkUiOpen = false;
                }
            }
        });

        alt.on('keyup', key => {
            if (key == config.KEY_MEGAFON) {
                alt.emitServer('server:Megafun', false);
            }

            if (key === config.KEY_RADIO_TALK && this.isRadioTalking) {
                if (this.isInRadio == false) { return; }
                this.isRadioTalking = false;
                alt.emitServer('server:ToggleRadioSpeaking', false);
                natives.stopAnimTask(this.localPlayer, "random@arrests", "generic_radio_chatter", 4);
            }
        });

        alt.onServer('client:UpdateCurrentAltVoiceRange', (range) => {
            this.currentRange = range;
            isMuted = (range === 0);
            if (this.visualVoiceRangeTimeout) {
                alt.clearTimeout(this.visualVoiceRangeTimeout);
                this.visualVoiceRangeTimeout = null;
            }

            if (this.visualVoiceRangeTick) {
                alt.clearEveryTick(this.visualVoiceRangeTick);
                this.visualVoiceRangeTick = null;
            }

            this.visualVoiceRangeTimeout = alt.setTimeout(() => {
                if (this.visualVoiceRangeTick) {
                    alt.clearEveryTick(this.visualVoiceRangeTick);
                    this.visualVoiceRangeTick = null;
                }

                this.visualVoiceRangeTimeout = null;
            }, 1000),

            this.visualVoiceRangeTick = alt.everyTick(() => {
                let pos = this.localPlayer.pos;
                let color = (range === 0) ? { r: 255, g: 0, b: 0 } : this.voiceRangeColor;
                natives.drawMarker(1, pos.x, pos.y, pos.z - 0.98, 0, 0, 0, 0, 0, 0, (range * 2) - 1, (range * 2) - 1, 1, color.r, color.g, color.b, 50, false, true, 2, true, null, null, false);
            });
            //HUD Event
            alt.emit("myhvoice:changeVoiceRange", range);
            // HUD nur aktualisieren, wenn aktiviert
            if (config.USE_HUD) {
                onVoiceRangeChange(range, isMuted);
            }
        });

        alt.onServer('megaphone:attachProp', async () => {
            natives.requestAnimDict('molly@megaphone');
            //alt.log("Versuche Animation abzuspielen...");
            let interval = alt.setInterval(() => {
            if (natives.hasAnimDictLoaded('molly@megaphone')) {
                    alt.clearInterval(interval);
                    //alt.log("Animation-Aufruf abgeschlossen");
                    natives.taskPlayAnim(this.localPlayer.scriptID, 'molly@megaphone', 'megaphone_clip', 8.0, 1, -1, 49, 1, false, false, false);
                }
            }, 0);
        });
        
        alt.onServer('megaphone:detachProp', () => {
            natives.clearPedTasks(this.localPlayer);
        });

        alt.on("streamSyncedMetaChange", (entity, key, value, oldValue) => {
            if (!entity || key !== "player_myhvoiceprop") return;
        
            if (value === undefined && oldValue !== undefined) {
                const foundedObject = propList.find((x) => x.entity === entity);
                if (!foundedObject) return;
                natives.deleteObject(foundedObject.prop);
                propList = propList.filter((x) => x.entity !== entity);
            } else if (value !== undefined && oldValue === undefined) {
                const objModel = natives.getHashKey(value.model);
                natives.requestModel(objModel);
        
                const requestInter = alt.setInterval(() => {
                    if (!natives.hasModelLoaded(objModel)) return;
        
                    const createdObject = natives.createObject(
                        objModel,
                        entity.pos.x,
                        entity.pos.y,
                        entity.pos.z,
                        true,
                        true,
                        false
                    );
        
                    natives.attachEntityToEntity(
                        createdObject,
                        entity,
                        natives.getPedBoneIndex(entity, value.bone),
                        value.pos.x, value.pos.y, value.pos.z,
                        value.rot.x, value.rot.y, value.rot.z,
                        false, false, false, false, 1, true, 1
                    );
        
                    propList.push({ entity, prop: createdObject });
                    alt.clearInterval(requestInter);
                }, 0);
            }
        });

        alt.on("gameEntityCreate", (entity) => {
            if (!entity || !entity.hasStreamSyncedMeta("player_myhvoiceprop")) return;
            const value = entity.getStreamSyncedMeta("player_myhvoiceprop");
        
            const objModel = natives.getHashKey(value.model);
            natives.requestModel(objModel);
        
            const requestInter = alt.setInterval(() => {
                if (!natives.hasModelLoaded(objModel)) return;
        
                const createdObject = natives.createObject(
                    objModel,
                    entity.pos.x,
                    entity.pos.y,
                    entity.pos.z,
                    true,
                    true,
                    false
                );
        
                natives.attachEntityToEntity(
                    createdObject,
                    entity,
                    natives.getPedBoneIndex(entity, value.bone),
                    value.pos.x, value.pos.y, value.pos.z,
                    value.rot.x, value.rot.y, value.rot.z,
                    false, false, false, false, 1, true, 1
                );
        
                propList.push({ entity, prop: createdObject });
                alt.clearInterval(requestInter);
            }, 0);
        });

        alt.on("gameEntityDestroy", (entity) => {
            if (!entity || !entity.hasStreamSyncedMeta("player_myhvoiceprop")) return;
            const foundedObject = propList.find((x) => x.entity === entity);
            if (!foundedObject) return;
            natives.deleteObject(foundedObject.prop);
            propList = propList.filter((x) => x.entity !== entity);
        });

        alt.onServer('myhvoice:Funk:onoff', (onoff) => {
            this.isRadioON = onoff; //Radio ON = true, Radio OFF = false
            if (this.isRadioON == false) {
                this.isInRadio = false;
                if (funkView) funkView.destroy();
                funkView = null;
                alt.showCursor(false); // Cursor verstecken
                isFunkUiOpen = false;
                alt.emitServer('server:LeaveRadioChannel');
            }
            if (config.USE_HUD) updateHudRadio(this.isRadioON);
        });

        this.registerTalkingInterval();

        alt.everyTick(() => {
            if (isFunkUiOpen) {
                // Blockiere Nahkampf/Angriff
                natives.disableControlAction(0, 24, true); // Angriff (LMB)
                natives.disableControlAction(0, 140, true); // Nahkampf
                natives.disableControlAction(0, 141, true); // Nahkampf
                natives.disableControlAction(0, 142, true); // Nahkampf
                natives.disableControlAction(0, 257, true); // Angriff (LMB)
            }
        });
    }

    /*
     * interval to handle talking state changes
     * i.e show in your ui if this player is talking (like ts3 voice led)
     */
    registerTalkingInterval() {
        this.interval = alt.setInterval(() => {
            //only emit if state changed
            if (this.talkingState !== this.localPlayer.isTalking && this.currentRange !== 0) {
                this.talkingState = this.localPlayer.isTalking;
                const animationData = lipsyncAnims[this.talkingState];
                //alt.log("lipsync", this.talkingState);
                natives.playFacialAnim(this.localPlayer, animationData.name, animationData.dict);
                //emit talking state change to your ui {this.talkingState}
            }
            if (this.talkingState && this.currentRange === 0) {
                //emit talking state change to your ui {false}
                //alt.log("lipsyncoff", this.talkingState);
            }
        }, 444);
    }
}

//initilize voice class instance
export const AltvVoiceClientModuleInstance = new AltvVoiceClientModule();
