from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from accounts.models import User
from campaigns.models import Campaign
from donations.models import Donation
from decimal import Decimal

class AdminDonationManagementTests(APITestCase):
    def setUp(self):
        # Create admin user
        self.admin_user = User.objects.create_user(
            username="adminuser",
            email="admin@example.com",
            password="adminpassword123",
            role="admin",
            phone="08123456780"
        )
        
        # Create regular user
        self.regular_user = User.objects.create_user(
            username="regularuser",
            email="user@example.com",
            password="userpassword123",
            role="user",
            phone="08123456781"
        )
        
        # Create a campaign
        self.campaign = Campaign.objects.create(
            title="Charity Campaign Test",
            description="Campaign description",
            category="donasi",
            target_amount=Decimal("1000000.00"),
            current_amount=Decimal("0.00"),
            created_by=self.admin_user,
            approval_status="approved"
        )
        
        # Create an existing donation
        self.existing_donation = Donation.objects.create(
            campaign=self.campaign,
            amount=Decimal("20000.00"),
            donor_name="Initial Donor",
            donor_phone="08123456789",
            payment_method="bsi",
            payment_status="pending"
        )
        
        self.list_url = reverse("admin-donation-list")
        self.detail_url = reverse("admin-donation-detail", kwargs={"pk": self.existing_donation.id})

    def test_admin_can_view_donations(self):
        """Admin is authorized to fetch donations list."""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Result can be a list or paginated list
        results = response.data.get("results") if isinstance(response.data, dict) else response.data
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["donor_name"], "Initial Donor")

    def test_regular_user_cannot_view_donations(self):
        """Regular user is forbidden from listing donations at the admin endpoint."""
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_create_manual_donation(self):
        """Admin can manually add a donation, and it should be auto-verified."""
        self.client.force_authenticate(user=self.admin_user)
        data = {
            "campaign_id": self.campaign.id,
            "donor_name": "Manual Donor",
            "donor_phone": "08999999999",
            "amount": "50000.00",
            "payment_method": "cash",
            "is_anonymous": False,
            "message": "Manual donation message"
        }
        response = self.client.post(self.list_url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Check database
        donation = Donation.objects.get(donor_name="Manual Donor")
        self.assertEqual(donation.payment_status, "verified")
        self.assertEqual(donation.amount, Decimal("50000.00"))
        
        # Verify campaign balance updated (initial pending 20k, verified 50k -> current_amount=50k)
        self.campaign.refresh_from_db()
        self.assertEqual(self.campaign.current_amount, Decimal("50000.00"))

    def test_regular_user_cannot_create_manual_donation(self):
        """Regular user cannot create a donation through the admin endpoint."""
        self.client.force_authenticate(user=self.regular_user)
        data = {
            "campaign_id": self.campaign.id,
            "donor_name": "Manual Donor",
            "donor_phone": "08999999999",
            "amount": "50000.00",
            "payment_method": "cash",
            "is_anonymous": False
        }
        response = self.client.post(self.list_url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_delete_donation(self):
        """Admin can delete a donation record."""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.delete(self.detail_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Donation.objects.filter(id=self.existing_donation.id).exists())

    def test_regular_user_cannot_delete_donation(self):
        """Regular user is forbidden from deleting a donation record."""
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.delete(self.detail_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(Donation.objects.filter(id=self.existing_donation.id).exists())
