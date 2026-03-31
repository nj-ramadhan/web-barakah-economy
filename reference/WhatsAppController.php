<?php

class WhatsAppController {
    private $db;

    // Hardcoded config for now as requested. Can be moved to DB later.
    private $api_url = "http://notif-gowhatsappwebmultidevice-23d189-159-65-58-54.traefik.me";
    private $api_user = "admin";
    private $api_pass = "reh1sspkbdgul0ebtax6vwxjqnzhzek7";

    public function __construct($db) {
        $this->db = $db;
    }

    public function send() {
        header('Content-Type: application/json');

        // Optional: Simple Auth Check (uncomment if you want only logged-in users to send WA)
        // require_once __DIR__ . '/../middleware/AuthMiddleware.php';
        // $user = AuthMiddleware::authenticate();

        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            $input = $_POST;
        }

        $phone = $input['phone'] ?? '';
        $message = $input['message'] ?? ''; // pure text message
        $caption = $input['caption'] ?? ''; // text for file
        $pdfBase64 = $input['pdf_data'] ?? '';
        $filename = $input['filename'] ?? 'invoice.pdf';
        
        // Normalize variables
        if(empty($caption) && !empty($message)) {
            $caption = $message;
        }

        if (empty($phone)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'No HP kosong']);
            exit;
        }

        // ==========================================
        // SCENARIO 1: SEND FILE (PDF)
        // ==========================================
        if (!empty($pdfBase64)) {
            $this->sendFile($phone, $caption, $pdfBase64, $filename);
        } 
        // ==========================================
        // SCENARIO 2: SEND PURE TEXT MESSAGE
        // ==========================================
        else {
            $this->sendMessage($phone, $caption);
        }
    }

    private function sendFile($phone, $caption, $pdfBase64, $filename) {
        $apiUrl = $this->api_url . "/send/file";

        // A. Separate Header Data URI
        if (strpos($pdfBase64, ',') !== false) {
            $parts = explode(',', $pdfBase64);
            $payload = $parts[1]; 
        } else {
            $payload = $pdfBase64;
        }

        // B. Fix spaces
        $payload = str_replace(' ', '+', $payload);

        // C. Decode Base64
        $pdfDecoded = base64_decode($payload);

        // D. Validate
        if ($pdfDecoded === false || strlen($pdfDecoded) < 100) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Gagal decode file PDF']);
            exit;
        }

        // E. Save to Temp File
        $tempFilePath = sys_get_temp_dir() . '/' . uniqid('wa_') . '_' . $filename;
        file_put_contents($tempFilePath, $pdfDecoded);

        // F. Send via cURL
        if (!function_exists('curl_init')) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Ekstensi CURL nonaktif pada server']);
            exit;
        }

        $ch = curl_init();
        $cfile = new CURLFile($tempFilePath, 'application/pdf', $filename);

        $postData = [
            'phone' => $phone,
            'caption' => $caption,
            'file' => $cfile
        ];

        curl_setopt_array($ch, [
            CURLOPT_URL => $apiUrl,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $postData,
            CURLOPT_HTTPAUTH => CURLAUTH_BASIC,
            CURLOPT_USERPWD => "{$this->api_user}:{$this->api_pass}",
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_TIMEOUT => 45,
            CURLOPT_IPRESOLVE => CURL_IPRESOLVE_V4
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        // Delete temp file
        if (file_exists($tempFilePath)) unlink($tempFilePath);

        $jsonResp = json_decode($response, true);

        // Check Success
        if ($httpCode >= 200 && $httpCode < 300) {
            echo json_encode(['success' => true, 'data' => ['mode' => 'file', 'api_response' => $jsonResp]]);
        } else {
            // FALLBACK TO TEXT MESSAGE
            $this->sendMessage($phone, $caption . "\n\n*[System]* Gagal lampirkan PDF. (Error cURL/Traefik: ".$curlError.")", false);
        }
    }

    private function sendMessage($phone, $message, $isPrimary = true) {
        $apiUrl = $this->api_url . "/send/message";

        $postData = [
            'phone' => $phone,
            'message' => $message
        ];
        
        $payload = json_encode($postData);

        $chMsg = curl_init();
        curl_setopt_array($chMsg, [
            CURLOPT_URL => $apiUrl,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $payload,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Content-Length: ' . strlen($payload)
            ],
            CURLOPT_HTTPAUTH => CURLAUTH_BASIC,
            CURLOPT_USERPWD => "{$this->api_user}:{$this->api_pass}",
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_IPRESOLVE => CURL_IPRESOLVE_V4
        ]);

        $response = curl_exec($chMsg);
        $httpCode = curl_getinfo($chMsg, CURLINFO_HTTP_CODE);
        $curlError = curl_error($chMsg);
        curl_close($chMsg);

        $jsonResp = json_decode($response, true);

        if ($httpCode >= 200 && $httpCode < 300) {
            echo json_encode([
                'success' => true, 
                'message' => 'Pesan WhatsApp berhasil dikirim',
                'data' => [
                    'mode' => 'text',
                    'fallback_used' => !$isPrimary,
                    'api_response' => $jsonResp
                ]
            ]);
        } else {
            http_response_code(500);
            echo json_encode([
                'success' => false, 
                'message' => 'Gagal mengirim pesan WhatsApp. cURL Error: ' . $curlError,
                'data' => [
                    'mode' => 'text',
                    'http_code' => $httpCode,
                    'api_response' => $jsonResp
                ]
            ]);
        }
    }
}
