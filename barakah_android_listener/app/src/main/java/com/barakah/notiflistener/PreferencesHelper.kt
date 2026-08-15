package com.barakah.notiflistener

import android.content.Context
import android.content.SharedPreferences

class PreferencesHelper(context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences("barakah_notif_prefs", Context.MODE_PRIVATE)

    var webhookUrl: String
        get() = prefs.getString("webhook_url", "https://api.barakah.cloud/api/payments/webhook/android-notification/") ?: "https://api.barakah.cloud/api/payments/webhook/android-notification/"
        set(value) = prefs.edit().putString("webhook_url", value).apply()

    var secretToken: String
        get() = prefs.getString("secret_token", "barakah_android_notif_secret_123") ?: "barakah_android_notif_secret_123"
        set(value) = prefs.edit().putString("secret_token", value).apply()

    var isServiceEnabled: Boolean
        get() = prefs.getBoolean("is_service_enabled", true)
        set(value) = prefs.edit().putBoolean("is_service_enabled", value).apply()

    var allowAllApps: Boolean
        get() = prefs.getBoolean("allow_all_apps", false)
        set(value) = prefs.edit().putBoolean("allow_all_apps", value).apply()

    var selectedPackages: Set<String>
        get() = prefs.getStringSet("selected_packages", defaultBankPackages) ?: defaultBankPackages
        set(value) = prefs.edit().putStringSet("selected_packages", value).apply()

    companion object {
        val defaultBankPackages = setOf(
            "id.co.bankbsi.mobile",     // BSI Mobile
            "com.bca",                  // BCA Mobile
            "id.bmri.livin",            // Mandiri Livin
            "id.co.bri.brimo",          // BRImo
            "id.co.bni.newmobile",      // BNI Mobile
            "id.dana",                  // DANA
            "com.gojek.app",            // GoPay / Gojek
            "net.oneoryx.ovo",          // OVO
            "com.shopee.id",            // ShopeePay
            "com.seabank.id",           // SeaBank
            "id.btpn.jenius",           // Jenius
            "id.co.cimbniaga.octomobile" // OCTO Mobile
        )
    }
}

