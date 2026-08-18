package com.barakah.notiflistener

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.Looper
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

    private val client = OkHttpClient.Builder()
        .connectTimeout(15, java.util.concurrent.TimeUnit.SECONDS)
        .readTimeout(15, java.util.concurrent.TimeUnit.SECONDS)
        .build()

    private lateinit var prefs: PreferencesHelper
    private val heartbeatHandler = Handler(Looper.getMainLooper())
    private var isHeartbeatRunning = false

    private val heartbeatRunnable = object : Runnable {
        override fun run() {
            sendHeartbeat()
            heartbeatHandler.postDelayed(this, 60000) // Ping every 60 seconds
        }
    }

    override fun onCreate() {
        super.onCreate()
        prefs = PreferencesHelper(applicationContext)
        Log.d(TAG, "Barakah NotificationListenerService created")
        createNotificationChannel()
        startForegroundServiceNotification()
        startHeartbeatLoop()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startForegroundServiceNotification()
        startHeartbeatLoop()
        return START_STICKY
    }

    override fun onListenerConnected() {
        super.onListenerConnected()
        Log.d(TAG, "NotificationListenerConnected: Service active and listening 24/7")
        broadcastLog("🟢 Listener Aktif 24/7 & Terhubung ke Sistem Android")
        startForegroundServiceNotification()
        startHeartbeatLoop()
    }

    override fun onListenerDisconnected() {
        super.onListenerDisconnected()
        Log.w(TAG, "NotificationListenerDisconnected")
        broadcastLog("🔴 Listener Terputus dari Sistem Android")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            requestRebind(ComponentName(this, NotificationService::class.java))
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        stopHeartbeatLoop()
    }

    private fun startHeartbeatLoop() {
        if (!isHeartbeatRunning) {
            isHeartbeatRunning = true
            heartbeatHandler.post(heartbeatRunnable)
        }
    }

    private fun stopHeartbeatLoop() {
        isHeartbeatRunning = false
        heartbeatHandler.removeCallbacks(heartbeatRunnable)
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Barakah Notif Listener 24/7",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Notifikasi status pemantauan transaksi m-Banking 24 Jam Nonstop"
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
            .setContentTitle("🟢 Barakah Listener Aktif 24 Jam Nonstop")
            .setContentText("Memantau notifikasi mutasi m-Banking & QRIS secara realtime")
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

    private fun sendHeartbeat() {
        val baseUrl = prefs.webhookUrl.trim()
        val secret = prefs.secretToken.trim()

        if (baseUrl.isEmpty()) return

        // Derive heartbeat URL from webhook URL or standard path
        val heartbeatUrl = if (baseUrl.contains("/webhook/")) {
            baseUrl.substringBeforeLast("/webhook/") + "/webhook/heartbeat/"
        } else {
            "https://api.barakah.cloud/api/payments/webhook/heartbeat/"
        }

        try {
            val json = JSONObject().apply {
                put("device_id", prefs.deviceId)
                put("device_name", prefs.deviceName)
                put("secret", secret)
                put("force_claim", false)
            }

            val body = json.toString().toRequestBody("application/json; charset=utf-8".toMediaType())
            val request = Request.Builder()
                .url(heartbeatUrl)
                .addHeader("X-Android-Secret", secret)
                .addHeader("Content-Type", "application/json")
                .post(body)
                .build()

            client.newCall(request).enqueue(object : Callback {
                override fun onFailure(call: Call, e: IOException) {
                    Log.w(TAG, "Heartbeat failed: ${e.message}")
                }

                override fun onResponse(call: Call, response: Response) {
                    val respBody = response.body?.string() ?: ""
                    if (response.isSuccessful) {
                        try {
                            val resJson = JSONObject(respBody)
                            val isPrimary = resJson.optBoolean("is_primary", true)
                            prefs.isPrimaryListener = isPrimary
                            if (!isPrimary) {
                                broadcastLog("⚠️ Peringatan: Sesi listener telah diambil alih oleh HP lain.")
                            }
                        } catch (e: Exception) {
                            Log.e(TAG, "Error parsing heartbeat response: ${e.message}")
                        }
                    }
                }
            })
        } catch (e: Exception) {
            Log.e(TAG, "Error building heartbeat request: ${e.message}")
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
        val infoText = extras?.getCharSequence(Notification.EXTRA_INFO_TEXT)?.toString() ?: ""
        val ticker = sbn.notification.tickerText?.toString() ?: ""

        // Combine all extracted text pieces into a rich full string
        val contentPieces = listOf(title, text, bigText, subText, infoText, ticker).filter { it.isNotBlank() }
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
        // If allowAllApps is enabled, accept any notification that has text
        if (prefs.allowAllApps) {
            return true
        }

        val lowerPkg = pkg.lowercase()
        val lowerText = text.lowercase()

        // Check if package is in target list
        val selectedPkgs = prefs.selectedPackages
        val isTargetApp = selectedPkgs.any { lowerPkg.contains(it.lowercase()) } ||
                lowerPkg.contains("bank") ||
                lowerPkg.contains("dana") ||
                lowerPkg.contains("gopay") ||
                lowerPkg.contains("ovo") ||
                lowerPkg.contains("shopee") ||
                lowerPkg.contains("seabank") ||
                lowerPkg.contains("bca") ||
                lowerPkg.contains("bsi") ||
                lowerPkg.contains("mandiri") ||
                lowerPkg.contains("bri") ||
                lowerPkg.contains("bni")

        // Keywords indicating financial transaction or test
        val keywords = listOf(
            "transfer", "uang masuk", "diterima", "masuk", "kredit", "cr", "rp", "rupiah", "idr",
            "top up", "topup", "qris", "pembayaran", "payment", "bayar", "lunas", "berhasil", "sukses",
            "dana bisnis", "merchant", "saldo", "terima", "tes", "test", "uji", "coba"
        )
        val hasKeyword = keywords.any { lowerText.contains(it) }

        return isTargetApp || hasKeyword
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
                put("device_id", prefs.deviceId)
                put("device_name", prefs.deviceName)
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

