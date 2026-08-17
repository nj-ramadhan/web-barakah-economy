from django.http import HttpResponse
from django.utils.text import slugify
import re

# Models
from products.models import Product
from campaigns.models import Campaign
from article.models import Article
from courses.models import Course
from events.models import Event
from digital_products.models import DigitalProduct
from forum.models import Thread
from site_content.models import Activity
from accounts.models import User

from .seo_utils import get_seo_response

def clean_html(text):
    if not text: return ""
    clean = re.sub(r'<[^>]*>', '', text)
    return clean[:160].strip()

# --- MODULE HANDLERS ---

def seo_product_detail(request, slug):
    slug_clean = str(slug).strip('/')
    product = None
    
    # 1. Search by exact slug
    product = Product.objects.filter(slug__iexact=slug_clean).first()
    
    # 2. Search by ID if numeric
    if not product and slug_clean.isdigit():
        product = Product.objects.filter(id=int(slug_clean)).first()
        
    # 3. Search by title approximation
    if not product:
        search_term = slug_clean.replace('-', ' ').strip()
        product = Product.objects.filter(title__icontains=search_term).first()
        
    # 4. Fallback to DigitalProduct if applicable
    if not product:
        dp = DigitalProduct.objects.filter(slug__iexact=slug_clean).first()
        if not dp and slug_clean.isdigit():
            dp = DigitalProduct.objects.filter(id=int(slug_clean)).first()
        if dp:
            return seo_digital_product_detail(request, slug)

    if product:
        title = product.title
        clean_desc = clean_html(product.description)
        
        # Format price
        price_parts = []
        if product.price:
            try:
                price_str = f"Rp {int(product.price):,}".replace(',', '.')
                price_parts.append(f"Harga: {price_str}")
            except Exception:
                pass
        
        if clean_desc:
            price_parts.append(clean_desc)
        else:
            price_parts.append(f"Beli {product.title} di Barakah Economy.")
            
        desc = " | ".join(price_parts)
        
        img = ''
        if product.thumbnail and hasattr(product.thumbnail, 'url') and product.thumbnail.url:
            img = product.thumbnail.url
        elif hasattr(product, 'images') and product.images.exists():
            first_img = product.images.first()
            if first_img and hasattr(first_img.image, 'url'):
                img = first_img.image.url
    else:
        title = str(slug_clean).replace('-', ' ').title()
        desc = "Lihat produk unggulan di Barakah Economy."
        img = ''

    return get_seo_response(request, {
        'title': title,
        'description': desc,
        'image_url': img,
        'type': 'product'
    })

def seo_campaign_detail(request, slug):
    campaign = None
    if str(slug).isdigit():
        campaign = Campaign.objects.filter(id=int(slug)).first()
    if not campaign:
        campaign = Campaign.objects.filter(slug=slug).first()

    if campaign:
        title = campaign.title
        desc = clean_html(campaign.description) or f"Bantu program {campaign.title} di Barakah Economy"
        img = campaign.thumbnail.url if (campaign.thumbnail and hasattr(campaign.thumbnail, 'url')) else ''
        body = campaign.description
    else:
        title = str(slug).replace('-', ' ').title()
        desc = "Lihat program donasi & kebaikan di Barakah Economy."
        img = ''
        body = ''

    return get_seo_response(request, {
        'title': title,
        'description': desc,
        'image_url': img,
        'type': 'article',
        'body_content': body
    })

def seo_article_detail(request, id_or_slug):
    article = None
    if str(id_or_slug).isdigit():
        article = Article.objects.filter(id=int(id_or_slug)).first()
    if not article:
        article = Article.objects.filter(slug=id_or_slug).first()

    if article:
        title = article.title
        desc = clean_html(article.content) or f"Baca artikel {article.title} di Barakah Economy"
        img = ''
        if article.images.exists():
            first_img = article.images.first()
            if first_img and hasattr(first_img.path, 'url'):
                img = first_img.path.url
        body = article.content
    else:
        title = str(id_or_slug).replace('-', ' ').title()
        desc = "Baca artikel inspiratif di Barakah Economy."
        img = ''
        body = ''

    return get_seo_response(request, {
        'title': title,
        'description': desc,
        'image_url': img,
        'type': 'article',
        'body_content': body
    })

def seo_course_detail(request, slug):
    course = None
    if str(slug).isdigit():
        course = Course.objects.filter(id=int(slug)).first()
    if not course:
        course = Course.objects.filter(slug=slug).first()

    if course:
        title = course.title
        desc = clean_html(course.description) or f"Ikuti kelas {course.title} di Barakah Economy"
        img = course.thumbnail.url if (course.thumbnail and hasattr(course.thumbnail, 'url')) else ''
    else:
        title = str(slug).replace('-', ' ').title()
        desc = "Lihat e-course bermanfaat di Barakah Academy."
        img = ''

    return get_seo_response(request, {
        'title': title,
        'description': desc,
        'image_url': img,
        'type': 'website'
    })

def seo_event_detail(request, slug):
    event = None
    if str(slug).isdigit():
        event = Event.objects.filter(id=int(slug)).first()
    if not event:
        event = Event.objects.filter(slug=slug).first()

    if event:
        title = event.title
        desc = clean_html(event.short_description or event.description) or f"Ikuti event {event.title}"
        img = event.thumbnail.url if (event.thumbnail and hasattr(event.thumbnail, 'url')) else (
            event.header_image.url if (event.header_image and hasattr(event.header_image, 'url')) else ''
        )
    else:
        title = str(slug).replace('-', ' ').title()
        desc = "Lihat event & kegiatan menarik di Barakah Economy."
        img = ''

    return get_seo_response(request, {
        'title': title,
        'description': desc,
        'image_url': img,
        'type': 'article'
    })

