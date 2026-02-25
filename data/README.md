Структура данных (JSON) для compot

Папки:
- proposals/ — предложения и версии
- cases/ — кейсы
- services/ — услуги
- clients/ — клиенты
- markets/ — отрасли
- designs/ — варианты дизайна
- links/ — агрегирующие индексы и связи
- spec/ — спецификации каркаса (типы блоков и примеры)

Файлы индексов:
- proposals/index.json
- cases/index.json
- services/index.json
- clients/index.json
- markets/index.json
- designs/index.json
- links/service-proposals.json
- links/service-cases.json
- links/case-proposals.json
- spec/proposal-blocks.json
- spec/plan-block.json
- spec/case.json
- spec/service.json
- spec/client.json
- spec/market.json
- spec/design.json
- spec/proposal.json
- spec/proposal-version.json
- spec/indexes.json
- spec/links.json

Версии предложений:
- актуальное состояние: data/proposals/<proposalId>/proposal.json
- история: data/proposals/<proposalId>/versions/<versionId>.json

Индексы и связи:
- все index.json обновляются при каждом изменении соответствующих объектов
- links/*.json обновляются при каждом изменении связей (привязка/отвязка)

Шаблоны:
- data/cases/_templates/case.json
- data/services/_templates/service.json
- data/designs/_templates/design.json
- data/proposals/_templates/proposal.json
- data/proposals/_templates/versions/version.json

ID и версии:
- proposalId: clientSlug + "_" + YYYY-MM-DD (добавить суффикс при коллизии)
- versionId: YYYY-MM-DD_HHMM
- serviceId/caseId/designId: slug

Каждый JSON содержит поле schemaVersion.
