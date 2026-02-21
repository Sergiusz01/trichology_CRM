import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Rozpoczynam migrację ścieżek zdjęć...');

    const photos = await prisma.scalpPhoto.findMany();
    console.log(`Znaleziono ${photos.length} zdjęć w bazie danych.`);

    let updatedCount = 0;

    for (const photo of photos) {
        if (photo.filePath && !photo.filename) {
            // Extract the filename from the end of the URL or Unix/Windows file path
            const filename = photo.filePath.split(/[/\\]/).pop();

            if (filename) {
                await prisma.scalpPhoto.update({
                    where: { id: photo.id },
                    data: { filename },
                });
                console.log(`Zaktualizowano ID: ${photo.id}. Nowy filename: ${filename}`);
                updatedCount++;
            }
        }
    }

    console.log(`Migracja zakończona. Zaktualizowano ${updatedCount} rekordów.`);
}

main()
    .catch((e) => {
        console.error('Błąd podczas migracji:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
