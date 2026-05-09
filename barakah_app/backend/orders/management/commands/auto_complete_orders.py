from django.core.management.base import BaseCommand
from django.utils import timezone
from orders.models import Order

class Command(BaseCommand):
    help = 'Automatically completes orders that have passed their auto-completion date'

    def handle(self, *args, **options):
        now = timezone.now()
        # Find orders that are 'Dikirim' and have passed the auto_complete_at time
        orders_to_complete = Order.objects.filter(
            status='Dikirim',
            auto_complete_at__lte=now
        )
        
        count = orders_to_complete.count()
        if count == 0:
            self.stdout.write(self.style.SUCCESS('No orders to auto-complete.'))
            return

        for order in orders_to_complete:
            order.status = 'Selesai'
            order.completed_at = now
            order.save()
            self.stdout.write(self.style.SUCCESS(f'Order {order.order_number} auto-completed.'))

        self.stdout.write(self.style.SUCCESS(f'Successfully auto-completed {count} orders.'))
