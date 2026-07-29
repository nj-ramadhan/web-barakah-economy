import requests
import logging
import random
from datetime import timedelta
from django.utils import timezone
from django.core.cache import cache
from .models import PaymentSetting

logger = logging.getLogger(__name__)

DYNAQRIS_CONVERT_URL = "https://dynaqris.web.id/api/v1/convert"

class DynaQRISService:
    @staticmethod
    def get_active_config():
        """Retrieve current PaymentSetting instance."""
        return PaymentSetting.get_settings()

    @classmethod
    def get_lowest_available_unique_code(cls, base_amount, timeout_seconds=300, max_code=500):
        """
        Finds the lowest available unique nominal code (from 1 up to max_code=500).
        Prioritizes lowest numbers first (1, 2, 3, etc.).
        Automatically recycles/refreshes the code once timeout_seconds (e.g. 5 minutes) expires.
        """
        for code in range(1, max_code + 1):
            cache_key = f"active_qris_ucode_{base_amount}_{code}"
            if not cache.get(cache_key):
                # Lock code in cache for the payment timer duration
                cache.set(cache_key, True, timeout=timeout_seconds)
                return code
        # Fallback in the rare case that all 1..500 are concurrently active
        return random.randint(1, max_code)

    @classmethod
    def generate_dynamic_qris(cls, amount, user_id=None, reference_id=None, add_unique_code=True):
        """
        Convert Static QRIS to Dynamic QRIS via DynaQRIS API.
        Includes anti-spam rate limiting per user/IP and recycled low unique nominal code (1..500).
        """
        settings_obj = PaymentSetting.get_settings()
        timeout_minutes = settings_obj.payment_timeout_minutes or 5
        timeout_seconds = timeout_minutes * 60
        
        # Check Anti-Spam protection if enabled
        if settings_obj.enable_anti_spam and user_id:
            cache_key = f"dynaqris_cooldown_{user_id}_{reference_id}"
            if cache.get(cache_key):
                return {
                    "error": "Harap tunggu 10 detik sebelum membuat QRIS baru (Proteksi Anti-Spam).",
                    "code": "RATE_LIMITED"
                }
            # Set a 10 second cooldown
            cache.set(cache_key, True, timeout=10)

        api_key = settings_obj.dynaqris_api_key
        qris_id = settings_obj.dynaqris_qris_id

        if not api_key or not qris_id:
            return {"error": "Pengaturan DynaQRIS belum lengkap (API Key atau QRIS ID kosong)."}

        try:
            base_amount = int(round(float(amount)))
            if base_amount <= 0:
                return {"error": "Nominal pembayaran tidak valid."}
        except (ValueError, TypeError):
            return {"error": "Format nominal tidak valid."}

        # Find the lowest available unique nominal code (range 1-500), auto-refreshed after timeout
        unique_code = 0
        if add_unique_code:
            unique_code = cls.get_lowest_available_unique_code(
                base_amount=base_amount,
                timeout_seconds=timeout_seconds,
                max_code=500
            )

        final_amount = base_amount + unique_code

        headers = {
            "X-API-Key": api_key,
            "Content-Type": "application/json"
        }

        payload = {
            "qrisId": qris_id,
            "amount": final_amount
        }

        try:
            logger.info(f"Generating DynaQRIS for base amount {base_amount} + unique {unique_code} = {final_amount} with QRIS ID {qris_id}")
            response = requests.post(DYNAQRIS_CONVERT_URL, json=payload, headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                expires_at = timezone.now() + timedelta(minutes=timeout_minutes)
                
                return {
                    "qrisCode": data.get("qrisCode"),
                    "qrisImage": data.get("qrisImage"),
                    "createdAt": data.get("createdAt"),
                    "expiresAt": expires_at.isoformat(),
                    "timeoutSeconds": timeout_seconds,
                    "baseAmount": base_amount,
                    "uniqueCode": unique_code,
                    "amount": final_amount
                }
            else:
                logger.error(f"DynaQRIS API Error ({response.status_code}): {response.text}")
                return {
                    "error": f"Gagal menghasilkan QRIS dari DynaQRIS (Status {response.status_code}): {response.text}"
                }
        except requests.RequestException as e:
            logger.error(f"DynaQRIS Request Exception: {str(e)}")
            return {"error": f"Gagal terhubung ke layanan DynaQRIS: {str(e)}"}
