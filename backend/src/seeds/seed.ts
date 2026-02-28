import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { BCRYPT_ROUNDS, MEDALS } from '../utils/constants';

const prisma = new PrismaClient();

async function seed() {
    console.log('🌱 Seeding database...');

    // Create medals
    for (const medalha of MEDALS) {
        await prisma.medalha.upsert({
            where: { codigo: medalha.codigo },
            create: medalha,
            update: medalha,
        });
    }
    console.log('✅ Medals created');

    // Create admin user
    const adminHash = await bcrypt.hash('Admin@123', BCRYPT_ROUNDS);
    await prisma.usuario.upsert({
        where: { email: 'admin@comunidadesegura.com' },
        create: {
            nomeCompleto: 'Administrador do Sistema',
            pseudonimo: 'Admin',
            email: 'admin@comunidadesegura.com',
            senhaHash: adminHash,
            role: 'ADMIN',
            pontuacao: 2000,
            nivel: 'Guardião da Comunidade',
            aceitouTermos: true,
            senhasAnteriores: JSON.stringify([adminHash]),
        },
        update: {},
    });
    console.log('✅ Admin user created (admin@comunidadesegura.com / Admin@123)');

    // Create moderator user
    const modHash = await bcrypt.hash('Mod@1234', BCRYPT_ROUNDS);
    await prisma.usuario.upsert({
        where: { email: 'moderador@comunidadesegura.com' },
        create: {
            nomeCompleto: 'Moderador Padrão',
            pseudonimo: 'ModeradorJP',
            email: 'moderador@comunidadesegura.com',
            senhaHash: modHash,
            role: 'MODERADOR',
            pontuacao: 800,
            nivel: 'Sentinela',
            aceitouTermos: true,
            senhasAnteriores: JSON.stringify([modHash]),
        },
        update: {},
    });
    console.log('✅ Moderator user created (moderador@comunidadesegura.com / Mod@1234)');

    // Create test member
    const memberHash = await bcrypt.hash('User@1234', BCRYPT_ROUNDS);
    const membro = await prisma.usuario.upsert({
        where: { email: 'joao@email.com' },
        create: {
            nomeCompleto: 'João Silva',
            pseudonimo: 'JoãoS',
            email: 'joao@email.com',
            senhaHash: memberHash,
            role: 'MEMBRO',
            pontuacao: 150,
            nivel: 'Colaborador',
            aceitouTermos: true,
            miniBio: 'Morador do bairro há 10 anos. Ajudando a comunidade.',
            senhasAnteriores: JSON.stringify([memberHash]),
        },
        update: {},
    });
    console.log('✅ Member user created (joao@email.com / User@1234)');

    // Create another member
    const member2Hash = await bcrypt.hash('User@1234', BCRYPT_ROUNDS);
    const membro2 = await prisma.usuario.upsert({
        where: { email: 'maria@email.com' },
        create: {
            nomeCompleto: 'Maria Oliveira',
            pseudonimo: 'MariaO',
            email: 'maria@email.com',
            senhaHash: member2Hash,
            role: 'MEMBRO',
            pontuacao: 50,
            nivel: 'Iniciante',
            aceitouTermos: true,
            senhasAnteriores: JSON.stringify([member2Hash]),
        },
        update: {},
    });
    console.log('✅ Member 2 user created (maria@email.com / User@1234)');

    // Create seed incidents (João Pessoa area)
    const incidents = [
        {
            titulo: 'Assalto na Av. Epitácio Pessoa',
            descricao: 'Dois indivíduos em uma moto roubaram celular e carteira na altura do número 1200.',
            categoria: 'Assalto à mão armada',
            tipo: 'CRITICAL',
            severidade: 'CRITICA',
            latitude: -7.11532,
            longitude: -34.86105,
            autorId: membro.id,
        },
        {
            titulo: 'Furto de bicicleta no Parque Solon',
            descricao: 'Bicicleta presa no bicicletário foi furtada durante a noite. Câmeras não cobrem a área.',
            categoria: 'Furto',
            tipo: 'WARNING',
            severidade: 'MEDIA',
            latitude: -7.11932,
            longitude: -34.85105,
            autorId: membro2.id,
        },
        {
            titulo: 'Poste apagado na Rua das Mangabeiras',
            descricao: 'Poste de iluminação está apagado há 3 dias deixando a rua completamente escura à noite.',
            categoria: 'Iluminação Deficiente',
            tipo: 'WARNING',
            severidade: 'BAIXA',
            latitude: -7.11832,
            longitude: -34.85505,
            autorId: membro.id,
        },
        {
            titulo: 'Assalto no ponto de ônibus',
            descricao: 'Assalto a mão armada no ponto de ônibus próximo ao shopping. Vítima foi ameaçada com faca.',
            categoria: 'Assalto à mão armada',
            tipo: 'CRITICAL',
            severidade: 'CRITICA',
            latitude: -7.12132,
            longitude: -34.87105,
            autorId: membro2.id,
        },
        {
            titulo: 'Acidente de trânsito na BR-230',
            descricao: 'Colisão entre dois veículos na entrada de João Pessoa. Trânsito lento no local.',
            categoria: 'Acidente de Trânsito',
            tipo: 'WARNING',
            severidade: 'ALTA',
            latitude: -7.10832,
            longitude: -34.84705,
            autorId: membro.id,
        },
        {
            titulo: 'Furto em residência no Manaíra',
            descricao: 'Casa arrombada durante o horário comercial. Moradores suspeitam de atuação organizada.',
            categoria: 'Furto',
            tipo: 'WARNING',
            severidade: 'ALTA',
            latitude: -7.10432,
            longitude: -34.83505,
            autorId: membro2.id,
        },
    ];

    for (const inc of incidents) {
        await prisma.incidente.create({ data: inc });
    }
    console.log(`✅ ${incidents.length} incidents created`);

    // Create a sample event
    const dataEvento = new Date();
    dataEvento.setDate(dataEvento.getDate() + 7);

    await prisma.evento.create({
        data: {
            titulo: 'Mutirão de Limpeza - Praça da Independência',
            descricao: 'Convocamos todos os moradores para um grande mutirão de limpeza na Praça da Independência. Tragam sacos, luvas e disposição! Vamos melhorar nosso bairro juntos. Haverá água e lanche para os voluntários.',
            categoriaEvento: 'Mutirão de Limpeza',
            latitude: -7.12532,
            longitude: -34.86505,
            dataEvento,
            horaInicio: '08:00',
            horaFim: '12:00',
            necessitaVoluntarios: true,
            capacidadeMax: 50,
            autorId: membro.id,
        },
    });
    console.log('✅ Sample event created');

    // Create sample zone of interest
    await prisma.zonaInteresse.create({
        data: {
            usuarioId: membro.id,
            nome: 'Minha Casa',
            latitude: -7.11532,
            longitude: -34.86105,
            raio: 500,
        },
    });
    console.log('✅ Sample zone of interest created');

    // Seed permissions
    const permissions = [
        // MEMBRO
        { perfil: 'MEMBRO', recurso: 'INCIDENTE', acao: 'CRIAR', permitido: true },
        { perfil: 'MEMBRO', recurso: 'INCIDENTE', acao: 'LER', permitido: true },
        { perfil: 'MEMBRO', recurso: 'INCIDENTE', acao: 'EDITAR', permitido: true },
        { perfil: 'MEMBRO', recurso: 'VOTO', acao: 'CRIAR', permitido: true },
        // MODERADOR
        { perfil: 'MODERADOR', recurso: 'INCIDENTE', acao: 'MODERAR', permitido: true },
        { perfil: 'MODERADOR', recurso: 'INCIDENTE', acao: 'DELETAR', permitido: true },
        // ADMIN
        { perfil: 'ADMIN', recurso: 'USUARIO', acao: 'BANIR', permitido: true },
        { perfil: 'ADMIN', recurso: 'DASHBOARD', acao: 'LER', permitido: true },
        { perfil: 'ADMIN', recurso: 'AUDITORIA', acao: 'LER', permitido: true },
        // ORGAO_SEGURANCA
        { perfil: 'ORGAO_SEGURANCA', recurso: 'DASHBOARD', acao: 'LER', permitido: true },
        { perfil: 'ORGAO_SEGURANCA', recurso: 'INCIDENTE', acao: 'MODERAR', permitido: true },
    ];

    for (const p of permissions) {
        await prisma.perfilPermissao.upsert({
            where: {
                perfil_recurso_acao: { perfil: p.perfil, recurso: p.recurso, acao: p.acao },
            },
            create: p,
            update: p,
        });
    }
    console.log('✅ Permissions seeded');

    console.log('\n🎉 Seed completed successfully!');
    console.log('\n📋 Login credentials:');
    console.log('  Admin:     admin@comunidadesegura.com / Admin@123');
    console.log('  Moderador: moderador@comunidadesegura.com / Mod@1234');
    console.log('  Membro 1:  joao@email.com / User@1234');
    console.log('  Membro 2:  maria@email.com / User@1234');
}

seed()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
