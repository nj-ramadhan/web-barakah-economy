package com.barakah.notiflistener

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import androidx.core.app.NotificationCompat
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
        createNotificationChannel()
        startForegroundServiceNotification()
    }

    override fun onListenerConnected() {
        super.onListenerConnected()
        Log.d(TAG, "NotificationListenerConnected: Service active and listening 24/7")
        broadcastLog("🟢 Listener Aktif 24/7 & Terhubung ke Sistem Android")
        startForegroundServiceNotification()
    }

    override fun onListenerDisconnected() {
        super.onListenerDisconnected()
        Log.w(TAG, "NotificationListenerDisconnected")
        broadcastLog("🔴 Listener Terputus dari Sistem Android")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            requestRebind(ComponentName(this, NotificationService::class.java))
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Barakah Notif Listener Status",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Notifikasi status pemantauan m-Banking 24/7 (Hemat Baterai)"
                setShowBadge(false)
            }
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }

    private fun startForegroundServiceNotification() {
        val intent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification: Notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("🟢 Barakah Listener Aktif (Realtime)")
            .setContentText("Memantau notifikasi m-Banking & QRIS (Mode Hemat Baterai)")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()

        try {
            startForeground(NOTIFICATION_ID, notification)
        } catch (e: Exception) {
            Log.e(TAG, "Error starting foreground notification: ${e.message}")
        }
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        super.onNotificationPosted(sbn)
        if (sbn == null) return
        if (!prefs.isServiceEnabled) return

        val packageName = sbn.packageName ?: ""
        
        // Skip own app notifications
        if (packageName == applicationContext.packageName) return

        val extras = sbn.notification.extras
        
        // Extract title (CharSequence / String)
        val title = extras?.getCharSequence(Notification.EXTRA_TITLE)?.toString()
            ?: extras?.getString(Notification.EXTRA_TITLE)
            ?: ""

        // Extract main text (CharSequence / String / BigText)
        val text = extras?.getCharSequence(Notification.EXTRA_TEXT)?.toString()
            ?: extras?.getString(Notification.EXTRA_TEXT)
            ?: ""

        val bigText = extras?.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString() ?: ""
        val subText = extras?.getCharSequence(Notification.EXTRA_SUB_TEXT)?.toString() ?: ""
        val ticker = sbn.notification.tickerText?.toString() ?: ""

        // Combine all extracted text pieces into a rich full string
        val contentPieces = listOf(title, text, bigText, subText, ticker).filter { it.isNotBlank() }
        val fullContent = contentPieces.distinct().joinToString(" ").trim()

        if (fullContent.isBlank()) return

        Log.d(TAG, "Notification received from [$packageName]: $fullContent")

        // Filter: Check if notification matches target banks, e-wallets, or money transfer patterns
        if (isRelevantNotification(packageName, fullContent)) {
            broadcastLog("📥 Terdeteksi [$packageName]: $fullContent")
            sendWebhookPayload(packageName, title, text.ifBlank { bigText }, fullContent)
        }
    }

    private fun isRelevantNotification(pkg: String, text: String): Boolean {
        // If "allow all apps" (test mode) is enabled or no apps selected, skip package whitelist
        if (!prefs.allowAllApps) {
            val selectedPkgs = prefs.selectedPackages
            val isPackageAllowed = selectedPkgs.isEmpty() ||
                    selectedPkgs.contains(pkg) ||
                    selectedPkgs.any { pkg.lowercase().contains(it.lowercase()) }

            if (!isPackageAllowed) {
                Log.d(TAG, "Skipping notification from $pkg (not in selected apps list)")
                return false
            }
        }

        // Check money, bank, transfer, QRIS, and testing keywords
        val lowerText = text.lowercase()
        val keywords = listOf(
            "bsi", "bca", "mandiri", "bri", "bni", "dana", "gopay", "ovo", "shopeepay", "shopee",
            "seabank", "blu", "jenius", "octo", "cimb", "permata", "danamon", "panin", "neobank", "bank",
            "transfer", "uang masuk", "diterima", "masuk", "kredit", "cr", "rp", "rupiah", "idr",
            "top up", "topup", "qris", "pembayaran", "payment", "bayar", "lunas", "berhasil", "sukses",
            "tes", "test", "uji", "coba"
        )
        return keywords.any { lowerText.contains(it) }
    }

    private fun sendWebhookPayload(pkgName: String, title: String, text: String, fullContent: String) {
        val url = prefs.webhookUrl.trim()
        val secret = prefs.secretToken.trim()

        if (url.isEmpty()) {
            broadcastLog("⚠️ Webhook URL kosong di Pengaturan!")
            return
        }

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
                        try {
                            val resJson = JSONObject(respBody)
                            val matched = resJson.optBoolean("matched", false)
                            val msg = resJson.optString("message", "OK")
                            if (matched) {
                                broadcastLog("🎉 BERHASIL VERIFIKASI: $msg")
                            } else {
                                broadcastLog("✓ Webhook Terkirim (${response.code}): $msg")
                            }
                        } catch (e: Exception) {
                            broadcastLog("✓ Webhook Terkirim: $respBody")
                        }
                    } else {
                        broadcastLog("✗ Server Response HTTP ${response.code}: $respBody")
                    }
                }
            })
        } catch (e: Exception) {
            Log.e(TAG, "Error building webhook request: ${e.message}")
            broadcastLog("✗ Error: ${e.message}")
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
        const val CHANNEL_ID = "barakah_listener_channel"
        const val NOTIFICATION_ID = 1001
    }
}

