# 🎯 Walidacja Formularzy - Przewodnik Implementacji

## ✅ **Co Zostało Zaimplementowane:**

### **1. Pakiety Zainstalowane:**
```bash
npm install react-hook-form @hookform/resolvers zod
```

### **2. Utworzone Pliki:**
- ✅ `frontend/src/pages/PatientFormPage.tsx` - Przykład z pełną walidacją
- ✅ `frontend/src/hooks/useNotification.ts` - Hook dla toast notifications

---

## 📚 **Jak Używać w Innych Formularzach**

### **Krok 1: Zdefiniuj Schemat Walidacji**

```typescript
import { z } from 'zod';

const myFormSchema = z.object({
  name: z.string()
    .min(2, 'Nazwa musi mieć minimum 2 znaki')
    .max(100, 'Nazwa może mieć maksymalnie 100 znaków'),
  
  email: z.string()
    .email('Nieprawidłowy adres email'),
  
  age: z.number()
    .int('Wiek musi być liczbą całkowitą')
    .min(0, 'Wiek nie może być ujemny')
    .max(150, 'Wiek nie może przekraczać 150 lat')
    .optional(),
  
  phone: z.string()
    .regex(/^[0-9\s\-\+\(\)]*$/, 'Nieprawidłowy format telefonu')
    .optional(),
});

type MyFormData = z.infer<typeof myFormSchema>;
```

### **Krok 2: Użyj React Hook Form**

```typescript
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const {
  control,
  handleSubmit,
  reset,
  formState: { errors, isSubmitting },
} = useForm<MyFormData>({
  resolver: zodResolver(myFormSchema),
  defaultValues: {
    name: '',
    email: '',
    age: undefined,
    phone: '',
  },
});
```

### **Krok 3: Renderuj Pola z Walidacją**

```typescript
<Controller
  name="name"
  control={control}
  render={({ field }) => (
    <TextField
      {...field}
      fullWidth
      required
      label="Nazwa"
      error={!!errors.name}
      helperText={errors.name?.message}
    />
  )}
/>
```

### **Krok 4: Obsłuż Submit**

```typescript
import { useNotification } from '../hooks/useNotification';

const notify = useNotification();

const onSubmit = async (data: MyFormData) => {
  try {
    await api.post('/endpoint', data);
    notify.success('Dane zapisane pomyślnie!');
    navigate('/success-page');
  } catch (err: any) {
    notify.error(err.response?.data?.error || 'Błąd zapisu');
  }
};

// W JSX:
<form onSubmit={handleSubmit(onSubmit)}>
  {/* pola formularza */}
</form>
```

---

## 🎨 **Przykłady Walidacji Zod**

### **Podstawowe Typy:**

```typescript
// String
z.string()
  .min(2, 'Za krótkie')
  .max(100, 'Za długie')
  .email('Nieprawidłowy email')
  .url('Nieprawidłowy URL')
  .regex(/^[A-Z]/, 'Musi zaczynać się wielką literą')

// Number
z.number()
  .int('Musi być liczbą całkowitą')
  .positive('Musi być dodatnia')
  .min(0, 'Minimum 0')
  .max(100, 'Maksimum 100')

// Boolean
z.boolean()

// Date
z.date()
  .min(new Date('2000-01-01'), 'Data za wczesna')
  .max(new Date(), 'Data nie może być w przyszłości')

// Enum
z.enum(['MALE', 'FEMALE', 'OTHER'])

// Optional
z.string().optional()
z.string().nullable()
z.string().optional().or(z.literal(''))
```

### **Zaawansowane:**

```typescript
// Walidacja warunkowa
z.object({
  hasEmail: z.boolean(),
  email: z.string().email().optional(),
}).refine(
  (data) => !data.hasEmail || !!data.email,
  { message: 'Email jest wymagany', path: ['email'] }
);

// Custom validation
z.string().refine(
  (val) => val.length >= 8,
  { message: 'Hasło musi mieć min 8 znaków' }
);

// Transform
z.string().transform((val) => val.trim().toLowerCase());

// Preprocess
z.preprocess(
  (val) => (val === '' ? undefined : val),
  z.number().optional()
);
```

---

## 🚀 **Wzorce Użycia**

### **1. Formularz z Loading State:**

```typescript
const onSubmit = async (data: FormData) => {
  try {
    // isSubmitting automatycznie true
    await api.post('/endpoint', data);
    notify.success('Sukces!');
  } catch (err) {
    notify.error('Błąd!');
  }
  // isSubmitting automatycznie false
};

// W przycisku:
<Button
  type="submit"
  disabled={isSubmitting}
>
  {isSubmitting ? 'Zapisywanie...' : 'Zapisz'}
</Button>
```

