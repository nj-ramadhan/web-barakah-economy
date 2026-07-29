package com.barakah.notiflistener

import android.content.Intent
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.io.IOException

class NotificationService : NotificationListenerService() {

    private val client = OkHttpClient()
    private lateinit var prefs: PreferencesHelper

    override fun onCreate() {
        super.onCreate()
        prefs = PreferencesHelper(applicationContext)
        Log.d(TAG, "Barakah NotificationListenerService created")
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        super.onNotificationPosted(sbn)
        if (sbn == null) return
        if (!prefs.isServiceEnabled) return

        val packageName = sbn.packageName ?: ""
        val extras = sbn.notification.extras
        val title = extras.getString("android.title") ?: ""
        val text = extras.getCharSequence("android.text")?.toString() ?: ""

        val fullText = "$title $text".trim()

        Log.d(TAG, "Notification received from [$packageName]: $fullText")

        // Filter: Only process notifications containing money keywords or bank package names
        if (isRelevantNotification(packageName, fullText)) {
            sendWebhookPayload(packageName, title, text, fullText)
        }
    }

    private fun isRelevantNotification(pkg: String, text: String): Boolean {
        val lowerText = text.lowercase()
        val bankKeywords = listOf(
            "bsi", "bca", "mandiri", "bri", "bni", "dana", "gopay", "ovo", "shopeepay",
            "transfer", "uang masuk", "diterima", "masuk", "kredit", "rp", "rupiah"
        )
        return bankKeywords.any { lowerText.contains(it) }
    }

    private fun sendWebhookPayload(pkgName: String, title: String, text: String, fullContent: String) {
        val url = prefs.webhookUrl.trim()
        val secret = prefs.secretToken.trim()

        if (url.isEmpty()) return

        try {
            val json = JSONObject().apply {
                put("package", pkgName)
                put("title", title)
                put("text", text)
                put("content", fullContent)
                put("secret", secret)
            }

            val body = json.toString().toRequestBody("application/json; charset=utf-8".toMediaType())
            val request = Request.Builder()
                .url(url)
                .addHeader("X-Android-Secret", secret)
                .addHeader("Content-Type", "application/json")
                .post(body)
                .build()

            client.newCall(request).enqueue(object : Callback {
                override fun onFailure(call: Call, e: IOException) {
                    Log.e(TAG, "Failed to send webhook notification to $url: ${e.message}")
                    broadcastLog("✗ Gagal kirim webhook: ${e.message}")
                }

                override fun onResponse(call: Call, response: Response) {
                    val respBody = response.body?.string() ?: ""
                    Log.d(TAG, "Webhook response (${response.code}): $respBody")
                    if (response.isSuccessful) {
                        broadcastLog("✓ Webhook Terkirim: $fullContent")
                    } else {
                        broadcastLog("✗ Server Response HTTP ${response.code}: $respBody")
                    }
                }
            })
        } catch (e: Exception) {
            Log.e(TAG, "Error building webhook request: ${e.message}")
        }
    }

    private fun broadcastLog(message: String) {
        val intent = Intent(ACTION_NOTIFICATION_LOG).apply {
            putExtra("log_message", message)
        }
        sendBroadcast(intent)
    }

    companion object {
        const val TAG = "BarakahNotifService"
        const val ACTION_NOTIFICATION_LOG = "com.barakah.notiflistener.LOG"
    }
}
