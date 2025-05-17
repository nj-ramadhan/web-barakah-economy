# Super App for Barakah Economy Society
A step-by-step guide to build a crowdfunding website using Django and React, based on the layout shown in the reference images.
Building a Crowdfunding Platform with Django and React


# Step 1: Project Setup 
## Backend (Django)
### Create virtual environment
    python -m venv env
    
#### On Linux: 
    source env/bin/activate  
#### On Windows: 
    env\Scripts\activate

### Install dependencies
    pip install django djangorestframework django-cors-headers Pillow

### Start project
    django-admin startproject barakah_app
    cd barakah_app

### Create apps
    python manage.py startapp accounts
    python manage.py startapp campaigns
    python manage.py startapp donations
    python manage.py startapp payments


## Frontend (React)
### Create React app
    npx create-react-app frontend
    cd frontend

### Install dependencies
    npm install axios react-router-dom formik yup tailwindcss styled-components
    npm install @mui/material @emotion/react @emotion/styled

# Step 2: Database Design
## Create models in Django:
    # accounts/models.py
    from django.db import models
    from django.contrib.auth.models import AbstractUser
    
    class User(AbstractUser):
        phone = models.CharField(max_length=15, blank=True)
        is_anonymous_donor = models.BooleanField(default=False)


    # campaigns/models.py
    from django.db import models
    
    class Campaign(models.Model):
        CATEGORY_CHOICES = [
            ('dhuafa', 'Peduli Dhuafa'),
            ('yatim', 'Peduli Anak Yatim'),
            ('quran', 'Wakaf Mushaf Al Quran'),
            ('qurban', 'Qurban Peduli'),
            ('palestine', 'Bantuan Palestina'),
            ('education', 'Bantuan Pendidikan'),
            ('iftar', 'Berbagi Iftar'),
            ('jumat', 'Jumat Berkah'),
        ]
    
        title = models.CharField(max_length=100)
        description = models.TextField()
        category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
        thumbnail = models.ImageField(upload_to='campaign_images/')
        target_amount = models.DecimalField(max_digits=12, decimal_places=2)
        current_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
        is_active = models.BooleanField(default=True)
        created_at = models.DateTimeField(auto_now_add=True)

    
    # donations/models.py
    from django.db import models
    from accounts.models import User
    from campaigns.models import Campaign
    
    class Donation(models.Model):
        PAYMENT_METHOD_CHOICES = [
            ('bsi', 'Bank Syariah Indonesia'),
            ('bjb', 'Bank Jabar Banten Syariah'),
        ]
        
        campaign = models.ForeignKey(Campaign, on_delete=models.CASCADE)
        donor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
        amount = models.DecimalField(max_digits=12, decimal_places=2)
        donor_name = models.CharField(max_length=100)
        donor_phone = models.CharField(max_length=15)
        donor_email = models.EmailField(blank=True, null=True)
        is_anonymous = models.BooleanField(default=False)
        message = models.TextField(blank=True)
        payment_method = models.CharField(max_length=10, choices=PAYMENT_METHOD_CHOICES)
        payment_status = models.CharField(max_length=20, default='pending')
        created_at = models.DateTimeField(auto_now_add=True)
        
# Step 3: Django REST API Setup
## Configure settings
    # crowdfunding_platform/settings.py
    INSTALLED_APPS = [
        # Django apps
        'django.contrib.admin',
        'django.contrib.auth',
        'django.contrib.contenttypes',
        'django.contrib.sessions',
        'django.contrib.messages',
        'django.contrib.staticfiles',
        
        # Third-party apps
        'rest_framework',
        'corsheaders',
        
        # Local apps
        'accounts',
        'campaigns',
        'donations',
        'payments',
    ]

    MIDDLEWARE = [
        'corsheaders.middleware.CorsMiddleware',
        # Other middleware...
    ]
    
    CORS_ALLOWED_ORIGINS = [
        'http://localhost:3000',
    ]
    
    REST_FRAMEWORK = {
        'DEFAULT_AUTHENTICATION_CLASSES': [
            'rest_framework.authentication.SessionAuthentication',
            'rest_framework_simplejwt.authentication.JWTAuthentication',
        ],
    }
    
    AUTH_USER_MODEL = 'accounts.User'
    
    MEDIA_URL = '/media/'
    MEDIA_ROOT = BASE_DIR / 'media'
    
