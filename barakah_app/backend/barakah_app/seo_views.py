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
from forum.models import Thread
from site_content.models import Activity
from accounts.models import User

from .seo_utils import get_seo_response

def clean_html(text):
    if not text: return ""
    # Remove HTML tags and truncate
    clean = re.sub(r'<[^>]*>', '', text)
    return clean[:160]

# --- MODULE HANDLERS ---

def seo_product_detail(request, slug):
    if slug.isdigit():
        product = get_object_or_404(Product, id=int(slug), status='approved', is_active=True)
    else:
        product = get_object_or_404(Product, slug=slug, status='approved', is_active=True)
        
    image_url = ''
    if product.thumbnail:
        image_url = product.thumbnail.url
    elif product.images.exists():
        image_url = product.images.first().image.url

    metadata = {
        'title': product.title,
        'description': clean_html(product.description),
        'image_url': image_url,
        'type': 'product'
    }
    return get_seo_response(request, metadata)

def seo_campaign_detail(request, slug):
    if slug.isdigit():
        campaign = get_object_or_404(Campaign, id=int(slug), approval_status='approved', is_active=True)
    else:
        campaign = get_object_or_404(Campaign, slug=slug, approval_status='approved', is_active=True)
        
    metadata = {
        'title': campaign.title,
        'description': clean_html(campaign.description),
        'image_url': campaign.thumbnail.url if campaign.thumbnail else '',
        'type': 'article',
        'body_content': campaign.description
    }
    return get_seo_response(request, metadata)

def seo_article_detail(request, id_or_slug):
    if id_or_slug.isdigit():
        article = get_object_or_404(Article, id=int(id_or_slug), status='approved')
    else:
        article = get_object_or_404(Article, slug=id_or_slug, status='approved')
        
    image_url = ''
    if article.images.exists():
        image_url = article.images.first().path.url
        
    metadata = {
        'title': article.title,
        'description': clean_html(article.content),
        'image_url': image_url,
        'type': 'article',
        'body_content': article.content
    }
    return get_seo_response(request, metadata)

def seo_course_detail(request, slug):
    if slug.isdigit():
        course = get_object_or_404(Course, id=int(slug), is_active=True)
    else:
        course = get_object_or_404(Course, slug=slug, is_active=True)
        
    metadata = {
        'title': course.title,
        'description': clean_html(course.description),
        'image_url': course.thumbnail.url if course.thumbnail else '',
        'type': 'website'
    }
    return get_seo_response(request, metadata)

def seo_event_detail(request, slug):
    if slug.isdigit():
        event = get_object_or_404(Event, id=int(slug))
    else:
        event = get_object_or_404(Event, slug=slug)
        
    image_url = event.thumbnail.url if event.thumbnail else (event.header_image.url if event.header_image else '')
    metadata = {
        'title': event.title,
        'description': clean_html(event.short_description or event.description),
        'image_url': image_url,
        'type': 'article'
    }
    return get_seo_response(request, metadata)

def seo_digital_product_detail(request, slug, username=None):
    if username:
        user = get_object_or_404(User, username=username)
        if slug.isdigit():
            dp = get_object_or_404(DigitalProduct, user=user, id=int(slug), is_active=True)
        else:
            dp = get_object_or_404(DigitalProduct, user=user, slug=slug, is_active=True)
    else:
        if slug.isdigit():
            dp = get_object_or_404(DigitalProduct, id=int(slug), is_active=True)
        else:
            dp = get_object_or_404(DigitalProduct, slug=slug, is_active=True)
            
    metadata = {
        'title': dp.title,
        'description': clean_html(dp.description),
        'image_url': dp.thumbnail.url if dp.thumbnail else '',
        'type': 'product'
    }
    return get_seo_response(request, metadata)

def seo_forum_detail(request, slug):
    if slug.isdigit():
        thread = get_object_or_404(Thread, id=int(slug))
    else:
        thread = get_object_or_404(Thread, slug=slug)
        
    image_url = thread.image.url if thread.image else (thread.author.profile.photo.url if hasattr(thread.author, 'profile') and thread.author.profile.photo else '')
    metadata = {
        'title': thread.title,
        'description': clean_html(thread.content),
        'image_url': image_url,
        'type': 'article',
        'body_content': thread.content
    }
    return get_seo_response(request, metadata)

def seo_activity_detail(request, id_or_slug):
    if str(id_or_slug).isdigit():
        activity = get_object_or_404(Activity, id=int(id_or_slug))
    else:
        activity = get_object_or_404(Activity, id=id_or_slug)
        
    image_url = activity.get_image_url or ''
    metadata = {
        'title': activity.title,
        'description': clean_html(activity.content),
        'image_url': image_url,
        'type': 'article',
        'body_content': activity.content
    }
    return get_seo_response(request, metadata)

def seo_seller_profile(request, username):
    user = get_object_or_404(User, username=username)
    has_products = Product.objects.filter(seller=user, status='approved').exists() or \
                   DigitalProduct.objects.filter(user=user, is_active=True).exists()
    
    if not has_products:
        raise Http404

    name = user.profile.name_full if hasattr(user, 'profile') and user.profile.name_full else user.username
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