### **2. Reset Formularza:**

```typescript
// Po zapisie
reset(); // Resetuje do defaultValues

// Ustaw nowe wartości
reset({
  name: 'Jan',
  email: 'jan@example.com',
});
```

### **3. Programatyczne Ustawianie Błędów:**

```typescript
import { setError } from 'react-hook-form';

// W catch:
if (err.response?.data?.field === 'email') {
  setError('email', {
    type: 'manual',
    message: 'Ten email już istnieje',
  });
}
```

### **4. Watch dla Zależnych Pól:**

```typescript
import { useWatch } from 'react-hook-form';

const hasEmail = useWatch({ control, name: 'hasEmail' });

// Pokaż pole email tylko gdy hasEmail === true
{hasEmail && (
  <Controller name="email" control={control} ... />
)}
```

---

## 📋 **Checklist Migracji Formularza**

### **Przed:**
```typescript
const [formData, setFormData] = useState({ name: '' });
const [errors, setErrors] = useState({});

const handleChange = (e) => {
  setFormData({ ...formData, [e.target.name]: e.target.value });
};

const handleSubmit = async (e) => {
  e.preventDefault();
  // Manualna walidacja
  if (!formData.name) {
    setErrors({ name: 'Wymagane' });
    return;
  }
  // ...
};
```

### **Po:**
```typescript
const { control, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(schema),
  defaultValues: { name: '' },
});

const onSubmit = async (data) => {
  // Dane już zwalidowane!
  await api.post('/endpoint', data);
};
```

---

## 🎯 **Które Formularze Zaktualizować:**

### **Priorytet 1 (Krytyczne):**
- ✅ `PatientFormPage.tsx` - **GOTOWE!**
- ⏳ `ConsultationFormPage.tsx` - Duży formularz
- ⏳ `LabResultFormPage.tsx` - Dużo pól numerycznych
- ⏳ `LoginPage.tsx` - Bezpieczeństwo

### **Priorytet 2 (Ważne):**
- ⏳ `CarePlanFormPage.tsx`
- ⏳ `ScalpPhotoFormPage.tsx`
- ⏳ `EmailComposePage.tsx`

### **Priorytet 3 (Opcjonalne):**
- ⏳ `UserProfilePage.tsx`
- ⏳ `EmailTemplatesPage.tsx`

---

## 🐛 **Typowe Problemy i Rozwiązania**

### **Problem: "Cannot read property 'message' of undefined"**
```typescript
// ❌ Źle:
helperText={errors.name.message}

// ✅ Dobrze:
helperText={errors.name?.message}
```

### **Problem: Pole nie aktualizuje się**
```typescript
// ❌ Źle:
<TextField name="email" value={formData.email} onChange={handleChange} />

// ✅ Dobrze:
<Controller
  name="email"
  control={control}
  render={({ field }) => <TextField {...field} />}
/>
```

### **Problem: Number field pokazuje "0" zamiast pustego**
```typescript
// Rozwiązanie:
const schema = z.object({
  age: z.number().optional().or(z.literal('')),
});

// W defaultValues:
defaultValues: {
  age: '' as any, // TypeScript hack
}
```

### **Problem: Select nie działa z pustą wartością**
```typescript
// Dodaj pustą opcję:
<MenuItem value="">Brak</MenuItem>

// W schemacie:
z.enum(['OPTION1', 'OPTION2', ''])
```

---

## 📊 **Korzyści z Walidacji**

### **Przed:**
- ❌ Brak walidacji po stronie klienta
- ❌ Użytkownik wysyła błędne dane
- ❌ Błędy dopiero z backendu
- ❌ Słabe UX

### **Po:**
- ✅ Walidacja w czasie rzeczywistym
- ✅ Jasne komunikaty błędów
- ✅ Mniej requestów do API
- ✅ Lepsze UX
- ✅ Type-safe formularze

---

## 🚀 **Następne Kroki:**

1. **Przetestuj PatientFormPage:**
   - Spróbuj zapisać bez imienia/nazwiska
   - Wpisz nieprawidłowy email
   - Wpisz ujemny wiek
   - Zobacz komunikaty błędów

2. **Zaktualizuj LoginPage:**
   - Dodaj walidację email
   - Dodaj walidację hasła (min 6 znaków)

3. **Zaktualizuj ConsultationFormPage:**
   - Duży formularz, ale ten sam pattern
   - Podziel na sekcje jeśli potrzeba

4. **Dodaj więcej walidacji:**
   - PESEL (11 cyfr)
   - NIP (10 cyfr)
   - Kod pocztowy (XX-XXX)

---

**Gotowe! Formularz pacjenta ma teraz pełną walidację! 🎉**

Sprawdź: http://localhost:5173/patients/new
