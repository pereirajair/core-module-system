const updateHasManyAssociations = async (instance, data, transaction) => {
    const model = instance.constructor;

    // Iterar sobre todas as associações do modelo
    for (const associationName in model.associations) {
        const association = model.associations[associationName];

        // Processar apenas HasMany
        if (association.associationType === 'HasMany') {
            // Tentar encontrar os dados no payload usando o nome da associação, o alias, ou camelCase
            const keysToCheck = [
                associationName,
                association.as,
                association.as.charAt(0).toLowerCase() + association.as.slice(1)
            ];

            let itemsToProcess = null;
            for (const key of keysToCheck) {
                if (data[key] && Array.isArray(data[key])) {
                    itemsToProcess = data[key];
                    break;
                }
            }

            if (itemsToProcess) {
                // Lógica de sincronização (Sync)

                // 1. Obter itens atuais do banco
                const currentItems = await instance[association.accessors.get]({ transaction });
                const currentIds = currentItems.map(item => item.id);

                // 2. Identificar itens recebidos
                const receivedItems = itemsToProcess;
                const receivedIds = receivedItems.filter(item => item.id).map(item => item.id);

                // 3. Itens para deletar (que estão no banco mas não vieram no payload)
                const idsToDelete = currentIds.filter(id => !receivedIds.includes(id));

                if (idsToDelete.length > 0) {
                    await association.target.destroy({
                        where: { id: idsToDelete },
                        transaction
                    });
                }

                // 4. Criar ou Atualizar itens
                for (const itemData of receivedItems) {
                    if (itemData.id && currentIds.includes(itemData.id)) {
                        // Atualizar
                        await association.target.update(itemData, {
                            where: { id: itemData.id },
                            transaction
                        });
                    } else {
                        // Criar
                        // Remover ID temporário ou null se existir
                        const { id, ...newItemData } = itemData;
                        // Definir a chave estrangeira
                        newItemData[association.foreignKey] = instance.id;

                        await association.target.create(newItemData, { transaction });
                    }
                }
            }
        }
    }
};

module.exports = {
    updateHasManyAssociations
};
