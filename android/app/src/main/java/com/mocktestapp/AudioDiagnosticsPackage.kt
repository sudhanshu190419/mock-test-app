package com.mocktestapp

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

/**
 * React Package that registers the [AudioDiagnosticsModule] native module.
 *
 * This module is READ-ONLY — it only collects diagnostics and never
 * modifies Android audio settings or LiveKit behaviour.
 */
class AudioDiagnosticsPackage : ReactPackage {

    override fun createNativeModules(
        reactContext: ReactApplicationContext
    ): List<NativeModule> {
        return listOf(AudioDiagnosticsModule(reactContext))
    }

    override fun createViewManagers(
        reactContext: ReactApplicationContext
    ): List<ViewManager<*, *>> {
        return emptyList()
    }
}
