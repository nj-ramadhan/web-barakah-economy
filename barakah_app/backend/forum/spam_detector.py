import re
from datetime import timedelta
from django.utils import timezone

SPAM_KEYWORDS = [
    # Gambling / Slot / Casino terms
    r'\bslot\b', r'\bgacor\b', r'\bjudi\b', r'\btogel\b', r'\bmaxwin\b',
    r'\bpragmatic\b', r'\bscatter\b', r'\bdeposit\s+pulsa\b', r'\bagen\s+slot\b',
    r'\bbandar\b', r'\bcasino\b', r'\bpoker\b', r'\bsbobet\b', r'\brtp\s+slot\b',
    r'\bsensational\b', r'\blink\s+gacor\b', r'\bdaftar\s+slot\b', r'\bjackpot\b',
    r'\bdewaslot\b', r'\bmpo\b', r'\bslot88\b', r'\bhoki\s*slot\b', r'\bsitus\s+gacor\b',
    r'\bsitus\s+judi\b', r'\btaruhan\b', r'\blive\s*casino\b', r'\bfreebet\b',
    # Adult / Porn / Illegal
    r'\bopen\s*bo\b', r'\bbokep\b', r'\bvcs\b', r'\bobat\s+kuat\b',
    r'\bpinjol\s+ilegal\b', r'\bdana\s+gaib\b', r'\bpesugihan\b', r'\bhack\s+saldo\b',
]

SUSPICIOUS_LINKS = [
    r'bit\.ly', r'tinyurl\.com', r'cutt\.ly', r's\.id', r'shorturl\.at',
    r't\.me\/', r'wa\.me\/', r'telegram\.me\/', r'chat\.whatsapp\.com\/'
]

def check_spam(content: str, user=None, thread=None):
    """
    Analyzes content to detect spam.
    Returns: (is_spam: bool, reason: str)
    """
    if not content or not content.strip():
        return False, ""

    lower_content = content.lower()

    # 1. Check prohibited spam & gambling keywords
    for pattern in SPAM_KEYWORDS:
        if re.search(pattern, lower_content, re.IGNORECASE):
            match = re.search(pattern, lower_content, re.IGNORECASE).group(0)
            return True, f"Terdeteksi kata kunci terlarang/promosi ('{match}')"

    # 2. Check suspicious shortener/redirect links
    for link_pattern in SUSPICIOUS_LINKS:
        if re.search(link_pattern, lower_content, re.IGNORECASE):
            return True, "Terdeteksi tautan redirect/shortener mencurigakan"

    # 3. Check excessive links (> 2 links)
    url_pattern = r'https?:\/\/[^\s]+'
    urls = re.findall(url_pattern, content)
    if len(urls) > 2:
        return True, f"Terlalu banyak tautan luar ({len(urls)} tautan)"

    # 4. Check repetitive characters (e.g. 'aaaaaaaaaa' or '!!!!!!!!!!')
    if re.search(r'(.)\1{9,}', content):
        return True, "Karakter berulang mencurigakan (flooding/spam)"

    # 5. Check duplicate recent replies by the same user
    if user and user.is_authenticated:
        from .models import Reply
        recent_threshold = timezone.now() - timedelta(minutes=5)
        clean_content = content.strip()
        duplicate_exists = Reply.objects.filter(
            author=user,
            content__iexact=clean_content,
            created_at__gte=recent_threshold
        ).exists()
        if duplicate_exists:
            return True, "Balasan duplikat berulang dalam waktu singkat"

    return False, ""
