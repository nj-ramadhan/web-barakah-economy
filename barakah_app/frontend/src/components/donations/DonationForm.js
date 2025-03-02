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
    { id: 'bsi', name: 'BSI', logo: '/images/bsi-logo.png' },
    { id: 'bjb', name: 'BJB Syariah', logo: '/images/bjb-logo.png' },
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