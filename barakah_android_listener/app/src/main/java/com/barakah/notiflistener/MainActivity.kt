package com.barakah.notiflistener

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.io.IOException
import java.text.SimpleDateFormat
import java.util.*

class MainActivity : AppCompatActivity() {

    private lateinit var prefs: PreferencesHelper
    private lateinit var tvPermissionStatus: TextView
    private lateinit var etWebhookUrl: EditText
    private lateinit var etSecretToken: EditText
    private lateinit var tvLogConsole: TextView

    private val logReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            val msg = intent?.getStringExtra("log_message") ?: return
            appendLog(msg)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        prefs = PreferencesHelper(this)

        tvPermissionStatus = findViewById(R.id.tvPermissionStatus)
        etWebhookUrl = findViewById(R.id.etWebhookUrl)
        etSecretToken = findViewById(R.id.etSecretToken)
        tvLogConsole = findViewById(R.id.tvLogConsole)

        val btnGrantPermission: Button = findViewById(R.id.btnGrantPermission)
        val btnSaveSettings: Button = findViewById(R.id.btnSaveSettings)
        val btnTestWebhook: Button = findViewById(R.id.btnTestWebhook)

        etWebhookUrl.setText(prefs.webhookUrl)
        etSecretToken.setText(prefs.secretToken)

        btnGrantPermission.setOnClickListener {
            startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
        }

        btnSaveSettings.setOnClickListener {
            prefs.webhookUrl = etWebhookUrl.text.toString().trim()
            prefs.secretToken = etSecretToken.text.toString().trim()
            Toast.makeText(this, "Pengaturan Webhook berhasil disimpan!", Toast.LENGTH_SHORT).show()
            appendLog("✓ Pengaturan disimpan: ${prefs.webhookUrl}")
        }

        btnTestWebhook.setOnClickListener {
            sendTestWebhook()
        }

        val filter = IntentFilter(NotificationService.ACTION_NOTIFICATION_LOG)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(logReceiver, filter, RECEIVER_EXPORTED)
        } else {
            registerReceiver(logReceiver, filter)
        }
    }

    override fun onResume() {
        super.onResume()
        checkNotificationPermission()
    }

    override fun onDestroy() {
        super.onDestroy()
        try {
            unregisterReceiver(logReceiver)
        } catch (e: Exception) {
            // Ignored
        }
    }

    private fun checkNotificationPermission() {
        val packageName = packageName
        val flat = Settings.Secure.getString(contentResolver, "enabled_notification_listeners")
        val isGranted = flat != null && flat.contains(packageName)

        if (isGranted) {
            tvPermissionStatus.text = "✓ Izin Akses Notifikasi AKTIF"
            tvPermissionStatus.setTextColor(getColor(R.color.emerald_700))
        } else {
            tvPermissionStatus.text = "✗ Izin Akses Belum Diberikan (Klik tombol di bawah)"
            tvPermissionStatus.setTextColor(getColor(android.R.color.holo_red_dark))
        }
    }

    private fun sendTestWebhook() {
        val url = etWebhookUrl.text.toString().trim()
        val secret = etSecretToken.text.toString().trim()

        if (url.isEmpty()) {
            Toast.makeText(this, "URL Webhook tidak boleh kosong", Toast.LENGTH_SHORT).show()
            return
        }

        appendLog("→ Mengirim Tes Webhook ke $url...")
        val client = OkHttpClient()

        try {
            val json = JSONObject().apply {
                put("text", "Transfer masuk sebesar Rp 121.00 dari TES ANDROID APP")
                put("secret", secret)
            }
            val body = json.toString().toRequestBody("application/json; charset=utf-8".toMediaType())
            val request = Request.Builder()
                .url(url)
                .addHeader("X-Android-Secret", secret)
                .post(body)
                .build()

            client.newCall(request).enqueue(object : Callback {
                override fun onFailure(call: Call, e: IOException) {
                    runOnUiThread {
                        appendLog("✗ Tes Gagal: ${e.message}")
                        Toast.makeText(this@MainActivity, "Gagal koneksi ke server", Toast.LENGTH_SHORT).show()
                    }
                }

                override fun onResponse(call: Call, response: Response) {
                    val bodyStr = response.body?.string() ?: ""
                    runOnUiThread {
                        if (response.isSuccessful) {
                            appendLog("✓ Tes Sukses (${response.code}): $bodyStr")
                            Toast.makeText(this@MainActivity, "Tes Webhook Berhasil!", Toast.LENGTH_SHORT).show()
                        } else {
                            appendLog("✗ Tes Server Response ${response.code}: $bodyStr")
                            Toast.makeText(this@MainActivity, "Server merespon error ${response.code}", Toast.LENGTH_SHORT).show()
                        }
                    }
                }
            })
        } catch (e: Exception) {
            appendLog("✗ Error: ${e.message}")
        }
    }

    private fun appendLog(text: String) {
        val sdf = SimpleDateFormat("HH:mm:ss", Locale.getDefault())
        val timestamp = sdf.format(Date())
        val newLog = "[$timestamp] $text\n"
        tvLogConsole.append(newLog)
    }
}
