from django.contrib import admin
from django.urls import path, include
from ckeditor_uploader import views as ckeditor_views
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import SimpleRouter
router = SimpleRouter()

from barakah_app.seo_views import (
    robots_txt, sitemap_xml, seo_product_detail, 
    seo_campaign_detail, seo_article_detail, 
    seo_course_detail, seo_event_detail, seo_digital_product_detail,
    seo_forum_detail, seo_activity_detail, seo_seller_profile
)
from streaming.views import seo_streaming_detail

urlpatterns = [
    path('admin/', admin.site.urls),
    path('robots.txt', robots_txt),
    path('sitemap.xml', sitemap_xml),
    
    # --- SEO Crawler Traps & Detail Views (Frontend Paths Caught by Backend) ---
    path('streaming/', seo_streaming_detail),
    path('produk/<str:slug>/', seo_product_detail),
    path('produk/<str:slug>', seo_product_detail),
    path('kampanye/<str:slug>/', seo_campaign_detail),
    path('kampanye/<str:slug>', seo_campaign_detail),
    path('articles/<str:id_or_slug>/', seo_article_detail),
    path('articles/<str:id_or_slug>', seo_article_detail),
    path('academy/articles/<str:id_or_slug>/', seo_article_detail),
    path('academy/articles/<str:id_or_slug>', seo_article_detail),
    path('kelas/<str:slug>/', seo_course_detail),
    path('kelas/<str:slug>', seo_course_detail),
    path('event/<str:slug>/', seo_event_detail),
    path('event/<str:slug>', seo_event_detail),
    path('digital-products/<str:slug>/', seo_digital_product_detail),
    path('digital-products/<str:slug>', seo_digital_product_detail),
    path('digital-produk/<str:username>/<str:slug>/', seo_digital_product_detail),
    path('digital-produk/<str:username>/<str:slug>', seo_digital_product_detail),
    path('digital_produk/<str:username>/<str:slug>/', seo_digital_product_detail),
    path('digital_produk/<str:username>/<str:slug>', seo_digital_product_detail),
    path('forum/<str:slug>/', seo_forum_detail),
    path('forum/<str:slug>', seo_forum_detail),
    path('kegiatan/<str:id_or_slug>/', seo_activity_detail),
    path('kegiatan/<str:id_or_slug>', seo_activity_detail),
    path('<str:username>/', seo_seller_profile),
    path('<str:username>', seo_seller_profile),

    path('api/auth/', include('accounts.urls')),
    path('api/profiles/', include('profiles.urls')),
    path('api/streaming/', include('streaming.urls')),
    path('api/', include(router.urls)),

    path('api/', include('article.urls')),
    path('api/site-content/', include('site_content.urls')),
    path('api/chat/', include('chat.urls')),

    path('api/campaigns/', include('campaigns.urls')),
    path('api/donations/', include('donations.urls')),
    path('api/payments/', include('payments.urls')),

    path('api/products/', include('products.urls')),
    path('api/wishlists/', include('wishlists.urls')),
    path('api/carts/', include('carts.urls')),
    path('api/orders/', include('orders.urls')),
    path('api/coupons/', include('coupons.urls')),
    path('api/shippings/', include('shippings.urls')),
    path('api/reviews/', include('reviews.urls')),

    path('api/courses/', include('courses.urls')),

    path('api/digital-products/', include('digital_products.urls')),
    path('api/forum/', include('forum.urls')),
    path('api/events/', include('events.urls')),
    path('api/meetings/', include('meetings.urls')),
    path('api/zis/', include('zis.urls')),
    path('api/tracking/', include('tracking.urls')),
    path('ckeditor/', include('ckeditor_uploader.urls')),
    path('ckeditor/upload/', ckeditor_views.upload, name='ckeditor_upload'),
    
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)