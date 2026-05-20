from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.utils import timezone
from accounts.models import User
from .models import Event, EventRegistration, EventTeam, EventVoucher
from decimal import Decimal

class EventRegistrationPaymentTests(APITestCase):
    def setUp(self):
        # Create a test user
        self.user = User.objects.create_user(
            username="testuser",
            email="testuser@example.com",
            password="testpassword123",
            phone="08123456789"
        )
        # Authenticate test user
        self.client.force_authenticate(user=self.user)
        
        # Create another user for event creator
        self.creator = User.objects.create_user(
            username="eventcreator",
            email="creator@example.com",
            password="creatorpassword123"
        )
        
        # Create a paid event
        self.paid_event = Event.objects.create(
            title="Paid Event",
            description="A paid event for testing",
            start_date=timezone.now() + timezone.timedelta(days=1),
            location="Bandung",
            organizer_name="BAE Community",
            status="approved",
            price_type="fixed",
            price_fixed=Decimal("50000.00"),
            created_by=self.creator,
            visibility="public"
        )
        
        # URL for registration
        self.register_url = reverse("events-register", kwargs={"slug": self.paid_event.slug})

    def test_registration_paid_event_requires_payment_proof(self):
        """
        Registering for a paid event (expected_amount > 0) without payment proof should fail.
        """
        data = {
            "responses": "{}",
            "payment_method": "transfer",
            "payment_amount": 0
        }
        
        response = self.client.post(self.register_url, data, format="json")
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)
        self.assertEqual(response.data["error"], "Bukti pembayaran wajib diunggah untuk event berbayar.")

    def test_registration_paid_event_free_via_team_modifier_skips_payment_proof(self):
        """
        If the registration has active team management and the team price modifier
        reduces the expected amount to 0, it should bypass the payment proof requirement
        and auto-verify payment status.
        """
        # Create a team with a negative price modifier that makes total 0
        team = EventTeam.objects.create(
            event=self.paid_event,
            name="Gratis Team",
            capacity=5,
            price_modifier=Decimal("-50000.00")
        )
        
        data = {
            "responses": "{}",
            "payment_method": "transfer",
            "payment_amount": 0,
            "team_id": team.id
        }
        
        response = self.client.post(self.register_url, data, format="json")
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("unique_code", response.data)
        
        # Verify the registration was created and is auto-verified
        registration = EventRegistration.objects.get(event=self.paid_event, user=self.user)
        self.assertEqual(registration.team, team)
        self.assertEqual(registration.payment_status, "verified")
        self.assertEqual(registration.status, "approved")

    def test_registration_paid_event_free_via_voucher_skips_payment_proof(self):
        """
        If a voucher discount reduces the net expected amount to 0,
        it should bypass the payment proof requirement and auto-verify payment status.
        """
        # Create a voucher with 100% discount or 50,000 fixed discount
        voucher = EventVoucher.objects.create(
            event=self.paid_event,
            code="GRATIS100",
            discount_type="fixed",
            discount_value=Decimal("50000.00"),
            quota=10,
            is_active=True
        )
        
        data = {
            "responses": "{}",
            "payment_method": "transfer",
            "payment_amount": 0,
            "voucher_code": "GRATIS100"
        }
        
        response = self.client.post(self.register_url, data, format="json")
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("unique_code", response.data)
        
        # Verify the registration was created and is auto-verified
        registration = EventRegistration.objects.get(event=self.paid_event, user=self.user)
        self.assertEqual(registration.applied_voucher, voucher)
        self.assertEqual(registration.payment_status, "verified")
        self.assertEqual(registration.status, "approved")
        
        # Verify voucher used count incremented
        voucher.refresh_from_db()
        self.assertEqual(voucher.used_count, 1)
