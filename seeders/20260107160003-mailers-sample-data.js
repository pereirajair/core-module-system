'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // Gerar 100 emails de exemplo para testar a fila
        const emails = [];
        const domains = ['example.com', 'test.com', 'demo.com', 'sample.org', 'mail.com'];
        const names = [
            'João', 'Maria', 'Pedro', 'Ana', 'Carlos', 'Juliana', 'Fernando', 'Patricia',
            'Ricardo', 'Camila', 'Roberto', 'Mariana', 'Lucas', 'Beatriz', 'Gabriel', 'Isabela',
            'Rafael', 'Larissa', 'Thiago', 'Amanda', 'Bruno', 'Carolina', 'Felipe', 'Vanessa',
            'Daniel', 'Renata', 'André', 'Tatiana', 'Marcos', 'Priscila', 'Gustavo', 'Fernanda',
            'Rodrigo', 'Adriana', 'Eduardo', 'Cristina', 'Paulo', 'Monica', 'Leandro', 'Sandra',
            'Vinicius', 'Claudia', 'Diego', 'Simone', 'Henrique', 'Aline', 'Igor', 'Juliana',
            'Matheus', 'Leticia', 'Guilherme', 'Bruna', 'Rafaela', 'Natalia', 'Luciana', 'Fabiana'
        ];
        const subjects = [
            'Bem-vindo ao nosso sistema',
            'Confirmação de cadastro',
            'Atualização importante',
            'Notificação do sistema',
            'Mensagem automática',
            'Boas-vindas',
            'Confirmação de email',
            'Aviso importante',
            'Informação relevante',
            'Comunicação do sistema'
        ];
        const messages = [
            'Este é um email de teste gerado automaticamente.',
            'Olá! Este é um email de exemplo para testar o sistema de filas.',
            'Mensagem automática do sistema de emails.',
            'Este email foi criado para testar a funcionalidade de processamento em fila.',
            'Email de teste gerado pelo seeder.',
            'Mensagem de boas-vindas automática.',
            'Este é um email de demonstração.',
            'Notificação automática do sistema.',
            'Email de teste para validação do sistema de filas.',
            'Mensagem gerada automaticamente para testes.'
        ];

        for (let i = 0; i < 100; i++) {
            const fromName = names[Math.floor(Math.random() * names.length)];
            const toName = names[Math.floor(Math.random() * names.length)];
            const fromDomain = domains[Math.floor(Math.random() * domains.length)];
            const toDomain = domains[Math.floor(Math.random() * domains.length)];
            const subject = subjects[Math.floor(Math.random() * subjects.length)];
            const message = messages[Math.floor(Math.random() * messages.length)];

            // Criar alguns emails que irão falhar propositalmente (a cada 10 emails, 1 falhará)
            // Emails com "ERROR" no assunto ou destinatário "error@fail.com" irão falhar
            const shouldFail = (i + 1) % 10 === 0; // A cada 10 emails, 1 falhará
            const errorEmail = shouldFail ? 'error@fail.com' : `${toName.toLowerCase()}@${toDomain}`;
            const errorSubject = shouldFail ? `[ERROR-TEST] ${subject} #${i + 1}` : `${subject} #${i + 1}`;

            emails.push({
                from: `${fromName.toLowerCase()}@${fromDomain}`,
                to: errorEmail,
                subject: errorSubject,
                message: `${message} Email número ${i + 1} de 100.${shouldFail ? ' [ESTE EMAIL FALHARÁ PROPOSITALMENTE PARA TESTE]' : ''}`,
                status: 'pending',
                attempts: 0,
                createdAt: new Date(),
                updatedAt: new Date()
            });
        }

        await queryInterface.bulkInsert('sys_mailers', emails, {});
        console.log(`✅ ${emails.length} emails de exemplo criados com sucesso`);
    },

    async down(queryInterface, Sequelize) {
        // Remover emails de exemplo (identificados por serem emails de teste com domínios específicos)
        await queryInterface.bulkDelete('sys_mailers', {
            from: {
                [Sequelize.Op.like]: '%@example.com'
            }
        }, {});
        
        await queryInterface.bulkDelete('sys_mailers', {
            from: {
                [Sequelize.Op.like]: '%@test.com'
            }
        }, {});
        
        await queryInterface.bulkDelete('sys_mailers', {
            from: {
                [Sequelize.Op.like]: '%@demo.com'
            }
        }, {});
        
        await queryInterface.bulkDelete('sys_mailers', {
            from: {
                [Sequelize.Op.like]: '%@sample.org'
            }
        }, {});
        
        await queryInterface.bulkDelete('sys_mailers', {
            from: {
                [Sequelize.Op.like]: '%@mail.com'
            }
        }, {});
    }
};

