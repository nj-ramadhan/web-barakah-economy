import os
import re
from django.conf import settings
from django.http import HttpResponse

def get_seo_response(request, metadata):
    """
    Renders the React index.html with dynamically injected SEO meta tags.
    metadata = {
        'title': 'Page Title',
        'description': 'Page Description',
        'image_url': 'https://...',
        'type': 'website' or 'article' or 'product',
        'canonical_url': 'https://...',
        'body_content': 'Optional HTML/Text content for body'
    }
    """
    try:
        title = f"{metadata.get('title', 'BARAKAH APP')} | Barakah Economy"
        description = metadata.get('description', 'Penguatan Sistem Ekonomi Islam yang BARAKAH')
        image_url = metadata.get('image_url', '')
        current_url = metadata.get('canonical_url', request.build_absolute_uri())
        page_type = metadata.get('type', 'website')
        body_content = metadata.get('body_content', '')

        # Build absolute image URL
        if image_url:
            if hasattr(image_url, 'url'):
                image_url = image_url.url
            if not (image_url.startswith('http://') or image_url.startswith('https://')):
                image_url = request.build_absolute_uri(image_url)
            
            # Force HTTPS for social media scrapers (WhatsApp requires https for media previews)
            if image_url.startswith('http://'):
                image_url = 'https://' + image_url[7:]
        else:
            site_url = request.build_absolute_uri('/')[:-1]
            if site_url.startswith('http://'):
                site_url = 'https://' + site_url[7:]
            image_url = f"{site_url}/images/web-thumbnail.jpg"

        # Path to the frontend index.html
        index_path = os.path.join(settings.BASE_DIR, '..', 'frontend', 'build', 'index.html')
        if not os.path.exists(index_path):
            index_path = os.path.join(settings.BASE_DIR, '..', 'frontend', 'public', 'index.html')

        if not os.path.exists(index_path):
            return HttpResponse("Frontend index.html not found.", status=500)

        with open(index_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Meta tags to inject
        meta_tags = f'''
    <title>{title}</title>
    <meta name="description" content="{description}">
    <link rel="canonical" href="{current_url}">
    <meta property="og:site_name" content="Barakah Economy">
    <meta property="og:title" content="{title}">
    <meta property="og:description" content="{description}">
    <meta property="og:image" content="{image_url}">
    <meta property="og:image:secure_url" content="{image_url}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:url" content="{current_url}">
    <meta property="og:type" content="{page_type}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="{title}">
    <meta name="twitter:description" content="{description}">
    <meta name="twitter:image" content="{image_url}">'''

        # Remove existing title and meta tags to avoid duplicates
        content = re.sub(r'<title>.*?</title>', '', content, flags=re.IGNORECASE)
        content = re.sub(r'<meta\s+name=["\']description["\'].*?>', '', content, flags=re.IGNORECASE)
        content = re.sub(r'<meta\s+property=["\']og:.*?["\'].*?>', '', content, flags=re.IGNORECASE)
        content = re.sub(r'<meta\s+name=["\']twitter:.*?["\'].*?>', '', content, flags=re.IGNORECASE)

        content = content.replace('</head>', f'{meta_tags}\n</head>')

        # Inject body content if provided for crawler indexing
        if body_content:
            seo_body = f'<div id="seo-content" style="display:none;"><article><h1>{title}</h1>{body_content}</article></div>'
            content = content.replace('<body>', f'<body>\n{seo_body}')

        return HttpResponse(content)

    except Exception as e:
        return HttpResponse(f"SEO Generation Error: {str(e)}", status=500)