def seo_digital_product_detail(request, slug, username=None):
    dp = None
    if username:
        user = User.objects.filter(username=username).first()
        if user:
            if str(slug).isdigit():
                dp = DigitalProduct.objects.filter(user=user, id=int(slug)).first()
            if not dp:
                dp = DigitalProduct.objects.filter(user=user, slug=slug).first()
    if not dp:
        if str(slug).isdigit():
            dp = DigitalProduct.objects.filter(id=int(slug)).first()
        if not dp:
            dp = DigitalProduct.objects.filter(slug=slug).first()

    if dp:
        title = dp.title
        desc = clean_html(dp.description) or f"Dapatkan {dp.title} di Barakah Economy"
        img = dp.thumbnail.url if (dp.thumbnail and hasattr(dp.thumbnail, 'url')) else ''
    else:
        title = str(slug).replace('-', ' ').title()
        desc = "Lihat produk digital di Barakah Economy."
        img = ''

    return get_seo_response(request, {
        'title': title,
        'description': desc,
        'image_url': img,
        'type': 'product'
    })

def seo_forum_detail(request, slug):
    thread = None
    if str(slug).isdigit():
        thread = Thread.objects.filter(id=int(slug)).first()
    if not thread:
        thread = Thread.objects.filter(slug=slug).first()

    if thread:
        title = thread.title
        desc = clean_html(thread.content) or f"Diskusi tentang {thread.title}"
        img = thread.image.url if (thread.image and hasattr(thread.image, 'url')) else (
            thread.author.profile.photo.url if (hasattr(thread.author, 'profile') and thread.author.profile.photo and hasattr(thread.author.profile.photo, 'url')) else ''
        )
        body = thread.content
    else:
        title = str(slug).replace('-', ' ').title()
        desc = "Simak diskusi bermanfaat di Forum Barakah Economy."
        img = ''
        body = ''

    return get_seo_response(request, {
        'title': title,
        'description': desc,
        'image_url': img,
        'type': 'article',
        'body_content': body
    })

def seo_activity_detail(request, id_or_slug):
    activity = None
    if str(id_or_slug).isdigit():
        activity = Activity.objects.filter(id=int(id_or_slug)).first()
    if not activity:
        activity = Activity.objects.filter(id=id_or_slug).first()

    if activity:
        title = activity.title
        desc = clean_html(activity.content) or f"Kegiatan: {activity.title}"
        img = activity.get_image_url or ''
        body = activity.content
    else:
        title = str(id_or_slug).replace('-', ' ').title()
        desc = "Dokumentasi kegiatan di Barakah Economy."
        img = ''
        body = ''

    return get_seo_response(request, {
        'title': title,
        'description': desc,
        'image_url': img,
        'type': 'article',
        'body_content': body
    })

def seo_seller_profile(request, username):
    user = User.objects.filter(username=username).first()
    if user:
        name = user.profile.name_full if (hasattr(user, 'profile') and user.profile.name_full) else user.username
        desc = f"Lihat produk unggulan dari {name} di Barakah Economy."
        img = user.profile.photo.url if (hasattr(user, 'profile') and user.profile.photo and hasattr(user.profile.photo, 'url')) else ''
    else:
        name = username
        desc = "Profil Toko Barakah Economy."
        img = ''

    return get_seo_response(request, {
        'title': f"Toko {name}",
        'description': desc,
        'image_url': img,
        'type': 'profile'
    })

# --- DISCOVERY ---

def robots_txt(request):
    site_url = request.build_absolute_uri('/')[:-1]
    content = f"""User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /dashboard/
Disallow: /keranjang/
Disallow: /checkout/

Sitemap: {site_url}/sitemap.xml
"""
    return HttpResponse(content, content_type="text/plain")

def sitemap_xml(request):
    site_url = request.build_absolute_uri('/')[:-1]
    urls = []
    
    # helper for sitemap entries
    def add_url(path, lastmod=None):
        urls.append(f"  <url>\n    <loc>{site_url}{path}</loc>\n  </url>")

    # Base URLs
    add_url('/')
    add_url('/charity')
    add_url('/store')
    add_url('/sinergy')
    add_url('/event')
    add_url('/academy')
    add_url('/about')
    add_url('/hubungi-kami')

    # Dynamic URLs
    for p in Product.objects.filter(status='approved', is_active=True):
        add_url(f"/produk/{p.slug}")
    
    for c in Campaign.objects.filter(approval_status='approved', is_active=True):
        add_url(f"/kampanye/{c.slug}")

    for a in Article.objects.filter(status='approved'):
        add_url(f"/articles/{a.slug}")
        add_url(f"/academy/articles/{a.slug}")

    for co in Course.objects.filter(is_active=True):
        add_url(f"/kelas/{co.slug}")

    for e in Event.objects.all(): # Include all events for archival index
        add_url(f"/event/{e.slug}")

    for d in DigitalProduct.objects.filter(is_active=True):
        add_url(f"/digital-products/{d.slug}")
        add_url(f"/digital-produk/{d.user.username}/{d.slug}")

    # Registered Sellers
    seller_ids = set(Product.objects.filter(status='approved').values_list('seller_id', flat=True)) | \
                 set(DigitalProduct.objects.filter(is_active=True).values_list('user_id', flat=True))
    for s_id in seller_ids:
        try:
            u = User.objects.get(id=s_id)
            add_url(f"/{u.username}")
        except: continue

    xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
{"".join(urls)}
</urlset>"""
    return HttpResponse(xml, content_type="application/xml")