# Step 4: Create API Serializers and Views Serializers
    # campaigns/serializers.py
    from rest_framework import serializers
    from .models import Campaign
    
    class CampaignSerializer(serializers.ModelSerializer):
        class Meta:
            model = Campaign
            fields = '__all__'
    
    # donations/serializers.py
    from rest_framework import serializers
    from .models import Donation
    
    class DonationSerializer(serializers.ModelSerializer):
        class Meta:
            model = Donation
            fields = '__all__'
    Views
    pythonCopy# campaigns/views.py
    from rest_framework import viewsets
    from .models import Campaign
    from .serializers import CampaignSerializer
    
    class CampaignViewSet(viewsets.ModelViewSet):
        queryset = Campaign.objects.all()
        serializer_class = CampaignSerializer
        
        def get_queryset(self):
            queryset = Campaign.objects.all()
            category = self.request.query_params.get('category', None)
            if category:
                queryset = queryset.filter(category=category)
            return queryset

    # donations/views.py
    from rest_framework import viewsets, status
    from rest_framework.response import Response
    from .models import Donation
    from .serializers import DonationSerializer
    
    class DonationViewSet(viewsets.ModelViewSet):
        queryset = Donation.objects.all()
        serializer_class = DonationSerializer
        
        def create(self, request, *args, **kwargs):
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            self.perform_create(serializer)
            
            # Update campaign's current amount
            donation = serializer.instance
            campaign = donation.campaign
            campaign.current_amount += donation.amount
            campaign.save()
            
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
# Step 5: URL Configuration
    # crowdfunding_platform/urls.py
    from django.contrib import admin
    from django.urls import path, include
    from django.conf import settings
    from django.conf.urls.static import static
    from rest_framework.routers import DefaultRouter
    from campaigns.views import CampaignViewSet
    from donations.views import DonationViewSet
    
    router = DefaultRouter()
    router.register(r'campaigns', CampaignViewSet)
    router.register(r'donations', DonationViewSet)
    
    urlpatterns = [
        path('admin/', admin.site.urls),
        path('api/', include(router.urls)),
        path('api/auth/', include('accounts.urls')),
    ] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    
# Step 6: React Component Structure
Create the following component structure:

    frontend/
    └── src/
        ├── components/
        │   ├── layout/
        │   │   ├── Header.js
        │   │   ├── Footer.js
        │   │   └── Navigation.js
        │   ├── campaigns/
        │   │   ├── CampaignCard.js
        │   │   ├── CampaignGrid.js
        │   │   ├── CampaignDetails.js
        │   │   └── CampaignSlider.js
        │   └── donations/
        │       ├── DonationForm.js
        │       ├── PaymentMethod.js
        │       └── DonationPresets.js
        ├── pages/
        │   ├── Home.js
        │   ├── CampaignPage.js
        │   ├── DonationPage.js
        │   ├── PaymentPage.js
        │   └── AboutUs.js
        ├── services/
        │   ├── api.js
        │   ├── auth.js
        │   └── campaigns.js
        ├── App.js
        └── index.js
        
# Step 7: Implement Key React Components
## Home Page with Campaign Grid
    // src/pages/Home.js
    import React, { useEffect, useState } from 'react';
    import CampaignSlider from '../components/campaigns/CampaignSlider';
    import CampaignGrid from '../components/campaigns/CampaignGrid';
    import { getCampaigns } from '../services/campaigns';
    
    const Home = () => {
      const [campaigns, setCampaigns] = useState([]);
      const [isLoading, setIsLoading] = useState(true);
    
      useEffect(() => {
        const fetchCampaigns = async () => {
          try {
            const data = await getCampaigns();
            setCampaigns(data);
          } catch (error) {
            console.error('Error fetching campaigns:', error);
          } finally {
            setIsLoading(false);
          }
        };
    
        fetchCampaigns();
      }, []);
    
      return (
        <div className="home-container">
          <CampaignSlider 
            featuredCampaigns={campaigns.filter(c => c.category === 'dhuafa')} 
          />
          
          <div className="search-bar">
            <input 
              type="text" 
              placeholder="cari program" 
              className="search-input"
            />
          </div>
          
          <CampaignGrid 
            campaigns={campaigns} 
            isLoading={isLoading} 
          />
        </div>
      );
    };
    
    export default Home;
    
