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
    def get_random_available_unique_code(cls, base_amount, timeout_seconds=300, min_code=1, max_code=500, transaction_type=None):
        """
        Generates a RANDOM unique nominal code between min_code and max_code.
        - For event: min_code=1, max_code=100, locked for 2 hours (7200s). Checks DB for recent active registrations within 2 hours.
        - For ecourse/digital/ecommerce: min_code=1, max_code=500, locked for admin timeout duration.
        """
        lock_duration = max(60, int(timeout_seconds))
        
        used_codes = set()
        if transaction_type == 'event':
            try:
                from events.models import EventRegistration
                cutoff = timezone.now() - timedelta(hours=2)
                regs = EventRegistration.objects.filter(
                    created_at__gte=cutoff
                ).exclude(status__in=['rejected', 'cancelled', 'batal'])
                for r in regs:
                    if r.payment_amount and r.payment_amount > 0:
                        diff = int(round(float(r.payment_amount))) - base_amount
                        if min_code <= diff <= max_code:
                            used_codes.add(diff)
            except Exception as e:
                logger.error(f"Error querying used event codes: {e}")

        # Choose randomly from available unused numbers
        available_pool = [c for c in range(min_code, max_code + 1) if c not in used_codes]
        if available_pool:
            random.shuffle(available_pool)
            for code in available_pool:
                cache_key = f"active_qris_ucode_{transaction_type or 'gen'}_{base_amount}_{code}"
                if not cache.get(cache_key):
                    cache.set(cache_key, True, timeout=lock_duration)
                    return code

        for code in range(min_code, max_code + 1):
            cache_key = f"active_qris_ucode_{transaction_type or 'gen'}_{base_amount}_{code}"
            if not cache.get(cache_key):
                cache.set(cache_key, True, timeout=lock_duration)
                return code

        return random.randint(min_code, max_code)

    @classmethod
    def generate_dynamic_qris(cls, amount, user_id=None, reference_id=None, add_unique_code=True, transaction_type=None):
        """
        Convert Static QRIS to Dynamic QRIS via DynaQRIS API.
        Includes anti-spam rate limiting per user/IP and random unique nominal code:
        - For 'event': 1-100 range, 2-hour (120 mins) reset duration, concurrent collision avoidance.
        - For other types: 1-500 range, admin configured timeout duration.
        """
        settings_obj = PaymentSetting.get_settings()
        
        if transaction_type == 'event':
            timeout_minutes = 120  # 2 hours
            timeout_seconds = 120 * 60
            min_code = 1
            max_code = 100
        else:
            timeout_minutes = settings_obj.payment_timeout_minutes or 5
            timeout_seconds = timeout_minutes * 60
            min_code = 1
            max_code = 500
        
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

        # Find a random available unique nominal code
        unique_code = 0
        if add_unique_code:
            unique_code = cls.get_random_available_unique_code(
                base_amount=base_amount,
                timeout_seconds=timeout_seconds,
                min_code=min_code,
                max_code=max_code,
                transaction_type=transaction_type
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
