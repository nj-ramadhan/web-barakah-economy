from django.http import HttpResponse, Http404
from django.shortcuts import get_object_or_404
from django.utils.text import slugify
import re

# Models
from products.models import Product
from campaigns.models import Campaign
from article.models import Article
from courses.models import Course
from events.models import Event
from digital_products.models import DigitalProduct
from accounts.models import User

from .seo_utils import get_seo_response

def clean_html(text):
    if not text: return ""
    # Remove HTML tags and truncate
    clean = re.sub(r'<[^>]*>', '', text)
    return clean[:160]

# --- MODULE HANDLERS ---

def seo_product_detail(request, slug):
    product = get_object_or_404(Product, slug=slug, status='approved', is_active=True)
    metadata = {
        'title': product.title,
        'description': clean_html(product.description),
        'image_url': product.thumbnail.url if product.thumbnail else '',
        'type': 'product'
    }
    return get_seo_response(request, metadata)

def seo_campaign_detail(request, slug):
    campaign = get_object_or_404(Campaign, slug=slug, approval_status='approved', is_active=True)
    metadata = {
        'title': campaign.title,
        'description': clean_html(campaign.description),
        'image_url': campaign.thumbnail.url if campaign.thumbnail else '',
        'type': 'article'
    }
    return get_seo_response(request, metadata)

def seo_article_detail(request, slug):
    article = get_object_or_404(Article, slug=slug, status='approved')
    # Use first image if available
    image_url = ''
    if article.images.exists():
        image_url = article.images.first().path.url
        
    metadata = {
        'title': article.title,
        'description': clean_html(article.content),
        'image_url': image_url,
        'type': 'article'
    }
    return get_seo_response(request, metadata)

def seo_course_detail(request, slug):
    course = get_object_or_404(Course, slug=slug, is_active=True)
    metadata = {
        'title': course.title,
        'description': clean_html(course.description),
        'image_url': course.thumbnail.url if course.thumbnail else '',
        'type': 'website'
    }
    return get_seo_response(request, metadata)

def seo_event_detail(request, slug):
    # This replaces the logic previously in events/views.py
    event = get_object_or_404(Event, slug=slug)
    # Events can be active or not for indexing, usually better to keep them
    metadata = {
        'title': event.title,
        'description': clean_html(event.description),
        'image_url': event.thumbnail.url if event.thumbnail else (event.header_image.url if event.header_image else ''),
        'type': 'article'
    }
    return get_seo_response(request, metadata)

def seo_seller_profile(request, username):
    user = get_object_or_404(User, username=username)
    # Check if user has physical products or digital products
    has_products = Product.objects.filter(seller=user, status='approved').exists() or \
                   DigitalProduct.objects.filter(user=user, is_active=True).exists()
    
    if not has_products:
        # Don't spend SEO juice on empty profiles or non-sellers
        raise Http404

    name = user.profile.name_full if hasattr(user, 'profile') else user.username
    metadata = {
        'title': f"Toko {name}",
        'description': f"Lihat produk unggulan dari {name} di Barakah Economy.",
        'image_url': user.profile.photo.url if hasattr(user, 'profile') and user.profile.photo else '',
        'type': 'profile'
    }
    return get_seo_response(request, metadata)

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
