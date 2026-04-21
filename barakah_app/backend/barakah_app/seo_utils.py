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
        'canonical_url': 'https://...'
    }
    """
    try:
        title = f"{metadata.get('title', 'BARAKAH APP')} | Barakah Economy"
        description = metadata.get('description', 'Penguatan Sistem Ekonomi Islam yang BARAKAH')
        image_url = metadata.get('image_url', '')
        current_url = metadata.get('canonical_url', request.build_absolute_uri())
        page_type = metadata.get('type', 'website')

        # Fallback image
        if not image_url:
            site_url = request.build_absolute_uri('/')[:-1]
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
    <meta property="og:title" content="{title}">
    <meta property="og:description" content="{description}">
    <meta property="og:image" content="{image_url}">
    <meta property="og:url" content="{current_url}">
    <meta property="og:type" content="{page_type}">
    <meta property="twitter:card" content="summary_large_image">
    <meta property="twitter:title" content="{title}">
    <meta property="twitter:description" content="{description}">
    <meta property="twitter:image" content="{image_url}">'''

        # Remove existing title tag and inject new tags into <head>
        content = re.sub(r'<title>.*?</title>', '', content)
        # Remove any pre-existing meta descriptions to avoid duplicates
        content = re.sub(r'<meta name="description".*?>', '', content)
        
        content = content.replace('</head>', f'{meta_tags}\n</head>')
        
        return HttpResponse(content)

    except Exception as e:
        # Fallback to serving the file as is if it exists
        return HttpResponse(f"SEO Generation Error: {str(e)}", status=500)
