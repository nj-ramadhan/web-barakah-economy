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


class OnlineEventVisibilityTests(APITestCase):
    def setUp(self):
        self.creator = User.objects.create_user(
            username="creator",
            email="creator@example.com",
            password="password123"
        )
        self.participant = User.objects.create_user(
            username="participant",
            email="participant@example.com",
            password="password123",
            phone="08999999999"
        )
        
        now = timezone.now()
        self.online_event = Event.objects.create(
            title="Online Seminar",
            description="Testing online seminar",
            start_date=now + timezone.timedelta(days=1),
            end_date=now + timezone.timedelta(days=1, hours=2),
            location="Sengaja diisi salah",
            location_url="https://zoom.us/j/123456789",
            is_online=True,
            organizer_name="BAE Community",
            status="approved",
            created_by=self.creator,
            visibility="public"
        )
        
    def test_online_event_forces_location_to_online(self):
        self.online_event.refresh_from_db()
        self.assertEqual(self.online_event.location, "Online")

    def test_anonymous_user_cannot_see_location_url(self):
        url = reverse("events-detail", kwargs={"slug": self.online_event.slug})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["location"], "Online")
        self.assertIsNone(response.data["location_url"])

    def test_unregistered_user_cannot_see_location_url(self):
        self.client.force_authenticate(user=self.participant)
        url = reverse("events-detail", kwargs={"slug": self.online_event.slug})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data["location_url"])

    def test_registered_user_cannot_see_location_url_before_event_starts(self):
        EventRegistration.objects.create(
            event=self.online_event,
            user=self.participant,
            status="approved"
        )
        
        self.client.force_authenticate(user=self.participant)
        url = reverse("events-detail", kwargs={"slug": self.online_event.slug})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data["location_url"])

    def test_registered_user_can_see_location_url_during_event(self):
        EventRegistration.objects.create(
            event=self.online_event,
            user=self.participant,
            status="approved"
        )
        
        now = timezone.now()
        self.online_event.start_date = now - timezone.timedelta(minutes=30)
        self.online_event.end_date = now + timezone.timedelta(hours=1)
        self.online_event.save()
        
        self.client.force_authenticate(user=self.participant)
        url = reverse("events-detail", kwargs={"slug": self.online_event.slug})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["location_url"], "https://zoom.us/j/123456789")

    def test_creator_can_always_see_location_url(self):
        self.client.force_authenticate(user=self.creator)
        url = reverse("events-detail", kwargs={"slug": self.online_event.slug})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["location_url"], "https://zoom.us/j/123456789")

