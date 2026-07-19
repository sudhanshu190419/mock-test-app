package com.mocktestapp

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.media.AudioDeviceInfo
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioRecord
import android.media.audiofx.AcousticEchoCanceler
import android.media.audiofx.AutomaticGainControl
import android.media.audiofx.NoiseSuppressor
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * Native module that reads Android's audio subsystem state and device
 * information for diagnostic purposes only.
 *
 * *** This module NEVER changes audio settings. ***
 * All methods are read-only.
 *
 * Lifecycle:
 * - Call `getAllDiagnostics()` for a full snapshot at any time.
 * - Call `startRouteMonitoring()` to subscribe to AudioManager audio
 *   device and mode changes via React Native events.
 * - Call `stopRouteMonitoring()` to unsubscribe.
 */
class AudioDiagnosticsModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val TAG = "AudioDiagNative"
        const val MODULE_NAME = "AudioDiagnostics"
        const val EVENT_ROUTE_CHANGED = "onAudioRouteChanged"
    }

    private val audioManager: AudioManager?
        get() = reactApplicationContext.getSystemService(Context.AUDIO_SERVICE) as? AudioManager

    private var routeReceiver: BroadcastReceiver? = null
    private var isMonitoring = false

    // Mode monitoring
    private var previousMode = AudioManager.MODE_INVALID
    private var modeReceiver: BroadcastReceiver? = null
    private var isModeMonitoring = false

    // Audio level polling
    private var levelHandler: Handler? = null
    private var levelRunnable: Runnable? = null
    private var isLevelPolling = false

    // ═══════════════════════════════════════════════════════════════════
    //  Module identity
    // ═══════════════════════════════════════════════════════════════════

    override fun getName(): String = MODULE_NAME

    // ═══════════════════════════════════════════════════════════════════
    //  Device Information
    // ═══════════════════════════════════════════════════════════════════

    @ReactMethod
    fun getDeviceInfo(promise: Promise) {
        try {
            promise.resolve(buildDeviceInfoMap())
        } catch (e: Exception) {
            promise.reject("DEVICE_INFO_ERROR", "Failed to read device info", e)
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Audio Manager State
    // ═══════════════════════════════════════════════════════════════════

    @ReactMethod
    fun getAudioManagerState(promise: Promise) {
        try {
            val am = audioManager
            if (am == null) {
                promise.reject("AUDIO_MANAGER_NULL", "AudioManager service not available")
                return
            }
            promise.resolve(buildAudioManagerMap(am))
        } catch (e: Exception) {
            promise.reject("AUDIO_MANAGER_ERROR", "Failed to read AudioManager state", e)
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Microphone / Audio Processing Capabilities
    // ═══════════════════════════════════════════════════════════════════

    @ReactMethod
    fun getMicrophoneInfo(promise: Promise) {
        try {
            promise.resolve(buildMicrophoneMap())
        } catch (e: Exception) {
            promise.reject("MIC_INFO_ERROR", "Failed to read microphone info", e)
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Full diagnostics snapshot (inlined, no PromiseWrapper needed)
    // ═══════════════════════════════════════════════════════════════════

    @ReactMethod
    fun getAllDiagnostics(promise: Promise) {
        try {
            val result = Arguments.createMap()
            result.putMap("device", buildDeviceInfoMap())
            val am = audioManager
            if (am != null) {
                result.putMap("audioManager", buildAudioManagerMap(am))
            }
            result.putMap("microphone", buildMicrophoneMap())
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("DIAG_ERROR", "Failed to collect all diagnostics", e)
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    //  AudioRecord Configuration Diagnostics (read-only, no AudioRecord created)
    // ═══════════════════════════════════════════════════════════════════

    @ReactMethod
    fun getAudioRecordConfig(promise: Promise) {
        try {
            val result = Arguments.createMap()

            val sampleRates = intArrayOf(8000, 11025, 16000, 22050, 44100, 48000)
            data class ChannelCombo(val label: String, val config: Int)
            val channelConfigs = listOf(
                ChannelCombo("MONO", AudioFormat.CHANNEL_IN_MONO),
                ChannelCombo("STEREO", AudioFormat.CHANNEL_IN_STEREO),
            )
            data class EncodingCombo(val label: String, val encoding: Int)
            val encodings = listOf(
                EncodingCombo("PCM_16BIT", AudioFormat.ENCODING_PCM_16BIT),
                EncodingCombo("PCM_8BIT", AudioFormat.ENCODING_PCM_8BIT),
                EncodingCombo("PCM_FLOAT", AudioFormat.ENCODING_PCM_FLOAT),
            )

            val validConfigs = Arguments.createArray()
            var bestSize = Int.MAX_VALUE
            var bestConfig: WritableMap? = null

            for (sr in sampleRates) {
                for (ch in channelConfigs) {
                    for (enc in encodings) {
                        try {
                            val minBufSize = AudioRecord.getMinBufferSize(
                                sr, ch.config, enc.encoding
                            )
                            if (minBufSize > 0) {
                                val config = Arguments.createMap()
                                config.putInt("sampleRate", sr)
                                config.putString("channelConfig", ch.label)
                                config.putString("encoding", enc.label)
                                config.putInt("minBufferSize", minBufSize)
                                validConfigs.pushMap(config)

                                // Track the smallest buffer (most compatible)
                                if (minBufSize < bestSize) {
                                    bestSize = minBufSize
                                    bestConfig = config
                                }
                            }
                        } catch (_: Exception) {
                            // Combination not supported
                        }
                    }
                }
            }

            result.putArray("validConfigs", validConfigs)

            // Recommended AudioRecord config for VOICE_COMMUNICATION
            val recommended = Arguments.createMap()
            recommended.putString("audioSource", "VOICE_COMMUNICATION (MediaRecorder.AudioSource.VOICE_COMMUNICATION = 7)")
            recommended.putInt("recommendedSampleRate", 16000)
            recommended.putString("recommendedChannelConfig", "MONO (CHANNEL_IN_MONO)")
            recommended.putString("recommendedEncoding", "PCM_16BIT")

            // Find the 16kHz/MONO/PCM_16BIT entry from the loop results
            // (avoids querying AudioRecord.getMinBufferSize a second time)
            var recommendedBufSize = -1
            for (i in 0 until validConfigs.size()) {
                val cfg = validConfigs.getMap(i)
                if (cfg?.getInt("sampleRate") == 16000 &&
                    cfg.getString("channelConfig") == "MONO" &&
                    cfg.getString("encoding") == "PCM_16BIT"
                ) {
                    recommendedBufSize = cfg.getInt("minBufferSize")
                    break
                }
            }
            recommended.putInt("recommendedMinBufferSize", recommendedBufSize)

            result.putMap("recommended", recommended)

            // Sampling rate info
            val am = audioManager
            if (am != null && Build.VERSION.SDK_INT >= 28) {
                val sampleRate = am.getProperty(AudioManager.PROPERTY_OUTPUT_SAMPLE_RATE)
                if (sampleRate != null) {
                    result.putString("outputSampleRate", sampleRate.toString())
                }
            }

            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("AUDIO_RECORD_CONFIG_ERROR", "Failed to query AudioRecord config", e)
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Audio Mode Monitoring (BroadcastReceiver for volume + SCO changes)
    // ═══════════════════════════════════════════════════════════════════

    @ReactMethod
    fun startModeMonitoring() {
        if (isModeMonitoring) return
        isModeMonitoring = true

        previousMode = audioManager?.mode ?: AudioManager.MODE_INVALID

        // Note: VOLUME_CHANGED_ACTION is not available in all SDK versions.
        // Mode transitions are also detected by the periodic level polling.
        val filter = IntentFilter().apply {
            addAction(AudioManager.ACTION_SCO_AUDIO_STATE_UPDATED)
            addAction(AudioManager.ACTION_AUDIO_BECOMING_NOISY)
            addAction(Intent.ACTION_HEADSET_PLUG)
        }

        val receiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context, intent: Intent) {
                checkModeTransition()
            }
        }
        modeReceiver = receiver

        try {
            reactApplicationContext.registerReceiver(receiver, filter)
            Log.d(TAG, "Mode monitoring started")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to register mode receiver", e)
        }
    }

    @ReactMethod
    fun stopModeMonitoring() {
        if (!isModeMonitoring) return
        isModeMonitoring = false
        try {
            modeReceiver?.let { reactApplicationContext.unregisterReceiver(it) }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to unregister mode receiver", e)
        }
        modeReceiver = null
        Log.d(TAG, "Mode monitoring stopped")
    }

    private fun checkModeTransition() {
        val am = audioManager ?: return
        val currentMode = am.mode
        if (currentMode != previousMode && previousMode != AudioManager.MODE_INVALID) {
            val event = Arguments.createMap()
            event.putInt("previousModeRaw", previousMode)
            event.putString("previousMode", modeToString(previousMode))
            event.putInt("currentModeRaw", currentMode)
            event.putString("currentMode", modeToString(currentMode))

            Log.d(TAG, "Mode transition: ${modeToString(previousMode)} -> ${modeToString(currentMode)}")

            reactApplicationContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit("onAudioModeChanged", event)
        }
        previousMode = currentMode
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Audio Level Polling (periodic 1s AudioManager state)
    // ═══════════════════════════════════════════════════════════════════

    @ReactMethod
    fun startAudioLevelPolling() {
        if (isLevelPolling) return
        isLevelPolling = true

        levelHandler = Handler(Looper.getMainLooper())
        val runnable = object : Runnable {
            override fun run() {
                try {
                    val am = audioManager
                    if (am != null) {
                        val state = Arguments.createMap()
                        state.putInt("mode", am.mode)
                        state.putString("modeLabel", modeToString(am.mode))
                        state.putBoolean("speakerphoneOn", am.isSpeakerphoneOn)
                        state.putBoolean("microphoneMute", am.isMicrophoneMute)
                        state.putInt("voiceCallVolume", am.getStreamVolume(AudioManager.STREAM_VOICE_CALL))
                        state.putInt("voiceCallMaxVolume", am.getStreamMaxVolume(AudioManager.STREAM_VOICE_CALL))
                        state.putInt("musicVolume", am.getStreamVolume(AudioManager.STREAM_MUSIC))
                        state.putInt("musicMaxVolume", am.getStreamMaxVolume(AudioManager.STREAM_MUSIC))
                        state.putBoolean("bluetoothScoOn", am.isBluetoothScoOn)

                        reactApplicationContext
                            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                            .emit("onAudioLevelUpdate", state)
                    }

                    // Also check for mode transitions
                    checkModeTransition()
                } catch (e: Exception) {
                    Log.e(TAG, "Error in audio level polling", e)
                }

                // Schedule next poll in 1 second
                // "this" refers to the Runnable instance itself
                levelHandler?.postDelayed(this, 1000)
            }
        }

        levelRunnable = runnable
        levelHandler?.post(runnable)
        Log.d(TAG, "Audio level polling started (1s interval)")
    }

    @ReactMethod
    fun stopAudioLevelPolling() {
        if (!isLevelPolling) return
        isLevelPolling = false
        levelRunnable?.let { levelHandler?.removeCallbacks(it) }
        levelHandler?.removeCallbacksAndMessages(null)
        levelHandler = null
        levelRunnable = null
        Log.d(TAG, "Audio level polling stopped")
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Route Change Monitoring (BroadcastReceiver)
    // ═══════════════════════════════════════════════════════════════════

    @ReactMethod
    fun startRouteMonitoring() {
        if (isMonitoring) return
        isMonitoring = true

        val filter = IntentFilter().apply {
            addAction(AudioManager.ACTION_AUDIO_BECOMING_NOISY)
            addAction(AudioManager.ACTION_SCO_AUDIO_STATE_UPDATED)
            addAction(Intent.ACTION_HEADSET_PLUG)
        }

        val receiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context, intent: Intent) {
                handleRouteChange(intent)
            }
        }
        routeReceiver = receiver

        try {
            reactApplicationContext.registerReceiver(receiver, filter)
            Log.d(TAG, "Route monitoring started")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to register route receiver", e)
        }
    }

    @ReactMethod
    fun stopRouteMonitoring() {
        if (!isMonitoring) return
        isMonitoring = false
        try {
            routeReceiver?.let { reactApplicationContext.unregisterReceiver(it) }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to unregister route receiver", e)
        }
        routeReceiver = null
        Log.d(TAG, "Route monitoring stopped")
    }

    private fun handleRouteChange(intent: Intent) {
        val event = Arguments.createMap()
        event.putString("action", intent.action ?: "unknown")

        when (intent.action) {
            AudioManager.ACTION_AUDIO_BECOMING_NOISY -> {
                event.putString("reason", "audio_becoming_noisy")
                event.putString("description", "Audio becoming noisy (speaker/headset disconnected)")
            }
            AudioManager.ACTION_SCO_AUDIO_STATE_UPDATED -> {
                val state = intent.getIntExtra(
                    AudioManager.EXTRA_SCO_AUDIO_STATE,
                    AudioManager.SCO_AUDIO_STATE_DISCONNECTED
                )
                event.putString("reason", "sco_state_changed")
                event.putString("scoState", scoStateToString(state))
                event.putInt("scoStateRaw", state)
            }
            Intent.ACTION_HEADSET_PLUG -> {
                val state = intent.getIntExtra("state", 0)
                val hasMic = intent.getIntExtra("microphone", 0)
                event.putString("reason", "headset_plug")
                event.putString("headsetState",
                    if (state == 1) "connected" else "disconnected")
                event.putBoolean("hasMicrophone", hasMic == 1)
            }
        }

        // Append current audio manager state
        val am = audioManager
        if (am != null) {
            event.putString("currentMode", modeToString(am.mode))
            event.putBoolean("currentSpeakerphone", am.isSpeakerphoneOn)
            event.putBoolean("currentBluetoothSco", am.isBluetoothScoOn)
        }

        Log.d(TAG, "Route change detected: ${intent.action}")

        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(EVENT_ROUTE_CHANGED, event)

        // Also emit a full snapshot
        emitSnapshotAfterRouteChange()
    }

    private fun emitSnapshotAfterRouteChange() {
        try {
            val result = Arguments.createMap()
            result.putMap("device", buildDeviceInfoMap())
            val am = audioManager
            if (am != null) {
                result.putMap("audioManager", buildAudioManagerMap(am))
            }
            result.putMap("microphone", buildMicrophoneMap())

            reactApplicationContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit("onAudioDiagnosticsSnapshot", result)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to emit diagnostics snapshot", e)
        }
    }

    @ReactMethod
    fun addListener(eventName: String) {
        // Required for RN NativeEventEmitter compatibility
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Required for RN NativeEventEmitter compatibility
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Internal data builders (used by both @ReactMethod and inlined paths)
    // ═══════════════════════════════════════════════════════════════════

    private fun buildDeviceInfoMap(): WritableMap {
        val map = Arguments.createMap()
        map.putString("manufacturer", Build.MANUFACTURER)
        map.putString("brand", Build.BRAND)
        map.putString("model", Build.MODEL)
        map.putString("device", Build.DEVICE)
        map.putString("product", Build.PRODUCT)
        map.putString("androidVersion", Build.VERSION.RELEASE)
        map.putInt("sdkVersion", Build.VERSION.SDK_INT)
        map.putString("buildFingerprint", Build.FINGERPRINT)
        map.putString("hardware", Build.HARDWARE)

        val abiList = if (Build.VERSION.SDK_INT >= 21) {
            Build.SUPPORTED_ABIS?.joinToString(", ") ?: "unknown"
        } else {
            Build.CPU_ABI ?: "unknown"
        }
        map.putString("abis", abiList)
        map.putString("board", Build.BOARD)
        map.putString("bootloader", Build.BOOTLOADER)
        return map
    }

    private fun buildAudioManagerMap(am: AudioManager): WritableMap {
        val map = Arguments.createMap()

        // Mode
        map.putString("mode", modeToString(am.mode))
        map.putInt("modeRaw", am.mode)

        // Boolean flags
        map.putBoolean("isSpeakerphoneOn", am.isSpeakerphoneOn)
        map.putBoolean("isMicrophoneMute", am.isMicrophoneMute)
        map.putBoolean("isMusicActive", am.isMusicActive)
        if (Build.VERSION.SDK_INT >= 24) {
            map.putString("ringerMode", ringerModeToString(am.ringerMode))
            map.putInt("ringerModeRaw", am.ringerMode)
        }

        // Stream volumes
        val streamVolumes = Arguments.createMap()
        val streamTypes = listOf(
            AudioManager.STREAM_VOICE_CALL to "voice_call",
            AudioManager.STREAM_MUSIC to "music",
            AudioManager.STREAM_SYSTEM to "system",
            AudioManager.STREAM_RING to "ring",
            AudioManager.STREAM_ALARM to "alarm",
            AudioManager.STREAM_NOTIFICATION to "notification",
            AudioManager.STREAM_DTMF to "dtmf",
            AudioManager.STREAM_ACCESSIBILITY to "accessibility",
        )
        for ((type, label) in streamTypes) {
            try {
                val volMap = Arguments.createMap()
                volMap.putInt("current", am.getStreamVolume(type))
                volMap.putInt("max", am.getStreamMaxVolume(type))
                streamVolumes.putMap(label, volMap)
            } catch (_: Exception) {
                // Some stream types may not be queryable on some devices
            }
        }
        map.putMap("streamVolumes", streamVolumes)

        // Bluetooth & headset
        map.putBoolean("isBluetoothScoOn", am.isBluetoothScoOn)
        map.putBoolean("isWiredHeadsetOn", isWiredHeadsetConnected(am))

        // Available devices (API 23+)
        if (Build.VERSION.SDK_INT >= 23) {
            map.putArray("availableAudioDevices", getAudioDevicesInfo(am))
            map.putArray("availableCommunicationDevices",
                getAudioDevicesByType(am, AudioDeviceInfo.TYPE_TELEPHONY))
            map.putString("activeInputDevice", getActiveInputDeviceInfo(am))
            map.putString("activeOutputDevice", getActiveOutputDeviceInfo(am))
        }

        return map
    }

    private fun buildMicrophoneMap(): WritableMap {
        val map = Arguments.createMap()

        // AEC / NS / AGC availability
        map.putBoolean("aecSupported", AcousticEchoCanceler.isAvailable())
        map.putBoolean("nsSupported", NoiseSuppressor.isAvailable())
        map.putBoolean("agcSupported",
            if (Build.VERSION.SDK_INT >= 31) AutomaticGainControl.isAvailable()
            else false)
        map.putBoolean("aecEnabled", false) // placeholder — need active session
        map.putBoolean("nsEnabled", false)  // placeholder
        map.putBoolean("agcEnabled", false) // placeholder

        // Input device & capabilities (API 23+)
        val am = audioManager
        if (am != null && Build.VERSION.SDK_INT >= 23) {
            val inputDevice = getActiveInputDevice(am)
            if (inputDevice != null) {
                val sampleRates = inputDevice.sampleRates
                if (sampleRates.isNotEmpty()) {
                    val ratesArr = Arguments.createArray()
                    for (rate in sampleRates) ratesArr.pushInt(rate)
                    map.putArray("supportedSampleRates", ratesArr)
                } else {
                    val ratesArr = Arguments.createArray()
                    ratesArr.pushInt(8000)
                    ratesArr.pushInt(16000)
                    ratesArr.pushInt(44100)
                    ratesArr.pushInt(48000)
                    map.putArray("supportedSampleRates", ratesArr)
                }

                val channelCounts = inputDevice.channelCounts
                if (channelCounts.isNotEmpty()) {
                    val chArr = Arguments.createArray()
                    for (ch in channelCounts) chArr.pushInt(ch)
                    map.putArray("channelCounts", chArr)
                }

                val encodings = inputDevice.encodings
                if (encodings.isNotEmpty()) {
                    val encArr = Arguments.createArray()
                    for (enc in encodings) encArr.pushString(encodingToString(enc))
                    map.putArray("encodings", encArr)
                }

                map.putString("inputDeviceType", audioDeviceTypeToString(inputDevice.type))
                map.putString("inputDeviceAddress", inputDevice.address ?: "null")
                map.putString("inputDeviceProductName", inputDevice.productName?.toString() ?: "unknown")
            } else {
                map.putString("inputDeviceType", "none")
            }

            map.putString("activeInputPreset",
                inputPresetToString(am.getParameters("input_source")))
        }

        // Audio properties (API 28+)
        if (Build.VERSION.SDK_INT >= 28 && am != null) {
            val unproc = am.getProperty(AudioManager.PROPERTY_SUPPORT_AUDIO_SOURCE_UNPROCESSED)
            map.putBoolean("supportsUnprocessedAudio", "true".equals(unproc, ignoreCase = true))

            val sampleRate = am.getProperty(AudioManager.PROPERTY_OUTPUT_SAMPLE_RATE)
            if (sampleRate != null) {
                map.putString("outputSampleRate", sampleRate.toString())
            }
            val framesPerBuffer = am.getProperty(AudioManager.PROPERTY_OUTPUT_FRAMES_PER_BUFFER)
            if (framesPerBuffer != null) {
                map.putString("outputFramesPerBuffer", framesPerBuffer.toString())
            }
        }

        return map
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Utility helpers
    // ═══════════════════════════════════════════════════════════════════

    private fun getActiveInputDevice(am: AudioManager): AudioDeviceInfo? {
        if (Build.VERSION.SDK_INT < 23) return null
        val devices = am.getDevices(AudioManager.GET_DEVICES_INPUTS)
        return devices.firstOrNull { it.isSource }
    }

    private fun getActiveOutputDevice(am: AudioManager): AudioDeviceInfo? {
        if (Build.VERSION.SDK_INT < 23) return null
        val devices = am.getDevices(AudioManager.GET_DEVICES_OUTPUTS)
        return devices.firstOrNull { !it.isSource }
    }

    private fun getActiveInputDeviceInfo(am: AudioManager): String {
        if (Build.VERSION.SDK_INT < 23) return "N/A (API < 23)"
        val device = getActiveInputDevice(am) ?: return "none"
        return "${audioDeviceTypeToString(device.type)} (${device.productName})"
    }

    private fun getActiveOutputDeviceInfo(am: AudioManager): String {
        if (Build.VERSION.SDK_INT < 23) return "N/A (API < 23)"
        val device = getActiveOutputDevice(am) ?: return "none"
        return "${audioDeviceTypeToString(device.type)} (${device.productName})"
    }

    private fun getAudioDevicesInfo(am: AudioManager): WritableArray {
        if (Build.VERSION.SDK_INT < 23) return Arguments.createArray()
        val arr = Arguments.createArray()
        val allDevices = am.getDevices(AudioManager.GET_DEVICES_ALL)
        for (dev in allDevices) {
            dev ?: continue
            val devMap = Arguments.createMap()
            devMap.putString("type", audioDeviceTypeToString(dev.type))
            devMap.putInt("typeRaw", dev.type)
            devMap.putString("productName", dev.productName?.toString() ?: "unknown")
            devMap.putString("address", dev.address ?: "null")
            devMap.putBoolean("isSource", dev.isSource)
            devMap.putBoolean("isSink", dev.isSink)
            val channels = dev.channelCounts
            if (channels.isNotEmpty()) {
                val chArr = Arguments.createArray()
                for (c in channels) chArr.pushInt(c)
                devMap.putArray("channelCounts", chArr)
            }
            arr.pushMap(devMap)
        }
        return arr
    }

    private fun getAudioDevicesByType(am: AudioManager, type: Int): WritableArray {
        if (Build.VERSION.SDK_INT < 23) return Arguments.createArray()
        val arr = Arguments.createArray()
        val allDevices = am.getDevices(AudioManager.GET_DEVICES_ALL)
        for (dev in allDevices) {
            if (dev.type == type) {
                val devMap = Arguments.createMap()
                devMap.putString("type", audioDeviceTypeToString(dev.type))
                devMap.putString("productName", dev.productName?.toString() ?: "unknown")
                arr.pushMap(devMap)
            }
        }
        return arr
    }

    private fun isWiredHeadsetConnected(am: AudioManager): Boolean {
        if (Build.VERSION.SDK_INT >= 23) {
            val devices = am.getDevices(AudioManager.GET_DEVICES_ALL)
            return devices.any {
                it.type == AudioDeviceInfo.TYPE_WIRED_HEADSET ||
                it.type == AudioDeviceInfo.TYPE_WIRED_HEADPHONES ||
                it.type == AudioDeviceInfo.TYPE_USB_HEADSET
            }
        }
        return false
    }

    // ── String converters ──────────────────────────────────────────

    private fun modeToString(mode: Int): String = when (mode) {
        AudioManager.MODE_NORMAL -> "MODE_NORMAL"
        AudioManager.MODE_RINGTONE -> "MODE_RINGTONE"
        AudioManager.MODE_IN_CALL -> "MODE_IN_CALL"
        AudioManager.MODE_IN_COMMUNICATION -> "MODE_IN_COMMUNICATION"
        AudioManager.MODE_CURRENT -> "MODE_CURRENT"
        AudioManager.MODE_INVALID -> "MODE_INVALID"
        else -> "MODE_UNKNOWN($mode)"
    }

    private fun ringerModeToString(mode: Int): String = when (mode) {
        AudioManager.RINGER_MODE_SILENT -> "SILENT"
        AudioManager.RINGER_MODE_VIBRATE -> "VIBRATE"
        AudioManager.RINGER_MODE_NORMAL -> "NORMAL"
        else -> "UNKNOWN($mode)"
    }

    private fun scoStateToString(state: Int): String = when (state) {
        AudioManager.SCO_AUDIO_STATE_DISCONNECTED -> "DISCONNECTED"
        AudioManager.SCO_AUDIO_STATE_CONNECTED -> "CONNECTED"
        AudioManager.SCO_AUDIO_STATE_CONNECTING -> "CONNECTING"
        AudioManager.SCO_AUDIO_STATE_ERROR -> "ERROR"
        else -> "UNKNOWN($state)"
    }

    private fun audioDeviceTypeToString(type: Int): String {
        return when (type) {
            AudioDeviceInfo.TYPE_AUX_LINE -> "AUX_LINE"
            AudioDeviceInfo.TYPE_BLUETOOTH_A2DP -> "BLUETOOTH_A2DP"
            AudioDeviceInfo.TYPE_BLUETOOTH_SCO -> "BLUETOOTH_SCO"
            AudioDeviceInfo.TYPE_BUILTIN_EARPIECE -> "BUILTIN_EARPIECE"
            AudioDeviceInfo.TYPE_BUILTIN_MIC -> "BUILTIN_MIC"
            AudioDeviceInfo.TYPE_BUILTIN_SPEAKER -> "BUILTIN_SPEAKER"
            AudioDeviceInfo.TYPE_BUS -> "BUS"
            AudioDeviceInfo.TYPE_DOCK -> "DOCK"
            AudioDeviceInfo.TYPE_FM -> "FM"
            AudioDeviceInfo.TYPE_FM_TUNER -> "FM_TUNER"
            AudioDeviceInfo.TYPE_HDMI -> "HDMI"
            AudioDeviceInfo.TYPE_HDMI_ARC -> "HDMI_ARC"
            AudioDeviceInfo.TYPE_IP -> "IP"
            AudioDeviceInfo.TYPE_LINE_ANALOG -> "LINE_ANALOG"
            AudioDeviceInfo.TYPE_LINE_DIGITAL -> "LINE_DIGITAL"
            AudioDeviceInfo.TYPE_TELEPHONY -> "TELEPHONY"
            AudioDeviceInfo.TYPE_TV_TUNER -> "TV_TUNER"
            AudioDeviceInfo.TYPE_UNKNOWN -> "UNKNOWN"
            AudioDeviceInfo.TYPE_USB_ACCESSORY -> "USB_ACCESSORY"
            AudioDeviceInfo.TYPE_USB_DEVICE -> "USB_DEVICE"
            AudioDeviceInfo.TYPE_USB_HEADSET -> "USB_HEADSET"
            AudioDeviceInfo.TYPE_WIRED_HEADPHONES -> "WIRED_HEADPHONES"
            AudioDeviceInfo.TYPE_WIRED_HEADSET -> "WIRED_HEADSET"
            else -> when {
                Build.VERSION.SDK_INT >= 33 && type == AudioDeviceInfo.TYPE_BLE_BROADCAST -> "BLE_BROADCAST"
                Build.VERSION.SDK_INT >= 31 && type == AudioDeviceInfo.TYPE_HDMI_EARC -> "HDMI_EARC"
                Build.VERSION.SDK_INT >= 28 && type == AudioDeviceInfo.TYPE_BLE_HEADSET -> "BLE_HEADSET"
                Build.VERSION.SDK_INT >= 28 && type == AudioDeviceInfo.TYPE_BLE_SPEAKER -> "BLE_SPEAKER"
                else -> "TYPE_$type"
            }
        }
    }

    private fun encodingToString(encoding: Int): String = when (encoding) {
        AudioFormat.ENCODING_PCM_8BIT -> "PCM_8BIT"
        AudioFormat.ENCODING_PCM_16BIT -> "PCM_16BIT"
        AudioFormat.ENCODING_PCM_FLOAT -> "PCM_FLOAT"
        AudioFormat.ENCODING_AC3 -> "AC3"
        AudioFormat.ENCODING_E_AC3 -> "E_AC3"
        AudioFormat.ENCODING_DTS -> "DTS"
        AudioFormat.ENCODING_DTS_HD -> "DTS_HD"
        AudioFormat.ENCODING_MP3 -> "MP3"
        AudioFormat.ENCODING_AAC_LC -> "AAC_LC"
        AudioFormat.ENCODING_AAC_HE_V1 -> "AAC_HE_V1"
        AudioFormat.ENCODING_AAC_HE_V2 -> "AAC_HE_V2"
        AudioFormat.ENCODING_E_AC3_JOC -> "E_AC3_JOC"
        AudioFormat.ENCODING_DOLBY_TRUEHD -> "DOLBY_TRUEHD"
        AudioFormat.ENCODING_IEC61937 -> "IEC61937"
        AudioFormat.ENCODING_DEFAULT -> "DEFAULT"
        else -> when {
            Build.VERSION.SDK_INT >= 31 && encoding == AudioFormat.ENCODING_OPUS -> "OPUS"
            else -> "ENCODING_$encoding"
        }
    }

    private fun inputPresetToString(preset: String): String {
        return preset.ifBlank { "default (VOICE_COMMUNICATION)" }
    }
}