## Campaign Card Component
    // src/components/campaigns/CampaignCard.js
    import React from 'react';
    import { Link } from 'react-router-dom';
    import styled from 'styled-components';
    
    const Card = styled.div`
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      margin-bottom: 20px;
      background: white;
    `;
    
    const CardImage = styled.img`
      width: 100%;
      height: 180px;
      object-fit: cover;
    `;
    
    const CardContent = styled.div`
      padding: 15px;
    `;
    
    const CardTitle = styled.h3`
      font-size: 18px;
      margin-bottom: 10px;
      font-weight: bold;
      color: #222;
    `;
    
    const DonateButton = styled.button`
      background-color: #0C6E43;
      color: white;
      border: none;
      border-radius: 4px;
      padding: 8px 12px;
      font-weight: bold;
      width: 100%;
      cursor: pointer;
      text-transform: uppercase;
      font-size: 14px;
      
      &:hover {
        background-color: #07522F;
      }
    `;
    
    const CampaignCard = ({ campaign }) => {
      return (
        <Card>
          <CardImage 
            src={campaign.thumbnail} 
            alt={campaign.title} 
          />
          <CardContent>
            <CardTitle>{campaign.title}</CardTitle>
            <Link to={`/donate/${campaign.id}`}>
              <DonateButton>DONASI SEKARANG</DonateButton>
            </Link>
          </CardContent>
        </Card>
      );
    };
    
    export default CampaignCard;
    Donation Form Component
    jsxCopy// src/components/donations/DonationForm.js
    import React, { useState } from 'react';
    import { useParams } from 'react-router-dom';
    import { useFormik } from 'formik';
    import * as Yup from 'yup';
    import styled from 'styled-components';
    import DonationPresets from './DonationPresets';
    import PaymentMethod from './PaymentMethod';
    import { createDonation } from '../../services/donations';
    
    const FormContainer = styled.div`
      max-width: 500px;
      margin: 0 auto;
      padding: 20px;
    `;
    
    const FormSection = styled.div`
      margin-bottom: 25px;
    `;
    
    const SectionTitle = styled.h3`
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 15px;
      text-align: center;
    `;
    
    const Input = styled.input`
      width: 100%;
      padding: 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      margin-bottom: 15px;
    `;
    
    const TextArea = styled.textarea`
      width: 100%;
      padding: 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      margin-bottom: 15px;
      min-height: 100px;
    `;
    
    const SubmitButton = styled.button`
      background-color: #0C6E43;
      color: white;
      border: none;
      border-radius: 4px;
      padding: 15px;
      font-weight: bold;
      width: 100%;
      cursor: pointer;
      font-size: 16px;
      
      &:hover {
        background-color: #07522F;
      }
    `;
    
    const DonationForm = ({ campaign }) => {
      const { id } = useParams();
      const [selectedPayment, setSelectedPayment] = useState('bsi');
      
      const presetAmounts = [
        { label: 'Rp 25 rb', value: 25000 },
        { label: 'Rp 50 rb', value: 50000 },
        { label: 'Rp 100 rb', value: 100000 },
        { label: 'Rp 200 rb', value: 200000 },
        { label: 'Rp 500 rb', value: 500000 },
        { label: 'Rp 1 jt', value: 1000000 },
        { label: 'Rp 2,5 jt', value: 2500000 },
        { label: 'Rp 5 jt', value: 5000000 },
        { label: 'Rp 10 jt', value: 10000000 },
        { label: 'Rp 20 jt', value: 20000000 },
        { label: 'Rp 50 jt', value: 50000000 },
        { label: 'Nominal Lainnya', value: 'custom' },
      ];
      
      const paymentMethods = [
        { id: 'bsi', name: 'Bank Syariah Indonesia', logo: '/images/bsi-logo.png' },
        { id: 'bjb', name: 'Bank Jabar Banten Syariah', logo: '/images/bjb-logo.png' },
      ];
    
      const formik = useFormik({
        initialValues: {
          amount: 25000,
          customAmount: '',
          fullName: '',
          isAnonymous: false,
          phone: '',
          email: '',
          message: '',
        },
        validationSchema: Yup.object({
          amount: Yup.number().when('amount', {
            is: 'custom',
            then: () => Yup.number(),
            otherwise: () => Yup.number().required('Jumlah donasi diperlukan'),
          }),
          customAmount: Yup.string().when('amount', {
            is: 'custom',
            then: () => Yup.string().required('Masukkan nominal donasi'),
            otherwise: () => Yup.string(),
          }),
          fullName: Yup.string().required('Nama lengkap diperlukan'),
          phone: Yup.string().required('Nomor telepon diperlukan'),
        }),
        onSubmit: async (values) => {
          const donationData = {
            campaign: id,
            amount: values.amount === 'custom' ? parseInt(values.customAmount) : values.amount,
            donor_name: values.fullName,
            is_anonymous: values.isAnonymous,
            donor_phone: values.phone,
            donor_email: values.email || null,
            message: values.message,
            payment_method: selectedPayment,
          };
          
          try {
            const response = await createDonation(donationData);
            // Redirect to payment confirmation page
            window.location.href = `/payment-confirmation/${response.id}`;
          } catch (error) {
            console.error('Error creating donation:', error);
          }
        },
      });
    
      return (
        <FormContainer>
          <form onSubmit={formik.handleSubmit}>
            <FormSection>
              <SectionTitle>Donasi Terbaik Anda</SectionTitle>
              <DonationPresets 
                presets={presetAmounts}
                selectedAmount={formik.values.amount}
                onChange={(value) => formik.setFieldValue('amount', value)}
              />
              
              {formik.values.amount === 'custom' && (
                <div className="custom-amount-input">
                  <div className="input-prefix">Rp</div>
                  <Input
                    type="number"
                    placeholder="Masukan Nominal"
                    name="customAmount"
                    value={formik.values.customAmount}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                  />
                </div>
              )}
            </FormSection>
    
            <FormSection>
              <SectionTitle>Metode Pembayaran</SectionTitle>
              <PaymentMethod 
                methods={paymentMethods}
                selectedMethod={selectedPayment}
                onChange={setSelectedPayment}
              />
            </FormSection>
    
            <FormSection>
              <SectionTitle>Data Anda</SectionTitle>
              <Input
                type="text"
                placeholder="Nama Lengkap Anda"
                name="fullName"
                value={formik.values.fullName}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
              />
              {formik.touched.fullName && formik.errors.fullName && (
                <div className="error">{formik.errors.fullName}</div>
              )}
              
              <div className="anonymity-toggle">
                <label>
                  <input
                    type="checkbox"
                    name="isAnonymous"
                    checked={formik.values.isAnonymous}
                    onChange={formik.handleChange}
                  />
                  Sembunyikan Nama Anda (Hamba Allah)
                </label>
              </div>
              
              <Input
                type="tel"
                placeholder="No Whatsapp atau Handphone"
                name="phone"
                value={formik.values.phone}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
              />
              {formik.touched.phone && formik.errors.phone && (
                <div className="error">{formik.errors.phone}</div>
              )}
              
              <Input
                type="email"
                placeholder="Email Anda (tidak wajib)"
                name="email"
                value={formik.values.email}
                onChange={formik.handleChange}
              />
              
              <TextArea
                placeholder="Pesan atau do'a Anda (tidak wajib)"
                name="message"
                value={formik.values.message}
                onChange={formik.handleChange}
              />
            </FormSection>
            
            <SubmitButton type="submit">
              Lanjutkan Pembayaran
            </SubmitButton>
          </form>
        </FormContainer>
      );
    };
    
    export default DonationForm;
    
