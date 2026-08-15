package com.barakah.notiflistener

import android.content.BroadcastReceiver
import android.content.ClipData
import android.content.ClipboardManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.service.notification.NotificationListenerService
import android.widget.*
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
    private lateinit var tvLiveStatusHeader: TextView
    private lateinit var tvLiveStatusDetail: TextView
    private lateinit var cbAllowAllApps: CheckBox
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
        tvLiveStatusHeader = findViewById(R.id.tvLiveStatusHeader)
        tvLiveStatusDetail = findViewById(R.id.tvLiveStatusDetail)
        cbAllowAllApps = findViewById(R.id.cbAllowAllApps)
        etWebhookUrl = findViewById(R.id.etWebhookUrl)
        etSecretToken = findViewById(R.id.etSecretToken)
        tvLogConsole = findViewById(R.id.tvLogConsole)
        svLogConsole = findViewById(R.id.svLogConsole)

        val btnGrantPermission: Button = findViewById(R.id.btnGrantPermission)
        val btnOpenAppInfo: Button = findViewById(R.id.btnOpenAppInfo)
        val btnDisableBatteryOpt: Button = findViewById(R.id.btnDisableBatteryOpt)
        val btnPickInstalledApps: Button = findViewById(R.id.btnPickInstalledApps)
        val btnSimulateNotif: Button = findViewById(R.id.btnSimulateNotif)
        val btnSaveSettings: Button = findViewById(R.id.btnSaveSettings)
        val btnTestWebhook: Button = findViewById(R.id.btnTestWebhook)
        val btnCopyLog: Button = findViewById(R.id.btnCopyLog)
        val btnClearLog: Button = findViewById(R.id.btnClearLog)

        etWebhookUrl.setText(prefs.webhookUrl)
        etSecretToken.setText(prefs.secretToken)
        cbAllowAllApps.isChecked = prefs.allowAllApps

        updateSelectedAppsSummary()

        cbAllowAllApps.setOnCheckedChangeListener { _, isChecked ->
            prefs.allowAllApps = isChecked
            if (isChecked) {
                appendLog("✓ Mode Uji Coba AKTIF: Menerima notifikasi dari semua aplikasi (WhatsApp, SMS, Bank, dll).")
            } else {
                appendLog("✓ Mode Filter Normal: Hanya membaca aplikasi target m-Banking/E-Wallet terpilih.")
            }
        }

        btnGrantPermission.setOnClickListener {
            startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
        }

        btnOpenAppInfo.setOnClickListener {
            val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                data = Uri.fromParts("package", packageName, null)
            }
            startActivity(intent)
        }

        btnDisableBatteryOpt.setOnClickListener {
            try {
                val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                    data = Uri.parse("package:$packageName")
                }
                startActivity(intent)
            } catch (e: Exception) {
                startActivity(Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS))
            }
        }

        btnPickInstalledApps.setOnClickListener {
            showInstalledAppPickerDialog()
        }

        btnSimulateNotif.setOnClickListener {
            showSimulationDialog()
        }

        btnSaveSettings.setOnClickListener {
            prefs.webhookUrl = etWebhookUrl.text.toString().trim()
            prefs.secretToken = etSecretToken.text.toString().trim()

            Toast.makeText(this, "Pengaturan Webhook disimpan!", Toast.LENGTH_SHORT).show()
            appendLog("✓ Pengaturan disimpan. URL: ${prefs.webhookUrl}")
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
        if (prefs.allowAllApps) {
            tvSelectedAppsSummary.text = "Mode Uji Coba: Membaca notifikasi dari SEMUA aplikasi"
            return
        }
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

    private fun showSimulationDialog() {
        val options = arrayOf(
            "BSI Mobile - Rp 50.000",
            "BCA Mobile - Rp 100.000",
            "Mandiri Livin - Rp 25.000",
            "DANA - Rp 50.000",
            "GoPay - Rp 20.000",
            "ShopeePay - Rp 75.000",
            "Custom Nominal / Teks Notifikasi Sendiri..."
        )

        AlertDialog.Builder(this)
            .setTitle("🧪 Pilih Notifikasi Uji Coba")
            .setItems(options) { _, which ->
                when (which) {
                    0 -> sendCustomPayload("id.co.bankbsi.mobile", "BSI Mobile Uang Masuk", "Transfer masuk sebesar Rp 50.000 dari Ahmad Fulan")
                    1 -> sendCustomPayload("com.bca", "m-Transfer BCA", "Dana Masuk Sebesar Rp 100.000,00 dari REK 1234567890")
                    2 -> sendCustomPayload("id.bmri.livin", "Livin by Mandiri", "Penerimaan transfer Rp 25.000 berhasil diterima")
                    3 -> sendCustomPayload("id.dana", "DANA Saldo Masuk", "Kamu menerima saldo DANA sebesar Rp 50.000")
                    4 -> sendCustomPayload("com.gojek.app", "GoPay Masuk", "Top up / Transfer masuk sebesar Rp 20.000")
                    5 -> sendCustomPayload("com.shopee.id", "ShopeePay", "Pembayaran QRIS Rp 75.000 berhasil masuk ke saldo Anda")
                    6 -> showCustomInputPrompt()
                }
            }
            .setNegativeButton("Batal", null)
            .show()
    }

    private fun showCustomInputPrompt() {
        val input = EditText(this).apply {
            hint = "Contoh: Transfer masuk sebesar Rp 50.000"
            setText("Transfer masuk sebesar Rp 50.000 dari Uji Coba Android")
        }
        AlertDialog.Builder(this)
            .setTitle("Ketik Notifikasi Simulasi")
            .setView(input)
            .setPositiveButton("Kirim ke Webhook") { _, _ ->
                val txt = input.text.toString().trim()
                if (txt.isNotEmpty()) {
                    sendCustomPayload("com.barakah.simulation", "Notifikasi Simulasi", txt)
                }
            }
            .setNegativeButton("Batal", null)
            .show()
    }

    private fun sendCustomPayload(pkg: String, title: String, text: String) {
        val url = etWebhookUrl.text.toString().trim()
        val secret = etSecretToken.text.toString().trim()

        if (url.isEmpty()) {
            Toast.makeText(this, "URL Webhook tidak boleh kosong", Toast.LENGTH_SHORT).show()
            return
        }

        appendLog("🚀 [Simulasi] Mengirim notifikasi: \"$text\" ke server...")
        val client = OkHttpClient()

        try {
            val json = JSONObject().apply {
                put("package", pkg)
                put("title", title)
                put("text", text)
                put("content", "$title $text")
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
                        appendLog("✗ [Simulasi Gagal]: ${e.message}")
                        Toast.makeText(this@MainActivity, "Gagal koneksi ke server", Toast.LENGTH_SHORT).show()
                    }
                }

                override fun onResponse(call: Call, response: Response) {
                    val bodyStr = response.body?.string() ?: ""
                    runOnUiThread {
                        if (response.isSuccessful) {
                            try {
                                val resJson = JSONObject(bodyStr)
                                val matched = resJson.optBoolean("matched", false)
                                val msg = resJson.optString("message", "OK")
                                if (matched) {
                                    appendLog("🎉 [BERHASIL VERIFIKASI]: $msg")
                                    Toast.makeText(this@MainActivity, "Transaksi Berhasil Diverifikasi!", Toast.LENGTH_LONG).show()
                                } else {
                                    appendLog("✓ [Webhook Sukses]: $msg")
                                    Toast.makeText(this@MainActivity, "Webhook terhubung! $msg", Toast.LENGTH_SHORT).show()
                                }
                            } catch (e: Exception) {
                                appendLog("✓ [Server Response ${response.code}]: $bodyStr")
                            }
                        } else {
                            appendLog("✗ [Server Error ${response.code}]: $bodyStr")
                            Toast.makeText(this@MainActivity, "Server merespon ${response.code}", Toast.LENGTH_SHORT).show()
                        }
                    }
                }
            })
        } catch (e: Exception) {
            appendLog("✗ Error: ${e.message}")
        }
    }

    private fun showInstalledAppPickerDialog() {
        val pm = packageManager
        val installedApps = pm.getInstalledApplications(PackageManager.GET_META_DATA)
        val currentSelected = prefs.selectedPackages.toMutableSet()

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
            tvLiveStatusHeader.text = "LISTENER AKTIF 24/7 (MODE HEMAT BATERAI)"
            tvLiveStatusDetail.text = "Aplikasi memantau di latar belakang 24/7. Notifikasi m-Banking akan otomatis diverifikasi!"
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                try {
                    NotificationListenerService.requestRebind(ComponentName(this, NotificationService::class.java))
                } catch (e: Exception) {
                    // Ignored
                }
            }
        } else {
            tvPermissionStatus.text = "✗ Izin Akses Belum Diberikan / Pengaturan Dibatasi (Android 13/14/15)"
            tvPermissionStatus.setTextColor(getColor(android.R.color.holo_red_dark))
            tvLiveStatusHeader.text = "LISTENER NONAKTIF (Tunggu Izin)"
            tvLiveStatusDetail.text = "Buka izin akses notifikasi agar aplikasi dapat berjalan memantau di latar belakang."
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
                put("text", "Transfer masuk sebesar Rp 50.000 dari TES ANDROID APP")
                put("content", "Transfer masuk sebesar Rp 50.000 dari TES ANDROID APP")
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

