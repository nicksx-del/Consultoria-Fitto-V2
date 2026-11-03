# Catálogo de alimentos brasileiros

Fonte nutricional: Tabela Brasileira de Composição de Alimentos (TACO), 4ª edição, NEPA/UNICAMP.
Distribuição JSON comunitária: https://github.com/brolesi/taco
API consultada: https://brolesi.github.io/taco/
Importação: 2026-11-02. 597 alimentos. Valores por 100 g de porção comestível.

O arquivo taco-foods.json é uma cópia local normalizada da API. Não há consulta de dados de alunos ao fornecedor.
scripts/import-taco.cjs permite atualizar a cópia explicitamente. IDs e nomes devem ser revisados antes de substituir a versão utilizada em planos existentes.
A licença do distribuidor está em TACO-LICENSE.txt. A API comunitária não é um serviço oficial da UNICAMP.

Campos ausentes são preservados como null e nunca convertidos em zero.
O distribuidor representa traços por 0,00001; a interface arredonda valores somente na exibição.
Não há conversão automática de unidades ou medidas caseiras.
Totais representam porções prescritas; registros parciais não são convertidos em consumo nutricional.
Referências persistidas usam tacoId e grams; os nutrientes são derivados da base local, sem aceitar macros arbitrários do cliente.
Alimentos manuais continuam disponíveis e tornam a soma parcial.
