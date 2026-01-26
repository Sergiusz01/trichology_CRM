import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const id = 'cmid18rjh0003xq507dfb9h40';
    const photo = await prisma.scalpPhoto.findUnique({
        where: { id },
        include: { patient: true }
    });

    if (photo) {
        console.log('Photo found:', JSON.stringify(photo, null, 2));
    } else {
        console.log('Photo NOT found');
        const allPhotos = await prisma.scalpPhoto.findMany({ take: 5 });
        console.log('Some existing IDs:', allPhotos.map(p => p.id));
    }

    await prisma.$disconnect();
}

main();
