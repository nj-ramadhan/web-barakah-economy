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

        # Google Schema.org Product Rich Snippet
        prod_img_url = request.build_absolute_uri(img) if img else request.build_absolute_uri('/images/web-thumbnail.jpg')
        json_ld = {
            "@context": "https://schema.org/",
            "@type": "Product",
            "name": product.title,
            "description": clean_desc or product.title,
            "image": [prod_img_url],
            "offers": {
                "@type": "Offer",
                "url": request.build_absolute_uri(f"/produk/{product.slug or product.id}"),
                "priceCurrency": "IDR",
                "price": str(int(product.price or 0)),
                "availability": "https://schema.org/InStock" if (getattr(product, 'stock', 1) or 0) > 0 else "https://schema.org/OutOfStock",
                "seller": {
                    "@type": "Organization",
                    "name": getattr(product, 'seller_name', 'Barakah Economy')
                }
            }
        }
    else:
        title = str(slug_clean).replace('-', ' ').title()
        desc = "Lihat produk unggulan di Barakah Economy."
        img = ''
        json_ld = None

    return get_seo_response(request, {
        'title': title,
        'description': desc,
        'image_url': img,
        'type': 'product',
        'json_ld': json_ld
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
        json_ld = {
            "@context": "https://schema.org/",
            "@type": "NGO",
            "name": f"Kampanye: {campaign.title}",
            "description": desc,
            "image": [request.build_absolute_uri(img)] if img else [],
            "url": request.build_absolute_uri(f"/kampanye/{campaign.slug or campaign.id}"),
            "potentialAction": {
                "@type": "DonateAction",
                "target": request.build_absolute_uri(f"/kampanye/{campaign.slug or campaign.id}")
            }
        }
    else:
        title = str(slug).replace('-', ' ').title()
        desc = "Lihat program donasi & kebaikan di Barakah Economy."
        img = ''
        body = ''
        json_ld = None

    return get_seo_response(request, {
        'title': title,
        'description': desc,
        'image_url': img,
        'type': 'article',
        'body_content': body,
        'json_ld': json_ld
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
        art_img = request.build_absolute_uri(img) if img else request.build_absolute_uri('/images/web-thumbnail.jpg')
        json_ld = {
            "@context": "https://schema.org/",
            "@type": "BlogPosting",
            "headline": article.title,
            "description": desc,
            "image": [art_img],
            "url": request.build_absolute_uri(f"/articles/{article.slug or article.id}"),
            "author": {
                "@type": "Organization",
                "name": "Barakah Economy"
            },
            "publisher": {
                "@type": "Organization",
                "name": "Barakah Economy"
            }
        }
    else:
        title = str(id_or_slug).replace('-', ' ').title()
        desc = "Baca artikel inspiratif di Barakah Economy."
        img = ''
        body = ''
        json_ld = None

    return get_seo_response(request, {
        'title': title,
        'description': desc,
        'image_url': img,
        'type': 'article',
        'body_content': body,
        'json_ld': json_ld
    })

def seo_course_detail(request, slug):
    course = None
    if str(slug).isdigit():
        course = Course.objects.filter(id=int(slug)).first()
    if not course:
        course = Course.objects.filter(slug=slug).first()

    if course:
        title = course.title
        desc = clean_html(course.description) or f"Ikuti kelas {course.title} di Barakah Academy"
        img = course.thumbnail.url if (course.thumbnail and hasattr(course.thumbnail, 'url')) else ''
        crs_img = request.build_absolute_uri(img) if img else request.build_absolute_uri('/images/web-thumbnail.jpg')
        is_free = not course.price or int(course.price) <= 0
        json_ld = {
            "@context": "https://schema.org/",
            "@type": "Course",
            "name": course.title,
            "description": desc,
            "image": [crs_img],
            "provider": {
                "@type": "Organization",
                "name": "Barakah Academy",
                "sameAs": request.build_absolute_uri("/academy")
            },
            "offers": {
                "@type": "Offer",
                "url": request.build_absolute_uri(f"/kelas/{course.slug or course.id}"),
                "price": "0" if is_free else str(int(course.price or 0)),
                "priceCurrency": "IDR",
                "category": "Free" if is_free else "Paid"
            }
        }
    else:
        title = str(slug).replace('-', ' ').title()
        desc = "Lihat e-course bermanfaat di Barakah Academy."
        img = ''
        json_ld = None

    return get_seo_response(request, {
        'title': title,
        'description': desc,
        'image_url': img,
        'type': 'website',
        'json_ld': json_ld
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
        evt_img = request.build_absolute_uri(img) if img else request.build_absolute_uri('/images/web-thumbnail.jpg')
        json_ld = {
            "@context": "https://schema.org/",
            "@type": "Event",
            "name": event.title,
            "description": desc,
            "image": [evt_img],
            "eventStatus": "https://schema.org/EventScheduled",
            "organizer": {
                "@type": "Organization",
                "name": "Barakah Economy"
            }
        }
    else:
        title = str(slug).replace('-', ' ').title()
        desc = "Lihat event & kegiatan menarik di Barakah Economy."
        img = ''
        json_ld = None

    return get_seo_response(request, {
        'title': title,
        'description': desc,
        'image_url': img,
        'type': 'article',
        'json_ld': json_ld
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
        dp_img = request.build_absolute_uri(img) if img else request.build_absolute_uri('/images/web-thumbnail.jpg')
        json_ld = {
            "@context": "https://schema.org/",
            "@type": "Product",
            "name": dp.title,
            "description": desc,
            "image": [dp_img],
            "category": dp.category or "Digital Product",
            "offers": {
                "@type": "Offer",
                "url": request.build_absolute_uri(f"/digital-products/{dp.slug or dp.id}"),
                "price": str(int(dp.price or 0)),
                "priceCurrency": "IDR",
                "availability": "https://schema.org/InStock"
            }
        }
    else:
        title = str(slug).replace('-', ' ').title()
        desc = "Lihat produk digital di Barakah Economy."
        img = ''
        json_ld = None

    return get_seo_response(request, {
        'title': title,
        'description': desc,
        'image_url': img,
        'type': 'product',
        'json_ld': json_ld
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
        json_ld = {
            "@context": "https://schema.org/",
            "@type": "DiscussionForumPosting",
            "headline": thread.title,
            "articleBody": desc,
            "url": request.build_absolute_uri(f"/forum/{thread.slug or thread.id}"),
            "author": {
                "@type": "Person",
                "name": thread.author.username if thread.author else "Member Barakah"
            }
        }
    else:
        title = str(slug).replace('-', ' ').title()
        desc = "Simak diskusi bermanfaat di Forum Barakah Economy."
        img = ''
        body = ''
        json_ld = None

    return get_seo_response(request, {
        'title': title,
        'description': desc,
        'image_url': img,
        'type': 'article',
        'body_content': body,
        'json_ld': json_ld
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
    return seo_shop_profile(request, username)

def seo_shop_profile(request, identifier):
    from django.db.models import Q
    from profiles.models import Profile
    clean_id = str(identifier).strip('/')
    profile = Profile.objects.filter(Q(shop_name__iexact=clean_id) | Q(user__username__iexact=clean_id)).first()
    if profile:
        name = profile.shop_name or profile.name_full or profile.user.username
        desc = profile.shop_description or f"Lihat koleksi produk dan layanan dari Toko {name} di Barakah Economy."
        img = profile.picture.url if profile.picture else (profile.shop_thumbnail.url if profile.shop_thumbnail else '')
        if img and not img.startswith('http'):
            img = request.build_absolute_uri(img)
    else:
        name = clean_id
        desc = "Profil Toko Barakah Economy."
        img = ''

    return get_seo_response(request, {
        'title': f"Toko {name} | Barakah Economy",
        'description': desc,
        'image_url': img,
        'type': 'website'
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
    def add_url(path, priority="0.8", changefreq="daily"):
        urls.append(f"""  <url>
    <loc>{site_url}{path}</loc>
    <changefreq>{changefreq}</changefreq>
    <priority>{priority}</priority>
  </url>""")

    # Main Hub URLs
    add_url('/', priority="1.0", changefreq="daily")
    add_url('/store', priority="0.9", changefreq="hourly")
    add_url('/charity', priority="0.9", changefreq="daily")
    add_url('/sinergy', priority="0.9", changefreq="daily")
    add_url('/event', priority="0.8", changefreq="daily")
    add_url('/academy', priority="0.9", changefreq="daily")
    add_url('/academy/ecourse', priority="0.9", changefreq="daily")
    add_url('/digital-products', priority="0.9", changefreq="daily")
    add_url('/articles', priority="0.9", changefreq="daily")
    add_url('/forum', priority="0.9", changefreq="hourly")
    add_url('/kegiatan', priority="0.7", changefreq="weekly")
    add_url('/about', priority="0.6", changefreq="monthly")
    add_url('/hubungi-kami', priority="0.6", changefreq="monthly")

    # Dynamic Products
    for p in Product.objects.filter(status='approved', is_active=True):
        add_url(f"/produk/{p.slug or p.id}", priority="0.8", changefreq="daily")
    
    # Dynamic Campaigns
    for c in Campaign.objects.filter(approval_status='approved', is_active=True):
        add_url(f"/kampanye/{c.slug or c.id}", priority="0.8", changefreq="daily")

    # Dynamic Articles
    for a in Article.objects.filter(status='approved'):
        add_url(f"/articles/{a.slug or a.id}", priority="0.8", changefreq="weekly")
        add_url(f"/academy/articles/{a.slug or a.id}", priority="0.7", changefreq="weekly")

    # Dynamic Courses
    for co in Course.objects.filter(is_active=True):
        add_url(f"/kelas/{co.slug or co.id}", priority="0.8", changefreq="daily")

    # Dynamic Events
    for e in Event.objects.all():
        add_url(f"/event/{e.slug or e.id}", priority="0.7", changefreq="weekly")

    # Dynamic Digital Products
    for d in DigitalProduct.objects.filter(is_active=True):
        add_url(f"/digital-products/{d.slug or d.id}", priority="0.8", changefreq="daily")

    # Dynamic Forum Threads
    for t in Thread.objects.all()[:500]:
        add_url(f"/forum/{t.slug or t.id}", priority="0.7", changefreq="daily")

    # Dynamic Activities
    for act in Activity.objects.all()[:200]:
        add_url(f"/kegiatan/{act.id}", priority="0.6", changefreq="weekly")

    # Registered Sellers / Stores
    seller_ids = set(Product.objects.filter(status='approved').values_list('seller_id', flat=True)) | \
                 set(DigitalProduct.objects.filter(is_active=True).values_list('user_id', flat=True))
    for s_id in seller_ids:
        try:
            u = User.objects.get(id=s_id)
            add_url(f"/toko/{u.username}", priority="0.7", changefreq="weekly")
            add_url(f"/{u.username}", priority="0.6", changefreq="weekly")
        except: continue

    xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
{"".join(urls)}
</urlset>"""
    return HttpResponse(xml, content_type="application/xml")
