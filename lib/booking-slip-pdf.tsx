import React from 'react';
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer';
import { formatCurrency, formatDate } from './utils';

export interface BookingSlipData {
  bookingRef: string;
  status: string;
  source: string;
  roomName: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  children: number;
  extraBeds: number;
  roomTotal: number;
  extraBedTotal: number;
  grandTotal: number;
  createdAt: string;
  guestName: string;
  guestPhone: string;
  guestEmail: string;
  specialRequest?: string;
}

const NAVY = '#1A0B2E';
const RED = '#E30613';
const MUTED = '#666';
const HAIR = '#DDD';

const styles = StyleSheet.create({
  page: { paddingTop: 32, paddingBottom: 32, paddingHorizontal: 40, fontSize: 10, color: '#333', fontFamily: 'Helvetica' },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 12, marginBottom: 18, borderBottomWidth: 2, borderBottomColor: NAVY, borderBottomStyle: 'solid' },
  hotelName: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: NAVY },
  hotelMeta: { fontSize: 9, color: MUTED, marginTop: 3 },

  slipLabel: { fontSize: 8, color: MUTED, letterSpacing: 1.5, textAlign: 'right' },
  bookingRef: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: RED, marginTop: 2, textAlign: 'right' },
  printedOn: { fontSize: 8, color: MUTED, marginTop: 2, textAlign: 'right' },

  sectionTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: NAVY, marginBottom: 8, marginTop: 14 },

  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '50%', flexDirection: 'row', marginBottom: 6, paddingRight: 8 },
  label: { width: 100, color: MUTED, fontSize: 9 },
  value: { flex: 1, color: NAVY, fontSize: 9, fontFamily: 'Helvetica-Bold' },

  specialReq: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#EEE', borderTopStyle: 'solid' },
  specialReqLabel: { fontSize: 8, color: MUTED, letterSpacing: 1, marginBottom: 4 },
  specialReqBody: { fontSize: 10, color: '#333' },

  footer: { marginTop: 18, paddingTop: 12, borderTopWidth: 1, borderTopColor: HAIR, borderTopStyle: 'solid' },
  footerLine: { fontSize: 9, color: '#333', marginBottom: 4 },
  footerFine: { fontSize: 8, color: MUTED, marginBottom: 4 },

  signRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 28, gap: 24 },
  signBox: { flex: 1, borderTopWidth: 1, borderTopColor: '#333', borderTopStyle: 'solid', paddingTop: 4, fontSize: 8, color: MUTED },

  bold: { fontFamily: 'Helvetica-Bold' },
});

function BookingSlipDocument({ booking }: { booking: BookingSlipData }) {
  const printedAt = new Date().toLocaleString('en-PK', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const rows: Array<[string, string]> = [
    ['Booking Ref', booking.bookingRef],
    ['Status', booking.status],
    ['Room', booking.roomName],
    ['Source', booking.source],
    ['Check-in', formatDate(booking.checkIn)],
    ['Check-out', formatDate(booking.checkOut)],
    ['Nights', String(booking.nights)],
    ['Adults', String(booking.adults)],
    ['Children', String(booking.children)],
    ['Extra Beds', String(booking.extraBeds)],
    ['Room Total', formatCurrency(booking.roomTotal)],
    ['Extra Bed Total', formatCurrency(booking.extraBedTotal)],
    ['Grand Total', formatCurrency(booking.grandTotal)],
    ['Booked On', formatDate(booking.createdAt)],
  ];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.hotelName}>Hotel Elegant Executive Suites</Text>
            <Text style={styles.hotelMeta}>77-A Gulgasht Colony, Multan, Punjab 60750, Pakistan</Text>
            <Text style={styles.hotelMeta}>Phone: 0317-333-0998 · info@elegant-suite.com · elegant-suite.com</Text>
          </View>
          <View>
            <Text style={styles.slipLabel}>BOOKING SLIP</Text>
            <Text style={styles.bookingRef}>{booking.bookingRef}</Text>
            <Text style={styles.printedOn}>Printed: {printedAt}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Booking Details</Text>
        <View style={styles.grid}>
          {rows.map(([label, value]) => (
            <View key={label} style={styles.cell}>
              <Text style={styles.label}>{label}:</Text>
              <Text style={styles.value}>{value}</Text>
            </View>
          ))}
        </View>

        {booking.specialRequest ? (
          <View style={styles.specialReq}>
            <Text style={styles.specialReqLabel}>SPECIAL REQUEST</Text>
            <Text style={styles.specialReqBody}>{booking.specialRequest}</Text>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Guest Information</Text>
        <View style={styles.grid}>
          <View style={styles.cell}>
            <Text style={styles.label}>Name:</Text>
            <Text style={styles.value}>{booking.guestName}</Text>
          </View>
          <View style={styles.cell}>
            <Text style={styles.label}>Phone / WhatsApp:</Text>
            <Text style={styles.value}>{booking.guestPhone}</Text>
          </View>
          <View style={styles.cell}>
            <Text style={styles.label}>Email:</Text>
            <Text style={styles.value}>{booking.guestEmail || '—'}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerLine}>
            <Text style={styles.bold}>Payment: </Text>
            No advance payment taken. Guest pays at hotel by Visa, Mastercard or cash on check-out.
          </Text>
          <Text style={styles.footerLine}>
            <Text style={styles.bold}>Check-in: </Text>Available 24 hours   ·   <Text style={styles.bold}>Check-out: </Text>By 12:00 noon
          </Text>
          <Text style={styles.footerFine}>
            A valid CNIC (Pakistani nationals) or passport (foreign guests) is required at check-in per Pakistan hotel regulations.
          </Text>

          <View style={styles.signRow}>
            <Text style={styles.signBox}>Guest signature</Text>
            <Text style={styles.signBox}>Reception signature</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

export async function renderBookingSlipPDF(booking: BookingSlipData): Promise<Buffer> {
  return renderToBuffer(<BookingSlipDocument booking={booking} />);
}
