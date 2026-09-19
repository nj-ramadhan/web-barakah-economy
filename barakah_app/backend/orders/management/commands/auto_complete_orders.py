from django.core.management.base import BaseCommand
from orders.views import perform_order_maintenance

class Command(BaseCommand):
    help = 'Automatically completes orders that have arrived or passed delivery date/estimated time and performs maintenance'

    def handle(self, *args, **options):
        self.stdout.write("Running order maintenance and auto-complete...")
        perform_order_maintenance()
        self.stdout.write(self.style.SUCCESS("Successfully executed order maintenance."))
