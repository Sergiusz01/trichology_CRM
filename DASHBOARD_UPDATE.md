# Aktualizacja Dashboard - Wyświetlanie Emaili

## ✅ Co zostało zrobione:

1. **Backend już zapisuje emaile** w tabeli `EmailHistory`
2. **Endpoint `/api/email/history` już istnieje** i zwraca historię emaili

## 📝 Co trzeba zmienić w `DashboardPage.tsx`:

### 1. Dodaj pobieranie emaili (linia 61-64):

```tsx
const [patientsRes, consultationsRes, emailsRes] = await Promise.all([
    api.get('/patients'),
    api.get('/consultations'),
    api.get('/email/history', { params: { limit: 10 } }),
]);
```

### 2. Dodaj zmienną emails (po linii 67):

```tsx
const emails = emailsRes.data.emails || [];
```

### 3. Zaktualizuj licznik emaili (linia 69-73):

```tsx
// Policz tylko wysłane emaile
const sentEmailsCount = emails.filter((e: any) => e.status === 'SENT').length;

setStats({
    patientsCount: patients.length,
    consultationsCount: consultations.length,
    emailsSentCount: sentEmailsCount, // Zmień z 0 na sentEmailsCount
});
```

### 4. Dodaj emaile do aktywności (po linii 104, przed sortowaniem):

```tsx
// Dodaj ostatnie emaile
const sortedEmails = [...emails]
    .filter((e: any) => e.status === 'SENT') // Tylko wysłane
    .sort((a, b) => new Date(b.sentAt || 0).getTime() - new Date(a.sentAt || 0).getTime())
    .slice(0, 3);

sortedEmails.forEach((email: any) => {
    const patient = email.patient || patients.find((p: any) => p.id === email.patientId);
    activities.push({
        id: `email-${email.id}`,
        type: 'EMAIL',
        title: 'Wysłano email',
        subtitle: patient ? `${patient.firstName} ${patient.lastName} - ${email.subject}` : email.subject,
        date: email.sentAt || new Date().toISOString(),
        link: `/patients/${email.patientId}`,
    });
});
```

## 🎯 Rezultat:

Po tych zmianach dashboard będzie wyświetlał:
- ✅ **Prawdziwą liczbę wysłanych emaili**
- ✅ **Ostatnie wysłane emaile w sekcji "Ostatnia aktywność"**
- ✅ **Mieszankę pacjentów, konsultacji i emaili** posortowanych chronologicznie

## 📧 Jak przetestować:

1. Wyślij email do pacjenta (z formularza pacjenta lub konsultacji)
2. Odśwież dashboard
3. Zobaczysz:
   - Zwiększoną liczbę w karcie "Wiadomości"
   - Nowy wpis "Wysłano email" w ostatniej aktywności
