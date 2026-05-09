import logging
import traceback
from django.http import JsonResponse
from django.conf import settings

logger = logging.getLogger(__name__)

class GlobalExceptionMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        return self.get_response(request)

    def process_exception(self, request, exception):
        error_trace = traceback.format_exc()
        logger.error(f"Global Exception caught at {request.path}: {str(exception)}\n{error_trace}")
        
        # Only return JSON error if it's an API request
        if request.path.startswith('/api/'):
            return JsonResponse({
                "error": "Internal Server Error (Global Catch)",
                "details": str(exception),
                "trace": error_trace # Temporarily always show trace for debugging
            }, status=500)
        return None