# Step 8: API Service Setup
    // src/services/api.js
    import axios from 'axios';
    
    const API_URL = 'http://localhost:8000/api';
    
    const api = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    // Request interceptor for adding auth token
    api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
    
    export default api;
    
    // src/services/campaigns.js
    import api from './api';
    
    export const getCampaigns = async (category = '') => {
      try {
        const params = category ? { category } : {};
        const response = await api.get('/campaigns/', { params });
        return response.data;
      } catch (error) {
        console.error('Error fetching campaigns:', error);
        throw error;
      }
    };
    
    export const getCampaignById = async (id) => {
      try {
        const response = await api.get(`/campaigns/${id}/`);
        return response.data;
      } catch (error) {
        console.error(`Error fetching campaign with id ${id}:`, error);
        throw error;
      }
    };
    
    // src/services/donations.js
    import api from './api';
    
    export const createDonation = async (donationData) => {
      try {
        const response = await api.post('/donations/', donationData);
        return response.data;
      } catch (error) {
        console.error('Error creating donation:', error);
        throw error;
      }
    };
    
# Step 9: App Routing
    // src/App.js
    import React from 'react';
    import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
    import Header from './components/layout/Header';
    import Footer from './components/layout/Footer';
    import Home from './pages/Home';
    import CampaignPage from './pages/CampaignPage';
    import DonationPage from './pages/DonationPage';
    import PaymentPage from './pages/PaymentPage';
    import AboutUs from './pages/AboutUs';
    import './App.css';
    
    function App() {
      return (
        <Router>
          <div className="app">
            <Header />
            <main className="main-content">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/campaign/:id" element={<CampaignPage />} />
                <Route path="/donate/:id" element={<DonationPage />} />
                <Route path="/payment-confirmation/:id" element={<PaymentPage />} />
                <Route path="/about" element={<AboutUs />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </Router>
      );
    }
    
    export default App;
    Step 10: Styling with CSS/Tailwind
    Create a basic style setup using Tailwind:
    bashCopy# Initialize Tailwind
    npx tailwindcss init
    Update the tailwind.config.js:
    javascriptCopy// tailwind.config.js
    module.exports = {
      content: [
        "./src/**/*.{js,jsx,ts,tsx}",
      ],
      theme: {
        extend: {
          colors: {
            primary: {
              light: '#1E9A6E',
              DEFAULT: '#0C6E43',
              dark: '#07522F',
            },
            secondary: {
              light: '#FFE066',
              DEFAULT: '#FFD700',
              dark: '#E6C200',
            },
          },
          fontFamily: {
            sans: ['Roboto', 'sans-serif'],
          },
        },
      },
      plugins: [],
    }
    Step 11: Database Migrations and Initial Data
    bashCopy# Create migrations
    python manage.py makemigrations
    
    # Apply migrations
    python manage.py migrate
    
    # Create superuser
    python manage.py createsuperuser
    Create a data seeder script:
    pythonCopy# campaigns/management/commands/seed_campaigns.py
    from django.core.management.base import BaseCommand
    from campaigns.models import Campaign
    from django.core.files.base import ContentFile
    import os
    import requests
    from io import BytesIO
    
    class Command(BaseCommand):
        help = 'Seeds the database with initial campaigns'
    
        def handle(self, *args, **options):
            self.stdout.write('Seeding campaigns...')
            
            campaigns_data = [
                {
                    'title': 'Peduli Dhuafa',
                    'description': 'Program bantuan untuk kaum dhuafa dan masyarakat kurang mampu',
                    'category': 'dhuafa',
                    'target_amount': 100000000,
                    'current_amount': 0,
                    'image_url': 'https://example.com/images/dhuafa.jpg',
                },
                {
                    'title': 'Peduli Anak Yatim',
                    'description': 'Program bantuan untuk anak yatim dan piatu',
                    'category': 'yatim',
                    'target_amount': 75000000,
                    'current_amount': 0,
                    'image_url': 'https://example.com/images/yatim.jpg',
                },
                # Add more campaigns...
            ]
            
            for campaign_data in campaigns_data:
                image_url = campaign_data.pop('image_url')
                campaign = Campaign(**campaign_data)
                
                # Download and save image
                try:
                    response = requests.get(image_url)
                    if response.status_code == 200:
                        image_name = os.path.basename(image_url)
                        campaign.thumbnail.save(
                            image_name,
                            ContentFile(response.content),
                            save=False
                        )
                except Exception as e:
                    self.stdout.write(self.style.WARNING(f"Failed to download image: {e}"))
                
                campaign.save()
                self.stdout.write(self.style.SUCCESS(f'Added campaign: {campaign.title}'))
            
            self.stdout.write(self.style.SUCCESS('Successfully seeded campaigns'))
            
# Step 12: Running the Development Servers
## Run Django server
    python manage.py runserver
## or Run Django server with https    
    python manage.py runserver_plus --cert-file localhost.pem --key-file localhost-key.pem

## In a separate terminal, run React dev server
    cd frontend
    npm start

# Step 13: Implementing Mobile Responsiveness
Ensure the site is responsive by adding proper media queries:
    /* src/index.css */
    @media (max-width: 768px) {
      .donation-presets {
        grid-template-columns: repeat(3, 1fr);
      }
      
      .campaign-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    
    @media (max-width: 480px) {
      .donation-presets {
        grid-template-columns: repeat(2, 1fr);
      }
      
      .campaign-grid {
        grid-template-columns: 1fr;
      }
      
      .header {
        padding: 10px;
      }
    }

# Step 14: Testing and Deployment
## Testing

Test all API endpoints using Postman or Django's test client
Test React components with React Testing Library
Check mobile responsiveness on various devices

## Deployment

Set up a production database (PostgreSQL recommended)
Configure Django settings for production
Build React app: npm run build
Set up a web server (Nginx/Apache)
Use Gunicorn for Django in production
Configure HTTPS with Let's Encrypt


# Step 15: Production
## Clone your repository in the VPS:
    cd /var/www
    git clone https://github.com/yourusername/youproject.git

## Set up Backend (Django):
    cd /var/www/sdi-web-django-react-cf-ypmnpeduli/crowdfunding_platform/backend

## Create virtual environment
    python3 -m venv env
    source env/bin/activate

## Install dependencies
    pip install -r requirements.txt
    pip install gunicorn psycopg2-binary

## Collect static files
    python manage.py collectstatic

## Set up Frontend (React):
    cd /var/www/sdi-web-django-react-cf-ypmnpeduli/crowdfunding_platform/frontend

## Install dependencies and build
    npm install
    npm run build

## Configure Gunicorn:
    sudo nano /etc/systemd/system/gunicorn.service
    
    Add:
    [Unit]
    Description=gunicorn daemon
    Requires=gunicorn.socket
    After=network.target
    
    [Service]
    User=www-data
    Group=www-data
    WorkingDirectory=/var/www/sdi-web-django-react-cf-ypmnpeduli/crowdfunding_platform/backend
    ExecStart=/var/www/sdi-web-django-react-cf-ypmnpeduli/crowdfunding_platform/backend/env/bin/gunicorn \
              --access-logfile - \
              --workers 3 \
              --bind unix:/run/gunicorn.sock \
              crowdfunding_platform.wsgi:application
    
    [Install]
    WantedBy=multi-user.target

## Create Gunicorn Socket:

    sudo nano /etc/systemd/system/gunicorn.socket
    
    [Unit]
    Description=gunicorn socket
    
    [Socket]
    ListenStream=/run/gunicorn.sock
    
    [Install]
    WantedBy=sockets.target

## Start Gunicorn:
    sudo systemctl start gunicorn.socket
    sudo systemctl enable gunicorn.socket

## Configure Nginx:
    sudo nano /etc/nginx/sites-available/ypmn-peduli

    server {
        listen 80;
        server_name ypmn-peduli.org www.ypmn-peduli.org;
    
        location = /favicon.ico { access_log off; log_not_found off; }
        
        # Serve static files
        location /static/ {
            root /var/www/sdi-web-django-react-cf-ypmnpeduli/crowdfunding_platform/backend;
        }
    
        location /media/ {
            root /var/www/sdi-web-django-react-cf-ypmnpeduli/crowdfunding_platform/backend;
        }
    
        # Serve React frontend
        location / {
            root /var/www/sdi-web-django-react-cf-ypmnpeduli/crowdfunding_platform/frontend/build;
            try_files $uri $uri/ /index.html;
        }
    
        # Backend API endpoints
        location /api/ {
            include proxy_params;
            proxy_pass http://unix:/run/gunicorn.sock;
        }
    
        location /admin/ {
            include proxy_params;
            proxy_pass http://unix:/run/gunicorn.sock;
        }
    }

## Enable the Site:
    sudo ln -s /etc/nginx/sites-available/ypmn-peduli /etc/nginx/sites-enabled
    sudo nginx -t
    sudo systemctl restart nginx

## Setup SSL with Let's Encrypt:
    sudo apt install certbot python3-certbot-nginx
    sudo certbot --nginx -d ypmn-peduli.org -d www.ypmn-peduli.org

## Update Django Settings (backend/settings.py):

    DEBUG = False
    
    ALLOWED_HOSTS = ['ypmn-peduli.org', 'www.ypmn-peduli.org']
    
    STATIC_URL = '/static/'
    STATIC_ROOT = '/var/www/sdi-web-django-react-cf-ypmnpeduli/crowdfunding_platform/backend/static/'
    
    MEDIA_URL = '/media/'
    MEDIA_ROOT = '/var/www/sdi-web-django-react-cf-ypmnpeduli/crowdfunding_platform/backend/media/'
    
    CORS_ALLOWED_ORIGINS = [
        "https://ypmn-peduli.org",
        "https://www.ypmn-peduli.org",
    ]

## Set proper permissions:
    sudo chown -R www-data:www-data /var/www/sdi-web-django-react-cf-ypmnpeduli
    sudo chmod -R 755 /var/www/sdi-web-django-react-cf-ypmnpeduli

## Restart all services:
    sudo systemctl restart gunicorn
    sudo systemctl restart nginx

## Check status and logs if there are issues:
    sudo systemctl status gunicorn
    sudo systemctl status nginx
    sudo tail -f /var/log/nginx/error.log

Make sure your domain's DNS is properly configured to point to your VPS IP address. After following these steps, your website should be accessible at https://ypmn-peduli.org.
If you encounter any specific errors, let me know the error message and I can help you troubleshoot!

# Deploy Multiple Web App
To deploy multiple web app both of your websites (ypmn-peduli.org and barakah-economy.com) on a single VPS using Gunicorn and Nginx, follow these detailed instructions. I'll guide you step-by-step, including cloning the repositories, setting up the backend and frontend, configuring Gunicorn and Nginx, and ensuring everything runs smoothly.

## 1. Prerequisites
Before starting, ensure your VPS has the following:
    - Ubuntu/Debian (or any Linux distribution).
    - Python 3.x installed.
    - Node.js (for building the React frontend).
    - Git installed.
    - Nginx installed.
    - PostgreSQL/MySQL (or any database you're using).

If not, install them:
    sudo apt update
    sudo apt install python3 python3-pip python3-venv nodejs npm git nginx

## 2. Clone the Repositories
Create a directory for your websites and clone the repositories.
    cd /var/www

### Clone the first website (ypmn-peduli.org)
    sudo git clone https://github.com/nj-ramadhan/sdi-web-django-react-cf-ypmnpeduli.git ypmn-peduli

### Clone the second website (barakah-economy.com)
    sudo git clone https://github.com/nj-ramadhan/sdi-web-django-react-sa-bae.git barakah-economy

## 3. Set Up the Backend (Django)
For each website, set up the Django backend.

### For ypmn-peduli.org:
    cd /var/www/ypmn-peduli/crowdfunding_platform/backend

#### Create a virtual environment
    python3 -m venv venv
    source venv/bin/activate

#### Install dependencies
    pip install -r requirements.txt

#### Set up the database (replace with your database settings)
    python manage.py migrate

#### Create a superuser (optional)
    python manage.py createsuperuser

#### Test the Django development server
    python manage.py runserver

### For barakah-economy.com:
    cd /var/www/barakah-economy/barakah_app/backend

#### Create a virtual environment
    python3 -m venv venv
    source venv/bin/activate

#### Install dependencies
    pip install -r requirements.txt

#### Set up the database (replace with your database settings)
    python manage.py migrate

#### Create a superuser (optional)
    python manage.py createsuperuser

#### Test the Django development server
    python manage.py runserver


## 4. Set Up the Frontend (React)
For each website, build the React frontend.

### For ypmn-peduli.org:
    cd /var/www/ypmn-peduli/crowdfunding_platform/frontend

#### Install dependencies
    npm install

#### Build the React app
    npm run build

### For barakah-economy.com:
    cd /var/www/barakah-economy/barakah_app/frontend

#### Install dependencies
    npm install

#### Build the React app
    npm run build

## 5. Configure Gunicorn
Install Gunicorn and create systemd service files to run the Django apps.

### For ypmn-peduli.org:
Install Gunicorn:
    cd /var/www/ypmn-peduli/crowdfunding_platform/backend
    pip install gunicorn

Create a systemd service file (/etc/systemd/system/ypmn-peduli.service):

ini
Copy
[Unit]
Description=Gunicorn service for ypmn-peduli.org
After=network.target

[Service]
User=your_user
Group=www-data
WorkingDirectory=/var/www/ypmn-peduli/crowdfunding_platform/backend
ExecStart=/var/www/ypmn-peduli/crowdfunding_platform/backend/venv/bin/gunicorn --workers 3 --bind unix:/tmp/ypmn-peduli.sock crowdfunding_platform.wsgi:application

[Install]
WantedBy=multi-user.target
Enable and start the service:

bash
Copy
sudo systemctl enable ypmn-peduli
sudo systemctl start ypmn-peduli
For barakah-economy.com:
Install Gunicorn:

bash
Copy
cd /var/www/barakah-economy/barakah_app/backend
pip install gunicorn
Create a systemd service file (/etc/systemd/system/barakah-economy.service):

ini
Copy
[Unit]
Description=Gunicorn service for barakah-economy.com
After=network.target

[Service]
User=your_user
Group=www-data
WorkingDirectory=/var/www/barakah-economy/barakah_app/backend
ExecStart=/var/www/barakah-economy/barakah_app/backend/venv/bin/gunicorn --workers 3 --bind unix:/tmp/barakah-economy.sock barakah_app.wsgi:application

[Install]
WantedBy=multi-user.target
Enable and start the service:

bash
Copy
sudo systemctl enable barakah-economy
sudo systemctl start barakah-economy
6. Configure Nginx
Set up Nginx to serve both websites.

For ypmn-peduli.org:
Create an Nginx configuration file (/etc/nginx/sites-available/ypmn-peduli):

nginx
Copy
server {
    listen 80;
    server_name ypmn-peduli.org www.ypmn-peduli.org;

    location / {
        proxy_pass http://unix:/tmp/ypmn-peduli.sock;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /static/ {
        alias /var/www/ypmn-peduli/crowdfunding_platform/backend/static/;
    }

    location /media/ {
        alias /var/www/ypmn-peduli/crowdfunding_platform/backend/media/;
    }
}
Enable the site:

bash
Copy
sudo ln -s /etc/nginx/sites-available/ypmn-peduli /etc/nginx/sites-enabled/
For barakah-economy.com:
Create an Nginx configuration file (/etc/nginx/sites-available/barakah-economy):

nginx
Copy
server {
    listen 80;
    server_name barakah-economy.com www.barakah-economy.com;

    location / {
        proxy_pass http://unix:/tmp/barakah-economy.sock;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /static/ {
        alias /var/www/barakah-economy/barakah_app/backend/static/;
    }

    location /media/ {
        alias /var/www/barakah-economy/barakah_app/backend/media/;
    }
}
Enable the site:

bash
Copy
sudo ln -s /etc/nginx/sites-available/barakah-economy /etc/nginx/sites-enabled/
Test and reload Nginx:

bash
Copy
sudo nginx -t
sudo systemctl reload nginx
7. Secure with SSL (Optional but Recommended)
Use Let's Encrypt to secure your sites:

bash
Copy
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d ypmn-peduli.org -d www.ypmn-peduli.org
sudo certbot --nginx -d barakah-economy.com -d www.barakah-economy.com
8. Verify Deployment
Visit your domains in a browser:

http://ypmn-peduli.org

http://barakah-economy.com

Ensure both websites are working correctly.
```
sdi-web-django-react-sa-bae
├─ barakah_app
│  ├─ backend
│  │  ├─ accounts
│  │  │  ├─ admin.py
│  │  │  ├─ apps.py
│  │  │  ├─ migrations
│  │  │  │  ├─ 0001_initial.py
│  │  │  │  └─ __init__.py
│  │  │  ├─ models.py
│  │  │  ├─ tests.py
│  │  │  ├─ views.py
│  │  │  └─ __init__.py
│  │  ├─ barakah_app
│  │  │  ├─ asgi.py
│  │  │  ├─ settings.py
│  │  │  ├─ urls.py
│  │  │  ├─ wsgi.py
│  │  │  └─ __init__.py
│  │  ├─ campaigns
│  │  │  ├─ admin.py
│  │  │  ├─ apps.py
│  │  │  ├─ migrations
│  │  │  │  ├─ 0001_initial.py
│  │  │  │  ├─ 0002_alter_campaign_description_alter_update_description.py
│  │  │  │  └─ __init__.py
│  │  │  ├─ models.py
│  │  │  ├─ serializers.py
│  │  │  ├─ tests.py
│  │  │  ├─ views.py
│  │  │  └─ __init__.py
│  │  ├─ courses
│  │  │  ├─ admin.py
│  │  │  ├─ apps.py
│  │  │  ├─ migrations
│  │  │  │  ├─ 0001_initial.py
│  │  │  │  ├─ 0002_course_duration_alter_course_category.py
│  │  │  │  └─ __init__.py
│  │  │  ├─ models.py
│  │  │  ├─ serializers.py
│  │  │  ├─ tests.py
│  │  │  ├─ views.py
│  │  │  └─ __init__.py
│  │  ├─ donations
│  │  │  ├─ admin.py
│  │  │  ├─ apps.py
│  │  │  ├─ migrations
│  │  │  │  ├─ 0001_initial.py
│  │  │  │  ├─ 0002_alter_donation_payment_method.py
│  │  │  │  └─ __init__.py
│  │  │  ├─ models.py
│  │  │  ├─ serializers.py
│  │  │  ├─ signals.py
│  │  │  ├─ tests.py
│  │  │  ├─ urls.py
│  │  │  ├─ views.py
│  │  │  └─ __init__.py
│  │  ├─ manage.py
│  │  ├─ payments
│  │  │  ├─ admin.py
│  │  │  ├─ apps.py
│  │  │  ├─ migrations
│  │  │  │  └─ __init__.py
│  │  │  ├─ models.py
│  │  │  ├─ tests.py
│  │  │  ├─ urls.py
│  │  │  ├─ views.py
│  │  │  └─ __init__.py
│  │  ├─ products
│  │  │  ├─ admin.py
│  │  │  ├─ apps.py
│  │  │  ├─ migrations
│  │  │  │  ├─ 0001_initial.py
│  │  │  │  ├─ 0002_product_stock_product_unit_alter_product_category.py
│  │  │  │  └─ __init__.py
│  │  │  ├─ models.py
│  │  │  ├─ serializers.py
│  │  │  ├─ tests.py
│  │  │  ├─ views.py
│  │  │  └─ __init__.py
│  │  ├─ requirements.txt
│  │  └─ transactions
│  │     ├─ admin.py
│  │     ├─ apps.py
│  │     ├─ migrations
│  │     │  └─ __init__.py
│  │     ├─ models.py
│  │     ├─ tests.py
│  │     ├─ views.py
│  │     └─ __init__.py
│  └─ frontend
│     ├─ package-lock.json
│     ├─ package.json
│     ├─ postcss.config.js
│     ├─ public
│     │  ├─ favicon.ico
│     │  ├─ images
│     │  │  ├─ bjb-logo.png
│     │  │  ├─ bsi-logo.png
│     │  │  ├─ drawing.svg
│     │  │  ├─ favicon.ico
│     │  │  ├─ gopay-logo.png
│     │  │  ├─ logo.png
│     │  │  ├─ logo192.png
│     │  │  ├─ logo512.png
│     │  │  ├─ poster-open-volunteer.jpg
│     │  │  └─ poster.jpg
│     │  ├─ index.html
│     │  ├─ logo.png
│     │  ├─ logo192.png
│     │  ├─ logo512.png
│     │  ├─ manifest.json
│     │  └─ robots.txt
│     ├─ README.md
│     ├─ src
│     │  ├─ App.css
│     │  ├─ App.js
│     │  ├─ App.test.js
│     │  ├─ components
│     │  │  ├─ campaigns
│     │  │  │  ├─ CampaignCard.js
│     │  │  │  ├─ CampaignDetails.js
│     │  │  │  ├─ CampaignGrid.js
│     │  │  │  └─ CampaignSlider.js
│     │  │  ├─ donations
│     │  │  │  ├─ DonationForm.js
│     │  │  │  ├─ DonationPresets.js
│     │  │  │  └─ PaymentMethod.js
│     │  │  └─ layout
│     │  │     ├─ Footer.js
│     │  │     ├─ Header.js
│     │  │     ├─ HeaderHome.js
│     │  │     └─ Navigation.js
│     │  ├─ index.css
│     │  ├─ index.js
│     │  ├─ logo.svg
│     │  ├─ pages
│     │  │  ├─ AboutUs.js
│     │  │  ├─ admin
│     │  │  │  ├─ CampaignList.js
│     │  │  │  └─ NewCampaign.js
│     │  │  ├─ CampaignDetail.js
│     │  │  ├─ CampaignPage.js
│     │  │  ├─ CheckoutPage.js
│     │  │  ├─ ContactUs.js
│     │  │  ├─ CourseDetail.js
│     │  │  ├─ DonationPage.js
│     │  │  ├─ EcommercePage.js
│     │  │  ├─ EcoursePage.js
│     │  │  ├─ Home.js
│     │  │  ├─ JoinCoursePage.js
│     │  │  ├─ LoginPage.js
│     │  │  ├─ PaymentConfirmation.js
│     │  │  ├─ PaymentFailedPage.js
│     │  │  ├─ PaymentSuccessPage.js
│     │  │  ├─ ProductDetail.js
│     │  │  └─ RegisterPage.js
│     │  ├─ reportWebVitals.js
│     │  ├─ services
│     │  │  ├─ api.js
│     │  │  ├─ auth.js
│     │  │  ├─ campaigns.js
│     │  │  └─ donations.js
│     │  ├─ setupTests.js
│     │  ├─ styles
│     │  │  ├─ Body.css
│     │  │  ├─ Footer.css
│     │  │  ├─ Header.css
│     │  │  └─ Navigation.css
│     │  └─ utils
│     │     ├─ formatters.js
│     │     └─ validators.js
│     └─ tailwind.config.js
├─ LICENSE
├─ README.md
└─ sdi-web-django-react-sa-bae.code-workspace

```