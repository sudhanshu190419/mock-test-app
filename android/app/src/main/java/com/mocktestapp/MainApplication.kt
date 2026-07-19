package com.mocktestapp

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.livekit.reactnative.LiveKitReactNative

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // ── Audio Diagnostics (read-only, no behaviour changes) ──
          add(AudioDiagnosticsPackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    // Initializes the LiveKit audio device module, video encoder/decoder
    // factories, and hardware audio processing (AEC/NS on Android 10+).
    // Must be called *before* any other React Native initialization.
    LiveKitReactNative.setup(this)
    loadReactNative(this)
  }
}
