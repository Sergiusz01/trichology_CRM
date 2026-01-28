import { prisma } from '../prisma';

interface TemplateField {
  type: 'TEXT' | 'TEXTAREA' | 'SELECT' | 'MULTISELECT' | 'CHECKBOX' | 'NUMBER' | 'DATE';
  label: string;
  key: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
  defaultValue?: string | number | boolean | string[];
  order: number;
}

async function seedDefaultTemplate() {
  try {
    // Check if default template already exists
    const existing = await prisma.consultationTemplate.findFirst({
      where: { isDefault: true },
    });

    if (existing) {
      console.log('Domyślny szablon już istnieje. Aktualizuję...');
      await prisma.consultationTemplate.update({
        where: { id: existing.id },
        data: {
          name: 'Standardowy arkusz konsultacji',
          fields: generateDefaultFields() as any,
        },
      });
      console.log('✓ Szablon zaktualizowany');
      return;
    }

    // Get first doctor to assign template
    const doctor = await prisma.user.findFirst({
      where: { role: 'DOCTOR' },
    });

    if (!doctor) {
      console.error('Brak lekarza w bazie danych. Utwórz najpierw użytkownika z rolą DOCTOR.');
      return;
    }

    // Create default template
    await prisma.consultationTemplate.create({
      data: {
        name: 'Standardowy arkusz konsultacji',
        doctorId: doctor.id,
        fields: generateDefaultFields() as any,
        isDefault: true,
        isActive: true,
      },
    });

    console.log('✓ Domyślny szablon utworzony pomyślnie');
  } catch (error) {
    console.error('Błąd tworzenia szablonu:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

function generateDefaultFields(): TemplateField[] {
  const fields: TemplateField[] = [];
  let order = 0;

  // 1. WYPADANIE WŁOSÓW
  fields.push(
    {
      type: 'SELECT',
      label: 'Nasilenie wypadania włosów',
      key: 'hairLossSeverity',
      required: false,
      options: ['Brak', 'W normie', 'Nasilone', 'Nadmierne', 'Okresowe'],
      order: order++,
    },
    {
      type: 'SELECT',
      label: 'Czas trwania wypadania włosów',
      key: 'hairLossDuration',
      required: false,
      options: ['Brak', '0-6 m-cy', '6-12 m-cy', '12-24 m-cy', 'Powyżej roku'],
      order: order++,
    },
    {
      type: 'MULTISELECT',
      label: 'Lokalizacja wypadania włosów',
      key: 'hairLossLocalization',
      required: false,
      options: [
        'ciemieniowa',
        'skronie',
        'czołowa',
        'tonsura',
        'potylica',
        'uogólnione',
        'brwi, rzęsy',
        'pachy',
        'pachwiny',
      ],
      order: order++,
    },
    {
      type: 'TEXTAREA',
      label: 'Używane szampony (wypadanie włosów)',
      key: 'hairLossShampoos',
      required: false,
      placeholder: 'Wpisz używane szampony',
      order: order++,
    }
  );

  // 2. PRZETŁUSZCZANIE WŁOSÓW
  fields.push(
    {
      type: 'SELECT',
      label: 'Nasilenie przetłuszczania',
      key: 'oilyHairSeverity',
      required: false,
      options: ['Brak', 'W normie', 'Nasilone', 'Nadmierne', 'Okresowe'],
      order: order++,
    },
    {
      type: 'SELECT',
      label: 'Częstotliwość mycia',
      key: 'oilyHairWashingFreq',
      required: false,
      options: ['Brak', 'Codziennie', 'Co 2,3 dni', 'Raz w tygodniu'],
      order: order++,
    },
    {
      type: 'SELECT',
      label: 'Czas trwania przetłuszczania',
      key: 'oilyHairDuration',
      required: false,
      options: ['Brak', '0-6 m-cy', '6-12 m-cy', '12-24 m-cy', 'Powyżej roku'],
      order: order++,
    },
    {
      type: 'TEXTAREA',
      label: 'Używane szampony (przetłuszczanie)',
      key: 'oilyHairShampoos',
      required: false,
      placeholder: 'Wpisz używane szampony',
      order: order++,
    }
  );

  // 3. ŁUSZCZENIE SKÓRY GŁOWY
  fields.push(
    {
      type: 'SELECT',
      label: 'Nasilenie łuszczenia',
      key: 'scalingSeverity',
      required: false,
      options: ['Brak', 'W normie', 'Nasilone', 'Nadmierne', 'Okresowe'],
      order: order++,
    },
    {
      type: 'SELECT',
      label: 'Czas trwania łuszczenia',
      key: 'scalingDuration',
      required: false,
      options: ['Brak', '0-6 m-cy', '6-12 m-cy', '12-24 m-cy', 'Powyżej roku'],
      order: order++,
    },
    {
      type: 'MULTISELECT',
      label: 'Typ łuszczenia',
      key: 'scalingType',
      required: false,
      options: [
        'Drobne, białe',
        'Duże, żółte',
        'Tłuste',
        'Suche',
        'Zapalne',
        'Inne',
      ],
      order: order++,
    },
    {
      type: 'TEXT',
      label: 'Inne (łuszczenie)',
      key: 'scalingOther',
      required: false,
      placeholder: 'Opisz inne objawy',
      order: order++,
    }
  );

  // 4. WRAŻLIWOŚĆ SKÓRY GŁOWY
  fields.push(
    {
      type: 'SELECT',
      label: 'Nasilenie wrażliwości',
      key: 'sensitivitySeverity',
      required: false,
      options: ['Brak', 'W normie', 'Nasilone', 'Nadmierne', 'Okresowe'],
      order: order++,
    },
    {
      type: 'SELECT',
      label: 'Czas trwania wrażliwości',
      key: 'sensitivityDuration',
      required: false,
      options: ['Brak', '0-6 m-cy', '6-12 m-cy', '12-24 m-cy', 'Powyżej roku'],
      order: order++,
    },
    {
      type: 'MULTISELECT',
      label: 'Typ problemu wrażliwości',
      key: 'sensitivityProblemType',
      required: false,
      options: [
        'Świąd',
        'Pieczenie',
        'Ból',
        'Mrowienie',
        'Nadwrażliwość na dotyk',
        'Inne',
      ],
      order: order++,
    },
    {
      type: 'TEXT',
      label: 'Inne (wrażliwość)',
      key: 'sensitivityOther',
      required: false,
      placeholder: 'Opisz inne objawy',
      order: order++,
    }
  );

  // 5. STANY ZAPALNE/GRUDKI
  fields.push({
    type: 'TEXTAREA',
    label: 'Stany zapalne/grudki',
    key: 'inflammatoryStates',
    required: false,
    placeholder: 'Opisz stany zapalne i grudki',
    order: order++,
  });

  // WYWIAD
  fields.push(
    {
      type: 'TEXTAREA',
      label: 'Historia rodzinna',
      key: 'familyHistory',
      required: false,
      placeholder: 'Opisz historię rodzinną',
      order: order++,
    },
    {
      type: 'SELECT',
      label: 'Wizyty u dermatologa',
      key: 'dermatologyVisits',
      required: false,
      options: ['Tak', 'Nie'],
      order: order++,
    },
    {
      type: 'TEXT',
      label: 'Powód wizyt u dermatologa',
      key: 'dermatologyVisitsReason',
      required: false,
      placeholder: 'Opisz powód wizyt',
      order: order++,
    },
    {
      type: 'SELECT',
      label: 'Ciąża',
      key: 'pregnancy',
      required: false,
      options: ['Tak', 'Nie', 'Nie dotyczy'],
      order: order++,
    },
    {
      type: 'SELECT',
      label: 'Regularność miesiączki',
      key: 'menstruationRegularity',
      required: false,
      options: ['Regularna', 'Nieregularna', 'Nie dotyczy'],
      order: order++,
    },
    {
      type: 'SELECT',
      label: 'Antykoncepcja',
      key: 'contraception',
      required: false,
      options: ['Tak', 'Nie', 'Nie dotyczy'],
      order: order++,
    },
    {
      type: 'SELECT',
      label: 'Leki',
      key: 'medications',
      required: false,
      options: ['Tak', 'Nie'],
      order: order++,
    },
    {
      type: 'TEXTAREA',
      label: 'Lista leków',
      key: 'medicationsList',
      required: false,
      placeholder: 'Wymień przyjmowane leki',
      order: order++,
    },
    {
      type: 'SELECT',
      label: 'Suplementy',
      key: 'supplements',
      required: false,
      options: ['Tak', 'Nie'],
      order: order++,
    },
    {
      type: 'SELECT',
      label: 'Poziom stresu',
      key: 'stressLevel',
      required: false,
      options: ['Niski', 'Średni', 'Wysoki', 'Bardzo wysoki'],
      order: order++,
    },
    {
      type: 'SELECT',
      label: 'Znieczulenie',
      key: 'anesthesia',
      required: false,
      options: ['Tak', 'Nie'],
      order: order++,
    },
    {
      type: 'SELECT',
      label: 'Chemioterapia',
      key: 'chemotherapy',
      required: false,
      options: ['Tak', 'Nie'],
      order: order++,
    },
    {
      type: 'SELECT',
      label: 'Radioterapia',
      key: 'radiotherapy',
      required: false,
      options: ['Tak', 'Nie'],
      order: order++,
    },
    {
      type: 'SELECT',
      label: 'Szczepienia',
      key: 'vaccination',
      required: false,
      options: ['Tak', 'Nie'],
      order: order++,
    },
    {
      type: 'SELECT',
      label: 'Antybiotyki',
      key: 'antibiotics',
      required: false,
      options: ['Tak', 'Nie'],
      order: order++,
    },
    {
      type: 'SELECT',
      label: 'Choroby przewlekłe',
      key: 'chronicDiseases',
      required: false,
      options: ['Tak', 'Nie'],
      order: order++,
    },
    {
      type: 'TEXTAREA',
      label: 'Lista chorób przewlekłych',
      key: 'chronicDiseasesList',
      required: false,
      placeholder: 'Wymień choroby przewlekłe',
      order: order++,
    },
    {
      type: 'TEXTAREA',
      label: 'Specjaliści',
      key: 'specialists',
      required: false,
      placeholder: 'Wymień konsultowanych specjalistów',
      order: order++,
    },
    {
      type: 'TEXTAREA',
      label: 'Lista specjalistów',
      key: 'specialistsList',
      required: false,
      placeholder: 'Szczegóły',
      order: order++,
    },
    {
      type: 'SELECT',
      label: 'Zaburzenia odżywiania',
      key: 'eatingDisorders',
      required: false,
      options: ['Tak', 'Nie'],
      order: order++,
    },
    {
      type: 'TEXTAREA',
      label: 'Nietolerancje pokarmowe',
      key: 'foodIntolerances',
      required: false,
      placeholder: 'Opisz nietolerancje',
      order: order++,
    },
    {
      type: 'TEXTAREA',
      label: 'Dieta',
      key: 'diet',
      required: false,
      placeholder: 'Opisz dietę',
      order: order++,
    },
    {
      type: 'TEXTAREA',
      label: 'Alergie',
      key: 'allergies',
      required: false,
      placeholder: 'Wymień alergie',
      order: order++,
    },
    {
      type: 'SELECT',
      label: 'Metalowe części w ciele',
      key: 'metalPartsInBody',
      required: false,
      options: ['Tak', 'Nie'],
      order: order++,
    },
    {
      type: 'TEXTAREA',
      label: 'Rutyna pielęgnacyjna - szampon',
      key: 'careRoutineShampoo',
      required: false,
      placeholder: 'Opisz szampon',
      order: order++,
    },
    {
      type: 'TEXTAREA',
      label: 'Rutyna pielęgnacyjna - odżywka',
      key: 'careRoutineConditioner',
      required: false,
      placeholder: 'Opisz odżywkę',
      order: order++,
    },
    {
      type: 'TEXTAREA',
      label: 'Rutyna pielęgnacyjna - oleje',
      key: 'careRoutineOils',
      required: false,
      placeholder: 'Opisz oleje',
      order: order++,
    },
    {
      type: 'TEXTAREA',
      label: 'Rutyna pielęgnacyjna - zabiegi chemiczne',
      key: 'careRoutineChemical',
      required: false,
      placeholder: 'Opisz zabiegi',
      order: order++,
    }
  );

  // TRICHOSKOPIA - Dodajemy tylko najważniejsze pola, resztę można rozszerzyć
  fields.push(
    {
      type: 'MULTISELECT',
      label: 'Typ skóry głowy',
      key: 'scalpType',
      required: false,
      options: [
        'Normalna',
        'Tłusta',
        'Sucha',
        'Mieszana',
        'Wrażliwa',
        'Zapalna',
      ],
      order: order++,
    },
    {
      type: 'MULTISELECT',
      label: 'Wygląd skóry głowy',
      key: 'scalpAppearance',
      required: false,
      options: [
        'Zdrowe',
        'Zapalne',
        'Złuszczające się',
        'Zgrubiałe',
        'Zaczerwienione',
      ],
      order: order++,
    },
    {
      type: 'SELECT',
      label: 'Hiperhydroza',
      key: 'hyperhidrosis',
      required: false,
      options: ['Tak', 'Nie'],
      order: order++,
    },
    {
      type: 'SELECT',
      label: 'Hiperkeratynizacja',
      key: 'hyperkeratinization',
      required: false,
      options: ['Tak', 'Nie'],
      order: order++,
    },
    {
      type: 'SELECT',
      label: 'Wydzielanie łoju',
      key: 'sebaceousSecretion',
      required: false,
      options: ['Normalne', 'Zwiększone', 'Zmniejszone'],
      order: order++,
    },
    {
      type: 'SELECT',
      label: 'pH skóry głowy',
      key: 'scalpPH',
      required: false,
      options: ['Kwaśne', 'Neutralne', 'Zasadowe'],
      order: order++,
    },
    {
      type: 'SELECT',
      label: 'Jakość włosów',
      key: 'hairQuality',
      required: false,
      options: ['Dobra', 'Średnia', 'Słaba'],
      order: order++,
    },
    {
      type: 'SELECT',
      label: 'Kształt włosów',
      key: 'hairShape',
      required: false,
      options: ['Proste', 'Falowane', 'Kręcone'],
      order: order++,
    },
    {
      type: 'SELECT',
      label: 'Włosy odrastające',
      key: 'regrowingHairs',
      required: false,
      options: ['Tak', 'Nie'],
      order: order++,
    },
    {
      type: 'SELECT',
      label: 'Stopień przerzedzenia',
      key: 'degreeOfThinning',
      required: false,
      options: ['Lekki', 'Średni', 'Ciężki'],
      order: order++,
    },
    {
      type: 'SELECT',
      label: 'Miniaturyzacja',
      key: 'miniaturization',
      required: false,
      options: ['Tak', 'Nie'],
      order: order++,
    },
    {
      type: 'SELECT',
      label: 'Zespoły mieszkowe',
      key: 'follicularUnits',
      required: false,
      options: [
        'Przewaga pojedynczych',
        'Przewaga podwójnych',
        'Przewaga potrójnych/poczwórnych',
        'Występują puste mieszki włosowe',
      ],
      order: order++,
    },
    {
      type: 'SELECT',
      label: 'Pull Test',
      key: 'pullTest',
      required: false,
      options: ['Dodatni TE/AE', 'Ujemny AGA'],
      order: order++,
    },
    {
      type: 'TEXTAREA',
      label: 'Inne (diagnostyka łysienia)',
      key: 'alopeciaOther',
      required: false,
      placeholder: 'Opisz inne obserwacje',
      order: order++,
    }
  );

  // DIAGNOZA I ZALECENIA
  fields.push(
    {
      type: 'TEXTAREA',
      label: 'Diagnoza',
      key: 'diagnosis',
      required: false,
      placeholder: 'Wpisz diagnozę',
      order: order++,
    },
    {
      type: 'TEXTAREA',
      label: 'Zalecenia - mycie',
      key: 'careRecommendationsWashing',
      required: false,
      placeholder: 'Zalecenia dotyczące mycia',
      order: order++,
    },
    {
      type: 'TEXTAREA',
      label: 'Zalecenia - preparaty miejscowe',
      key: 'careRecommendationsTopical',
      required: false,
      placeholder: 'Zalecenia dotyczące preparatów',
      order: order++,
    },
    {
      type: 'TEXTAREA',
      label: 'Zalecenia - suplementy',
      key: 'careRecommendationsSupplement',
      required: false,
      placeholder: 'Zalecenia dotyczące suplementów',
      order: order++,
    },
    {
      type: 'TEXTAREA',
      label: 'Zmiany w pielęgnacji',
      key: 'careRecommendationsBehavior',
      required: false,
      placeholder: 'Zalecenia dotyczące zmian w zachowaniu',
      order: order++,
    },
    {
      type: 'TEXTAREA',
      label: 'Wizyty / Zabiegi',
      key: 'visitsProcedures',
      required: false,
      placeholder: 'Notatki z wizyt i zabiegów',
      order: order++,
    },
    {
      type: 'TEXTAREA',
      label: 'Uwagi ogólne',
      key: 'generalRemarks',
      required: false,
      placeholder: 'Dodatkowe uwagi',
      order: order++,
    }
  );

  return fields;
}

// Run if called directly
if (require.main === module) {
  seedDefaultTemplate()
    .then(() => {
      console.log('✓ Seed zakończony');
      process.exit(0);
    })
    .catch((error) => {
      console.error('✗ Błąd seed:', error);
      process.exit(1);
    });
}

export { seedDefaultTemplate, generateDefaultFields };
