@action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
def blast_whatsapp(self, request, slug=None):
    """Blast WhatsApp messages to all participants of an event."""
    event = self.get_object()
    
    # Check if user is the organizer or admin
