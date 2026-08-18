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

    private lateinit var tvHardwareDeviceInfo: TextView
    private lateinit var btnClaimDeviceLock: Button

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        prefs = PreferencesHelper(this)

        tvPermissionStatus = findViewById(R.id.tvPermissionStatus)
        tvSelectedAppsSummary = findViewById(R.id.tvSelectedAppsSummary)
        tvLiveStatusHeader = findViewById(R.id.tvLiveStatusHeader)
        tvLiveStatusDetail = findViewById(R.id.tvLiveStatusDetail)
        tvHardwareDeviceInfo = findViewById(R.id.tvHardwareDeviceInfo)
        btnClaimDeviceLock = findViewById(R.id.btnClaimDeviceLock)
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

        updateHardwareDeviceInfo()
        updateSelectedAppsSummary()

        btnClaimDeviceLock.setOnClickListener {
            claimPrimaryDeviceLock()
        }

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
            showCustomNotificationBuilderDialog()
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

    private fun updateHardwareDeviceInfo() {
        val manufacturer = Build.MANUFACTURER.uppercase()
        val model = Build.MODEL
        val release = Build.VERSION.RELEASE
        val sdk = Build.VERSION.SDK_INT
        val deviceIdShort = prefs.deviceId.take(8)

        val lockStatus = if (prefs.isPrimaryListener) "🟢 Listener Utama Server" else "⚠️ Bukan Listener Utama"
        tvHardwareDeviceInfo.text = "Model: $manufacturer $model (Android $release, SDK $sdk)\nDevice ID: $deviceIdShort...\nStatus Server: $lockStatus"
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

    private fun showCustomNotificationBuilderDialog() {
        val bankOptions = arrayOf(
            "DANA (id.dana)",
            "BSI Mobile (id.co.bankbsi.mobile)",
            "BCA Mobile (com.bca)",
            "Livin by Mandiri (id.bmri.livin)",
            "BRImo (id.co.bri.brimo)",
            "GoPay / Gojek (com.gojek.app)",
            "ShopeePay (com.shopee.id)",
            "OVO (net.oneoryx.ovo)",
            "SeaBank (com.seabank.id)",
            "Custom App Lainnya..."
        )

        val dialogView = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(40, 30, 40, 20)
        }

        val tvBankLabel = TextView(this).apply {
            text = "1. Pilih Sumber Notifikasi Bank / E-Wallet:"
            textSize = 13f
            setTypeface(null, android.graphics.Typeface.BOLD)
            setTextColor(getColor(R.color.gray_800))
        }
        dialogView.addView(tvBankLabel)

        val spinnerBank = android.widget.Spinner(this).apply {
            val adapter = android.widget.ArrayAdapter(this@MainActivity, android.R.layout.simple_spinner_dropdown_item, bankOptions)
            this.adapter = adapter
            setSelection(0) // Default DANA
        }
        dialogView.addView(spinnerBank)

        val tvNominalLabel = TextView(this).apply {
            text = "\n2. Masukkan Nominal Transfer (Rupiah):"
            textSize = 13f
            setTypeface(null, android.graphics.Typeface.BOLD)
            setTextColor(getColor(R.color.gray_800))
        }
        dialogView.addView(tvNominalLabel)

        val etNominal = EditText(this).apply {
            hint = "Cth: 4459 / 50000 / 100000"
            setText("4459")
            inputType = android.text.InputType.TYPE_CLASS_NUMBER
            textSize = 15f
        }
        dialogView.addView(etNominal)

        val tvSenderLabel = TextView(this).apply {
            text = "\n3. Nama Pengirim / Keterangan (Opsional):"
            textSize = 12f
            setTextColor(getColor(R.color.gray_700))
        }
        dialogView.addView(tvSenderLabel)

        val etSender = EditText(this).apply {
            hint = "Cth: Ahmad Fulan"
            setText("Pelanggan")
            textSize = 14f
        }
        dialogView.addView(etSender)

        AlertDialog.Builder(this)
            .setTitle("🧪 Custom Simulasi Notifikasi")
            .setView(dialogView)
            .setPositiveButton("🚀 Kirim ke Server") { _, _ ->
                val nominalStr = etNominal.text.toString().trim().replace(".", "").replace(",", "")
                val nominalInt = nominalStr.toIntOrNull() ?: 0
                if (nominalInt <= 0) {
                    Toast.makeText(this, "Nominal transfer tidak boleh kosong / 0", Toast.LENGTH_SHORT).show()
                    return@setPositiveButton
                }

                val formattedNominal = String.format("%,d", nominalInt).replace(',', '.')
                val sender = etSender.text.toString().trim().ifBlank { "Pelanggan" }
                val bankIndex = spinnerBank.selectedItemPosition

                var pkg = "id.dana"
                var title = "DANA Saldo Masuk"
                var text = "Kamu menerima saldo DANA sebesar Rp $formattedNominal dari $sender"

                when (bankIndex) {
                    0 -> { // DANA
                        pkg = "id.dana"
                        title = "DANA Saldo Masuk"
                        text = "Kamu menerima saldo DANA sebesar Rp $formattedNominal dari $sender"
                    }
                    1 -> { // BSI Mobile
                        pkg = "id.co.bankbsi.mobile"
                        title = "BSI Mobile Uang Masuk"
                        text = "Transfer masuk sebesar Rp $formattedNominal dari $sender"
                    }
                    2 -> { // BCA
                        pkg = "com.bca"
                        title = "m-Transfer BCA"
                        text = "Dana Masuk Sebesar Rp $formattedNominal,00 dari $sender"
                    }
                    3 -> { // Mandiri Livin
                        pkg = "id.bmri.livin"
                        title = "Livin by Mandiri"
                        text = "Penerimaan transfer Rp $formattedNominal berhasil diterima dari $sender"
                    }
                    4 -> { // BRImo
                        pkg = "id.co.bri.brimo"
                        title = "BRImo Info Mutasi"
                        text = "Transfer dana masuk sebesar Rp $formattedNominal berhasil dari $sender"
                    }
                    5 -> { // GoPay
                        pkg = "com.gojek.app"
                        title = "GoPay Masuk"
                        text = "Top up / Transfer masuk sebesar Rp $formattedNominal dari $sender"
                    }
                    6 -> { // ShopeePay
                        pkg = "com.shopee.id"
                        title = "ShopeePay"
                        text = "Pembayaran QRIS Rp $formattedNominal berhasil masuk ke saldo Anda"
                    }
                    7 -> { // OVO
                        pkg = "net.oneoryx.ovo"
                        title = "OVO Saldo Masuk"
                        text = "Kamu telah menerima transfer dana sebesar Rp $formattedNominal"
                    }
                    8 -> { // SeaBank
                        pkg = "com.seabank.id"
                        title = "SeaBank"
                        text = "Transfer masuk sebesar Rp $formattedNominal dari $sender"
                    }
                    else -> {
                        pkg = "com.bank.custom"
                        title = "Notifikasi Uang Masuk"
                        text = "Transfer masuk sebesar Rp $formattedNominal dari $sender"
                    }
                }

                sendCustomPayload(pkg, title, text)
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
        claimPrimaryDeviceLock()
    }

    override fun onDestroy() {
        super.onDestroy()
        try {
            unregisterReceiver(logReceiver)
        } catch (e: Exception) {
            // Ignored
        }
    }

    private fun claimPrimaryDeviceLock() {
        val baseUrl = prefs.webhookUrl.trim()
        val secret = prefs.secretToken.trim()
        if (baseUrl.isEmpty()) return

        val heartbeatUrl = if (baseUrl.contains("/webhook/")) {
            baseUrl.substringBeforeLast("/webhook/") + "/webhook/heartbeat/"
        } else {
            "https://api.barakah.cloud/api/payments/webhook/heartbeat/"
        }

        val client = OkHttpClient()
        try {
            val json = JSONObject().apply {
                put("device_id", prefs.deviceId)
                put("device_name", prefs.deviceName)
                put("secret", secret)
                put("force_claim", true)
            }

            val body = json.toString().toRequestBody("application/json; charset=utf-8".toMediaType())
            val request = Request.Builder()
                .url(heartbeatUrl)
                .addHeader("X-Android-Secret", secret)
                .post(body)
                .build()

            client.newCall(request).enqueue(object : Callback {
                override fun onFailure(call: Call, e: IOException) {
                    runOnUiThread {
                        appendLog("⚠️ Heartbeat server tidak terjangkau: ${e.message}")
                    }
                }

                override fun onResponse(call: Call, response: Response) {
                    val respBody = response.body?.string() ?: ""
                    runOnUiThread {
                        if (response.isSuccessful) {
                            try {
                                val resJson = JSONObject(respBody)
                                val msg = resJson.optString("message", "OK")
                                prefs.isPrimaryListener = true
                                tvLiveStatusHeader.text = "🟢 LISTENER UTAMA AKTIF 24/7 (LOCK 1 HP)"
                                tvLiveStatusDetail.text = "HP ini (${prefs.deviceName}) adalah penerima notifikasi tunggal aktif untuk server Barakah."
                                appendLog("✓ Sesi Listener Utama Terdaftar di Server Barakah.")
                            } catch (e: Exception) {
                                // Ignored
                            }
                        }
                    }
                }
            })
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
            tvLiveStatusHeader.text = "🟢 LISTENER AKTIF 24/7 (LOCK 1 HP)"
            tvLiveStatusDetail.text = "Aplikasi memantau di latar belakang 24/7. Notifikasi m-Banking & QRIS akan otomatis diverifikasi!"
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
                put("device_id", prefs.deviceId)
                put("device_name", prefs.deviceName)
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

