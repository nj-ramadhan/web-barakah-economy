package com.barakah.notiflistener

import android.content.BroadcastReceiver
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.widget.Button
import android.widget.EditText
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
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
    private lateinit var tvSelectedAppsSummary: TextView
    private lateinit var etWebhookUrl: EditText
    private lateinit var etSecretToken: EditText
    private lateinit var tvLogConsole: TextView
    private lateinit var svLogConsole: ScrollView

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
        tvSelectedAppsSummary = findViewById(R.id.tvSelectedAppsSummary)
        etWebhookUrl = findViewById(R.id.etWebhookUrl)
        etSecretToken = findViewById(R.id.etSecretToken)
        tvLogConsole = findViewById(R.id.tvLogConsole)
        svLogConsole = findViewById(R.id.svLogConsole)

        val btnGrantPermission: Button = findViewById(R.id.btnGrantPermission)
        val btnOpenAppInfo: Button = findViewById(R.id.btnOpenAppInfo)
        val btnPickInstalledApps: Button = findViewById(R.id.btnPickInstalledApps)
        val btnSaveSettings: Button = findViewById(R.id.btnSaveSettings)
        val btnTestWebhook: Button = findViewById(R.id.btnTestWebhook)
        val btnCopyLog: Button = findViewById(R.id.btnCopyLog)
        val btnClearLog: Button = findViewById(R.id.btnClearLog)

        etWebhookUrl.setText(prefs.webhookUrl)
        etSecretToken.setText(prefs.secretToken)

        updateSelectedAppsSummary()

        btnGrantPermission.setOnClickListener {
            startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
        }

        btnOpenAppInfo.setOnClickListener {
            val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                data = Uri.fromParts("package", packageName, null)
            }
            startActivity(intent)
        }

        btnPickInstalledApps.setOnClickListener {
            showInstalledAppPickerDialog()
        }

        btnSaveSettings.setOnClickListener {
            prefs.webhookUrl = etWebhookUrl.text.toString().trim()
            prefs.secretToken = etSecretToken.text.toString().trim()

            Toast.makeText(this, "Pengaturan Webhook & Aplikasi Target disimpan!", Toast.LENGTH_SHORT).show()
            appendLog("✓ Pengaturan disimpan. Target App aktif: ${prefs.selectedPackages.size} aplikasi.")
        }

        btnTestWebhook.setOnClickListener {
            sendTestWebhook()
        }

        btnCopyLog.setOnClickListener {
            val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
            val clip = ClipData.newPlainText("BarakahNotifLog", tvLogConsole.text.toString())
            clipboard.setPrimaryClip(clip)
            Toast.makeText(this, "Log riwayat berhasil disalin ke clipboard!", Toast.LENGTH_SHORT).show()
        }

        btnClearLog.setOnClickListener {
            tvLogConsole.text = "[System Log Console Cleared...]\n"
            Toast.makeText(this, "Log riwayat dibersihkan", Toast.LENGTH_SHORT).show()
        }

        val filter = IntentFilter(NotificationService.ACTION_NOTIFICATION_LOG)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(logReceiver, filter, RECEIVER_EXPORTED)
        } else {
            registerReceiver(logReceiver, filter)
        }
    }

    private fun updateSelectedAppsSummary() {
        val selected = prefs.selectedPackages
        val pm = packageManager
        val names = selected.map { pkg ->
            try {
                val appInfo = pm.getApplicationInfo(pkg, 0)
                pm.getApplicationLabel(appInfo).toString()
            } catch (e: Exception) {
                pkg
            }
        }
        if (names.isEmpty()) {
            tvSelectedAppsSummary.text = "Aplikasi Aktif: Belum ada (Membaca semua notifikasi)"
        } else {
            val previewText = names.take(5).joinToString(", ")
            val extraCount = if (names.size > 5) " +${names.size - 5} lainnya" else ""
            tvSelectedAppsSummary.text = "Aplikasi Aktif: $previewText$extraCount (Total: ${names.size} App)"
        }
    }

    private fun showInstalledAppPickerDialog() {
        val pm = packageManager
        val installedApps = pm.getInstalledApplications(PackageManager.GET_META_DATA)
        val currentSelected = prefs.selectedPackages.toMutableSet()

        // Filter and sort apps: Selected apps FIRST, then Bank/E-wallet apps, then User apps, then System apps
        val appList = installedApps.map { appInfo ->
            val label = pm.getApplicationLabel(appInfo).toString()
            val pkg = appInfo.packageName
            val isUserApp = (appInfo.flags and ApplicationInfo.FLAG_SYSTEM) == 0
            AppItem(label, pkg, isUserApp)
        }.sortedWith(
            compareByDescending<AppItem> { currentSelected.contains(it.packageName) }
                .thenByDescending { it.isBankOrWallet() }
                .thenByDescending { it.isUserApp }
                .thenBy { it.label.lowercase() }
        )

        val appLabels = appList.map { item ->
            val statusTag = if (currentSelected.contains(item.packageName)) "✓ " else ""
            "$statusTag${item.label} (${item.packageName})"
        }.toTypedArray()

        val checkedItems = BooleanArray(appList.size) { i -> currentSelected.contains(appList[i].packageName) }

        val builder = AlertDialog.Builder(this)
        builder.setTitle("Pilih Aplikasi Terinstall di HP")
        builder.setMultiChoiceItems(appLabels, checkedItems) { _, which, isChecked ->
            val pkg = appList[which].packageName
            if (isChecked) {
                currentSelected.add(pkg)
            } else {
                currentSelected.remove(pkg)
            }
        }

        builder.setPositiveButton("Simpan Pilihan") { dialog, _ ->
            prefs.selectedPackages = currentSelected
            updateSelectedAppsSummary()
            Toast.makeText(this, "Target aplikasi diperbarui (${currentSelected.size} aplikasi aktif)", Toast.LENGTH_SHORT).show()
            appendLog("✓ Pilihan aplikasi target diperbarui (${currentSelected.size} app aktif).")
            dialog.dismiss()
        }

        builder.setNeutralButton("Kosongkan Semua") { dialog, _ ->
            currentSelected.clear()
            prefs.selectedPackages = currentSelected
            updateSelectedAppsSummary()
            Toast.makeText(this, "Semua pilihan aplikasi dibersihkan", Toast.LENGTH_SHORT).show()
            appendLog("✓ Pilihan aplikasi target dibersihkan (membaca semua).")
            dialog.dismiss()
        }

        builder.setNegativeButton("Batal") { dialog, _ ->
            dialog.dismiss()
        }

        builder.show()
    }

    private data class AppItem(val label: String, val packageName: String, val isUserApp: Boolean) {
        fun isBankOrWallet(): Boolean {
            val lower = "$label $packageName".lowercase()
            return listOf("bsi", "bca", "mandiri", "bri", "bni", "dana", "gopay", "ovo", "shopee", "seabank", "blu", "jenius", "permata", "danamon", "cimb", "neo").any { lower.contains(it) }
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
            tvPermissionStatus.text = "✗ Izin Akses Belum Diberikan / Pengaturan Dibatasi (Android 13/14/15)"
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
                put("package", "id.co.bankbsi.mobile")
                put("title", "BSI Mobile Uang Masuk")
                put("text", "Transfer masuk sebesar Rp 121.00 dari TES ANDROID APP")
                put("content", "Transfer masuk sebesar Rp 121.00 dari TES ANDROID APP")
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
        svLogConsole.post {
            svLogConsole.fullScroll(ScrollView.FOCUS_DOWN)
        }
    }
}
